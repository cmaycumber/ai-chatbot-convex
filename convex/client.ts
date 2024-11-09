import { ConvexHttpClient } from 'convex/browser';

export const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
