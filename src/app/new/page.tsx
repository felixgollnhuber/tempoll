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
      <div className="mb-8 space-y-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{messages.newEventPage.eyebrow}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{messages.newEventPage.title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {messages.newEventPage.description}
          </p>
        </div>
      </div>

      <CreateEventForm
        timezones={getSupportedTimezones()}
        timeOptions={buildTimeOptions(30)}
        notificationsConfigured={isNotificationDeliveryConfigured()}
      />
    </main>
  );
}
