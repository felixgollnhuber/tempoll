import { CreateEventForm } from "@/components/create-event-form";
import { buildTimeOptions } from "@/lib/availability";
import { getSupportedTimezones } from "@/lib/constants";

export default function NewEventPage() {
  return (
    <main className="app-shell flex-1 py-10 sm:py-14">
      <div className="mb-8 space-y-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">New event</p>
          <h1 className="text-4xl font-semibold tracking-tight">Create a scheduling board</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Pick one date range, choose the daily window, and generate a shareable event link.
          </p>
        </div>
      </div>

      <CreateEventForm
        timezones={getSupportedTimezones()}
        timeOptions={buildTimeOptions(30)}
      />
    </main>
  );
}
