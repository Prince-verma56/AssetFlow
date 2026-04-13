import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const createOrder = mutation({
  args: {
    clerkId: v.optional(v.string()),
    buyerId: v.optional(v.string()),
    farmerId: v.optional(v.string()),
    listingId: v.id("listings"),
    totalAmount: v.number(),
    paymentId: v.optional(v.string()),
    razorpayOrderId: v.optional(v.string()),
    quantity: v.optional(v.union(v.string(), v.number())),
    unit: v.optional(v.string()),
    type: v.optional(v.union(v.literal("sample"), v.literal("bulk"))),
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
        status: "escrow",
        type: args.type,
        quantity: args.quantity,
        unit: args.unit,
        buyerConfirmed: false,
        escrowReleaseAt: Date.now() + 72 * 60 * 60 * 1000,
        deliveryAddress: args.deliveryAddress,
        createdAt: Date.now(),
        orderStatus: "placed",
      });

      return created;
    }

    if (!args.clerkId || !args.paymentId || !args.razorpayOrderId || typeof args.quantity !== "string") {
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

    // Reduce stock slightly simply
    const oldStockStr = String(listing.quantity || "0").replace(/[^\d.]/g, "");
    const purStockStr = String(args.quantity || "0").replace(/[^\d.]/g, "");
    
    let oldStockNum = Number.parseFloat(oldStockStr);
    let purStockNum = Number.parseFloat(purStockStr);
    
    if (!Number.isNaN(oldStockNum) && !Number.isNaN(purStockNum)) {
       let newStock = oldStockNum - purStockNum;
       if (newStock < 0) newStock = 0;
       
       let newStatus = listing.status;
       if (newStock <= 0) {
           newStatus = "sold";
       }
       
       // Note: Keeping unit (e.g. quintal, kg) intact if we can, but fallback string approach for now
       await ctx.db.patch(listing._id, {
           quantity: String(newStock) + " " + (listing.quantity.replace(/[\d.\s]/g, "")).trim(),
           status: newStatus
       });
    }

    return await ctx.db.insert("orders", {
      listingId: listing._id,
      buyerId: buyer._id,
      farmerId: listing.farmerId,
      totalAmount: args.totalAmount,
      paymentStatus: "paid",
      paymentId: args.paymentId,
      razorpayOrderId: args.razorpayOrderId,
      orderStatus: "placed",
      status: "escrow",
      type: "bulk",
      quantity: Number.parseFloat(String(args.quantity).replace(/[^\d.]/g, "")) || 0,
      unit: "kg",
      buyerConfirmed: false,
      escrowReleaseAt: Date.now() + 72 * 60 * 60 * 1000,
      createdAt: Date.now(),
      deliveryAddress: args.deliveryAddress,
      latitude: args.latitude,
      longitude: args.longitude,
    });
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
      .collect();

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
        cropName: listing?.cropName || "Direct Farm Purchase",
        farmerName: farmerUser?.name || "Verified Farmer",
        farmerEmail: farmerUser?.email || "contact@farmdirect.com",
        farmerPhone: farmerUser?.phone || "Phone Hidden",
        farmerImage: farmerUser?.imageUrl,
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
      .collect();
      
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
        cropName: listing?.cropName || "Direct Farm Purchase",
        buyerName: buyerUser?.name || "Anonymous Buyer",
        buyerEmail: buyerUser?.email || "-",
        buyerPhone: buyerUser?.phone || "No Contact",
        buyerImage: buyerUser?.imageUrl,
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
        cropName: listing?.cropName || "Direct Farm Purchase",
        quantity: listing?.quantity || "Various",
        location: listing?.location || "Unknown",
        farmerName: farmerUser?.name || "Verified Farmer",
        farmerEmail: farmerUser?.email || "contact@farmdirect.com",
        buyerName: buyerUser?.name || "Buyer",
        buyerEmail: buyerUser?.email || "-",
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
    const normalizedStatus =
      args.orderStatus === "placed"
        ? "escrow"
        : args.orderStatus === "cancelled"
          ? "disputed"
          : args.orderStatus;

    await ctx.db.patch(args.orderId, {
      orderStatus: args.orderStatus,
      status: normalizedStatus,
      buyerConfirmed: args.orderStatus === "completed" ? true : undefined,
    });
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
      orderStatus: "delivered",
      buyerConfirmed: args.buyerConfirmed ?? true,
      escrowReleaseAt: Date.now(),
    });

    return { success: true, data: { orderId: args.orderId } } as const;
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
        buyerImage: buyerUser?.imageUrl,
        cropName: listing?.cropName ?? "Crop",
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
          lat: farmer.lat ?? null,
          lng: farmer.lng ?? null,
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
