import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublicEventClient } from "@/components/public-event-client";
import { RecentEventTracker } from "@/components/recent-event-tracker";
import { getPublicEventSnapshot } from "@/lib/event-service";
import { getParticipantCookieName } from "@/lib/tokens";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    participantId?: string;
    token?: string;
  }>;
};

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const { participantId, token } = await searchParams;
  const cookieStore = await cookies();

  const directSessionValue =
    participantId && token ? `${participantId}.${token}` : cookieStore.get(getParticipantCookieName(slug))?.value;

  const event = await getPublicEventSnapshot(slug, directSessionValue);
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
        initialSnapshot={event.snapshot}
        initialSession={
          event.participant && participantId && token
            ? {
                participantId,
                displayName: event.participant.displayName,
                editToken: token,
              }
            : event.participant
              ? {
                  participantId: event.participant.id,
                  displayName: event.participant.displayName,
                  editToken: directSessionValue?.split(".")[1] ?? "",
                }
              : null
        }
      />
    </main>
  );
}
