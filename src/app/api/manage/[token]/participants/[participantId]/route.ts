import { NextResponse } from "next/server";

import { deleteParticipant } from "@/lib/event-service";
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
  try {
    const { token, participantId } = await params;
    const ip = getClientIp(_request);

    enforceRateLimit(`manage-mutation:${token}:${ip}`, {
      limit: 60,
      windowMs: 10 * 60 * 1000,
      message: "Too many organizer actions. Please wait a bit and try again.",
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
      fallbackMessage: "Unable to remove participant.",
      route: "api/manage/[token]/participants/[participantId]",
      headers: MANAGE_RESPONSE_HEADERS,
    });
  }
}
