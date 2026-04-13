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
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "unknown",
      clerkId: identity.subject,
      role: args.role,
      roles: ["farmer", "buyer"],
      hasOnboarded: false,
      imageUrl: identity.pictureUrl,
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      const roles = normalizeRoles(existing.roles, args.role);
      await ctx.db.patch(existing._id, {
        role: args.role,
        roles,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      role: args.role,
      roles: ["farmer", "buyer"],
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
      hasOnboarded: true,
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
            lat: user.lat ?? null,
            lng: user.lng ?? null,
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const resolvedClerkId = identity?.subject ?? args.clerkId;
    const resolvedName = identity?.name ?? args.name ?? "Anonymous";
    const resolvedEmail = identity?.email ?? args.email ?? "unknown@example.com";
    const resolvedImage = identity?.pictureUrl ?? args.imageUrl;

    if (!resolvedClerkId) {
      return { success: false, error: "Unauthenticated" } as const;
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", resolvedClerkId))
      .unique();

    if (existing) {
      const roles = normalizeRoles(existing.roles, args.role);
      await ctx.db.patch(existing._id, {
        role: args.role,
        roles,
        hasOnboarded: true,
      });
      return { success: true, data: { id: existing._id, role: args.role } } as const;
    }

    const id = await ctx.db.insert("users", {
      name: resolvedName,
      email: resolvedEmail,
      clerkId: resolvedClerkId,
      role: args.role,
      roles: ["farmer", "buyer"],
      hasOnboarded: true,
      imageUrl: resolvedImage,
    });

    return { success: true, data: { id, role: args.role } } as const;
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
