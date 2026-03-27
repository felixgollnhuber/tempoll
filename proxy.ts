import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getParticipantSessionCookieFromEditLink } from "@/lib/event-service";
import { appConfig } from "@/lib/config";
import { getParticipantCookieOptions } from "@/lib/tokens";
import { isAppSetupComplete } from "@/lib/setup-state";
import { PRIVATE_NO_STORE_HEADERS, mergeHeaders } from "@/lib/security";

function isEventBootstrapRequest(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/e/");
}

function getEventSlug(pathname: string) {
  const match = pathname.match(/^\/e\/([^/]+)$/);
  return match?.[1];
}

export async function proxy(request: NextRequest) {
  if (!isAppSetupComplete()) {
    const { pathname } = request.nextUrl;

    if (pathname === "/setup" || pathname === "/api/health") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "App setup is not complete yet. Open /setup to generate the environment configuration.",
        },
        { status: 503 },
      );
    }

    return NextResponse.redirect(new URL("/setup", request.url));
  }

  if (!isEventBootstrapRequest(request)) {
    return NextResponse.next();
  }

  const participantId = request.nextUrl.searchParams.get("participantId");
  const token = request.nextUrl.searchParams.get("token");
  if (!participantId || !token) {
    return NextResponse.next();
  }

  const slug = getEventSlug(request.nextUrl.pathname);
  if (!slug) {
    return NextResponse.next();
  }

  const sanitizedUrl = request.nextUrl.clone();
  sanitizedUrl.searchParams.delete("participantId");
  sanitizedUrl.searchParams.delete("token");

  const response = NextResponse.redirect(sanitizedUrl, {
    headers: mergeHeaders(PRIVATE_NO_STORE_HEADERS, {
      "Referrer-Policy": "no-referrer",
    }),
  });

  const sessionCookie = await getParticipantSessionCookieFromEditLink(slug, participantId, token);
  if (!sessionCookie) {
    return response;
  }

  response.cookies.set(
    sessionCookie.cookieName,
    sessionCookie.cookieValue,
    getParticipantCookieOptions(appConfig.sessionMaxAgeSeconds),
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
