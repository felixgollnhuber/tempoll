import { NextResponse } from "next/server";

import { updateManagedEvent } from "@/lib/event-service";
import { handleRouteError, MANAGE_RESPONSE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { manageUpdateSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    token: string;
  }>;
};

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { token } = await params;
    const ip = getClientIp(request);

    enforceRateLimit(`manage-mutation:${token}:${ip}`, {
      limit: 60,
      windowMs: 10 * 60 * 1000,
      message: "Too many organizer actions. Please wait a bit and try again.",
    });

    const json = await request.json();
    const input = manageUpdateSchema.parse(json);

    await updateManagedEvent(token, input);

    return NextResponse.json(
      { ok: true },
      {
        headers: MANAGE_RESPONSE_HEADERS,
      },
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Unable to update event.",
      route: "api/manage/[token]",
      headers: MANAGE_RESPONSE_HEADERS,
    });
  }
}
