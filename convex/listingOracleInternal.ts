import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const syncOracleIntoListings = internalMutation({
  args: {
    commodity: v.string(),
    mandiModalPrice: v.number(),
    oraclePrice: v.number(),
    confidence: v.number(),
    recommendation: v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate")),
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .take(100);

    for (const listing of listings) {
      await ctx.db.patch(listing._id, {
        oraclePrice: args.oraclePrice,
        mandiModalPrice: args.mandiModalPrice,
        oracleConfidence: args.confidence,
        oracleRecommendation: args.recommendation,
        aiSuggestedPrice: args.oraclePrice / 100,
        aiRecommendation: args.recommendation,
      });
    }

    return { syncedCount: listings.length };
  },
});
