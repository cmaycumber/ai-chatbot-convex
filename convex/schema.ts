import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()),
  }),

  chats: defineTable({
    createdAt: v.number(),
    title: v.string(),
    userId: v.id("users"),
  }),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.string(),
    content: v.any(), // For JSON content
    createdAt: v.number(),
  }),

  votes: defineTable({
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    isUpvoted: v.boolean(),
  }).index("by_chat_message", ["chatId", "messageId"]),

  documents: defineTable({
    createdAt: v.number(),
    title: v.string(),
    content: v.optional(v.string()),
    userId: v.id("users"),
  }),

  suggestions: defineTable({
    documentId: v.id("documents"),
    documentCreatedAt: v.number(),
    originalText: v.string(),
    suggestedText: v.string(), 
    description: v.optional(v.string()),
    isResolved: v.boolean(),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_document", ["documentId", "documentCreatedAt"])
});
