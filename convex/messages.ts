import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    listingId: v.id("listings"),
    senderId: v.string(),
    receiverId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (!trimmed) {
      return { success: false, error: "Message cannot be empty." } as const;
    }

    const id = await ctx.db.insert("messages", {
      listingId: args.listingId,
      senderId: args.senderId,
      receiverId: args.receiverId,
      text: trimmed,
      createdAt: Date.now(),
    });

    return { success: true, data: { id } } as const;
  },
});

export const getMessages = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_listing_and_createdAt", (q) => q.eq("listingId", args.listingId))
      .order("asc")
      .take(500);

    return { success: true, data: messages } as const;
  },
});

