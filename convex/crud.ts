import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id, TableNames } from "./_generated/dataModel";

// Generic "Get All" for any table
export const list = query({
  args: { table: v.string() },
  handler: async (ctx, args) => {
    // Note: In production, you'd restrict this. In a hackathon, speed > security.
    return await ctx.db.query(args.table as TableNames).collect();
  },
});

// Update Listing Price
export const patchListing = mutation({
  args: {
    id: v.id("listings"),
    pricePerKg: v.optional(v.number()),
    oraclePrice: v.optional(v.number()),
    mandiModalPrice: v.optional(v.number()),
    oracleConfidence: v.optional(v.number()),
    oracleRecommendation: v.optional(v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate"))),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const getOrderWithListing = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const listing = await ctx.db.get(order.listingId);
    return { ...order, listing };
  },
});
