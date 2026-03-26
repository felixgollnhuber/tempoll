import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicEventSnapshot } from "@/lib/event-service";
import { getParticipantCookieName } from "@/lib/tokens";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(getParticipantCookieName(slug))?.value;
  const event = await getPublicEventSnapshot(slug, cookieValue);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      snapshot: event.snapshot,
      participant: event.participant,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
