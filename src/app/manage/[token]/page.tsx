import { notFound } from "next/navigation";

import { ManageEventClient } from "@/components/manage-event-client";
import { RecentEventTracker } from "@/components/recent-event-tracker";
import { getManageEventView } from "@/lib/event-service";

type ManagePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ManagePage({ params }: ManagePageProps) {
  const { token } = await params;
  const view = await getManageEventView(token);

  if (!view) {
    notFound();
  }

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <RecentEventTracker
        slug={view.snapshot.slug}
        title={view.snapshot.title}
        publicUrl={`/e/${view.snapshot.slug}`}
        manageUrl={`/manage/${token}`}
      />
      <ManageEventClient initialView={view} />
    </main>
  );
}
