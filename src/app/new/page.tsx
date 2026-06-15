import type { Metadata } from "next";

import { CreateEventForm } from "@/components/create-event-form";
import { buildTimeOptions } from "@/lib/availability";
import { isNotificationDeliveryConfigured } from "@/lib/config";
import { getSupportedTimezones } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return {
    title: messages.metadata.newEventTitle,
  };
}

export default async function NewEventPage() {
  const { messages } = await getServerI18n();

  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <header className="mb-10 max-w-2xl space-y-3 sm:mb-14">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {messages.newEventPage.eyebrow}
        </p>
        <h1 className="font-heading text-3xl font-semibold leading-[1.08] tracking-tight sm:text-[2.5rem]">
          {messages.newEventPage.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {messages.newEventPage.description}
        </p>
      </header>

      <CreateEventForm
        timezones={getSupportedTimezones()}
        timeOptions={buildTimeOptions(30)}
        notificationsConfigured={isNotificationDeliveryConfigured()}
      />
    </main>
  );
}
