import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

async function resolveOwner(ctx: QueryCtx | MutationCtx, ownerId: string) {
  try {
    const byId = await ctx.db.get(ownerId as Id<"users">);
    if (byId) return byId as Doc<"users">;
  } catch {
    // Fall through to Clerk lookup.
  }

  return (await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", ownerId))
    .unique()) as Doc<"users"> | null;
}

export const toggleFollow = mutation({
  args: {
    followerId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_ownerId", (q) => q.eq("followerId", args.followerId).eq("ownerId", args.ownerId))
      .unique();

    const owner = await resolveOwner(ctx, args.ownerId);
    if (!owner) {
      throw new Error("Owner not found");
    }

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(owner._id, {
        followerCount: Math.max(0, (owner.followerCount ?? 0) - 1),
      });
      return { following: false, followerCount: Math.max(0, (owner.followerCount ?? 0) - 1) } as const;
    }

    await ctx.db.insert("follows", {
      followerId: args.followerId,
      followingId: args.ownerId,
      ownerId: args.ownerId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(owner._id, {
      followerCount: (owner.followerCount ?? 0) + 1,
    });

    return { following: true, followerCount: (owner.followerCount ?? 0) + 1 } as const;
  },
});

export const isFollowing = query({
  args: {
    followerId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_ownerId", (q) => q.eq("followerId", args.followerId).eq("ownerId", args.ownerId))
      .unique();

    return { following: Boolean(existing) } as const;
  },
});

export const getFollowerCount = query({
  args: {
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const owner = await resolveOwner(ctx, args.ownerId);
    return { followerCount: owner?.followerCount ?? 0 } as const;
  },
});
