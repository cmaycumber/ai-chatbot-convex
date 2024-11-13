import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { DEFAULT_MODEL_NAME, models } from "@/ai/models";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { api } from "@/convex/_generated/api";
import { convex } from "@/lib/convex";
import { convertToUIMessages } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

export default async function Page(props: {
	params: Promise<{ id: Id<"chats"> }>;
}) {
	const params = await props.params;
	const { id } = params;

	const chat = await convex.query(api.queries.getChatById, { id });

	console.log("Chat: ", chat);

	if (!chat) {
		notFound();
	}

	// const user = await convex.query(api.queries.getCurrentUser);

	// console.log("User: ", user);

	// if (!user) {
	// 	return notFound();
	// }

	// if (user._id !== chat.userId) {
	// 	return notFound();
	// }

	const messages = await convex.query(api.queries.getMessagesByChatId, { id });

	const cookieStore = await cookies();
	const modelIdFromCookie = cookieStore.get("model-id")?.value;
	const selectedModelId =
		models.find((model) => model.id === modelIdFromCookie)?.id ||
		DEFAULT_MODEL_NAME;

	return (
		<PreviewChat
			id={chat._id}
			initialMessages={convertToUIMessages(messages)}
			selectedModelId={selectedModelId}
		/>
	);
}
