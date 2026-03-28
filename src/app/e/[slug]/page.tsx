import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublicEventClient } from "@/components/public-event-client";
import { RecentEventTracker } from "@/components/recent-event-tracker";
import { getPublicEventSnapshot } from "@/lib/event-service";
import { getServerI18n } from "@/lib/i18n/server";
import { buildPublicEventUrl, getParticipantCookieName } from "@/lib/tokens";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(getParticipantCookieName(slug))?.value;
  const { locale } = await getServerI18n();

  const event = await getPublicEventSnapshot(slug, locale, cookieValue);
  if (!event) {
    notFound();
  }

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <RecentEventTracker
        slug={slug}
        title={event.snapshot.title}
        publicUrl={`/e/${slug}`}
      />
      <PublicEventClient
        slug={slug}
        shareUrl={buildPublicEventUrl(slug)}
        initialSnapshot={event.snapshot}
        initialSession={
          event.participant
            ? {
                participantId: event.participant.id,
                displayName: event.participant.displayName,
              }
            : null
        }
      />
    </main>
  );
}
