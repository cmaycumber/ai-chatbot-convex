import { httpRouter } from 'convex/server';
import { Id } from './_generated/dataModel';
import { api, internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { z } from 'zod';

const http = httpRouter();

// Chat endpoints
http.route({
  path: '/api/chat',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const { id, messages, modelId } = await request.json();
    // Implementation would go here
    // This is a complex endpoint that requires streaming and AI integration
    // You may want to implement this differently or keep it in Next.js
    return new Response('Not implemented', { status: 501 });
  }),
});

http.route({
  path: '/api/chat',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response('Not Found', { status: 404 });
    }

    const chat = await ctx.runQuery(internal.queries.getChatById, { id });
    if (!chat) {
      return new Response('Not Found', { status: 404 });
    }

    await ctx.runMutation(internal.queries.deleteChatById, { id });
    return new Response('Chat deleted', { status: 200 });
  }),
});

// Document endpoints
http.route({
  path: '/api/document',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response('Missing id', { status: 400 });
    }

    const document = await ctx.runQuery(api.queries.getDocumentById, {
      id,
    });

    if (!document) {
      return new Response('Not Found', { status: 404 });
    }

    return Response.json([document], { status: 200 });
  }),
});

http.route({
  path: '/api/document',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response('Missing id', { status: 400 });
    }

    const { content, title } = await request.json();

    const document = await ctx.runMutation(internal.queries.saveDocument, {
      id,
      content,
      title,
      userId: '', // You'll need to get the userId from the auth context
    });

    return Response.json(document, { status: 200 });
  }),
});

// History endpoint
http.route({
  path: '/api/history',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // You'll need to get the userId from the auth context
    const userId = '';
    const chats = await ctx.runQuery(internal.queries.getChatsByUserId, {
      userId,
    });

    return Response.json(chats);
  }),
});

// Suggestions endpoint
http.route({
  path: '/api/suggestions',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const documentId = url.searchParams.get('documentId');

    if (!documentId) {
      return new Response('Not Found', { status: 404 });
    }

    const suggestions = await ctx.runQuery(
      internal.queries.getSuggestionsByDocumentId,
      { documentId }
    );

    return Response.json(suggestions, { status: 200 });
  }),
});

// Vote endpoints
http.route({
  path: '/api/vote',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');

    if (!chatId) {
      return new Response('chatId is required', { status: 400 });
    }

    const votes = await ctx.runQuery(internal.queries.getVotesByChatId, {
      id: chatId,
    });

    return Response.json(votes, { status: 200 });
  }),
});

http.route({
  path: '/api/vote',
  method: 'PATCH',
  handler: httpAction(async (ctx, request) => {
    const { chatId, messageId, type } = await request.json();

    if (!chatId || !messageId || !type) {
      return new Response('messageId and type are required', { status: 400 });
    }

    await ctx.runMutation(internal.queries.voteMessage, {
      chatId,
      messageId,
      type,
    });

    return new Response('Message voted', { status: 200 });
  }),
});

// File upload endpoint
const FileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine(
      (file) =>
        ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
      {
        message: 'File type should be JPEG, PNG, or PDF',
      }
    ),
});

http.route({
  path: '/api/files/upload',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    if (request.body === null) {
      return new Response('Request body is empty', { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response('No file uploaded', { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return new Response(errorMessage, { status: 400 });
    }

    // Implement file upload logic here
    // You may want to use Convex's file storage or keep this in Next.js
    return new Response('Not implemented', { status: 501 });
  }),
});

export default http;
