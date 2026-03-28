import { NextResponse } from "next/server";

import { getPublicEventSnapshot } from "@/lib/event-service";
import { buildEventCalendarFile } from "@/lib/ics";
import { PUBLIC_NO_STORE_HEADERS, mergeHeaders } from "@/lib/security";
import { buildPublicEventUrl } from "@/lib/tokens";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const event = await getPublicEventSnapshot(slug);

  if (!event || event.snapshot.status !== "CLOSED" || !event.snapshot.finalizedSlot) {
    return NextResponse.json(
      { error: "Event not found." },
      {
        status: 404,
        headers: mergeHeaders(PUBLIC_NO_STORE_HEADERS),
      },
    );
  }

  const body = buildEventCalendarFile({
    slug: event.snapshot.slug,
    title: event.snapshot.title,
    timezone: event.snapshot.timezone,
    slotStart: event.snapshot.finalizedSlot.slotStart,
    slotEnd: event.snapshot.finalizedSlot.slotEnd,
    url: buildPublicEventUrl(event.snapshot.slug),
  });

  return new NextResponse(body, {
    status: 200,
    headers: mergeHeaders(PUBLIC_NO_STORE_HEADERS, {
      "Content-Disposition": `attachment; filename="tempoll-${event.snapshot.slug}.ics"`,
      "Content-Type": "text/calendar; charset=utf-8",
    }),
  });
}
