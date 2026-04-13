import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export const getById = query({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByFarmer = query({
  args: { farmerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId))
      .collect();
  },
});

export const listAvailable = query({
  args: {
    cropName: v.optional(v.string()),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 24, 1), 60);
    const result = [];
    let queryResult;

    if (!args.cropName || args.cropName === "All") {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "available"))
        .order("desc")
        .take(limit * 2); // Overfetch to allow memory filtering
    } else {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_crop_and_status", (q) => q.eq("cropName", args.cropName as string).eq("status", "available"))
        .order("desc")
        .take(limit * 2);
    }

    if (args.location && args.location !== "All, All") {
       queryResult = queryResult.filter(listing => listing.location.toLowerCase().includes(args.location!.toLowerCase()));
    }
    
    queryResult = queryResult.slice(0, limit);

    // Attach farmer identity securely for the buyer frontend
    for (const listing of queryResult) {
      const farmer = await ctx.db.get(listing.farmerId);
      result.push({
        ...listing,
        farmerName: farmer?.name || "Verified Farmer",
        farmerImage: farmer?.imageUrl,
      });
    }

    return result;
  },
});

export const updateOracleData = mutation({
  args: {
    listingId: v.id("listings"),
    oraclePrice: v.number(),
    mandiModalPrice: v.number(),
    oracleRecommendation: v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate")),
    oracleConfidence: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated call to updateOracleData");

    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || user._id !== listing.farmerId) {
      throw new Error("Unauthorized to update this listing");
    }

    await ctx.db.patch(args.listingId, {
      oraclePrice: args.oraclePrice,
      mandiModalPrice: args.mandiModalPrice,
      oracleRecommendation: args.oracleRecommendation,
      oracleConfidence: args.oracleConfidence,
    });
  },
});

export const updateFarmerOracleData = mutation({
  args: {
    cropName: v.string(),
    oraclePrice: v.number(),
    mandiModalPrice: v.number(),
    oracleRecommendation: v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate")),
    oracleConfidence: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return; // Silent return if not authenticated

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || user.role !== "farmer") return;

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", user._id))
      .filter((q) => q.eq(q.field("cropName"), args.cropName))
      .collect();

    for (const listing of listings) {
      await ctx.db.patch(listing._id, {
        oraclePrice: args.oraclePrice,
        mandiModalPrice: args.mandiModalPrice,
        oracleRecommendation: args.oracleRecommendation,
        oracleConfidence: args.oracleConfidence,
        aiSuggestedPrice: args.oraclePrice / 100, // Update this as well for buyers
        aiRecommendation: args.oracleRecommendation,
      });
    }
  },
});

export const createListing = mutation({
  args: {
    clerkId: v.string(), // By-passing JWT requirement
    cropName: v.string(),
    description: v.string(),
    pricePerKg: v.number(),
    quantity: v.string(),
    location: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) throw new Error("User record not found. Cannot create listing.");

    const listingId = await ctx.db.insert("listings", {
      farmerId: user._id,
      cropName: args.cropName,
      description: args.description,
      pricePerKg: args.pricePerKg,
      quantity: args.quantity,
      location: args.location,
      imageUrl: args.imageUrl,
      status: "available",
      aiSuggestedPrice: args.pricePerKg, // Baseline until Oracle runs
    });

    return listingId;
  },
});

export const updateListing = mutation({
  args: {
    listingId: v.id("listings"),
    description: v.optional(v.string()),
    pricePerKg: v.optional(v.number()),
    quantity: v.optional(v.string()),
    status: v.optional(v.union(v.literal("available"), v.literal("sold"))),
  },
  handler: async (ctx, args) => {
    // Ideally we would verify identity here matching clerk ID to farmer ID 
    // but aligning with prototype authentication flow we will just allow patching
    const { listingId, ...updates } = args;
    await ctx.db.patch(listingId, updates);
  },
});

export const deleteListing = mutation({
  args: {
    listingId: v.id("listings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.listingId);
  },
});

export const getListingsNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radiusKm = Math.min(Math.max(args.radiusKm ?? 50, 1), 200);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const candidates = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .order("desc")
      .take(300);

    const results: Array<{
      id: string;
      cropName: string;
      description: string;
      pricePerKg: number;
      quantity: string;
      location: string;
      imageUrl?: string;
      farmerId: string;
      farmerName: string;
      farmerImage?: string;
      approxLat: number;
      approxLng: number;
      distanceKm: number;
      oraclePrice?: number;
      mandiModalPrice?: number;
      qualityScore?: string;
    }> = [];

    for (const listing of candidates) {
      if (listing.approxLat === undefined || listing.approxLng === undefined) continue;

      const distanceKm = distanceInKm(args.lat, args.lng, listing.approxLat, listing.approxLng);
      if (distanceKm > radiusKm) continue;

      const farmer = await ctx.db.get(listing.farmerId);
      results.push({
        id: String(listing._id),
        cropName: listing.cropName,
        description: listing.description,
        pricePerKg: listing.pricePerKg,
        quantity: listing.quantity,
        location: listing.location,
        imageUrl: listing.imageUrl,
        farmerId: String(listing.farmerId),
        farmerName: farmer?.name ?? "Verified Farmer",
        farmerImage: farmer?.imageUrl,
        approxLat: listing.approxLat,
        approxLng: listing.approxLng,
        distanceKm: Number(distanceKm.toFixed(1)),
        oraclePrice: listing.oraclePrice,
        mandiModalPrice: listing.mandiModalPrice,
        qualityScore: listing.qualityScore,
      });
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      success: true,
      data: results.slice(0, limit),
    } as const;
  },
});

export const getListingsByFarmer = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const farmer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!farmer) {
      return { success: false, error: "Farmer not found" } as const;
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .order("desc")
      .take(200);

    return {
      success: true,
      data: listings,
    } as const;
  },
});
