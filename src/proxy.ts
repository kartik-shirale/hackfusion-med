import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forget-password(.*)",
  "/callback(.*)",
  "/api/webhooks(.*)",
  "/api/warehouse/dispatch(.*)",
  "/api/cron(.*)",
  "/api/razorpay/webhook(.*)",
  "/manifest.webmanifest",
  "/sw.js",
  "/workbox-(.*)",
]);

// Auth pages — redirect logged-in users away from these
const isAuthPage = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forget-password(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  // If user is logged in and visits auth pages or root — send to chat
  // The layout will then redirect to the correct role-specific page
  if (userId && (isAuthPage(request) || pathname === "/")) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // If user is NOT logged in and visits root — send to sign-in
  if (!userId && pathname === "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Protect all private routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
