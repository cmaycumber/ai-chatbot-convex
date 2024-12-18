"use client";

import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useWindowSize } from "usehooks-ts";

import { ChatHeader } from "@/components/custom/chat-header";
import { PreviewMessage, ThinkingMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import type { Vote } from "@/db/schema";
import { fetcher } from "@/lib/utils";

import { Block, type UIBlock } from "./block";
import { BlockStreamHandler } from "./block-stream-handler";
import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";
import type { Id } from "@/convex/_generated/dataModel";

export function Chat({
	id: initialId,
	initialMessages,
	selectedModelId,
}: {
	initialMessages: Array<Message>;
	selectedModelId: string;
	id?: Id<"chats">;
}) {
	const [id, setId] = useState<Id<"chats"> | undefined>(initialId ?? undefined);
	const { mutate } = useSWRConfig();

	const {
		messages,
		setMessages,
		handleSubmit,
		input,
		setInput,
		append,
		isLoading,
		stop,
		data: streamingData,
	} = useChat({
		body: { id, modelId: selectedModelId },
		initialMessages,
		onFinish: () => {
			mutate("/api/history");
		},
		// Set chat id from response headers
		onResponse: (response) => {
			const chatId = response.headers.get("chat-id");

			if (chatId) {
				setId(chatId as Id<"chats">);
				window.history.replaceState({}, "", `/chat/${chatId}`);
			}
		},
	});

	const { width: windowWidth = 1920, height: windowHeight = 1080 } =
		useWindowSize();

	const [block, setBlock] = useState<UIBlock>({
		documentId: "init",
		content: "",
		title: "",
		status: "idle",
		isVisible: false,
		boundingBox: {
			top: windowHeight / 4,
			left: windowWidth / 4,
			width: 250,
			height: 50,
		},
	});

	const { data: votes } = useSWR<Array<Vote>>(
		`/api/vote?chatId=${id}`,
		fetcher,
	);

	const [messagesContainerRef, messagesEndRef] =
		useScrollToBottom<HTMLDivElement>();

	const [attachments, setAttachments] = useState<Array<Attachment>>([]);

	return (
		<>
			<div className="flex h-dvh min-w-0 flex-col bg-background">
				<ChatHeader selectedModelId={selectedModelId} />
				<div
					ref={messagesContainerRef}
					className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4"
				>
					{messages.length === 0 && <Overview />}

					{messages.map((message, index) => (
						<PreviewMessage
							key={message.id}
							chatId={id}
							message={message}
							block={block}
							setBlock={setBlock}
							isLoading={isLoading && messages.length - 1 === index}
							vote={
								votes
									? votes.find((vote) => vote.messageId === message.id)
									: undefined
							}
						/>
					))}

					{isLoading &&
						messages.length > 0 &&
						messages[messages.length - 1].role === "user" && (
							<ThinkingMessage />
						)}

					<div
						ref={messagesEndRef}
						className="min-h-[24px] min-w-[24px] shrink-0"
					/>
				</div>
				<form className="mx-auto flex w-full gap-2 bg-background px-4 pb-4 md:max-w-3xl md:pb-6">
					<MultimodalInput
						chatId={id}
						input={input}
						setInput={setInput}
						handleSubmit={handleSubmit}
						isLoading={isLoading}
						stop={stop}
						attachments={attachments}
						setAttachments={setAttachments}
						messages={messages}
						setMessages={setMessages}
						append={append}
					/>
				</form>
			</div>

			<AnimatePresence>
				{block?.isVisible && (
					<Block
						chatId={id}
						input={input}
						setInput={setInput}
						handleSubmit={handleSubmit}
						isLoading={isLoading}
						stop={stop}
						attachments={attachments}
						setAttachments={setAttachments}
						append={append}
						block={block}
						setBlock={setBlock}
						messages={messages}
						setMessages={setMessages}
						votes={votes}
					/>
				)}
			</AnimatePresence>

			<BlockStreamHandler streamingData={streamingData} setBlock={setBlock} />
		</>
	);
}
