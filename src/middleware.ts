import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isJellyfinFullyConfigured } from "@/lib/config/services";

export const config = {
  runtime: "nodejs",
};

/**
 * Paths that should never be redirected by the onboarding guard.
 * API routes, Next.js internals, and static assets are always allowed through.
 */
const BYPASS_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon.ico",
];

const BYPASS_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".css",
  ".js",
  ".woff",
  ".woff2",
];

/**
 * In-memory cache for the Jellyfin configuration check.
 * Avoids a DB read on every single request.
 */
let cachedConfigured: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5_000; // 5 seconds

/**
 * Invalidate the middleware configuration cache.
 * Call this when service config changes (connect/disconnect).
 */
export function invalidateConfigCache(): void {
  cachedConfigured = null;
  cacheTimestamp = 0;
}

function isConfigured(): boolean {
  const now = Date.now();
  if (cachedConfigured !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfigured;
  }

  cachedConfigured = isJellyfinFullyConfigured();
  cacheTimestamp = now;
  return cachedConfigured;
}

function shouldBypass(pathname: string): boolean {
  for (const prefix of BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  for (const ext of BYPASS_EXTENSIONS) {
    if (pathname.endsWith(ext)) return true;
  }
  return false;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API routes, Next.js internals, and static assets through
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const configured = isConfigured();

  // If not configured and not on /setup, redirect to /setup
  if (!configured && !pathname.startsWith("/setup")) {
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = "/setup";
    return NextResponse.redirect(setupUrl);
  }

  // If configured and on /setup, redirect to dashboard
  if (configured && pathname.startsWith("/setup")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}
