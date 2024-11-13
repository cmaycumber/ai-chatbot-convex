"use client";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useEffect } from "react";

// Start the session whenever the user isn't signed in.
export function InitializeSession() {
	const token = useAuthToken();
	const { signIn } = useAuthActions();

	console.log("Token: ", token);

	useEffect(() => {
		// Automatically attempt to sign in when the component mounts
		if (!token) signIn("anonymous");
	}, [signIn, token]);

	return null; // This is a placeholder component that doesn't render anything
}
