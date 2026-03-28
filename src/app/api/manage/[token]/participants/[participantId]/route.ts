import { NextResponse } from "next/server";

import { deleteParticipant } from "@/lib/event-service";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { handleRouteError, MANAGE_RESPONSE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";

type Context = {
  params: Promise<{
    token: string;
    participantId: string;
  }>;
};

export async function DELETE(_request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(_request));

  try {
    const { token, participantId } = await params;
    const ip = getClientIp(_request);

    enforceRateLimit(`manage-mutation:${token}:${ip}`, {
      limit: 60,
      windowMs: 10 * 60 * 1000,
      code: "organizer_action_rate_limited",
    });

    await deleteParticipant(token, participantId);
    return NextResponse.json(
      { ok: true },
      {
        headers: MANAGE_RESPONSE_HEADERS,
      },
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: i18n.messages.errors.routeFallbacks.removeParticipant,
      messages: i18n.messages,
      route: "api/manage/[token]/participants/[participantId]",
      headers: MANAGE_RESPONSE_HEADERS,
    });
  }
}
