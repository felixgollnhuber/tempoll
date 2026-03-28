import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicEventClient } from "@/components/public-event-client";
import { RecentEventTracker } from "@/components/recent-event-tracker";
import { getPublicEventSnapshot } from "@/lib/event-service";
import { getServerI18n } from "@/lib/i18n/server";
import { buildSocialImages, buildSocialTitle } from "@/lib/site-metadata";
import { getParticipantCookieName } from "@/lib/tokens";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { locale, messages, format } = await getServerI18n();
  const event = await getPublicEventSnapshot(slug, locale);

  if (!event) {
    notFound();
  }

  const description = format(messages.metadata.eventShareDescription, {
    title: event.snapshot.title,
  });
  const socialImages = buildSocialImages(messages);
  const socialTitle = buildSocialTitle(event.snapshot.title);

  return {
    title: event.snapshot.title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      url: `/e/${slug}`,
      images: socialImages.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: socialImages.twitter,
    },
  };
}

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
