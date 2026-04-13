import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

export const countByRenter = query({
  args: { renterId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_renterId", (q) => q.eq("renterId", args.renterId))
      .take(200);

    return items.length;
  },
});

export const listByRenter = query({
  args: { renterId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlist")
      .withIndex("by_renterId", (q) => q.eq("renterId", args.renterId))
      .order("desc")
      .take(200);

    const results = [];
    for (const item of items) {
      const listing = await ctx.db.get(item.listingId);
      if (!listing) continue;
      const owner = await ctx.db.get(listing.farmerId);

      results.push({
        ...item,
        listing,
        owner: owner
          ? {
              id: String(owner._id),
              name: owner.name,
              avatarUrl: owner.avatarUrl ?? owner.imageUrl,
              trustScore: owner.trustScore ?? 78,
            }
          : null,
      });
    }

    return results;
  },
});

export const listByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.ownerId as any))
      .take(500);

    const wishlistItemsByListing = new Map<string, any[]>();
    const rentersSet = new Map<string, any>();

    for (const listing of listings) {
      const items = await ctx.db
        .query("wishlist")
        .filter((q) => q.eq(q.field("listingId"), listing._id))
        .take(500);

      for (const item of items) {
        const renter = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", item.renterId))
          .unique();

        if (renter) {
          const renterId = String(renter._id);
          if (!rentersSet.has(renterId)) {
            rentersSet.set(renterId, {
              id: renterId,
              clerkId: renter.clerkId,
              name: renter.name,
              avatarUrl: renter.avatarUrl ?? renter.imageUrl,
              trustScore: renter.trustScore ?? 75,
              bio: renter.bio,
              location: renter.cityRegion,
              savedAt: item.savedAt,
              listings: [],
            });
          }

          const renterData = rentersSet.get(renterId)!;
          if (!renterData.listings.find((l: any) => l._id === listing._id)) {
            renterData.listings.push({
              _id: listing._id,
              title: listing.title,
              assetCategory: listing.assetCategory,
              imageUrl: listing.imageUrl,
              pricePerDay: listing.pricePerDay,
              location: listing.location,
              savedAt: item.savedAt,
            });
          }
        }
      }
    }

    return Array.from(rentersSet.values()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  },
});

export const isSaved = query({
  args: {
    renterId: v.string(),
    listingId: v.id("listings"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_renterId_and_listingId", (q) =>
        q.eq("renterId", args.renterId).eq("listingId", args.listingId)
      )
      .unique();

    return Boolean(existing);
  },
});

export const toggleSaved = mutation({
  args: {
    renterId: v.string(),
    listingId: v.id("listings"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlist")
      .withIndex("by_renterId_and_listingId", (q) =>
        q.eq("renterId", args.renterId).eq("listingId", args.listingId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false } as const;
    }

    await ctx.db.insert("wishlist", {
      renterId: args.renterId,
      listingId: args.listingId,
      savedAt: Date.now(),
    });

    return { saved: true } as const;
  },
});

export const getDemandSignals = query({
  args: {},
  handler: async (ctx) => {
    const wishlistItems = await ctx.db.query("wishlist").take(500);
    const orderRows = await ctx.db.query("orders").order("desc").take(500);

    const points: Array<{
      lng: number;
      lat: number;
      weight: number;
      label: string;
      source: "wishlist" | "order";
      renterName: string;
      assetCategory?: string;
    }> = [];

    for (const item of wishlistItems) {
      const renter = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", item.renterId))
        .unique();
      if (!renter || typeof renter.lat !== "number" || typeof renter.lng !== "number") continue;

      const listing = await ctx.db.get(item.listingId);
      points.push({
        lng: renter.lng,
        lat: renter.lat,
        weight: 0.55,
        label: "Wishlist interest",
        source: "wishlist",
        renterName: renter.name,
        assetCategory: listing?.assetCategory,
      });
    }

    for (const order of orderRows) {
      let renter: Doc<"users"> | null = null;
      if (typeof order.buyerId === "string") {
        renter = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", order.buyerId))
          .unique();
      } else {
        renter = (await ctx.db.get(order.buyerId)) as Doc<"users"> | null;
      }

      const lat = typeof order.latitude === "number" ? order.latitude : renter?.lat;
      const lng = typeof order.longitude === "number" ? order.longitude : renter?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const listing = await ctx.db.get(order.listingId);
      points.push({
        lng,
        lat,
        weight: 1,
        label: "Recent rental demand",
        source: "order",
        renterName: renter?.name ?? "Renter",
        assetCategory: listing?.assetCategory,
      });
    }

    return points;
  },
});
