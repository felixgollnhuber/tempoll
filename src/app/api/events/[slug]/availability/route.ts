import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { saveAvailability } from "@/lib/event-service";
import { handleRouteError, PRIVATE_NO_STORE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getParticipantCookieName } from "@/lib/tokens";
import { availabilityMutationSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export async function PUT(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const ip = getClientIp(request);
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(getParticipantCookieName(slug))?.value;

    enforceRateLimit(`availability:ip:${slug}:${ip}`, {
      limit: 120,
      windowMs: 5 * 60 * 1000,
      message: "Too many availability updates from this network. Please wait a moment and try again.",
    });

    enforceRateLimit(`availability:session:${slug}:${cookieValue ?? ip}`, {
      limit: 60,
      windowMs: 60 * 1000,
      message: "Too many availability updates in a short time. Please slow down for a moment.",
    });

    const json = await request.json();
    const mutation = availabilityMutationSchema.parse(json);

    const result = await saveAvailability(slug, mutation, cookieValue);

    return NextResponse.json(
      { ok: true, snapshot: result.snapshot },
      {
        headers: PRIVATE_NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: "Unable to save availability.",
      route: "api/events/[slug]/availability",
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
