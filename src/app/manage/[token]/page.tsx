import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ManageEventClient } from "@/components/manage-event-client";
import { RecentEventTracker } from "@/components/recent-event-tracker";
import { getSupportedTimezones } from "@/lib/constants";
import { getManageEventView } from "@/lib/event-service";
import { getServerI18n } from "@/lib/i18n/server";
import { buildSocialImages, buildSocialTitle } from "@/lib/site-metadata";

type ManagePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ManagePageProps): Promise<Metadata> {
  const { token } = await params;
  const { locale, messages } = await getServerI18n();
  const view = await getManageEventView(token, locale);

  if (!view) {
    notFound();
  }

  const socialImages = buildSocialImages(messages);
  const socialTitle = buildSocialTitle(messages.metadata.managePrivateTitle);

  return {
    title: messages.metadata.managePrivateTitle,
    description: messages.metadata.managePrivateDescription,
    openGraph: {
      title: socialTitle,
      description: messages.metadata.managePrivateDescription,
      images: socialImages.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: messages.metadata.managePrivateDescription,
      images: socialImages.twitter,
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noimageindex: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { token } = await params;
  const { locale } = await getServerI18n();
  const timezones = getSupportedTimezones();
  const view = await getManageEventView(token, locale);

  if (!view) {
    notFound();
  }

  return (
    <main className="app-shell flex-1 pt-10 pb-20 sm:pt-14 sm:pb-24">
      <RecentEventTracker
        slug={view.snapshot.slug}
        title={view.snapshot.title}
        publicUrl={`/e/${view.snapshot.slug}`}
        manageUrl={`/manage/${token}`}
      />
      <ManageEventClient initialView={view} timezones={timezones} />
    </main>
  );
}
