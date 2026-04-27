import { NextResponse } from "next/server";

import { getPublicEventSnapshot } from "@/lib/event-service";
import { buildSlotStart } from "@/lib/availability";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { buildEventCalendarFile } from "@/lib/ics";
import { PUBLIC_NO_STORE_HEADERS, mergeHeaders } from "@/lib/security";
import { buildPublicEventUrl } from "@/lib/tokens";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(request));
  const { slug } = await params;
  const event = await getPublicEventSnapshot(slug, i18n.locale);

  if (!event || event.snapshot.status !== "CLOSED" || !event.snapshot.finalizedSlot) {
    return NextResponse.json(
      { error: i18n.messages.errors.routeFallbacks.eventNotFound },
      {
        status: 404,
        headers: mergeHeaders(PUBLIC_NO_STORE_HEADERS),
      },
    );
  }

  const isTimedFullDayEvent =
    event.snapshot.eventType === "full_day" &&
    event.snapshot.fullDayStartMinutes !== null &&
    event.snapshot.fullDayStartMinutes !== undefined;
  const slotStart = isTimedFullDayEvent
    ? buildSlotStart(
        event.snapshot.finalizedSlot.dateKey,
        event.snapshot.fullDayStartMinutes ?? 0,
        event.snapshot.timezone,
      )
    : event.snapshot.finalizedSlot.slotStart;
  const slotEnd = isTimedFullDayEvent
    ? new Date(
        new Date(slotStart).getTime() + event.snapshot.meetingDurationMinutes * 60 * 1000,
      ).toISOString()
    : event.snapshot.finalizedSlot.slotEnd;

  const body = buildEventCalendarFile({
    slug: event.snapshot.slug,
    title: event.snapshot.title,
    location: event.snapshot.location,
    isOnlineMeeting: event.snapshot.isOnlineMeeting,
    meetingLink: event.snapshot.meetingLink,
    timezone: event.snapshot.timezone,
    slotStart,
    slotEnd,
    allDayDateKey:
      event.snapshot.eventType === "full_day" && !isTimedFullDayEvent
        ? event.snapshot.finalizedSlot.dateKey
        : null,
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
