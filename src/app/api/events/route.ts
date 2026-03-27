import { NextResponse } from "next/server";

import { createEvent } from "@/lib/event-service";
import { handleRouteError, MANAGE_RESPONSE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { eventCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    enforceRateLimit(`event-create:${ip}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many event creation attempts. Please wait a few minutes and try again.",
    });

    const json = await request.json();
    const input = eventCreateSchema.parse({
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
      fallbackMessage: "Unable to create event.",
      route: "api/events",
      headers: MANAGE_RESPONSE_HEADERS,
    });
  }
}
