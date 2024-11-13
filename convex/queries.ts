import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getUser = query({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		return await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("email"), email))
			.collect();
	},
});

export const getUserByToken = query({
	args: { id: v.string() },
	handler: async (ctx, { id }) => {
		return await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("_id"), id))
			.first();
	},
});

// Probably remove this...
export const createUser = mutation({
	args: {
		email: v.string(),
	},
	handler: async (ctx, { email }) => {
		return await ctx.db.insert("users", {
			email,
		});
	},
});

export const saveChat = mutation({
	args: {
		userId: v.id("users"),
		title: v.string(),
	},
	handler: async (ctx, { userId, title }) => {
		return await ctx.db.insert("chats", {
			userId,
			title,
		});
	},
});

export const createChat = mutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, { userId }) => {
		return await ctx.db.insert("chats", {
			userId,
			title: "",
		});
	},
});

export const deleteChatById = mutation({
	args: { id: v.id("chats") },
	handler: async (ctx, { id }) => {
		const votes = await ctx.db
			.query("votes")
			.filter((q) => q.eq(q.field("chatId"), id))
			.collect();

		for (const vote of votes) {
			await ctx.db.delete(vote._id);
		}

		const messages = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("chatId"), id))
			.collect();

		for (const message of messages) {
			await ctx.db.delete(message._id);
		}

		return await ctx.db.delete(id);
	},
});

export const getChatsByUserId = query({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		return await ctx.db
			.query("chats")
			.filter((q) => q.eq(q.field("userId"), userId))
			.order("desc")
			.collect();
	},
});

export const getChatById = query({
	args: { id: v.id("chats") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const saveMessages = mutation({
	args: {
		messages: v.array(
			v.object({
				chatId: v.id("chats"),
				role: v.string(),
				content: v.any(),
			}),
		),
	},
	handler: async (ctx, { messages }) => {
		const ids = [];
		for (const message of messages) {
			const id = await ctx.db.insert("messages", message);
			ids.push(id);
		}
		return ids;
	},
});

export const getMessagesByChatId = query({
	args: { id: v.id("chats") },
	handler: async (ctx, { id }) => {
		return await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("chatId"), id))
			.order("asc")
			.collect();
	},
});

export const voteMessage = mutation({
	args: {
		chatId: v.id("chats"),
		messageId: v.id("messages"),
		type: v.union(v.literal("up"), v.literal("down")),
	},
	handler: async (ctx, { chatId, messageId, type }) => {
		const existingVotes = await ctx.db
			.query("votes")
			.filter((q) =>
				q.and(
					q.eq(q.field("chatId"), chatId),
					q.eq(q.field("messageId"), messageId),
				),
			)
			.collect();

		if (existingVotes.length > 0) {
			return await ctx.db.patch(existingVotes[0]._id, {
				isUpvoted: type === "up",
			});
		}
		return await ctx.db.insert("votes", {
			chatId,
			messageId,
			isUpvoted: type === "up",
		});
	},
});

export const getVotesByChatId = query({
	args: { id: v.id("chats") },
	handler: async (ctx, { id }) => {
		return await ctx.db
			.query("votes")
			.filter((q) => q.eq(q.field("chatId"), id))
			.collect();
	},
});

export const saveDocument = mutation({
	args: {
		id: v.string(),
		title: v.string(),
		content: v.string(),
		userId: v.id("users"),
	},
	handler: async (ctx, { id, title, content, userId }) => {
		return await ctx.db.insert("documents", {
			title,
			content,
			userId,
		});
	},
});

export const getDocumentsById = query({
	args: { id: v.id("documents") },
	handler: async (ctx, { id }) => {
		return await ctx.db
			.query("documents")
			.filter((q) => q.eq(q.field("_id"), id))
			.order("asc")
			.collect();
	},
});

export const getDocumentById = query({
	args: { id: v.id("documents") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const deleteDocumentsByIdAfterTimestamp = mutation({
	args: {
		id: v.id("documents"),
		timestamp: v.number(),
	},
	handler: async (ctx, { id, timestamp }) => {
		const suggestions = await ctx.db
			.query("suggestions")
			.filter((q) =>
				q.and(
					q.eq(q.field("documentId"), id),
					q.gt(q.field("documentCreatedTime"), timestamp),
				),
			)
			.collect();

		for (const suggestion of suggestions) {
			await ctx.db.delete(suggestion._id);
		}

		const documents = await ctx.db
			.query("documents")
			.filter((q) =>
				q.and(
					q.eq(q.field("_id"), id),
					q.gt(q.field("_creationTime"), timestamp),
				),
			)
			.collect();

		for (const document of documents) {
			await ctx.db.delete(document._id);
		}
	},
});

export const saveSuggestions = mutation({
	args: {
		suggestions: v.array(
			v.object({
				documentId: v.id("documents"),
				documentCreatedTime: v.number(),
				originalText: v.string(),
				suggestedText: v.string(),
				description: v.optional(v.string()),
				isResolved: v.boolean(),
				userId: v.id("users"),
			}),
		),
	},
	handler: async (ctx, { suggestions }) => {
		const ids = [];
		for (const suggestion of suggestions) {
			const id = await ctx.db.insert("suggestions", suggestion);
			ids.push(id);
		}
		return ids;
	},
});

export const getSuggestionsByDocumentId = query({
	args: { documentId: v.id("documents") },
	handler: async (ctx, { documentId }) => {
		return await ctx.db
			.query("suggestions")
			.filter((q) => q.eq(q.field("documentId"), documentId))
			.collect();
	},
});
