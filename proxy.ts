import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getParticipantSessionCookieFromEditLink } from "@/lib/event-service";
import { appConfig } from "@/lib/config";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/locale";
import { createI18n, resolveLocale } from "@/lib/i18n/server";
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
  const i18n = createI18n(
    resolveLocale({
      cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
      acceptLanguage: request.headers.get("accept-language"),
    }),
  );

  if (!isAppSetupComplete()) {
    const { pathname } = request.nextUrl;

    if (pathname === "/setup" || pathname === "/api/health") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: i18n.messages.errors.appSetupIncomplete,
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
