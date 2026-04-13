import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- CORE SYSTEM: USERS ---
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(), 
    // Keep this field readable for older documents, but new users default to renter/buyer immediately.
    role: v.optional(v.union(v.literal("farmer"), v.literal("buyer"))),
    roles: v.optional(v.array(v.union(v.literal("farmer"), v.literal("buyer")))),
    hasOnboarded: v.boolean(),
    imageUrl: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    pickupLocation: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    locationUpdatedAt: v.optional(v.number()),
    bio: v.optional(v.string()),
    address: v.optional(v.string()),
    cityRegion: v.optional(v.string()),
    primaryUseCase: v.optional(v.string()),
    businessName: v.optional(v.string()),
    kycVerified: v.optional(v.boolean()),
    joinedAt: v.optional(v.number()),
    trustScore: v.optional(v.number()),
    followerCount: v.optional(v.number()),
    lifetimeCompletedOrders: v.optional(v.number()),
  }).index("by_clerkId", ["clerkId"]),

  // --- PRODUCT MODULE: LISTINGS (The Farmer's Crop) ---
  listings: defineTable({
    farmerId: v.id("users"),
    assetCategory: v.string(),
    title: v.string(),
    categoryId: v.optional(v.string()),
    subCategoryId: v.optional(v.string()),
    description: v.string(),
    pricePerDay: v.number(),
    quantity: v.string(),
    stockQuantity: v.optional(v.number()),
    minimumRentalDays: v.optional(v.number()),
    purchaseYear: v.optional(v.number()),
    condition: v.optional(v.union(v.literal("Like New"), v.literal("Excellent"), v.literal("Good"), v.literal("Fair"))),
    // AI Insights (The 'Wow' Factor)
    aiSuggestedPrice: v.number(),
    aiRecommendation: v.optional(v.string()), // "Sell now" or "Wait"
    oraclePrice: v.optional(v.number()),
    mandiModalPrice: v.optional(v.number()),
    oracleConfidence: v.optional(v.number()),
    oracleRecommendation: v.optional(v.union(v.literal("sell_now"), v.literal("wait"), v.literal("negotiate"))),
    status: v.union(v.literal("available"), v.literal("maintenance"), v.literal("sold")),
    location: v.string(),
    imageUrl: v.optional(v.string()),
    approxLat: v.optional(v.number()),
    approxLng: v.optional(v.number()),
    exactLat: v.optional(v.number()),
    exactLng: v.optional(v.number()),
    qualityScore: v.optional(v.string()),
    qualityChecklist: v.optional(v.string()),
    // Asset Ledger & Availability Tracking
    nextAvailableDate: v.optional(v.number()), // Timestamp when asset becomes available after current rental
    totalRentals: v.optional(v.number()), // Lifetime rental count for this asset (defaults to 0)
    lifetimeRentals: v.optional(v.number()),
    averageRating: v.optional(v.number()),
  })
  .index("by_status", ["status"])
  .index("by_farmer", ["farmerId"])
  .index("by_assetCategory", ["assetCategory"])
  .index("by_categoryId_and_status", ["categoryId", "status"])
  .index("by_assetCategory_and_status", ["assetCategory", "status"])
  .index("by_location_and_status", ["location", "status"])
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
    rentalStartDate: v.optional(v.union(v.string(), v.number())),
    rentalEndDate: v.optional(v.union(v.string(), v.number())),
    insuranceSelected: v.optional(v.boolean()),
    dynamicPriceApplied: v.optional(v.number()), // Discount applied (e.g., 0.1 for 10% off)
    createdAt: v.optional(v.number()),
    // Payment Integration Fields
    paymentStatus: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    paymentId: v.optional(v.string()), // For Razorpay Payment ID (rzp_pay_xxx)
    razorpayPaymentId: v.optional(v.string()),
    razorpayOrderId: v.optional(v.string()), // For Razorpay Order ID (order_xxx)
    invoiceUrl: v.optional(v.string()),
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
    trackingTimeline: v.optional(
      v.array(
        v.object({
          status: v.string(),
          timestamp: v.number(),
          description: v.string(),
        })
      )
    ),
  })
  .index("by_buyer", ["buyerId"])
  .index("by_farmer", ["farmerId"])
  .index("by_listingId", ["listingId"])
  .index("by_status", ["status"]),

  wishlist: defineTable({
    renterId: v.string(),
    listingId: v.id("listings"),
    savedAt: v.number(),
  })
    .index("by_renterId", ["renterId"])
    .index("by_renterId_and_listingId", ["renterId", "listingId"]),

  savedOwners: defineTable({
    renterId: v.string(),
    ownerId: v.string(),
    savedAt: v.number(),
  })
    .index("by_renterId", ["renterId"])
    .index("by_renterId_and_ownerId", ["renterId", "ownerId"])
    .index("by_ownerId", ["ownerId"]),

  follows: defineTable({
    followerId: v.string(),
    ownerId: v.string(),
    createdAt: v.number(),
  })
    .index("by_followerId", ["followerId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_followerId_and_ownerId", ["followerId", "ownerId"]),

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
