import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { saveAvailability } from "@/lib/event-service";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { handleRouteError, PRIVATE_NO_STORE_HEADERS } from "@/lib/security";
import { getClientIp } from "@/lib/request";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getParticipantCookieName } from "@/lib/tokens";
import { createAvailabilityMutationSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export async function PUT(request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(request));

  try {
    const { slug } = await params;
    const ip = getClientIp(request);
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(getParticipantCookieName(slug))?.value;

    enforceRateLimit(`availability:ip:${slug}:${ip}`, {
      limit: 120,
      windowMs: 5 * 60 * 1000,
      code: "availability_ip_rate_limited",
    });

    enforceRateLimit(`availability:session:${slug}:${cookieValue ?? ip}`, {
      limit: 60,
      windowMs: 60 * 1000,
      code: "availability_session_rate_limited",
    });

    const json = await request.json();
    const mutation = createAvailabilityMutationSchema().parse(json);

    const result = await saveAvailability(slug, i18n.locale, mutation, cookieValue);

    return NextResponse.json(
      { ok: true, snapshot: result.snapshot },
      {
        headers: PRIVATE_NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: i18n.messages.errors.routeFallbacks.saveAvailability,
      messages: i18n.messages,
      route: "api/events/[slug]/availability",
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
