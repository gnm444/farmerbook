import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";

const publicPrefixes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/auth",
  "/invite",
  "/join",
  "/confirm-email",
  "/unsubscribe",
  "/api/health",
  "/api/outreach",
  "/manifest.webmanifest",
  "/marketplace",
  "/featured-farmers",
  "/robots.txt",
  "/sitemap.xml",
  "/companies",
  "/offers",
  "/profile",
  "/store",
  "/community-rules",
  "/data-deletion",
  "/privacy",
  "/terms",
  "/license",
];

export function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const internalServicePaths = new Set(["/api/managed-agents/run"]);

export function isInternalServicePath(pathname: string) {
  return internalServicePaths.has(pathname);
}

export function requiresUserSession(pathname: string) {
  return !isPublicPath(pathname) && !isInternalServicePath(pathname);
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode() && requiresUserSession(request.nextUrl.pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("error", "Sign-in is temporarily unavailable.");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && requiresUserSession(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
