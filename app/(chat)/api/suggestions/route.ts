import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const documentId = searchParams.get("documentId");

	if (!documentId) {
		return new Response("Not Found", { status: 404 });
	}

	const session = await auth();

	if (!session || !session.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const suggestions = await convex.query(
		api.queries.getSuggestionsByDocumentId,
		{
			documentId: documentId as Id<"documents">,
		},
	);

	const [suggestion] = suggestions;

	if (!suggestion) {
		return Response.json([], { status: 200 });
	}

	if (suggestion.userId !== session.user.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	return Response.json(suggestions, { status: 200 });
}
