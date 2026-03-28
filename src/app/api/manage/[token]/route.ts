import { NextResponse } from "next/server";

import { updateManagedEvent } from "@/lib/event-service";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { handleRouteError, MANAGE_RESPONSE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createManageUpdateSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    token: string;
  }>;
};

export async function PATCH(request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(request));

  try {
    const { token } = await params;
    const ip = getClientIp(request);

    enforceRateLimit(`manage-mutation:${token}:${ip}`, {
      limit: 60,
      windowMs: 10 * 60 * 1000,
      code: "organizer_action_rate_limited",
    });

    const json = await request.json();
    const input = createManageUpdateSchema(i18n.messages).parse(json);

    await updateManagedEvent(token, input);

    return NextResponse.json(
      { ok: true },
      {
        headers: MANAGE_RESPONSE_HEADERS,
      },
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: i18n.messages.errors.routeFallbacks.updateEvent,
      messages: i18n.messages,
      route: "api/manage/[token]",
      headers: MANAGE_RESPONSE_HEADERS,
    });
  }
}
