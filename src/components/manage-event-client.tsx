"use client";

import type { Locale } from "date-fns";
import Link from "next/link";
import {
  CalendarIcon,
  ChevronDownIcon,
  Loader2Icon,
  LockIcon,
  Trash2Icon,
  UnlockIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { EventHeatmap } from "@/components/event-heatmap";
import { FullDayAvailability } from "@/components/full-day-availability";
import { CopyButton } from "@/components/copy-button";
import { EventMetaDetails } from "@/components/event-meta-details";
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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildTimeOptions, formatMeetingWindowLabels } from "@/lib/availability";
import { useI18n } from "@/lib/i18n/context";
import type { MessageValues, PluralMessage } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { buildTimezoneOptions } from "@/lib/timezone-options";
import type {
  ManageEventNotificationState,
  ManageEventView,
  PublicEventSnapshot,
  SnapshotSlot,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useViewerTimezone } from "@/lib/viewer-timezone";

type ManageEventClientProps = {
  initialView: ManageEventView;
  timezones?: string[];
};

type PendingAction =
  | "updateTitle"
  | "closeEvent"
  | "updateFixedDate"
  | "reopenEvent"
  | "renameParticipant"
  | "removeParticipant"
  | "updateNotificationEmail"
  | "updateSchedule";

type RefreshSnapshotOptions = {
  preserveDirtyTitle?: boolean;
};

export function ManageEventClient({
  initialView,
  timezones = [],
}: ManageEventClientProps) {
  const { messages, format, plural, locale, dateFnsLocale } = useI18n();
  const [snapshot, setSnapshot] = useState<PublicEventSnapshot>(initialView.snapshot);
  const [notification, setNotification] = useState<ManageEventNotificationState>(
    initialView.notification,
  );
  const [notificationEmail, setNotificationEmail] = useState(
    initialView.notification.recipientEmail ?? "",
  );
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
  const isFullDayEvent = snapshot.eventType === "full_day";
  const activeParticipantId = useMemo(
    () =>
      snapshot.participants.some((participant) => participant.id === requestedActiveParticipantId)
        ? requestedActiveParticipantId
        : null,
    [requestedActiveParticipantId, snapshot.participants],
  );
  const savedFinalSlot = snapshot.status === "CLOSED" ? snapshot.finalizedSlot : null;
  const isTitleDirty = title !== snapshot.title;
  const normalizedNotificationEmail = notificationEmail.trim().toLowerCase();
  const isNotificationEmailDirty =
    normalizedNotificationEmail !== (notification.recipientEmail ?? "");
  const manageActionUrl = `/api/manage/${initialView.manageKey}`;
  const visibleSuggestions = savedFinalSlot
    ? snapshot.suggestions.filter((suggestion) => suggestion.slotStart !== savedFinalSlot.slotStart)
    : snapshot.suggestions;
  const {
    viewerTimezone,
    viewerTimezoneSelectValue,
    setViewerTimezonePreference,
  } = useViewerTimezone(snapshot.timezone, timezones);
  const timezoneOptions = useMemo(
    () => buildTimezoneOptions(timezones, snapshot.dates[0]?.dateKey),
    [snapshot.dates, timezones],
  );
  const savedFinalSlotDisplayLabel = useMemo(() => {
    if (!savedFinalSlot) {
      return null;
    }

    if (snapshot.eventType === "full_day") {
      return savedFinalSlot.label;
    }

    return formatMeetingWindowLabels({
      slotStart: savedFinalSlot.slotStart,
      slotEnd: savedFinalSlot.slotEnd,
      locale,
      timezone: viewerTimezone,
    }).label;
  }, [locale, savedFinalSlot, snapshot.eventType, viewerTimezone]);
  const visibleSuggestionsWithDisplayLabels = useMemo(
    () =>
      visibleSuggestions.map((suggestion) => ({
        ...suggestion,
        displayLabel:
          snapshot.eventType === "full_day"
            ? suggestion.label
            : formatMeetingWindowLabels({
                slotStart: suggestion.slotStart,
                slotEnd: suggestion.slotEnd,
                locale,
                timezone: viewerTimezone,
              }).label,
      })),
    [locale, snapshot.eventType, viewerTimezone, visibleSuggestions],
  );
  const notificationTimestampFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const pendingDigestSummary = notification.pendingDigest
    ? format(messages.manageEvent.emailAlertsPending, {
        timestamp: notificationTimestampFormatter.format(
          new Date(notification.pendingDigest.flushAfterAt),
        ),
      })
    : messages.manageEvent.emailAlertsIdle;
  const lastSentSummary = notification.lastSentAt
    ? format(messages.manageEvent.emailAlertsLastSent, {
        timestamp: notificationTimestampFormatter.format(new Date(notification.lastSentAt)),
      })
    : null;

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
      onSuccess?: (payload: {
        error?: string;
        notification?: ManageEventNotificationState;
      }) => Promise<void> | void;
    },
  ) {
    setPendingAction(action);

    startTransition(async () => {
      try {
        const response = await request();
        const payload = (await response.json()) as {
          error?: string;
          notification?: ManageEventNotificationState;
        };
        if (!response.ok) {
          toast.error(payload.error ?? errorMessage);
          return;
        }

        toast.success(successMessage);

        if (onSuccess) {
          await onSuccess(payload);
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

  function saveSchedule(payload: {
    dates: string[];
    dayStartMinutes?: number;
    dayEndMinutes?: number;
  }) {
    performManageAction(
      "updateSchedule",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateSchedule",
            ...payload,
          }),
        }),
      {
        successMessage: messages.manageEvent.scheduleSaved,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
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

  function saveNotificationEmail(nextEmail = notificationEmail) {
    performManageAction(
      "updateNotificationEmail",
      () =>
        fetch(manageActionUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateNotificationEmail",
            notificationEmail: nextEmail,
          }),
        }),
      {
        successMessage: nextEmail.trim()
          ? messages.manageEvent.notificationEmailSaved
          : messages.manageEvent.notificationEmailCleared,
        errorMessage: messages.errors.routeFallbacks.updateEvent,
        onSuccess: (payload) => {
          if (!payload.notification) {
            return;
          }

          setNotification(payload.notification);
          setNotificationEmail(payload.notification.recipientEmail ?? "");
        },
      },
    );
  }

  const bestWindowsCard = hasAnyAvailability && visibleSuggestionsWithDisplayLabels.length > 0 ? (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">
          {isFullDayEvent
            ? messages.manageEvent.bestDaysTitle
            : messages.manageEvent.bestWindowsTitle}
        </CardTitle>
        <CardDescription className="text-xs">
          {isFullDayEvent
            ? messages.publicEvent.bestDaysDescription
            : format(messages.publicEvent.bestWindowsDescription, {
                duration: snapshot.meetingDurationMinutes,
              })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {visibleSuggestionsWithDisplayLabels.map((suggestion, index) => (
          <div key={suggestion.slotStart} className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              {format(messages.common.option, { count: index + 1 })}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{suggestion.displayLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plural(
                isFullDayEvent
                  ? messages.publicEvent.fullDayFree
                  : messages.manageEvent.peopleAvailable,
                suggestion.availableCount,
              )}
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
              : isFullDayEvent
                ? messages.manageEvent.statusOpenFullDayDescription
                : messages.manageEvent.statusOpenDescription}
          </p>
        </div>

        {savedFinalSlot ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {isFullDayEvent ? messages.common.fixedDay : messages.common.fixedDate}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{savedFinalSlotDisplayLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plural(
                isFullDayEvent
                  ? messages.publicEvent.fullDayFree
                  : messages.publicEvent.fullWindowFree,
                savedFinalSlot.availableCount,
              )}
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
                          isFullDayEvent
                            ? messages.publicEvent.participantSelectedDays
                            : messages.publicEvent.participantSelectedSlots,
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
            <EventMetaDetails snapshot={snapshot} className="pt-1" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <aside className="order-1 min-w-0 space-y-5 xl:order-2">
          {statusCard}

          {snapshot.status === "OPEN" ? (
            <ScheduleEditorCard
              key={`${snapshot.dates.map((date) => date.dateKey).join(",")}|${snapshot.dayStartMinutes}|${snapshot.dayEndMinutes}`}
              messages={messages}
              format={format}
              plural={plural}
              dateFnsLocale={dateFnsLocale}
              isFullDayEvent={isFullDayEvent}
              slots={snapshot.slots}
              initialDateKeys={snapshot.dates.map((date) => date.dateKey)}
              initialDayStartMinutes={snapshot.dayStartMinutes}
              initialDayEndMinutes={snapshot.dayEndMinutes}
              isPending={isPending}
              isSaving={pendingAction === "updateSchedule"}
              onSave={saveSchedule}
            />
          ) : null}

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

          <Card>
            <CardHeader>
              <CardTitle>{messages.manageEvent.emailAlertsTitle}</CardTitle>
              <CardDescription>{messages.manageEvent.emailAlertsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notification.isConfigured ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="notification-email">
                      {messages.manageEvent.emailAlertsRecipientLabel}
                    </Label>
                    <Input
                      id="notification-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={notificationEmail}
                      placeholder={messages.createEvent.notificationEmailPlaceholder}
                      onChange={(event) => setNotificationEmail(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => saveNotificationEmail()}
                      disabled={isPending || !isNotificationEmailDirty}
                    >
                      {pendingAction === "updateNotificationEmail" ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : null}
                      {messages.manageEvent.emailAlertsSave}
                    </Button>
                    {notification.recipientEmail ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => saveNotificationEmail("")}
                        disabled={isPending}
                      >
                        {messages.manageEvent.emailAlertsClear}
                      </Button>
                    ) : null}
                  </div>
                  <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    <p>{pendingDigestSummary}</p>
                    {lastSentSummary ? <p className="mt-2">{lastSentSummary}</p> : null}
                    <p className="mt-2">{messages.manageEvent.emailAlertsPrivateLinkNote}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {messages.manageEvent.emailAlertsUnavailable}
                </div>
              )}
            </CardContent>
          </Card>

          {bestWindowsCard}
          {participantsCard}
        </aside>

        <div className="order-2 min-w-0 xl:order-1">
          {isFullDayEvent ? (
            <FullDayAvailability
              snapshot={snapshot}
              canEdit={false}
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
              description={
                snapshot.status === "CLOSED"
                  ? messages.manageEvent.closedFullDayDescription
                  : messages.manageEvent.openFullDayDescription
              }
            />
          ) : (
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
              timezoneOptions={timezoneOptions}
              viewerTimezone={viewerTimezone}
              viewerTimezoneSelectValue={viewerTimezoneSelectValue}
              onViewerTimezoneChange={setViewerTimezonePreference}
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
          )}
        </div>
      </div>
    </div>
  );
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortDateKeys(dateKeys: string[]) {
  return [...dateKeys].sort((a, b) => a.localeCompare(b));
}

type ScheduleEditorCardProps = {
  messages: Messages;
  format: (template: string, values?: MessageValues) => string;
  plural: (message: PluralMessage, count: number, values?: MessageValues) => string;
  dateFnsLocale: Locale;
  isFullDayEvent: boolean;
  slots: SnapshotSlot[];
  initialDateKeys: string[];
  initialDayStartMinutes: number;
  initialDayEndMinutes: number;
  isPending: boolean;
  isSaving: boolean;
  onSave: (payload: {
    dates: string[];
    dayStartMinutes?: number;
    dayEndMinutes?: number;
  }) => void;
};

function ScheduleEditorCard({
  messages,
  format,
  plural,
  dateFnsLocale,
  isFullDayEvent,
  slots,
  initialDateKeys,
  initialDayStartMinutes,
  initialDayEndMinutes,
  isPending,
  isSaving,
  onSave,
}: ScheduleEditorCardProps) {
  const scheduleMessages = messages.manageEvent;
  const timeOptions = useMemo(() => buildTimeOptions(30), []);
  const [selectedDateKeys, setSelectedDateKeys] = useState(() => sortDateKeys(initialDateKeys));
  const [dayStartMinutes, setDayStartMinutes] = useState(initialDayStartMinutes);
  const [dayEndMinutes, setDayEndMinutes] = useState(initialDayEndMinutes);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const selectedDates = useMemo(
    () => selectedDateKeys.map((dateKey) => dateKeyToDate(dateKey)),
    [selectedDateKeys],
  );
  const nextDateKeySet = useMemo(() => new Set(selectedDateKeys), [selectedDateKeys]);

  const datesChanged =
    selectedDateKeys.join(",") !== sortDateKeys(initialDateKeys).join(",");
  const windowChanged =
    !isFullDayEvent &&
    (dayStartMinutes !== initialDayStartMinutes || dayEndMinutes !== initialDayEndMinutes);
  const hasChanges = datesChanged || windowChanged;
  const hasNoDates = selectedDateKeys.length === 0;
  const hasInvalidWindow = !isFullDayEvent && dayEndMinutes <= dayStartMinutes;

  const removedSlots = useMemo(
    () =>
      slots.filter((slot) => {
        if (!nextDateKeySet.has(slot.dateKey)) {
          return true;
        }
        if (!isFullDayEvent && (slot.minutes < dayStartMinutes || slot.minutes >= dayEndMinutes)) {
          return true;
        }
        return false;
      }),
    [slots, nextDateKeySet, isFullDayEvent, dayStartMinutes, dayEndMinutes],
  );
  const deletedVotes = useMemo(
    () => removedSlots.reduce((total, slot) => total + slot.availabilityCount, 0),
    [removedSlots],
  );
  const affectedParticipants = useMemo(() => {
    const participantIds = new Set<string>();
    for (const slot of removedSlots) {
      for (const participantId of slot.participantIds) {
        participantIds.add(participantId);
      }
    }
    return participantIds.size;
  }, [removedSlots]);

  const startTimeOptions = timeOptions.filter((option) => option.value < dayEndMinutes);
  const endTimeOptions = timeOptions.filter((option) => option.value > dayStartMinutes);
  const canSave = hasChanges && !hasNoDates && !hasInvalidWindow && !isPending;

  function submit() {
    onSave({
      dates: selectedDateKeys,
      ...(isFullDayEvent ? {} : { dayStartMinutes, dayEndMinutes }),
    });
  }

  function handleSaveClick() {
    if (!canSave) {
      return;
    }
    if (deletedVotes > 0) {
      setIsConfirmOpen(true);
      return;
    }
    submit();
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{scheduleMessages.scheduleTitle}</CardTitle>
        <CardDescription className="text-xs">
          {scheduleMessages.scheduleDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="space-y-2">
          <Label className="text-xs">{scheduleMessages.scheduleDatesLabel}</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="h-9 w-full justify-between font-normal">
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{scheduleMessages.schedulePickDates}</span>
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-2.5">
                    {plural(scheduleMessages.scheduleDatesSelected, selectedDateKeys.length)}
                  </Badge>
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-[min(22rem,calc(100vw-2rem))] p-0"
            >
              <div className="p-3">
                <Calendar
                  mode="multiple"
                  numberOfMonths={1}
                  selected={selectedDates}
                  defaultMonth={selectedDates[0]}
                  weekStartsOn={1}
                  onSelect={(dates) =>
                    setSelectedDateKeys(sortDateKeys((dates ?? []).map(dateToDateKey)))
                  }
                  locale={dateFnsLocale}
                  className="mx-auto"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {isFullDayEvent ? null : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{scheduleMessages.scheduleDayStartLabel}</Label>
              <Select
                value={String(dayStartMinutes)}
                onValueChange={(value) => setDayStartMinutes(Number(value))}
              >
                <SelectTrigger className="w-full" aria-label={scheduleMessages.scheduleDayStartLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {startTimeOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{scheduleMessages.scheduleDayEndLabel}</Label>
              <Select
                value={String(dayEndMinutes)}
                onValueChange={(value) => setDayEndMinutes(Number(value))}
              >
                <SelectTrigger className="w-full" aria-label={scheduleMessages.scheduleDayEndLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {endTimeOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {hasNoDates ? (
          <p className="text-xs text-destructive">{scheduleMessages.scheduleDatesRequired}</p>
        ) : hasInvalidWindow ? (
          <p className="text-xs text-destructive">{scheduleMessages.scheduleInvalidWindow}</p>
        ) : null}

        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!canSave || isSaving}
          onClick={handleSaveClick}
        >
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {scheduleMessages.scheduleSave}
        </Button>
      </CardContent>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{scheduleMessages.scheduleConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {format(scheduleMessages.scheduleConfirmDescription, {
                marks: plural(scheduleMessages.scheduleConfirmMarks, deletedVotes),
                participants: plural(
                  scheduleMessages.scheduleConfirmParticipants,
                  affectedParticipants,
                ),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setIsConfirmOpen(false);
                submit();
              }}
            >
              {scheduleMessages.scheduleConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
