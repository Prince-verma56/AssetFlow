import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

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

function normalizeTimestamp(value: string | number | undefined | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
  }
  return null;
}

function getStockQuantity(listing: Doc<"listings">) {
  if (typeof listing.stockCount === "number" && listing.stockCount > 0) {
    return listing.stockCount;
  }

  if (typeof listing.stockQuantity === "number" && listing.stockQuantity > 0) {
    return listing.stockQuantity;
  }

  const parsed = Number.parseInt(String(listing.quantity ?? "").replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1;
}

function isOperationalOrder(order: Doc<"orders">) {
  const status = order.orderStatus ?? "pending";
  return status === "placed" || status === "escrow" || status === "shipped" || status === "delivered";
}

function isOverlap(
  orderStart: number | null,
  orderEnd: number | null,
  requestedStart: number | null,
  requestedEnd: number | null,
) {
  if (requestedStart === null || requestedEnd === null) {
    const now = Date.now();
    return (orderEnd ?? now) >= now;
  }

  const safeOrderStart = orderStart ?? orderEnd ?? requestedStart;
  const safeOrderEnd = orderEnd ?? orderStart ?? requestedEnd;
  return safeOrderStart <= requestedEnd && safeOrderEnd >= requestedStart;
}

async function getListingOrders(ctx: QueryCtx, listingId: Id<"listings">) {
  return await ctx.db
    .query("orders")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .order("desc")
    .take(200);
}

async function getAvailabilitySnapshot(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  requestedStart?: number,
  requestedEnd?: number,
) {
  const orders = await getListingOrders(ctx, listing._id);
  const operationalOrders = orders.filter(isOperationalOrder);

  const overlappingOrders = operationalOrders.filter((order) =>
    isOverlap(
      normalizeTimestamp(order.rentalStartDate),
      normalizeTimestamp(order.rentalEndDate),
      requestedStart ?? null,
      requestedEnd ?? null,
    ),
  );

  const stockQuantity = getStockQuantity(listing);
  const activeOrdersCount = overlappingOrders.length;
  const availableStock = Math.max(stockQuantity - activeOrdersCount, 0);
  const nearestEndDate = overlappingOrders
    .map((order) => normalizeTimestamp(order.rentalEndDate))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)[0] ?? null;

  return {
    stockQuantity,
    activeOrdersCount,
    availableStock,
    nearestEndDate,
  };
}

function deriveTrustScore(owner: Doc<"users"> | null) {
  if (!owner) return 78;
  const completed = owner.lifetimeCompletedOrders ?? 0;
  const followers = owner.followerCount ?? 0;
  return Math.min(99, Math.max(owner.trustScore ?? 74, 70 + Math.min(18, completed / 4) + Math.min(8, followers / 25)));
}

function deriveOwnerBadge(owner: Doc<"users"> | null, listings: Array<Doc<"listings">>) {
  const completed = owner?.lifetimeCompletedOrders ?? 0;
  const listingRentals = listings.reduce((sum, listing) => sum + (listing.totalRentals ?? listing.lifetimeRentals ?? 0), 0);
  if (completed >= 50 || listingRentals >= 50) return "Elite Owner";
  if (completed >= 20 || listingRentals >= 20) return "Trusted Owner";
  return "Verified Owner";
}

async function decorateListing(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  owner?: Doc<"users"> | null,
  requestedStart?: number,
  requestedEnd?: number,
) {
  const resolvedOwner = owner ?? ((await ctx.db.get(listing.farmerId)) as Doc<"users"> | null);
  const availability = await getAvailabilitySnapshot(ctx, listing, requestedStart, requestedEnd);
  const currentYear = new Date().getFullYear();
  const assetAge =
    typeof listing.purchaseYear === "number" && listing.purchaseYear > 1900
      ? Math.max(0, currentYear - listing.purchaseYear)
      : null;

  return {
    ...listing,
    quantity: listing.quantity ?? `${availability.stockQuantity} Units`,
    basePricePerDay: listing.basePricePerDay ?? listing.pricePerDay,
    stockCount: availability.stockQuantity,
    stockQuantity: availability.stockQuantity,
    availableStock: availability.availableStock,
    activeOrdersCount: availability.activeOrdersCount,
    nearestEndDate: availability.nearestEndDate ?? listing.nextAvailableDate ?? null,
    farmerName: resolvedOwner?.name || "Verified Farmer",
    farmerImage: resolvedOwner?.imageUrl,
    ownerId: String(listing.farmerId),
    ownerName: resolvedOwner?.businessName || resolvedOwner?.name || "Verified Owner",
    ownerImage: resolvedOwner?.avatarUrl ?? resolvedOwner?.imageUrl,
    ownerEmail: resolvedOwner?.email,
    ownerTrustScore: deriveTrustScore(resolvedOwner),
    ownerFollowerCount: resolvedOwner?.followerCount ?? 0,
    ownerLifetimeCompletedOrders: resolvedOwner?.lifetimeCompletedOrders ?? 0,
    ownerBadge: deriveOwnerBadge(resolvedOwner, [listing]),
    assetAge,
    lifetimeRentals: listing.lifetimeRentals ?? listing.totalRentals ?? 0,
    totalRentals: listing.totalRentals ?? listing.lifetimeRentals ?? 0,
  };
}

export const getById = query({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.id);
    if (!listing) return null;
    return await decorateListing(ctx, listing);
  },
});

export const listByFarmer = query({
  args: { farmerId: v.id("users") },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId))
      .order("desc")
      .take(200);

    const result = [];
    for (const listing of listings) {
      result.push(await decorateListing(ctx, listing));
    }
    return result;
  },
});

export const listAvailable = query({
  args: {
    categoryId: v.optional(v.string()),
    assetCategory: v.optional(v.string()),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 24, 1), 60);
    let queryResult: Doc<"listings">[];

    if (args.categoryId && args.categoryId !== "All") {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_categoryId_and_status", (q) =>
          q.eq("categoryId", args.categoryId).eq("status", "available"),
        )
        .order("desc")
        .take(limit * 3);
    } else if (args.location && args.location !== "All, All") {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_location_and_status", (q) =>
          q.eq("location", args.location as string).eq("status", "available"),
        )
        .order("desc")
        .take(limit * 3);
    } else if (args.assetCategory && args.assetCategory !== "All") {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_assetCategory_and_status", (q) =>
          q.eq("assetCategory", args.assetCategory as string).eq("status", "available"),
        )
        .order("desc")
        .take(limit * 3);
    } else {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "available"))
        .order("desc")
        .take(limit * 3);
    }

    if (args.location && args.location !== "All, All") {
      queryResult = queryResult.filter((listing) => listing.location === args.location);
    }

    const result = [];
    for (const listing of queryResult.slice(0, limit)) {
      result.push(await decorateListing(ctx, listing));
    }

    return result;
  },
});

export const getAllAvailable = query({
  args: {
    categoryId: v.optional(v.string()),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 24, 1), 60);
    let queryResult: Doc<"listings">[];

    if (args.categoryId && args.categoryId !== "All") {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_categoryId_and_status", (q) =>
          q.eq("categoryId", args.categoryId).eq("status", "available"),
        )
        .order("desc")
        .take(limit * 3);
    } else if (args.location && args.location !== "All, All") {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_location_and_status", (q) =>
          q.eq("location", args.location as string).eq("status", "available"),
        )
        .order("desc")
        .take(limit * 3);
    } else {
      queryResult = await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "available"))
        .order("desc")
        .take(limit * 3);
    }

    if (args.location && args.location !== "All, All") {
      queryResult = queryResult.filter((listing) => listing.location === args.location);
    }

    const result = [];
    for (const listing of queryResult.slice(0, limit)) {
      result.push(await decorateListing(ctx, listing));
    }
    return result;
  },
});

export const getBookingAvailability = query({
  args: {
    listingId: v.id("listings"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return { success: false, error: "Listing not found" } as const;
    }

    const snapshot = await getAvailabilitySnapshot(ctx, listing, args.startDate, args.endDate);
    return {
      success: true,
      data: snapshot,
    } as const;
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
    assetCategory: v.string(),
    oraclePrice: v.number(),
    mandiModalPrice: v.number(),
    oracleRecommendation: v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate")),
    oracleConfidence: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || user.role !== "farmer") return null;

    const allListings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", user._id))
      .order("desc")
      .take(200);

    const listings = allListings.filter((listing) => listing.assetCategory === args.assetCategory);

    for (const listing of listings) {
      await ctx.db.patch(listing._id, {
        oraclePrice: args.oraclePrice,
        mandiModalPrice: args.mandiModalPrice,
        oracleRecommendation: args.oracleRecommendation,
        oracleConfidence: args.oracleConfidence,
        aiSuggestedPrice: args.oraclePrice / 100,
        aiRecommendation: args.oracleRecommendation,
      });
    }

    return null;
  },
});

export const createListing = mutation({
  args: {
    clerkId: v.string(),
    title: v.string(),
    assetCategory: v.string(),
    categoryId: v.optional(v.string()),
    subCategoryId: v.optional(v.string()),
    description: v.string(),
    pricePerDay: v.number(),
    quantity: v.string(),
    basePricePerDay: v.optional(v.number()),
    stockCount: v.optional(v.number()),
    stockQuantity: v.optional(v.number()),
    minimumRentalDays: v.optional(v.number()),
    purchaseYear: v.optional(v.number()),
    condition: v.optional(v.union(v.literal("Like New"), v.literal("Excellent"), v.literal("Good"), v.literal("Fair"))),
    location: v.string(),
    imageUrl: v.optional(v.string()),
    approxLat: v.optional(v.number()),
    approxLng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) throw new Error("User record not found. Cannot create listing.");

    const parsedQuantity = Number.parseInt(args.quantity.replace(/[^\d]/g, ""), 10);
    const stockQuantity = Math.max(1, (args.stockCount ?? args.stockQuantity ?? parsedQuantity) || 1);
    const currentYear = new Date().getFullYear();

    return await ctx.db.insert("listings", {
      farmerId: user._id,
      title: args.title,
      assetCategory: args.assetCategory,
      categoryId: args.categoryId,
      subCategoryId: args.subCategoryId,
      description: args.description,
      pricePerDay: args.pricePerDay,
      basePricePerDay: args.basePricePerDay ?? args.pricePerDay,
      quantity: args.quantity,
      stockCount: stockQuantity,
      stockQuantity,
      minimumRentalDays: args.minimumRentalDays,
      purchaseYear:
        typeof args.purchaseYear === "number" && args.purchaseYear >= 1980 && args.purchaseYear <= currentYear
          ? args.purchaseYear
          : undefined,
      condition: args.condition,
      location: args.location,
      imageUrl: args.imageUrl,
      approxLat: args.approxLat,
      approxLng: args.approxLng,
      status: "available",
      aiSuggestedPrice: args.pricePerDay,
      totalRentals: 0,
      lifetimeRentals: 0,
      nextAvailableDate: undefined,
      averageRating: undefined,
    });
  },
});

export const updateListing = mutation({
  args: {
    listingId: v.id("listings"),
    description: v.optional(v.string()),
    pricePerDay: v.optional(v.number()),
    basePricePerDay: v.optional(v.number()),
    quantity: v.optional(v.string()),
    stockCount: v.optional(v.number()),
    stockQuantity: v.optional(v.number()),
    purchaseYear: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("maintenance"), v.literal("sold"))),
  },
  handler: async (ctx, args) => {
    const { listingId, ...updates } = args;
    const normalizedUpdates = {
      ...updates,
      basePricePerDay: updates.basePricePerDay ?? updates.pricePerDay,
      stockCount: updates.stockCount ?? updates.stockQuantity,
    };
    await ctx.db.patch(listingId, normalizedUpdates);
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
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const radiusKm = Math.min(Math.max(args.radiusKm ?? 50, 1), 200);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const queryResult =
      args.categoryId && args.categoryId !== "All"
        ? ctx.db
            .query("listings")
            .withIndex("by_categoryId_and_status", (q) => q.eq("categoryId", args.categoryId).eq("status", "available"))
        : ctx.db.query("listings").withIndex("by_status", (q) => q.eq("status", "available"));

    const candidates = await queryResult.order("desc").take(300);
    const results = [];

    for (const listing of candidates) {
      if (listing.approxLat === undefined || listing.approxLng === undefined) continue;

      const distanceKm = distanceInKm(args.lat, args.lng, listing.approxLat, listing.approxLng);
      if (distanceKm > radiusKm) continue;

      const owner = (await ctx.db.get(listing.farmerId)) as Doc<"users"> | null;
      const decorated = await decorateListing(ctx, listing, owner);
      results.push({
        id: String(listing._id),
        ...decorated,
        distanceKm: Number(distanceKm.toFixed(1)),
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

    const data = [];
    for (const listing of listings) {
      data.push(await decorateListing(ctx, listing, farmer));
    }

    return {
      success: true,
      data,
    } as const;
  },
});

export const getOwnerDashboard = query({
  args: { clerkId: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const owner = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!owner) {
      return { success: false, error: "Owner not found" } as const;
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", owner._id))
      .order("desc")
      .take(200);

    const ordersById = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", owner._id))
      .order("desc")
      .take(300);
    const ordersByClerk = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.clerkId))
      .order("desc")
      .take(300);

    const orders = [...ordersById, ...ordersByClerk].filter(
      (order, index, self) => self.findIndex((candidate) => candidate._id === order._id) === index,
    );

    const totalEarnings = orders
      .filter((order) => order.paymentStatus === "paid")
      .reduce((sum, order) => sum + order.totalAmount, 0);
    const activeAssets = listings.filter((listing) => listing.status !== "sold").length;
    const currentlyRentedOut = orders.filter(isOperationalOrder).length;
    const pendingRequests = orders.filter((order) => {
      const status = order.orderStatus ?? "pending";
      return status === "placed" || status === "escrow";
    }).length;

    const rows = [];
    for (const listing of listings) {
      const availability = await getAvailabilitySnapshot(ctx, listing);
      const activeOrder = orders.find(
        (order) => order.listingId === listing._id && isOperationalOrder(order),
      );
      const renter =
        activeOrder
          ? typeof activeOrder.buyerId === "string"
            ? await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", activeOrder.buyerId)).unique()
            : await ctx.db.get(activeOrder.buyerId)
          : null;

      const totalEarned = orders
        .filter((order) => order.listingId === listing._id && order.paymentStatus === "paid")
        .reduce((sum, order) => sum + order.totalAmount, 0);

      rows.push({
        listingId: String(listing._id),
        assetName: listing.title,
        status:
          listing.status === "maintenance"
            ? "Maintenance"
            : availability.availableStock === 0
              ? "Rented"
              : "Available",
        currentRenter: (renter as Doc<"users"> | null)?.name ?? "None",
        nextAvailableDate: availability.nearestEndDate ?? null,
        totalEarned,
        availableStock: availability.availableStock,
        stockQuantity: availability.stockQuantity,
      });
    }

    const today = new Date();
    const chartDays = args.days ?? 30;
    const chart = Array.from({ length: chartDays }, (_, index) => {
      const bucket = new Date(today);
      bucket.setDate(today.getDate() - (chartDays - 1 - index));
      const bucketLabel = bucket.toISOString().slice(5, 10);
      const count = orders.filter((order) => {
        const stamp = order.createdAt ?? order._creationTime;
        const day = new Date(stamp);
        return (
          day.getFullYear() === bucket.getFullYear() &&
          day.getMonth() === bucket.getMonth() &&
          day.getDate() === bucket.getDate()
        );
      }).length;

      return {
        day: bucketLabel,
        requests: count,
      };
    });

    return {
      success: true,
      data: {
        metrics: {
          totalEarnings,
          activeAssets,
          currentlyRentedOut,
          pendingRequests,
        },
        rows,
        chart,
      },
    } as const;
  },
});

export const getListingsByOwnerId = query({
  args: {
    ownerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 24, 1), 60);

    let owner: Doc<"users"> | null = null;
    try {
      owner = (await ctx.db.get(args.ownerId as Id<"users">)) as Doc<"users"> | null;
    } catch {
      owner = null;
    }

    if (!owner) {
      owner = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.ownerId))
        .unique();
    }

    if (!owner) {
      return { success: false, error: "Owner not found" } as const;
    }

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_farmer", (q) => q.eq("farmerId", owner._id))
      .order("desc")
      .take(limit);

    const data = [];
    for (const listing of listings.filter((item) => item.status === "available")) {
      data.push(await decorateListing(ctx, listing, owner));
    }

    return {
      success: true,
      data,
      owner: {
        id: String(owner._id),
        name: owner.businessName ?? owner.name,
        avatarUrl: owner.avatarUrl ?? owner.imageUrl,
        trustScore: deriveTrustScore(owner),
        bio: owner.bio ?? "Owner profile",
        followerCount: owner.followerCount ?? 0,
        lifetimeCompletedOrders: owner.lifetimeCompletedOrders ?? 0,
        badge: deriveOwnerBadge(owner, listings),
      },
    } as const;
  },
});

export const getAvailableMapListings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 120, 1), 160);
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .order("desc")
      .take(limit * 2);

    const points = [];

    for (const listing of listings) {
      const lat = listing.approxLat ?? listing.exactLat;
      const lng = listing.approxLng ?? listing.exactLng;
      if (lat === undefined || lng === undefined) continue;

      const owner = (await ctx.db.get(listing.farmerId)) as Doc<"users"> | null;
      const decorated = await decorateListing(ctx, listing, owner);

      points.push({
        id: String(listing._id),
        title: listing.title || listing.assetCategory,
        assetCategory: listing.assetCategory,
        pricePerDay: listing.pricePerDay,
        location: listing.location,
        imageUrl: listing.imageUrl,
        lat,
        lng,
        ownerId: String(listing.farmerId),
        ownerName: decorated.ownerName,
        ownerAvatarUrl: decorated.ownerImage,
        ownerTrustScore: decorated.ownerTrustScore,
        availableStock: decorated.availableStock,
        nearestEndDate: decorated.nearestEndDate,
      });
    }

    return points.slice(0, limit);
  },
});
