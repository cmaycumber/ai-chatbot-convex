import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const getVotes = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const chatId = url.searchParams.get("chatId");

	if (!chatId) {
		return new Response("chatId is required", { status: 400 });
	}

	const identity = await ctx.auth.getUserIdentity();

	if (!identity?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	const votes = await ctx.runQuery(api.queries.getVotesByChatId, {
		id: chatId as Id<"chats">,
	});

	return Response.json(votes);
});

export const voteMessage = httpAction(async (ctx, request) => {
	const { chatId, messageId, type } = await request.json();

	if (!chatId || !messageId || !type) {
		return new Response("messageId and type are required", { status: 400 });
	}

	const identity = await ctx.auth.getUserIdentity();

	if (!identity?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	await ctx.runMutation(api.queries.voteMessage, {
		chatId,
		messageId,
		type,
	});

	return new Response("Message voted", { status: 200 });
});
