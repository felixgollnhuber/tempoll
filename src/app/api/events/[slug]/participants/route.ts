import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config";
import { joinParticipant } from "@/lib/event-service";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { handleRouteError, PRIVATE_NO_STORE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getParticipantCookieOptions } from "@/lib/tokens";
import { createParticipantCreateSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(request));

  try {
    const { slug } = await params;
    const ip = getClientIp(request);

    enforceRateLimit(`event-join:${slug}:${ip}`, {
      limit: 20,
      windowMs: 10 * 60 * 1000,
      code: "event_join_rate_limited",
    });

    const json = await request.json();
    const input = createParticipantCreateSchema(i18n.messages).parse(json);
    const result = await joinParticipant(slug, input.displayName);

    const response = NextResponse.json(
      {
        session: result.session,
      },
      {
        status: 201,
        headers: PRIVATE_NO_STORE_HEADERS,
      },
    );

    response.cookies.set(
      result.cookieName,
      result.cookieValue,
      getParticipantCookieOptions(appConfig.sessionMaxAgeSeconds),
    );

    return response;
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: i18n.messages.errors.routeFallbacks.joinEvent,
      messages: i18n.messages,
      route: "api/events/[slug]/participants",
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
