import { auth } from '@/app/(auth)/auth';
import { api } from '@/convex/_generated/api';
import { convex } from '@/lib/convex';

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const chats = await convex.query(api.queries.getChatsByUserId, {
    userId: session.user.id,
  });

  return Response.json(chats);
}
