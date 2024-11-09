import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// TODO: Figure out how to properly implement auth w/ the API's
export const auth = async () => {
  return null as any;

  //   const token = convexAuthNextjsToken();

  //   if (!token) {
  //     return null;
  //   }

  // //   const user = await fetchQuery(
  // //     api.queries.getUserByToken,
  // //     { id: token },
  // //     { token }
  // //   );

  //   return {
  //     token,
  //     user,
  //   };
};
