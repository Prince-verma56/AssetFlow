import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

type TrackingEvent = {
  status: string;
  timestamp: number;
  description: string;
};

function createTrackingEvent(status: string, description: string, timestamp = Date.now()): TrackingEvent {
  return {
    status,
    timestamp,
    description,
  };
}

function initialTrackingTimeline() {
  return [
    createTrackingEvent(
      "Payment Secured",
      "Razorpay payment was secured and the rental order is ready for owner confirmation."
    ),
  ];
}

function dedupeOrders<T extends { _id: Id<"orders"> }>(orders: T[]) {
  return orders.filter((order, index, self) => self.findIndex((candidate) => candidate._id === order._id) === index);
}

async function resolveUser(
  ctx: QueryCtx | MutationCtx,
  identifier: Id<"users"> | string
): Promise<Doc<"users"> | null> {
  if (typeof identifier !== "string") {
    return (await ctx.db.get(identifier)) as Doc<"users"> | null;
  }

  try {
    const byId = await ctx.db.get(identifier as Id<"users">);
    if (byId) return byId as Doc<"users">;
  } catch {
    // Fall back to Clerk id lookup below.
  }

  return (await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identifier))
    .unique()) as Doc<"users"> | null;
}

function normalizeTrackingStatus(status: string) {
  switch (status) {
    case "placed":
    case "escrow":
      return "Payment Secured";
    case "shipped":
      return "Asset Handover";
    case "delivered":
      return "In Use";
    case "completed":
      return "Returned";
    default:
      return status;
  }
}

function ensureTrackingTimeline(order: Doc<"orders">) {
  if (order.trackingTimeline && order.trackingTimeline.length > 0) {
    return order.trackingTimeline;
  }

  return initialTrackingTimeline();
}

async function syncListingAvailability(ctx: MutationCtx, listingId: Id<"listings">) {
  const listing = await ctx.db.get(listingId);
  if (!listing) return;

  const orders = await ctx.db
    .query("orders")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .take(200);

  const activeOrders = orders.filter((order) => {
    const status = order.orderStatus ?? "pending";
    return status === "placed" || status === "escrow" || status === "shipped" || status === "delivered";
  });

  const nextAvailableDate =
    activeOrders
      .map((order) => {
        const value = order.rentalEndDate;
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const parsed = Date.parse(value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      })
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0] ?? undefined;

  await ctx.db.patch(listingId, {
    nextAvailableDate,
    status: activeOrders.length >= Math.max(1, listing.stockQuantity ?? 1) ? "sold" : "available",
  });
}

async function applyCompletionMetrics(ctx: MutationCtx, order: Doc<"orders">) {
  if (order.orderStatus === "completed" || order.buyerConfirmed) {
    return;
  }

  const listing = await ctx.db.get(order.listingId);
  if (listing) {
    const nextTotalRentals = (listing.totalRentals ?? 0) + 1;
    await ctx.db.patch(listing._id, {
      totalRentals: nextTotalRentals,
      lifetimeRentals: (listing.lifetimeRentals ?? listing.totalRentals ?? 0) + 1,
    });
  }

  const owner = await resolveUser(ctx, order.farmerId);
  if (owner) {
    await ctx.db.patch(owner._id, {
      lifetimeCompletedOrders: (owner.lifetimeCompletedOrders ?? 0) + 1,
    });
  }
}

export const createOrder = mutation({
  args: {
    clerkId: v.optional(v.string()),
    buyerId: v.optional(v.string()),
    farmerId: v.optional(v.string()),
    listingId: v.id("listings"),
    totalAmount: v.number(),
    paymentId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    razorpayOrderId: v.optional(v.string()),
    quantity: v.optional(v.union(v.string(), v.number())),
    unit: v.optional(v.string()),
    type: v.optional(v.union(v.literal("sample"), v.literal("bulk"))),
    rentalStartDate: v.optional(v.union(v.string(), v.number())),
    rentalEndDate: v.optional(v.union(v.string(), v.number())),
    insuranceSelected: v.optional(v.boolean()),
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
    invoiceUrl: v.optional(v.string()),
    dynamicPriceApplied: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.buyerId && args.farmerId && typeof args.quantity === "number" && args.unit && args.type) {
      const created = await ctx.db.insert("orders", {
        listingId: args.listingId,
        buyerId: args.buyerId,
        farmerId: args.farmerId,
        totalAmount: args.totalAmount,
        paymentStatus: args.paymentId ? "paid" : "pending",
        paymentId: args.paymentId,
        razorpayPaymentId: args.razorpayPaymentId ?? args.paymentId,
        razorpayOrderId: args.razorpayOrderId,
        invoiceUrl: args.invoiceUrl,
        status: "escrow",
        type: args.type,
        quantity: args.quantity,
        unit: args.unit,
        buyerConfirmed: false,
        rentalStartDate: args.rentalStartDate,
        rentalEndDate: args.rentalEndDate,
        insuranceSelected: args.insuranceSelected,
        dynamicPriceApplied: args.dynamicPriceApplied,
        escrowReleaseAt: Date.now() + 72 * 60 * 60 * 1000,
        deliveryAddress: args.deliveryAddress,
        createdAt: Date.now(),
        orderStatus: "placed",
        trackingTimeline: initialTrackingTimeline(),
      });

      await syncListingAvailability(ctx, args.listingId);

      return created;
    }

    if (!args.clerkId || !args.paymentId || !args.razorpayOrderId || args.quantity === undefined) {
      throw new Error("Missing required fields for legacy order creation");
    }

    const clerkId = args.clerkId;
    const buyer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!buyer) throw new Error("Buyer not found");

    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    const parsedQuantity =
      typeof args.quantity === "number"
        ? args.quantity
        : Number.parseFloat(String(args.quantity).replace(/[^\d.]/g, "")) || 0;

    const orderId = await ctx.db.insert("orders", {
      listingId: listing._id,
      buyerId: buyer._id,
      farmerId: listing.farmerId,
      totalAmount: args.totalAmount,
      paymentStatus: "paid",
      paymentId: args.paymentId,
      razorpayPaymentId: args.razorpayPaymentId ?? args.paymentId,
      razorpayOrderId: args.razorpayOrderId,
      invoiceUrl: args.invoiceUrl,
      orderStatus: "placed",
      status: "escrow",
      type: "bulk",
      quantity: parsedQuantity,
      unit: args.unit || "days",
      buyerConfirmed: false,
      rentalStartDate: args.rentalStartDate,
      rentalEndDate: args.rentalEndDate,
      insuranceSelected: args.insuranceSelected,
      dynamicPriceApplied: args.dynamicPriceApplied,
      escrowReleaseAt: Date.now() + 72 * 60 * 60 * 1000,
      createdAt: Date.now(),
      deliveryAddress: args.deliveryAddress,
      latitude: args.latitude,
      longitude: args.longitude,
      trackingTimeline: initialTrackingTimeline(),
    });

    await syncListingAvailability(ctx, listing._id);
    return orderId;
  },
});

export const getBuyerOrders = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const buyer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!buyer) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", buyer._id))
      .order("desc")
      .take(200);

    // Map the listings and farmer details
    const results = [];
    for (const order of orders) {
      const listing = await ctx.db.get(order.listingId);
      const farmer =
        typeof order.farmerId === "string"
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", order.farmerId))
              .unique()
          : await ctx.db.get(order.farmerId);
      const farmerUser = farmer as Doc<"users"> | null;
      results.push({ 
        ...order, 
        assetCategory: listing?.assetCategory || "Direct Rental",
        farmerName: farmerUser?.name || "Verified Owner",
        farmerEmail: farmerUser?.email || "contact@farmdirect.com",
        farmerPhone: farmerUser?.phone || "Phone Hidden",
        farmerImage: farmerUser?.avatarUrl ?? farmerUser?.imageUrl,
        trackingTimeline: ensureTrackingTimeline(order),
      });
    }
    return results;
  },
});

export const getRenterOrdersDetailed = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const renter = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!renter) return [];

    const ordersById = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", renter._id))
      .order("desc")
      .take(200);
    const ordersByClerkId = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.clerkId))
      .order("desc")
      .take(200);

    const orders = dedupeOrders([...ordersById, ...ordersByClerkId]);

    const results = [];
    for (const order of orders) {
      const listing = await ctx.db.get(order.listingId);
      const owner: Doc<"users"> | null =
        typeof order.farmerId === "string"
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", order.farmerId))
              .unique()
          : ((await ctx.db.get(order.farmerId)) as Doc<"users"> | null);

      results.push({
        ...order,
        title: listing?.title ?? listing?.assetCategory ?? "Equipment Rental",
        assetCategory: listing?.assetCategory ?? "Equipment Rental",
        imageUrl: listing?.imageUrl,
        location: listing?.location ?? "Unknown Region",
        ownerName: owner?.name ?? "Verified Owner",
        ownerImage: owner?.avatarUrl ?? owner?.imageUrl,
        ownerTrustScore: owner?.trustScore ?? 78,
        trackingTimeline: ensureTrackingTimeline(order),
        currentTrackingStatus:
          ensureTrackingTimeline(order)[ensureTrackingTimeline(order).length - 1]?.status ?? "Payment Secured",
      });
    }

    return results;
  },
});

export const getFarmerOrders = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const farmer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!farmer) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .order("desc")
      .take(200);
      
    // Map the listings and buyer details
    const results = [];
    for (const order of orders) {
      const listing = await ctx.db.get(order.listingId);
      const buyer =
        typeof order.buyerId === "string"
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", order.buyerId))
              .unique()
          : await ctx.db.get(order.buyerId);
      const buyerUser = buyer as Doc<"users"> | null;
      results.push({ 
        ...order, 
        assetCategory: listing?.assetCategory || "Direct Rental",
        title: listing?.title ?? listing?.assetCategory ?? "Equipment Rental",
        imageUrl: listing?.imageUrl,
        buyerName: buyerUser?.name || "Anonymous Renter",
        buyerEmail: buyerUser?.email || "-",
        buyerPhone: buyerUser?.phone || "No Contact",
        buyerImage: buyerUser?.avatarUrl ?? buyerUser?.imageUrl,
        renterName: buyerUser?.name || "Anonymous Renter",
        renterEmail: buyerUser?.email || "-",
        renterPhone: buyerUser?.phone || "No Contact",
        renterImage: buyerUser?.avatarUrl ?? buyerUser?.imageUrl,
        trackingTimeline: ensureTrackingTimeline(order),
      });
    }
    return results;
  },
});

export const getOrderDetails = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    // Attempt to treat as a direct ID but handle random search strings gracefully
    try {
      const orderId = args.orderId as Id<"orders">;
      const order = await ctx.db.get(orderId);
      if (!order) return null;

      const listing = await ctx.db.get(order.listingId);
      const farmer =
        typeof order.farmerId === "string"
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", order.farmerId))
              .unique()
          : await ctx.db.get(order.farmerId);
      const buyer =
        typeof order.buyerId === "string"
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", order.buyerId))
              .unique()
          : await ctx.db.get(order.buyerId);
      const farmerUser = farmer as Doc<"users"> | null;
      const buyerUser = buyer as Doc<"users"> | null;

      return {
        ...order,
        listingId: order.listingId,
        assetCategory: listing?.assetCategory || "Direct Rental",
        title: listing?.title ?? listing?.assetCategory ?? "Equipment Rental",
        imageUrl: listing?.imageUrl,
        quantity: listing?.quantity || "Various",
        location: listing?.location || "Unknown",
        farmerName: farmerUser?.name || "Verified Owner",
        farmerImage: farmerUser?.avatarUrl ?? farmerUser?.imageUrl,
        invoiceUrl: order.invoiceUrl,
        farmerEmail: farmerUser?.email || "contact@agrirent.com",
        buyerName: buyerUser?.name || "Renter",
        buyerEmail: buyerUser?.email || "-",
        trackingTimeline: ensureTrackingTimeline(order),
      };
    } catch (e) {
      return null;
    }
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    orderStatus: v.union(
      v.literal("pending"),
      v.literal("escrow"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("disputed"),
      v.literal("completed"),
      v.literal("placed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const normalizedStatus =
      args.orderStatus === "placed"
        ? "escrow"
        : args.orderStatus === "cancelled"
          ? "disputed"
          : args.orderStatus === "delivered"
            ? "completed"
          : args.orderStatus;

    await ctx.db.patch(args.orderId, {
      orderStatus: args.orderStatus,
      status: normalizedStatus,
      buyerConfirmed: args.orderStatus === "completed" ? true : undefined,
      trackingTimeline: [
        ...ensureTrackingTimeline(order),
        createTrackingEvent(
          normalizeTrackingStatus(args.orderStatus),
          `Order status updated to ${args.orderStatus.replace(/_/g, " ")}.`
        ),
      ],
    });

    if (args.orderStatus === "completed") {
      await applyCompletionMetrics(ctx, order);
    }
    await syncListingAvailability(ctx, order.listingId);
  },
});

export const deleteOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.orderId);
  },
});

export const clearOrderHistory = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) throw new Error("User not found");

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", user._id))
      .collect();

    for (const order of orders) {
      await ctx.db.delete(order._id);
    }
  },
});

export const getOrdersByBuyer = query({
  args: { buyerId: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.buyerId))
      .order("desc")
      .take(200);

    return { success: true, data: orders } as const;
  },
});

export const getOrdersByFarmer = query({
  args: { farmerId: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId))
      .order("desc")
      .take(200);

    return { success: true, data: orders } as const;
  },
});

export const releaseEscrow = mutation({
  args: { orderId: v.id("orders"), buyerConfirmed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, error: "Order not found" } as const;
    }

    await ctx.db.patch(args.orderId, {
      status: "completed",
      orderStatus: "completed",
      buyerConfirmed: args.buyerConfirmed ?? true,
      escrowReleaseAt: Date.now(),
      trackingTimeline: [
        ...ensureTrackingTimeline(order),
        createTrackingEvent("Returned", "Rental return was confirmed and the order was completed."),
      ],
    });

    await applyCompletionMetrics(ctx, order);
    await syncListingAvailability(ctx, order.listingId);

    return { success: true, data: { orderId: args.orderId } } as const;
  },
});

export const attachInvoiceUrl = mutation({
  args: {
    orderId: v.id("orders"),
    invoiceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      invoiceUrl: args.invoiceUrl,
    });

    return { success: true } as const;
  },
});

export const getActiveFarmerLogistics = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== args.clerkId) {
      return { success: false, error: "Unauthorized logistics access" } as const;
    }

    const farmer = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!farmer) {
      return { success: false, error: "Farmer not found" } as const;
    }

    const byId = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .order("desc")
      .take(200);
    const byClerkId = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.clerkId))
      .order("desc")
      .take(200);

    const orders = [...byId, ...byClerkId].filter(
      (order, index, self) => self.findIndex((x) => x._id === order._id) === index
    );

    const active = orders.filter((order) => {
      const status = order.orderStatus ?? "pending";
      return status === "placed" || status === "escrow" || status === "shipped" || status === "delivered";
    });

    const points: Array<{
      orderId: Id<"orders">;
      listingId: Id<"listings">;
      lat: number;
      lng: number;
      buyerName: string;
      buyerId: string;
      buyerImage?: string;
      cropName: string;
      quantityLabel: string;
      status: string;
      imageUrl?: string;
      deliveryAddress?: string;
    }> = [];

    for (const order of active) {
      if (typeof order.latitude !== "number" || typeof order.longitude !== "number") continue;

      const listing = await ctx.db.get(order.listingId);
      const buyerDoc =
        typeof order.buyerId === "string"
          ? await ctx.db
              .query("users")
              .withIndex("by_clerkId", (q) => q.eq("clerkId", order.buyerId))
              .unique()
          : await ctx.db.get(order.buyerId);
      const buyerUser = buyerDoc as Doc<"users"> | null;

      const quantityValue =
        typeof order.quantity === "number" ? String(order.quantity) : listing?.quantity ?? "N/A";
      const quantityUnit = order.unit ?? (listing?.quantity?.replace(/[\d.\s]/g, "").trim() || "kg");

      points.push({
        orderId: order._id,
        listingId: order.listingId,
        lat: Number(order.latitude.toFixed(6)),
        lng: Number(order.longitude.toFixed(6)),
        buyerName: buyerUser?.name ?? "Buyer",
        buyerId: String(order.buyerId),
        buyerImage: buyerUser?.avatarUrl ?? buyerUser?.imageUrl,
        cropName: listing?.assetCategory ?? "Asset",
        quantityLabel: `${quantityValue} ${quantityUnit}`.trim(),
        status: order.orderStatus ?? "pending",
        imageUrl: listing?.imageUrl,
        deliveryAddress:
          typeof order.deliveryAddress === "string"
            ? order.deliveryAddress
            : order.deliveryAddress
              ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`
              : undefined,
      });
    }

    return {
      success: true,
      data: {
        farmer: {
          name: farmer.name,
          lat: farmer.location?.lat ?? farmer.lat ?? null,
          lng: farmer.location?.lng ?? farmer.lng ?? null,
        },
        activeOrders: points,
      },
    } as const;
  },
});

export const getCrossRoleSummary = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== args.clerkId) {
      return { success: false, error: "Unauthorized summary access" } as const;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      } as const;
    }

    const asFarmerById = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", user._id))
      .take(200);
    const asFarmerByClerk = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.clerkId))
      .take(200);
    const asBuyerById = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", user._id))
      .take(200);
    const asBuyerByClerk = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", args.clerkId))
      .take(200);

    const asFarmer = [...asFarmerById, ...asFarmerByClerk].filter(
      (order, index, self) => self.findIndex((x) => x._id === order._id) === index
    );
    const asBuyer = [...asBuyerById, ...asBuyerByClerk].filter(
      (order, index, self) => self.findIndex((x) => x._id === order._id) === index
    );

    const pendingFarmerDeliveries = asFarmer.filter((order) => {
      const status = order.orderStatus ?? "pending";
      return status === "placed" || status === "escrow" || status === "shipped" || status === "delivered";
    }).length;

    const activeBuyerPurchases = asBuyer.filter((order) => {
      const status = order.orderStatus ?? "pending";
      return status === "placed" || status === "escrow" || status === "shipped" || status === "delivered";
    }).length;

    return {
      success: true,
      data: {
        pendingFarmerDeliveries,
        activeBuyerPurchases,
      },
    } as const;
  },
});

export const getRenterActiveRentals = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const orders = (await ctx.runQuery(api.orders.getRenterOrdersDetailed, {
      clerkId: args.clerkId,
    })) as Array<Record<string, unknown>>;
    return orders.filter((order: Record<string, unknown>) => (order.orderStatus ?? "pending") !== "pending");
  },
});

export const getRenterTrackingOrders = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const orders = (await ctx.runQuery(api.orders.getRenterOrdersDetailed, {
      clerkId: args.clerkId,
    })) as Array<Record<string, unknown>>;
    return orders.filter((order: Record<string, unknown>) => {
      const status = order.orderStatus ?? "pending";
      return status !== "pending" && status !== "cancelled";
    });
  },
});

export const getOwnerTrackingOrders = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const orders = (await ctx.runQuery(api.orders.getFarmerOrders, {
      clerkId: args.clerkId,
    })) as Array<Record<string, unknown>>;
    const results: Array<Record<string, unknown>> = [];

    for (const order of orders) {
      const listing = await ctx.db.get(order.listingId as Id<"listings">);
      const renter = await resolveUser(ctx, order.buyerId as Id<"users"> | string);

      results.push({
        ...order,
        title: listing?.title ?? listing?.assetCategory ?? "Equipment Rental",
        imageUrl: listing?.imageUrl,
        location: listing?.location ?? "Unknown Region",
        renterName: renter?.name ?? order.buyerName ?? "Renter",
        renterAvatarUrl: renter?.avatarUrl ?? renter?.imageUrl ?? order.buyerImage,
        renterTrustScore: renter?.trustScore ?? 74,
        trackingTimeline: ensureTrackingTimeline(order as unknown as Doc<"orders">),
        currentTrackingStatus:
          ensureTrackingTimeline(order as unknown as Doc<"orders">)[
            ensureTrackingTimeline(order as unknown as Doc<"orders">).length - 1
          ]?.status ??
          "Payment Secured",
      });
    }

    return results.filter((order: Record<string, unknown>) => {
      const status = order.orderStatus ?? "pending";
      return status !== "pending" && status !== "cancelled";
    });
  },
});

export const appendTrackingEvent = mutation({
  args: {
    orderId: v.id("orders"),
    eventType: v.union(v.literal("handover"), v.literal("in_use"), v.literal("return")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { success: false, error: "Order not found" } as const;
    }

    const eventMap = {
      handover: {
        status: "Asset Handover",
        description: "Owner confirmed the asset handover to the renter.",
        orderStatus: "shipped" as const,
        statusValue: "shipped" as const,
      },
      in_use: {
        status: "In Use",
        description: "Rental has started and the equipment is now in active use.",
        orderStatus: "delivered" as const,
        statusValue: "completed" as const,
      },
      return: {
        status: "Returned",
        description: "Owner confirmed the equipment return and closed the rental cycle.",
        orderStatus: "completed" as const,
        statusValue: "completed" as const,
      },
    } as const;

    const nextEvent = eventMap[args.eventType];
    const currentTimeline = ensureTrackingTimeline(order);
    const alreadyLogged = currentTimeline.some((entry) => entry.status === nextEvent.status);

    if (alreadyLogged) {
      return { success: true, data: order } as const;
    }

    await ctx.db.patch(args.orderId, {
      orderStatus: nextEvent.orderStatus,
      status: nextEvent.statusValue,
      buyerConfirmed: args.eventType === "return" ? true : order.buyerConfirmed,
      trackingTimeline: [...currentTimeline, createTrackingEvent(nextEvent.status, nextEvent.description)],
    });

    if (args.eventType === "return") {
      await applyCompletionMetrics(ctx, order);
    }
    await syncListingAvailability(ctx, order.listingId);

    return { success: true, data: { orderId: args.orderId, status: nextEvent.status } } as const;
  },
});

// PHASE 3: Asset Ledger Queries for Rental History
export const getAssetHistory = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .order("desc")
      .collect();

    const listing = await ctx.db.get(args.listingId);
    if (!listing) return [];

    const history = [];
    for (const order of orders) {
      if (order.orderStatus === "cancelled") continue; // Skip cancelled orders

      const renter = await resolveUser(ctx, order.buyerId);
      history.push({
        _id: order._id,
        listingId: order.listingId,
        renterName: renter?.name ?? "Anonymous Renter",
        renterEmail: renter?.email ?? "-",
        renterPhone: renter?.phone ?? renter?.phoneNumber ?? "-",
        renterAvatar: renter?.avatarUrl ?? renter?.imageUrl,
        startDate: order.rentalStartDate,
        endDate: order.rentalEndDate,
        status: order.orderStatus ?? "pending",
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
        razorpayPaymentId: order.razorpayPaymentId,
        razorpayOrderId: order.razorpayOrderId,
        invoiceUrl: order.invoiceUrl,
        dynamicPriceApplied: order.dynamicPriceApplied ?? 0,
        createdAt: order.createdAt,
      });
    }

    return history;
  },
});

export const getRentalStats = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .collect();

    const completedOrders = orders.filter(
      (order) =>
        order.orderStatus === "completed" ||
        order.orderStatus === "delivered" ||
        order.orderStatus === "placed" ||
        order.orderStatus === "shipped"
    );

    const totalRentals = completedOrders.length;
    const lifetimeEarnings = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const activeRentals = completedOrders.filter((order) =>
      order.orderStatus === "placed" ||
      order.orderStatus === "shipped" ||
      order.orderStatus === "delivered"
    ).length;
    const invoicesIssued = completedOrders.filter((order) => Boolean(order.invoiceUrl)).length;

    return {
      totalRentals,
      lifetimeEarnings,
      averageRevenue: totalRentals > 0 ? lifetimeEarnings / totalRentals : 0,
      activeRentals,
      invoicesIssued,
    };
  },
});
