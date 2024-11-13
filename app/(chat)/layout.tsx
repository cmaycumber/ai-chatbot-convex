import { cookies } from "next/headers";

import { AppSidebar } from "@/components/custom/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { InitializeSession } from "./initialize-session";
export const experimental_ppr = true;

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [cookieStore] = await Promise.all([cookies()]);
	const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

	console.log("Session: ", await convexAuthNextjsToken());

	return (
		<>
			<SidebarProvider defaultOpen={!isCollapsed}>
				{/** Replace once we can use convex auth for this... */}
				<AppSidebar user={undefined} />
				<SidebarInset>{children}</SidebarInset>
			</SidebarProvider>
			<InitializeSession />
		</>
	);
}
