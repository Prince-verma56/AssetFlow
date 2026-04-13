import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const syncMarketRun = mutation({
  args: {
    queryKey: v.string(),
    anchorDate: v.string(),
    commodity: v.string(),
    state: v.string(),
    city: v.string(),
    quantity: v.number(),
    unit: v.string(),
    mandiDate: v.optional(v.string()),
    snapshots: v.array(
      v.object({
        date: v.string(),
        minPrice: v.number(),
        maxPrice: v.number(),
        modalPrice: v.number(),
        isHistorical: v.boolean(),
      }),
    ),
    oracle: v.object({
      fairPrice: v.number(),
      buyerPricePerKg: v.number(),
      confidence: v.number(),
      recommendation: v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate")),
      reasoning: v.string(),
      forecast14: v.array(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const boundedSnapshots = args.snapshots.slice(0, 180);

    for (const record of boundedSnapshots) {
      const existing = await ctx.db
        .query("marketSnapshots")
        .withIndex("by_queryKey_and_date", (q) => q.eq("queryKey", args.queryKey).eq("date", record.date))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          minPrice: record.minPrice,
          maxPrice: record.maxPrice,
          modalPrice: record.modalPrice,
          isHistorical: record.isHistorical,
          anchorDate: args.anchorDate,
        });
      } else {
        await ctx.db.insert("marketSnapshots", {
          queryKey: args.queryKey,
          commodity: args.commodity,
          state: args.state,
          market: args.city,
          date: record.date,
          minPrice: record.minPrice,
          maxPrice: record.maxPrice,
          modalPrice: record.modalPrice,
          isHistorical: record.isHistorical,
          anchorDate: args.anchorDate,
        });
      }
    }

    await ctx.db.insert("oracleRuns", {
      queryKey: args.queryKey,
      commodity: args.commodity,
      state: args.state,
      city: args.city,
      quantity: args.quantity,
      unit: args.unit,
      mandiDate: args.mandiDate,
      fairPrice: args.oracle.fairPrice,
      buyerPricePerKg: args.oracle.buyerPricePerKg,
      confidence: args.oracle.confidence,
      recommendation: args.oracle.recommendation,
      reasoning: args.oracle.reasoning,
      forecast14: args.oracle.forecast14.slice(0, 14),
      anchorDate: args.anchorDate,
    });

    return { syncedSnapshots: boundedSnapshots.length };
  },
});

export const latestOracleByQuery = query({
  args: {
    queryKey: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("oracleRuns")
      .withIndex("by_queryKey_and_anchorDate", (q) => q.eq("queryKey", args.queryKey))
      .order("desc")
      .take(1);
    return rows[0] ?? null;
  },
});

export const snapshotsByQuery = query({
  args: {
    queryKey: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const boundedLimit = Math.min(Math.max(args.limit, 1), 180);
    return await ctx.db
      .query("marketSnapshots")
      .withIndex("by_queryKey_and_date", (q) => q.eq("queryKey", args.queryKey))
      .order("desc")
      .take(boundedLimit);
  },
});
