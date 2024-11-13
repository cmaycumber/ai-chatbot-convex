import {
	convertToCoreMessages,
	type Message,
	StreamData,
	streamObject,
	streamText,
} from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { models } from "@/ai/models";
import { blocksPrompt, regularPrompt, systemPrompt } from "@/ai/prompts";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
// import { Suggestion } from '@/db/schema';

import {
	generateUUID,
	getMostRecentUserMessage,
	sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

const TEMP_USER_ID = "js754cvywn95aq28skb6qtsb6574g0bh" as Id<"users">;

type AllowedTools =
	| "createDocument"
	| "updateDocument"
	| "requestSuggestions"
	| "getWeather";

const blocksTools: AllowedTools[] = [
	"createDocument",
	"updateDocument",
	"requestSuggestions",
];

const weatherTools: AllowedTools[] = ["getWeather"];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

export async function POST(request: Request) {
	const {
		id,
		messages,
		modelId,
	}: { id: string; messages: Array<Message>; modelId: string } =
		await request.json();

	const session = await auth();

	const token = await convexAuthNextjsToken();

	// if (!session || !session.user || !userId) {
	// 	return new Response("Unauthorized", { status: 401 });
	// }

	const model = models.find((model) => model.id === modelId);

	if (!model) {
		return new Response("Model not found", { status: 404 });
	}

	const coreMessages = convertToCoreMessages(messages);
	const userMessage = getMostRecentUserMessage(coreMessages);

	if (!userMessage) {
		return new Response("No user message found", { status: 400 });
	}

	const chat = id
		? await convex.query(api.queries.getChatById, {
				id: id as Id<"chats">,
			})
		: undefined;

	const userId = TEMP_USER_ID;

	let chatId: Id<"chats"> | undefined = chat?._id;
	if (!chatId) {
		const title = await generateTitleFromUserMessage({ message: userMessage });

		chatId = await convex.mutation(api.queries.saveChat, {
			userId: userId,
			title,
		});
	}

	await convex.mutation(api.queries.saveMessages, {
		messages: [
			{
				...userMessage,
				chatId: chatId,
			},
		],
	});

	const streamingData = new StreamData();

	const result = await streamText({
		model: customModel(model.apiIdentifier),
		system: systemPrompt,
		messages: coreMessages,
		maxSteps: 5,
		experimental_activeTools: allTools,
		tools: {
			getWeather: {
				description: "Get the current weather at a location",
				parameters: z.object({
					latitude: z.number(),
					longitude: z.number(),
				}),
				execute: async ({ latitude, longitude }) => {
					const response = await fetch(
						`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
					);

					const weatherData = await response.json();
					return weatherData;
				},
			},
			createDocument: {
				description: "Create a document for a writing activity",
				parameters: z.object({
					title: z.string(),
				}),
				execute: async ({ title }) => {
					const id = generateUUID();
					let draftText = "";

					streamingData.append({
						type: "id",
						content: id,
					});

					streamingData.append({
						type: "title",
						content: title,
					});

					streamingData.append({
						type: "clear",
						content: "",
					});

					const { fullStream } = await streamText({
						model: customModel(model.apiIdentifier),
						system:
							"Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
						prompt: title,
					});

					for await (const delta of fullStream) {
						const { type } = delta;

						if (type === "text-delta") {
							const { textDelta } = delta;

							draftText += textDelta;
							streamingData.append({
								type: "text-delta",
								content: textDelta,
							});
						}
					}

					streamingData.append({ type: "finish", content: "" });

					if (userId) {
						await convex.mutation(api.queries.saveDocument, {
							id,
							title,
							content: draftText,
							userId: userId,
						});
					}

					return {
						id,
						title,
						content: "A document was created and is now visible to the user.",
					};
				},
			},
			updateDocument: {
				description: "Update a document with the given description",
				parameters: z.object({
					id: z.string().describe("The ID of the document to update"),
					description: z
						.string()
						.describe("The description of changes that need to be made"),
				}),
				execute: async ({ id, description }) => {
					const document = await convex.query(api.queries.getDocumentById, {
						id,
					});

					if (!document) {
						return {
							error: "Document not found",
						};
					}

					const { content: currentContent } = document;
					let draftText = "";

					streamingData.append({
						type: "clear",
						content: document.title,
					});

					const { fullStream } = await streamText({
						model: customModel(model.apiIdentifier),
						system:
							"You are a helpful writing assistant. Based on the description, please update the piece of writing.",
						// experimental_providerMetadata: {
						// 	openai: {
						// 		prediction: {
						// 			type: "content",
						// 			content: currentContent,
						// 		},
						// 	},
						// },
						messages: [
							{
								role: "user",
								content: description,
							},
							{ role: "user", content: currentContent },
						],
					});

					for await (const delta of fullStream) {
						const { type } = delta;

						if (type === "text-delta") {
							const { textDelta } = delta;

							draftText += textDelta;
							streamingData.append({
								type: "text-delta",
								content: textDelta,
							});
						}
					}

					streamingData.append({ type: "finish", content: "" });

					if (userId) {
						await convex.mutation(api.queries.saveDocument, {
							id,
							title: document.title,
							content: draftText,
							userId: userId,
						});
					}

					return {
						id,
						title: document.title,
						content: "The document has been updated successfully.",
					};
				},
			},
			requestSuggestions: {
				description: "Request suggestions for a document",
				parameters: z.object({
					documentId: z
						.string()
						.describe("The ID of the document to request edits"),
				}),
				execute: async ({ documentId }) => {
					const document = await convex.query(api.queries.getDocumentById, {
						id: documentId,
					});

					if (!document || !document.content) {
						return {
							error: "Document not found",
						};
					}

					const suggestions: Array<
						Omit<
							Doc<"suggestions">,
							"userId" | "_creationTime" | "documentCreatedTime" | "_id"
						>
					> = [];

					const { elementStream } = await streamObject({
						model: customModel(model.apiIdentifier),
						system:
							"You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
						prompt: document.content,
						output: "array",
						schema: z.object({
							originalSentence: z.string().describe("The original sentence"),
							suggestedSentence: z.string().describe("The suggested sentence"),
							description: z
								.string()
								.describe("The description of the suggestion"),
						}),
					});

					for await (const element of elementStream) {
						const suggestion: Omit<
							Doc<"suggestions">,
							"userId" | "_creationTime" | "_id" | "documentCreatedTime"
						> = {
							originalText: element.originalSentence,
							suggestedText: element.suggestedSentence,
							description: element.description,
							documentId: documentId as Id<"documents">,
							isResolved: false,
						};

						streamingData.append({
							type: "suggestion",
							content: suggestion,
						});

						suggestions.push(suggestion);
					}

					const userId = TEMP_USER_ID;

					if (userId) {
						await convex.mutation(api.queries.saveSuggestions, {
							suggestions: suggestions.map((suggestion) => ({
								...suggestion,
								userId,
								documentCreatedTime: document._creationTime,
							})),
						});
					}

					return {
						id: documentId,
						title: document.title,
						message: "Suggestions have been added to the document",
					};
				},
			},
		},
		onFinish: async ({ responseMessages }) => {
			if (userId) {
				try {
					const responseMessagesWithoutIncompleteToolCalls =
						sanitizeResponseMessages(responseMessages);

					await convex.mutation(api.queries.saveMessages, {
						messages: responseMessagesWithoutIncompleteToolCalls.map(
							(message) => ({
								chatId: chatId as Id<"chats">,
								role: message.role,
								content: message.content,
							}),
						),
					});
				} catch (error) {
					console.error("Failed to save chat");
				}
			}

			streamingData.close();
		},
		experimental_telemetry: {
			isEnabled: true,
			functionId: "stream-text",
		},
	});

	return result.toDataStreamResponse({
		data: streamingData,
		headers: {
			"chat-id": chatId,
		},
	});
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return new Response("Not Found", { status: 404 });
	}

	const session = await auth();

	if (!session || !session.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const userId = TEMP_USER_ID;

	try {
		const chat = await convex.query(api.queries.getChatById, {
			id: id as Id<"chats">,
		});

		if (chat?.userId !== userId) {
			return new Response("Unauthorized", { status: 401 });
		}

		await convex.mutation(api.queries.deleteChatById, {
			id: id as Id<"chats">,
		});

		return new Response("Chat deleted", { status: 200 });
	} catch (error) {
		return new Response("An error occurred while processing your request", {
			status: 500,
		});
	}
}
