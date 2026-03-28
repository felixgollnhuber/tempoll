import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicEventSnapshot } from "@/lib/event-service";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { PRIVATE_NO_STORE_HEADERS, PUBLIC_NO_STORE_HEADERS, mergeHeaders } from "@/lib/security";
import { getParticipantCookieName } from "@/lib/tokens";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(request));
  const { slug } = await params;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(getParticipantCookieName(slug))?.value;
  const event = await getPublicEventSnapshot(slug, i18n.locale, cookieValue);

  if (!event) {
    return NextResponse.json(
      { error: i18n.messages.errors.routeFallbacks.eventNotFound },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      snapshot: event.snapshot,
      participant: event.participant,
    },
    {
      status: 200,
      headers: mergeHeaders(
        cookieValue ? PRIVATE_NO_STORE_HEADERS : PUBLIC_NO_STORE_HEADERS,
        {
          Vary: "Cookie",
        },
      ),
    },
  );
}
