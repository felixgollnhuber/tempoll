"use client";

import Link from "next/link";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { EventHeatmap } from "@/components/event-heatmap";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildFinalizedSlot } from "@/lib/availability";
import type { ManageEventView, PublicEventSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type ManageEventClientProps = {
  initialView: ManageEventView;
};

export function ManageEventClient({ initialView }: ManageEventClientProps) {
  const [snapshot, setSnapshot] = useState<PublicEventSnapshot>(initialView.snapshot);
  const [title, setTitle] = useState(initialView.snapshot.title);
  const [status, setStatus] = useState(initialView.snapshot.status);
  const [finalSlotStart, setFinalSlotStart] = useState<string | null>(
    initialView.snapshot.finalizedSlot?.slotStart ?? null,
  );
  const [requestedActiveParticipantId, setRequestedActiveParticipantId] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const hasAnyAvailability = snapshot.participants.some(
    (participant) => participant.selectedSlotCount > 0,
  );
  const activeParticipantId = useMemo(
    () =>
      snapshot.participants.some((participant) => participant.id === requestedActiveParticipantId)
        ? requestedActiveParticipantId
        : null,
    [requestedActiveParticipantId, snapshot.participants],
  );
  const draftFinalizedSlot = useMemo(() => {
    if (status !== "CLOSED" || !finalSlotStart) {
      return null;
    }

    return buildFinalizedSlot({
      dates: snapshot.dates.map((date) => date.dateKey),
      timezone: snapshot.timezone,
      dayStartMinutes: snapshot.dayStartMinutes,
      dayEndMinutes: snapshot.dayEndMinutes,
      slotMinutes: snapshot.slotMinutes,
      meetingDurationMinutes: snapshot.meetingDurationMinutes,
      slots: snapshot.slots,
      finalSlotStart,
    });
  }, [
    finalSlotStart,
    snapshot.dates,
    snapshot.dayEndMinutes,
    snapshot.dayStartMinutes,
    snapshot.meetingDurationMinutes,
    snapshot.slotMinutes,
    snapshot.slots,
    snapshot.timezone,
    status,
  ]);
  const isClosingWithoutFixedDate = status === "CLOSED" && !draftFinalizedSlot;

  const refreshSnapshot = useCallback(async () => {
    const response = await fetch(`/api/events/${initialView.snapshot.slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { snapshot: PublicEventSnapshot };
    setSnapshot(payload.snapshot);
    setTitle(payload.snapshot.title);
    setStatus(payload.snapshot.status);
    setFinalSlotStart(payload.snapshot.finalizedSlot?.slotStart ?? null);
  }, [initialView.snapshot.slug]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/events/${initialView.snapshot.slug}/stream`);
    eventSource.addEventListener("event-update", () => {
      void refreshSnapshot();
    });

    return () => eventSource.close();
  }, [initialView.snapshot.slug, refreshSnapshot]);

  function updateEvent() {
    if (isClosingWithoutFixedDate) {
      toast.error("Pick a fixed date before closing this event.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/manage/${initialView.manageKey}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateEvent",
          title,
          status,
          finalSlotStart: status === "CLOSED" ? finalSlotStart : null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to update event.");
        return;
      }

      toast.success("Event updated");
      await refreshSnapshot();
    });
  }

  function renameParticipant(participantId: string, displayName: string) {
    startTransition(async () => {
      const response = await fetch(`/api/manage/${initialView.manageKey}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "renameParticipant",
          participantId,
          displayName,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to rename participant.");
        return;
      }

      toast.success("Participant renamed");
      setSnapshot((current) => ({
        ...current,
        participants: current.participants.map((participant) =>
          participant.id === participantId ? { ...participant, displayName } : participant,
        ),
      }));
    });
  }

  function removeParticipant(participantId: string) {
    startTransition(async () => {
      const response = await fetch(
        `/api/manage/${initialView.manageKey}/participants/${participantId}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Unable to remove participant.");
        return;
      }

      toast.success("Participant removed");
      if (participantId === requestedActiveParticipantId) {
        setRequestedActiveParticipantId(null);
      }
      await refreshSnapshot();
    });
  }

  function handleStatusChange(nextStatus: "OPEN" | "CLOSED") {
    setStatus(nextStatus);
    if (nextStatus === "OPEN") {
      setFinalSlotStart(null);
    }
  }

  const savedFinalSlot = snapshot.status === "CLOSED" ? snapshot.finalizedSlot : null;
  const hasSavedFixedDate =
    Boolean(savedFinalSlot) && savedFinalSlot?.slotStart === draftFinalizedSlot?.slotStart;
  const timingCard = draftFinalizedSlot ? (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Fixed date</CardTitle>
        <CardDescription className="text-xs">
          {hasSavedFixedDate
            ? "This is the published fixed date for the closed event."
            : "This fixed date is selected locally and will be published after saving."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{draftFinalizedSlot.label}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {draftFinalizedSlot.availableCount} participants free for the full window
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {hasSavedFixedDate ? (
            <Button asChild size="sm" className="w-full">
              <a href={`/api/events/${snapshot.slug}/ics`}>Add to calendar (.ics)</a>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setFinalSlotStart(null)}
          >
            Clear fixed date
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : hasAnyAvailability ? (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Best windows right now</CardTitle>
        <CardDescription className="text-xs">
          Ranked by overlap across the full {snapshot.meetingDurationMinutes}-minute meeting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {snapshot.suggestions.map((suggestion, index) => (
          <div key={suggestion.slotStart} className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">Option {index + 1}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{suggestion.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {suggestion.availableCount} people available
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  ) : null;

  const participantsCard = (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Participants</CardTitle>
        <CardDescription className="text-xs">
          Click a row to highlight availability. Rename participants or remove accidental entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {snapshot.participants.map((participant) => {
          const isActive = activeParticipantId === participant.id;

          return (
            <div
              key={participant.id}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              className={cn(
                "rounded-lg border bg-muted/20 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive ? "border-foreground/10 bg-background/90 shadow-sm" : "hover:bg-muted/35",
              )}
              onClick={() =>
                setRequestedActiveParticipantId((current) =>
                  current === participant.id ? null : participant.id,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setRequestedActiveParticipantId((current) =>
                    current === participant.id ? null : participant.id,
                  );
                }
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 size-3 shrink-0 rounded-full shadow-sm"
                  style={{ background: participant.color }}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{participant.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {participant.selectedSlotCount} selected slots
                      </p>
                    </div>
                    {isActive ? (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Highlighting
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      defaultValue={participant.displayName}
                      className="min-w-0"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onBlur={(event) => {
                        const nextValue = event.target.value.trim();
                        if (nextValue && nextValue !== participant.displayName) {
                          renameParticipant(participant.id, nextValue);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeParticipant(participant.id);
                      }}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Manage event</CardTitle>
          <CardDescription>
            Share the public board, keep the private organizer URL safe, control whether new changes
            are still allowed and set the fixed date before closing the event.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => handleStatusChange(value as "OPEN" | "CLOSED")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open for edits</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 md:col-span-2">
            <Button
              onClick={updateEvent}
              disabled={isPending || isClosingWithoutFixedDate}
              className="h-10"
            >
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
            {isClosingWithoutFixedDate ? (
              <p className="text-sm text-destructive">
                Pick a fixed date in the heatmap before closing this event.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <aside className="order-1 min-w-0 space-y-6 xl:order-2">
          <Card>
            <CardHeader>
              <CardTitle>Share links</CardTitle>
              <CardDescription>
                Keep the organizer link private. The public link is safe to share.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Public event URL</Label>
                <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {initialView.shareUrl}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={initialView.shareUrl}>Open public event</Link>
                  </Button>
                  <CopyButton value={initialView.shareUrl} label="Copy public URL" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Private organizer URL</Label>
                <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {initialView.manageUrl}
                </div>
                <CopyButton value={initialView.manageUrl} label="Copy organizer URL" />
              </div>
            </CardContent>
          </Card>

          {timingCard}
          {participantsCard}
        </aside>

        <div className="order-2 min-w-0 xl:order-1">
          <EventHeatmap
            snapshot={snapshot}
            mode="view"
            canEdit={false}
            showModeToggle={false}
            showSidebar={false}
            displayStatus={status}
            finalSlotStart={status === "CLOSED" ? finalSlotStart : null}
            allowFinalSlotSelection={status === "CLOSED"}
            onFinalSlotSelect={setFinalSlotStart}
            activeParticipantId={activeParticipantId}
            onActiveParticipantChange={setRequestedActiveParticipantId}
            getDescription={({ usesDateWindowing }) =>
              status === "CLOSED"
                ? usesDateWindowing
                  ? "Select a slot to inspect overlap and use the button below to set the fixed date. Use the arrows to move through the date range."
                  : "Click any slot to inspect availability and set the fixed date for this closed event."
                : usesDateWindowing
                  ? "Select a slot to inspect availability. Close the event to choose the fixed date."
                  : "Click any slot to inspect availability. Close the event when you are ready to choose the fixed date."
            }
          />
        </div>
      </div>
    </div>
  );
}
