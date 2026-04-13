import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ANCHOR_DATE_ISO } from "../lib/time-anchor";

export const aprilRevenueMtd = query({
  args: {
    farmerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const start = new Date("2026-04-01T00:00:00.000Z").getTime();
    const end = new Date(`${ANCHOR_DATE_ISO}T23:59:59.999Z`).getTime();

    let totalRevenue = 0;
    let paidCount = 0;

    const queryRef = args.farmerId
      ? ctx.db.query("orders").withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId as Id<"users">))
      : ctx.db.query("orders");

    const rows = await queryRef.order("desc").take(500);
    for (const row of rows) {
      if (row._creationTime < start) continue;
      if (row._creationTime > end) continue;
      if (row.paymentStatus !== "paid") continue;

      totalRevenue += row.totalAmount;
      paidCount += 1;
    }

    return {
      totalRevenue,
      paidCount,
      startDate: "2026-04-01",
      endDate: ANCHOR_DATE_ISO,
    };
  },
});

export const getMarketTrends = query({
  args: { commodity: v.string() },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("marketSnapshots")
      .filter((q) => q.eq(q.field("commodity"), args.commodity.toLowerCase()))
      .take(100);
    
    return snapshots.map(s => ({
      date: s.date,
      modalPrice: s.modalPrice,
      minPrice: s.minPrice,
      maxPrice: s.maxPrice,
    }));
  },
});
