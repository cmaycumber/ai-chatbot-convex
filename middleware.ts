import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(async (request, ctx) => {
	const isAuthenticated = await ctx.convexAuth.isAuthenticated();

	console.log("Is authenticated:", isAuthenticated);
});

export const config = {
	// The following matcher runs middleware on all routes
	// except static assets.
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
