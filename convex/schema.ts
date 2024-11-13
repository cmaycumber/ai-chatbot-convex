import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
	...authTables,

	chats: defineTable({
		title: v.string(),
		userId: v.id("users"),
	}),

	messages: defineTable({
		chatId: v.id("chats"),
		role: v.string(),
		content: v.any(), // For JSON content
	}),

	votes: defineTable({
		chatId: v.id("chats"),
		messageId: v.id("messages"),
		isUpvoted: v.boolean(),
	}).index("by_chat_message", ["chatId", "messageId"]),

	documents: defineTable({
		title: v.string(),
		content: v.optional(v.string()),
		userId: v.id("users"),
	}),

	suggestions: defineTable({
		documentId: v.id("documents"),
		documentCreatedTime: v.number(),
		originalText: v.string(),
		suggestedText: v.string(),
		description: v.optional(v.string()),
		isResolved: v.boolean(),
		userId: v.id("users"),
	}).index("by_document", ["documentId", "documentCreatedTime"]),
});
