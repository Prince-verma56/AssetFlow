import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type AppRole = "farmer" | "buyer";

function normalizeRoles(input: Array<AppRole> | undefined, fallbackRole: AppRole | null): AppRole[] {
  const unique = new Set<AppRole>();
  for (const role of input ?? []) unique.add(role);
  if (fallbackRole) unique.add(fallbackRole);
  if (unique.size === 0) {
    unique.add("farmer");
    unique.add("buyer");
  }
  return Array.from(unique);
}

export const storeUser = mutation({
  args: { role: v.union(v.literal("farmer"), v.literal("buyer")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Called storeUser without authentication");

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user !== null) {
      return user._id; // User pehle se hai
    }

    // Naya user create karo
    const defaultRole: AppRole = args.role ?? "buyer";

    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "unknown",
      clerkId: identity.subject,
      role: defaultRole,
      roles: ["farmer", "buyer"],
      hasOnboarded: true,
      imageUrl: identity.pictureUrl,
      avatarUrl: identity.pictureUrl,
      kycVerified: false,
      joinedAt: Date.now(),
      trustScore: 72,
      followerCount: 0,
      lifetimeCompletedOrders: 0,
    });
  },
});

export const getRoleByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    return {
      exists: Boolean(user),
      role: user?.role ?? null,
      roles: normalizeRoles(
        user?.roles as Array<AppRole> | undefined,
        (user?.role as AppRole | undefined) ?? null
      ),
      id: user?._id ?? null,
    };
  },
});

export const upsertRoleByClerkId = mutation({
  args: {
    clerkId: v.string(),
    role: v.union(v.literal("farmer"), v.literal("buyer")),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nextRole: AppRole = args.role ?? "buyer";
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      const roles = normalizeRoles(existing.roles, nextRole);
      await ctx.db.patch(existing._id, {
        role: nextRole,
        roles,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        avatarUrl: args.avatarUrl ?? args.imageUrl,
        kycVerified: existing.kycVerified ?? false,
        joinedAt: existing.joinedAt ?? Date.now(),
        followerCount: existing.followerCount ?? 0,
        lifetimeCompletedOrders: existing.lifetimeCompletedOrders ?? 0,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      role: nextRole,
      roles: ["farmer", "buyer"],
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      avatarUrl: args.avatarUrl ?? args.imageUrl,
      hasOnboarded: true,
      kycVerified: false,
      joinedAt: Date.now(),
      trustScore: 72,
      followerCount: 0,
      lifetimeCompletedOrders: 0,
    });
  },
});
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updatePhone = mutation({
  args: { clerkId: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { phone: args.phone });
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    return {
      success: true,
      data: user
        ? {
            id: user._id,
            clerkId: user.clerkId,
            role: user.role ?? null,
            roles: normalizeRoles(
              user.roles as Array<AppRole> | undefined,
              (user.role as AppRole | undefined) ?? null
            ),
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl ?? user.imageUrl ?? null,
            phoneNumber: user.phoneNumber ?? user.phone ?? null,
            bio: user.bio ?? null,
            address: user.address ?? null,
            cityRegion: user.cityRegion ?? null,
            primaryUseCase: user.primaryUseCase ?? null,
            businessName: user.businessName ?? null,
            pickupLocation: user.pickupLocation ?? null,
            kycVerified: user.kycVerified ?? false,
            joinedAt: user.joinedAt ?? user._creationTime ?? null,
            trustScore: user.trustScore ?? 72,
            followerCount: user.followerCount ?? 0,
            lifetimeCompletedOrders: user.lifetimeCompletedOrders ?? 0,
            lat: user.lat ?? null,
            lng: user.lng ?? null,
            location: user.location ?? null,
            locationUpdatedAt: user.locationUpdatedAt ?? null,
          }
        : null,
    } as const;
  },
});

export const setUserRole = mutation({
  args: {
    role: v.union(v.literal("farmer"), v.literal("buyer")),
    clerkId: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nextRole: AppRole = args.role ?? "buyer";
    const identity = await ctx.auth.getUserIdentity();
    const resolvedClerkId = identity?.subject ?? args.clerkId;
    const resolvedName = identity?.name ?? args.name ?? "Anonymous";
    const resolvedEmail = identity?.email ?? args.email ?? "unknown@example.com";
    const resolvedImage = identity?.pictureUrl ?? args.imageUrl;
    const resolvedAvatar = identity?.pictureUrl ?? args.avatarUrl ?? args.imageUrl;

    if (!resolvedClerkId) {
      return { success: false, error: "Unauthenticated" } as const;
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", resolvedClerkId))
      .unique();

    if (existing) {
      const roles = normalizeRoles(existing.roles, nextRole);
      await ctx.db.patch(existing._id, {
        role: nextRole,
        roles,
        hasOnboarded: true,
        avatarUrl: existing.avatarUrl ?? resolvedAvatar,
        trustScore: existing.trustScore ?? 72,
        followerCount: existing.followerCount ?? 0,
        lifetimeCompletedOrders: existing.lifetimeCompletedOrders ?? 0,
      });
      return { success: true, data: { id: existing._id, role: nextRole } } as const;
    }

    const id = await ctx.db.insert("users", {
      name: resolvedName,
      email: resolvedEmail,
      clerkId: resolvedClerkId,
      role: nextRole,
      roles: ["farmer", "buyer"],
      hasOnboarded: true,
      imageUrl: resolvedImage,
      avatarUrl: resolvedAvatar,
      kycVerified: false,
      joinedAt: Date.now(),
      trustScore: 72,
      followerCount: 0,
      lifetimeCompletedOrders: 0,
    });

    return { success: true, data: { id, role: nextRole } } as const;
  },
});

export const updateUserLocation = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthenticated" } as const;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { success: false, error: "User not found" } as const;
    }

    const roundedLat = Number(args.lat.toFixed(2));
    const roundedLng = Number(args.lng.toFixed(2));

    await ctx.db.patch(user._id, {
      lat: roundedLat,
      lng: roundedLng,
      location: {
        lat: roundedLat,
        lng: roundedLng,
      },
      locationUpdatedAt: Date.now(),
    });

    return {
      success: true,
      data: {
        lat: roundedLat,
        lng: roundedLng,
      },
    } as const;
  },
});

export const getUsersNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radiusKm = Math.min(Math.max(args.radiusKm ?? 50, 1), 200);
    const users = await ctx.db.query("users").take(400);

    const points: Array<{ lat: number; lng: number; count: number }> = [];

    for (const user of users) {
      if (user.lat === undefined || user.lng === undefined) continue;
      const kmPerLat = 111;
      const kmPerLng = 111 * Math.cos((args.lat * Math.PI) / 180);
      const dLat = (user.lat - args.lat) * kmPerLat;
      const dLng = (user.lng - args.lng) * kmPerLng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      if (distance <= radiusKm) {
        points.push({
          lat: user.lat,
          lng: user.lng,
          count: user.role === "buyer" ? 2 : 1,
        });
      }
    }

    return { success: true, data: points } as const;
  },
});

export const toggleRole = mutation({
  args: {
    clerkId: v.string(),
    targetRole: v.optional(v.union(v.literal("farmer"), v.literal("buyer"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!existing) {
      return { success: false, error: "User not found" } as const;
    }

    const currentRole = (existing.role as AppRole | undefined) ?? "buyer";
    const nextRole = args.targetRole ?? (currentRole === "farmer" ? "buyer" : "farmer");
    const roles = normalizeRoles(existing.roles as Array<AppRole> | undefined, nextRole);

    await ctx.db.patch(existing._id, {
      role: nextRole,
      roles,
      hasOnboarded: true,
    });

    return {
      success: true,
      data: {
        role: nextRole,
        roles,
      },
    } as const;
  },
});

export const updateProfile = mutation({
  args: {
    clerkId: v.string(),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    cityRegion: v.optional(v.string()),
    bio: v.optional(v.string()),
    address: v.optional(v.string()),
    primaryUseCase: v.optional(v.string()),
    businessName: v.optional(v.string()),
    pickupLocation: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return { success: false, error: "User not found" } as const;
    }

    const pickup = args.pickupLocation;

    await ctx.db.patch(user._id, {
      name: args.fullName,
      avatarUrl: args.avatarUrl ?? user.avatarUrl ?? user.imageUrl,
      imageUrl: args.avatarUrl ?? user.imageUrl,
      phoneNumber: args.phoneNumber,
      phone: args.phoneNumber ?? user.phone,
      cityRegion: args.cityRegion,
      bio: args.bio,
      address: args.address,
      primaryUseCase: args.primaryUseCase,
      businessName: args.businessName,
      pickupLocation: pickup,
      location: pickup ?? user.location,
      lat: pickup?.lat ?? user.lat,
      lng: pickup?.lng ?? user.lng,
      locationUpdatedAt: pickup ? Date.now() : user.locationUpdatedAt,
      joinedAt: user.joinedAt ?? user._creationTime,
      kycVerified: user.kycVerified ?? false,
      followerCount: user.followerCount ?? 0,
      lifetimeCompletedOrders: user.lifetimeCompletedOrders ?? 0,
    });

    return { success: true, data: { userId: user._id } } as const;
  },
});
