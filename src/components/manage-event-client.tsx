"use client";

import Link from "next/link";
import { Loader2Icon, LockIcon, Trash2Icon, UnlockIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { EventHeatmap } from "@/components/event-heatmap";
import { CopyButton } from "@/components/copy-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/context";
import type { ManageEventView, PublicEventSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type ManageEventClientProps = {
  initialView: ManageEventView;
};

type PendingAction =
  | "updateTitle"
  | "closeEvent"
  | "updateFixedDate"
  | "reopenEvent"
  | "renameParticipant"
  | "removeParticipant";

type RefreshSnapshotOptions = {
  preserveDirtyTitle?: boolean;
};

export function ManageEventClient({ initialView }: ManageEventClientProps) {
  const { messages, format, plural } = useI18n();
  const [snapshot, setSnapshot] = useState<PublicEventSnapshot>(initialView.snapshot);
  const [title, setTitle] = useState(initialView.snapshot.title);
  const [requestedActiveParticipantId, setRequestedActiveParticipantId] = useState<string | null>(
    null,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
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
  const savedFinalSlot = snapshot.status === "CLOSED" ? snapshot.finalizedSlot : null;
  const isTitleDirty = title !== snapshot.title;
  const manageActionUrl = `/api/manage/${initialView.manageKey}`;
  const visibleSuggestions = savedFinalSlot
    ? snapshot.suggestions.filter((suggestion) => suggestion.slotStart !== savedFinalSlot.slotStart)
    : snapshot.suggestions;

  const refreshSnapshot = useCallback(
    async ({ preserveDirtyTitle = false }: RefreshSnapshotOptions = {}) => {
      const response = await fetch(`/api/events/${initialView.snapshot.slug}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { snapshot: PublicEventSnapshot };
      setSnapshot(payload.snapshot);
      setTitle((currentTitle) =>
        preserveDirtyTitle && currentTitle !== snapshot.title ? currentTitle : payload.snapshot.title,
      );
    },
    [initialView.snapshot.slug, snapshot.title],
  );

  useEffect(() => {
    const eventSource = new EventSource(`/api/events/${initialView.snapshot.slug}/stream`);
    eventSource.addEventListener("event-update", () => {
      void refreshSnapshot({ preserveDirtyTitle: true });
    });

    return () => eventSource.close();
  }, [initialView.snapshot.slug, refreshSnapshot]);

  function performManageAction(
    action: PendingAction,
    request: () => Promise<Response>,
    {
      errorMessage,
      onSuccess,
      preserveDirtyTitleOnRefresh = true,
      successMessage,
    }: {
      successMessage: string;
      errorMessage: string;
      preserveDirtyTitleOnRefresh?: boolean;
      onSuccess?: () => Promise<void> | void;
    },
  ) {
    setPendingAction(action);

    startTransition(async () => {
      try {
        const response = await request();
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          toast.error(payload.error ?? errorMessage);
          return;
        }

        toast.success(successMessage);

        if (onSuccess) {
          await onSuccess();
          return;
        }

        await refreshSnapshot({
          preserveDirtyTitle: preserveDirtyTitleOnRefresh,
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function saveTitle() {
    performManageAction(
      "updateTitle",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateTitle",
            title,
          }),
        }),
      {
        successMessage: messages.manageEvent.titleSaved,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
        preserveDirtyTitleOnRefresh: false,
      },
    );
  }

  function closeEvent(finalSlotStart: string) {
    performManageAction(
      "closeEvent",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "closeEvent",
            finalSlotStart,
          }),
        }),
      {
        successMessage: messages.manageEvent.eventClosed,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
      },
    );
  }

  function updateFixedDate(finalSlotStart: string) {
    performManageAction(
      "updateFixedDate",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateFixedDate",
            finalSlotStart,
          }),
        }),
      {
        successMessage: messages.manageEvent.fixedDateUpdated,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
      },
    );
  }

  function reopenEvent() {
    performManageAction(
      "reopenEvent",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reopenEvent",
          }),
        }),
      {
        successMessage: messages.manageEvent.eventReopened,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
        onSuccess: async () => {
          setIsReopenDialogOpen(false);
          await refreshSnapshot({
            preserveDirtyTitle: true,
          });
        },
      },
    );
  }

  function handleFixedDateAction(slotStart: string) {
    if (snapshot.status === "OPEN") {
      closeEvent(slotStart);
      return;
    }

    if (savedFinalSlot?.slotStart !== slotStart) {
      updateFixedDate(slotStart);
    }
  }

  function renameParticipant(participantId: string, displayName: string) {
    performManageAction(
      "renameParticipant",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "renameParticipant",
            participantId,
            displayName,
          }),
        }),
      {
        successMessage: messages.manageEvent.participantRenamed,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
        onSuccess: () => {
          setSnapshot((current) => ({
            ...current,
            participants: current.participants.map((participant) =>
              participant.id === participantId ? { ...participant, displayName } : participant,
            ),
          }));
        },
      },
    );
  }

  function removeParticipant(participantId: string) {
    performManageAction(
      "removeParticipant",
      () =>
        fetch(`/api/manage/${initialView.manageKey}/participants/${participantId}`, {
          method: "DELETE",
        }),
      {
        successMessage: messages.manageEvent.participantRemoved,
        errorMessage: messages.errors.routeFallbacks.removeParticipant,
        onSuccess: async () => {
          if (participantId === requestedActiveParticipantId) {
            setRequestedActiveParticipantId(null);
          }

          await refreshSnapshot({
            preserveDirtyTitle: true,
          });
        },
      },
    );
  }

  const bestWindowsCard = hasAnyAvailability && visibleSuggestions.length > 0 ? (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{messages.manageEvent.bestWindowsTitle}</CardTitle>
        <CardDescription className="text-xs">
          {format(messages.publicEvent.bestWindowsDescription, {
            duration: snapshot.meetingDurationMinutes,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {visibleSuggestions.map((suggestion, index) => (
          <div key={suggestion.slotStart} className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              {format(messages.common.option, { count: index + 1 })}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{suggestion.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plural(messages.manageEvent.peopleAvailable, suggestion.availableCount)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  ) : null;

  const statusCard = (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{messages.manageEvent.eventStatusTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="space-y-2">
          <Badge
            variant={snapshot.status === "CLOSED" ? "destructive" : "secondary"}
            className="h-7 w-fit gap-1.5 px-2.5 text-xs"
          >
            {snapshot.status === "CLOSED" ? (
              <LockIcon className="size-3.5" />
            ) : (
              <UnlockIcon className="size-3.5" />
            )}
            {snapshot.status === "CLOSED"
              ? messages.manageEvent.statusClosed
              : messages.manageEvent.statusOpen}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {snapshot.status === "CLOSED"
              ? messages.manageEvent.statusClosedDescription
              : messages.manageEvent.statusOpenDescription}
          </p>
        </div>

        {savedFinalSlot ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {messages.common.fixedDate}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{savedFinalSlot.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plural(messages.publicEvent.fullWindowFree, savedFinalSlot.availableCount)}
            </p>
          </div>
        ) : null}

        {savedFinalSlot ? (
          <Button asChild size="sm" className="w-full">
            <a href={`/api/events/${snapshot.slug}/ics`}>{messages.common.addToCalendar}</a>
          </Button>
        ) : null}

        {snapshot.status === "CLOSED" ? (
          <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={isPending} className="w-full">
                {messages.manageEvent.reopenEvent}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.manageEvent.reopenEventConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {messages.manageEvent.reopenEventConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={reopenEvent} disabled={isPending}>
                  {pendingAction === "reopenEvent" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  {messages.manageEvent.reopenEventConfirmAction}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </CardContent>
    </Card>
  );

  const participantsCard = (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{messages.manageEvent.participantsTitle}</CardTitle>
        <CardDescription className="text-xs">
          {messages.manageEvent.participantsDescription}
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
                  data-slot="participant-color-dot"
                  className="mt-1 size-3 shrink-0 rounded-full shadow-sm"
                  style={{ background: participant.color }}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{participant.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {plural(
                          messages.publicEvent.participantSelectedSlots,
                          participant.selectedSlotCount,
                        )}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                        {messages.publicEvent.participantHighlighting}
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
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-3xl">{messages.manageEvent.title}</CardTitle>
          <CardDescription>{messages.manageEvent.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-w-3xl space-y-2">
            <Label htmlFor="title">{messages.manageEvent.titleLabel}</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
              {isTitleDirty ? (
                <Button
                  type="button"
                  onClick={saveTitle}
                  disabled={isPending}
                  className="sm:shrink-0"
                >
                  {pendingAction === "updateTitle" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  {messages.manageEvent.saveTitle}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <aside className="order-1 min-w-0 space-y-5 xl:order-2">
          {statusCard}

          <Card>
            <CardHeader>
              <CardTitle>{messages.manageEvent.shareLinksTitle}</CardTitle>
              <CardDescription>{messages.manageEvent.shareLinksDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{messages.manageEvent.publicEventUrl}</Label>
                <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {initialView.shareUrl}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={initialView.shareUrl}>{messages.manageEvent.openPublicEvent}</Link>
                  </Button>
                  <CopyButton value={initialView.shareUrl} label={messages.manageEvent.copyPublicUrl} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{messages.manageEvent.privateOrganizerUrl}</Label>
                <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {initialView.manageUrl}
                </div>
                <CopyButton value={initialView.manageUrl} label={messages.manageEvent.copyOrganizerUrl} />
              </div>
            </CardContent>
          </Card>

          {bestWindowsCard}
          {participantsCard}
        </aside>

        <div className="order-2 min-w-0 xl:order-1">
          <EventHeatmap
            snapshot={snapshot}
            mode="view"
            canEdit={false}
            showModeToggle={false}
            showSidebar={false}
            displayStatus={snapshot.status}
            finalSlotStart={savedFinalSlot?.slotStart ?? null}
            showStatusBadge={false}
            showTitleBlock={false}
            showFixedDateAction
            isFixedDateActionPending={
              pendingAction === "closeEvent" || pendingAction === "updateFixedDate"
            }
            onFixedDateAction={handleFixedDateAction}
            activeParticipantId={activeParticipantId}
            onActiveParticipantChange={setRequestedActiveParticipantId}
            getDescription={({ usesDateWindowing }) =>
              snapshot.status === "CLOSED"
                ? usesDateWindowing
                  ? messages.manageEvent.closedHeatmapDescriptionWindowed
                  : messages.manageEvent.closedHeatmapDescription
                : usesDateWindowing
                  ? messages.manageEvent.openHeatmapDescriptionWindowed
                  : messages.manageEvent.openHeatmapDescription
            }
          />
        </div>
      </div>
    </div>
  );
}
