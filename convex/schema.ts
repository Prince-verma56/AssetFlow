import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- CORE SYSTEM: USERS ---
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(), 
    // role is optional initially so we can redirect to onboarding
    role: v.optional(v.union(v.literal("farmer"), v.literal("buyer"))),
    roles: v.optional(v.array(v.union(v.literal("farmer"), v.literal("buyer")))),
    hasOnboarded: v.boolean(),
    imageUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    locationUpdatedAt: v.optional(v.number()),
  }).index("by_clerkId", ["clerkId"]),

  // --- PRODUCT MODULE: LISTINGS (The Farmer's Crop) ---
  listings: defineTable({
    farmerId: v.id("users"),
    cropName: v.string(),
    description: v.string(),
    pricePerKg: v.number(),
    quantity: v.string(),
    // AI Insights (The 'Wow' Factor)
    aiSuggestedPrice: v.number(),
    aiRecommendation: v.optional(v.string()), // "Sell now" or "Wait"
    oraclePrice: v.optional(v.number()),
    mandiModalPrice: v.optional(v.number()),
    oracleConfidence: v.optional(v.number()),
    oracleRecommendation: v.optional(v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate"))),
    status: v.union(v.literal("available"), v.literal("sold")),
    location: v.string(),
    imageUrl: v.optional(v.string()),
    approxLat: v.optional(v.number()),
    approxLng: v.optional(v.number()),
    exactLat: v.optional(v.number()),
    exactLng: v.optional(v.number()),
    qualityScore: v.optional(v.string()),
    qualityChecklist: v.optional(v.string()),
  })
  .index("by_status", ["status"])
  .index("by_farmer", ["farmerId"])
  .index("by_crop", ["cropName"])
  .index("by_crop_and_status", ["cropName", "status"])
  .index("by_approxLat_and_approxLng", ["approxLat", "approxLng"]),

  // --- PRODUCT MODULE: ORDERS (The Transactions) ---
  orders: defineTable({
    listingId: v.id("listings"),
    buyerId: v.union(v.id("users"), v.string()),
    farmerId: v.union(v.id("users"), v.string()),
    totalAmount: v.number(),
    type: v.optional(v.union(v.literal("sample"), v.literal("bulk"))),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("escrow"),
        v.literal("shipped"),
        v.literal("delivered"),
        v.literal("disputed"),
        v.literal("completed"),
      )
    ),
    escrowReleaseAt: v.optional(v.number()),
    buyerConfirmed: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    // Payment Integration Fields
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    paymentId: v.optional(v.string()), // For Razorpay Payment ID (rzp_pay_xxx)
    razorpayOrderId: v.optional(v.string()), // For Razorpay Order ID (order_xxx)
    orderStatus: v.union(
      v.literal("pending"),
      v.literal("escrow"),
      v.literal("placed"), 
      v.literal("shipped"), 
      v.literal("delivered"),
      v.literal("disputed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    deliveryAddress: v.optional(
      v.union(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          pincode: v.string(),
        }),
        v.string()
      )
    ),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  })
  .index("by_buyer", ["buyerId"])
  .index("by_farmer", ["farmerId"])
  .index("by_status", ["status"]),

  messages: defineTable({
    listingId: v.id("listings"),
    senderId: v.string(),
    receiverId: v.string(),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_listing", ["listingId"])
    .index("by_listing_and_createdAt", ["listingId", "createdAt"]),

  // --- MARKET INTELLIGENCE MODULE ---
  marketSnapshots: defineTable({
    queryKey: v.string(),
    commodity: v.string(),
    state: v.string(),
    market: v.string(),
    date: v.string(),
    minPrice: v.number(),
    maxPrice: v.number(),
    modalPrice: v.number(),
    isHistorical: v.boolean(),
    anchorDate: v.string(),
  })
    .index("by_queryKey_and_date", ["queryKey", "date"])
    .index("by_anchorDate_and_queryKey", ["anchorDate", "queryKey"]),

  oracleRuns: defineTable({
    queryKey: v.string(),
    commodity: v.string(),
    state: v.string(),
    city: v.string(),
    quantity: v.number(),
    unit: v.string(),
    mandiDate: v.optional(v.string()),
    fairPrice: v.number(),
    buyerPricePerKg: v.number(),
    confidence: v.number(),
    recommendation: v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate")),
    reasoning: v.string(),
    forecast14: v.array(v.number()),
    anchorDate: v.string(),
  })
    .index("by_queryKey_and_anchorDate", ["queryKey", "anchorDate"])
    .index("by_anchorDate_and_queryKey", ["anchorDate", "queryKey"]),
});
