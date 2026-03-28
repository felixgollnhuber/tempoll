import { NextResponse } from "next/server";

import { createEvent } from "@/lib/event-service";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { handleRouteError, MANAGE_RESPONSE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createEventCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const i18n = createI18n(getLocaleFromRequest(request));

  try {
    const ip = getClientIp(request);

    enforceRateLimit(`event-create:${ip}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
      code: "event_create_rate_limited",
    });

    const json = await request.json();
    const input = createEventCreateSchema(i18n.messages).parse({
      ...json,
      dayStartMinutes: Number(json.dayStartMinutes),
      dayEndMinutes: Number(json.dayEndMinutes),
    });

    const result = await createEvent({
      ...input,
      dates: [...new Set(input.dates)].sort(),
    });

    return NextResponse.json(result, {
      status: 201,
      headers: MANAGE_RESPONSE_HEADERS,
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: i18n.messages.errors.routeFallbacks.createEvent,
      messages: i18n.messages,
      route: "api/events",
      headers: MANAGE_RESPONSE_HEADERS,
    });
  }
}
