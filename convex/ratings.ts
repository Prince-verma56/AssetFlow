import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Submit a rating for a listing — only allowed if user has a completed order
export const submitRating = mutation({
  args: {
    listingId: v.id("listings"),
    score: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in to rate equipment.");

    const clerkId = identity.subject;
    const score = Math.max(1, Math.min(5, Math.round(args.score)));

    // Verify the user has a completed order for this listing
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .take(100);

    const hasCompletedOrder = orders.some((order) => {
      const buyerMatch =
        order.buyerId === clerkId ||
        String(order.buyerId) === clerkId;
      const statusMatch =
        order.orderStatus === "completed" || order.orderStatus === "delivered";
      return buyerMatch && statusMatch;
    });

    if (!hasCompletedOrder) {
      throw new Error("You can only rate equipment you have rented and completed.");
    }

    // Check if already rated
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_listingId_and_authorId", (q) =>
        q.eq("listingId", args.listingId).eq("authorId", clerkId),
      )
      .unique();

    if (existing) {
      // Update existing rating
      await ctx.db.patch(existing._id, {
        score,
        comment: args.comment,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("ratings", {
        listingId: args.listingId,
        authorId: clerkId,
        score,
        comment: args.comment,
        createdAt: Date.now(),
      });
    }

    // Recalculate average rating for the listing
    const allRatings = await ctx.db
      .query("ratings")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .take(500);

    if (allRatings.length > 0) {
      const avgRating =
        allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
      await ctx.db.patch(args.listingId, {
        averageRating: Math.round(avgRating * 10) / 10,
      });
    }

    return { success: true };
  },
});

// Get all ratings for a listing
export const getRatingsForListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .order("desc")
      .take(50);

    // Enrich with author info from users table
    const enriched = [];
    for (const rating of ratings) {
      const author = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", rating.authorId))
        .unique();
      enriched.push({
        ...rating,
        authorName: author?.name ?? "Anonymous Renter",
        authorImage: author?.imageUrl ?? null,
      });
    }

    const avgScore =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : 0;

    return {
      ratings: enriched,
      avgScore: Math.round(avgScore * 10) / 10,
      count: ratings.length,
    };
  },
});

// Check if the current user has a completed order for this listing
export const getUserOrderStatusForListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { canRate: false, hasRated: false };

    const clerkId = identity.subject;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .take(100);

    const hasCompletedOrder = orders.some((order) => {
      const buyerMatch =
        order.buyerId === clerkId || String(order.buyerId) === clerkId;
      const statusMatch =
        order.orderStatus === "completed" || order.orderStatus === "delivered";
      return buyerMatch && statusMatch;
    });

    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_listingId_and_authorId", (q) =>
        q.eq("listingId", args.listingId as Id<"listings">).eq("authorId", clerkId),
      )
      .unique();

    return {
      canRate: hasCompletedOrder,
      hasRated: Boolean(existingRating),
      existingScore: existingRating?.score ?? null,
      existingComment: existingRating?.comment ?? null,
    };
  },
});

// Increment view count for a listing (call on modal open)
export const incrementViewCount = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return;
    await ctx.db.patch(args.listingId, {
      viewCount: (listing.viewCount ?? 0) + 1,
    });
  },
});
