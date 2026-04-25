import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

async function getOwnerDoc(ctx: QueryCtx, ownerId: string) {
  try {
    const byId = await ctx.db.get(ownerId as Id<"users">);
    if (byId) return byId as Doc<"users">;
  } catch {
    // Fall back to Clerk id lookup below.
  }

  return (await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", ownerId))
    .unique()) as Doc<"users"> | null;
}

export const toggleSavedOwner = mutation({
  args: {
    renterId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedOwners")
      .withIndex("by_renterId_and_ownerId", (q) =>
        q.eq("renterId", args.renterId).eq("ownerId", args.ownerId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false } as const;
    }

    await ctx.db.insert("savedOwners", {
      renterId: args.renterId,
      ownerId: args.ownerId,
      savedAt: Date.now(),
    });

    return { saved: true } as const;
  },
});

export const listByRenter = query({
  args: { renterId: v.string() },
  handler: async (ctx, args) => {
    const savedRows = await ctx.db
      .query("savedOwners")
      .withIndex("by_renterId", (q) => q.eq("renterId", args.renterId))
      .order("desc")
      .take(100);

    const results = [];

    for (const row of savedRows) {
      const owner = await getOwnerDoc(ctx, row.ownerId);
      if (!owner) continue;

      const listings = await ctx.db
        .query("listings")
        .withIndex("by_farmer", (q) => q.eq("farmerId", owner._id))
        .order("desc")
        .take(12);

      const availableListings = listings.filter((listing) => listing.status === "available");

      results.push({
        ...row,
        owner: {
          id: String(owner._id),
          name: owner.name,
          email: owner.email,
          avatarUrl: owner.avatarUrl ?? owner.imageUrl,
          bio: owner.bio ?? "Trusted equipment owner on AssetFlow.",
          phone: owner.phone,
          trustScore: owner.trustScore ?? 78,
          location: owner.location ?? (owner.lat !== undefined && owner.lng !== undefined ? { lat: owner.lat, lng: owner.lng } : null),
          listingCount: availableListings.length,
        },
      });
    }

    return results;
  },
});

export const listOwnerIdsByRenter = query({
  args: { renterId: v.string() },
  handler: async (ctx, args) => {
    const savedRows = await ctx.db
      .query("savedOwners")
      .withIndex("by_renterId", (q) => q.eq("renterId", args.renterId))
      .take(200);

    return savedRows.map((row) => row.ownerId);
  },
});
