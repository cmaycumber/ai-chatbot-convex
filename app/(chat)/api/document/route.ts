import { auth } from '@/app/(auth)/auth';
import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const document = await convex.query(api.queries.getDocumentById, { id });

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json([document], { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { content, title }: { content: string; title: string } =
    await request.json();

  if (session.user && session.user.id) {
    const document = await convex.mutation(api.queries.saveDocument, {
      id,
      content,
      title,
      userId: session.user.id,
    });

    return Response.json(document, { status: 200 });
  } else {
    return new Response('Unauthorized', { status: 401 });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const document = await convex.query(api.queries.getDocumentById, { id });

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await convex.mutation(api.queries.deleteDocumentsByIdAfterTimestamp, {
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('Deleted', { status: 200 });
}
