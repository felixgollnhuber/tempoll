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
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
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
import {
  buildScheduleSignature,
  buildTimeOptions,
  doesZonedCivilDateExist,
  formatMeetingWindowLabels,
  getAllowedFinalSlotStarts,
  isExistingZonedWallTime,
  sortDateKeys,
} from "@/lib/availability";
import { fullDayDateLimit, timeGridDateLimit } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/context";
import type { MessageValues, PluralMessage } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { buildTimezoneOptions } from "@/lib/timezone-options";
import type {
  ManageEventNotificationState,
  ManageEventView,
  PublicEventSnapshot,
  SnapshotParticipant,
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

type ScheduleValues = {
  dates: string[];
  dayStartMinutes: number;
  dayEndMinutes: number;
};

type ScheduleEditorState = {
  saved: ScheduleValues;
  draft: ScheduleValues;
  hasRemoteConflict: boolean;
};

type ScheduleEditorAction =
  | { type: "edit"; value: ScheduleValues }
  | { type: "serverReceived"; value: ScheduleValues; discardDraft: boolean }
  | { type: "useLatest" }
  | { type: "keepChanges" };

function getScheduleValues(snapshot: PublicEventSnapshot): ScheduleValues {
  return {
    dates: sortDateKeys(snapshot.dates.map((date) => date.dateKey)),
    dayStartMinutes: snapshot.dayStartMinutes,
    dayEndMinutes: snapshot.dayEndMinutes,
  };
}

function getScheduleSignature(value: ScheduleValues) {
  return buildScheduleSignature({
    dates: value.dates,
    dayStartMinutes: value.dayStartMinutes,
    dayEndMinutes: value.dayEndMinutes,
  });
}

function createScheduleEditorState(value: ScheduleValues): ScheduleEditorState {
  return {
    saved: value,
    draft: value,
    hasRemoteConflict: false,
  };
}

function scheduleEditorReducer(
  state: ScheduleEditorState,
  action: ScheduleEditorAction,
): ScheduleEditorState {
  if (action.type === "edit") {
    return {
      ...state,
      draft: action.value,
      hasRemoteConflict:
        getScheduleSignature(action.value) === getScheduleSignature(state.saved)
          ? false
          : state.hasRemoteConflict,
    };
  }

  if (action.type === "useLatest") {
    return {
      saved: state.saved,
      draft: state.saved,
      hasRemoteConflict: false,
    };
  }

  if (action.type === "keepChanges") {
    return {
      ...state,
      hasRemoteConflict: false,
    };
  }

  const nextSaved = action.value;
  if (action.discardDraft) {
    return createScheduleEditorState(nextSaved);
  }

  const previousSavedSignature = getScheduleSignature(state.saved);
  const nextSavedSignature = getScheduleSignature(nextSaved);
  if (previousSavedSignature === nextSavedSignature) {
    return state;
  }

  const draftSignature = getScheduleSignature(state.draft);
  if (draftSignature === previousSavedSignature || draftSignature === nextSavedSignature) {
    return createScheduleEditorState(nextSaved);
  }

  return {
    saved: nextSaved,
    draft: state.draft,
    hasRemoteConflict: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonRecord(response: Response) {
  try {
    const value: unknown = await response.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

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
  const [scheduleEditorState, dispatchScheduleEditor] = useReducer(
    scheduleEditorReducer,
    getScheduleValues(initialView.snapshot),
    createScheduleEditorState,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const snapshotRefreshSequenceRef = useRef(0);
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
      const refreshSequence = snapshotRefreshSequenceRef.current + 1;
      snapshotRefreshSequenceRef.current = refreshSequence;

      try {
        const response = await fetch(`/api/events/${initialView.snapshot.slug}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return false;
        }

        const payload = await readJsonRecord(response);
        if (!payload || !isRecord(payload.snapshot)) {
          return false;
        }

        if (refreshSequence !== snapshotRefreshSequenceRef.current) {
          return false;
        }

        const nextSnapshot = payload.snapshot as PublicEventSnapshot;
        setSnapshot(nextSnapshot);
        dispatchScheduleEditor({
          type: "serverReceived",
          value: getScheduleValues(nextSnapshot),
          discardDraft: false,
        });
        setTitle((currentTitle) =>
          preserveDirtyTitle && currentTitle !== snapshot.title
            ? currentTitle
            : nextSnapshot.title,
        );
        return true;
      } catch {
        return false;
      }
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
      refreshSnapshotOnError = false,
      successMessage,
    }: {
      successMessage: string;
      errorMessage: string;
      preserveDirtyTitleOnRefresh?: boolean;
      refreshSnapshotOnError?: boolean;
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
        const rawPayload = await readJsonRecord(response);
        const payload = {
          error:
            rawPayload && typeof rawPayload.error === "string" ? rawPayload.error : undefined,
          notification:
            rawPayload && isRecord(rawPayload.notification)
              ? (rawPayload.notification as ManageEventNotificationState)
              : undefined,
        };
        if (!response.ok) {
          toast.error(payload.error ?? errorMessage);
          if (refreshSnapshotOnError) {
            await refreshSnapshot({ preserveDirtyTitle: true });
          }
          return;
        }

        if (!rawPayload || rawPayload.ok !== true) {
          toast.error(errorMessage);
          if (refreshSnapshotOnError) {
            await refreshSnapshot({ preserveDirtyTitle: true });
          }
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
      } catch {
        toast.error(errorMessage);
        if (refreshSnapshotOnError) {
          await refreshSnapshot({ preserveDirtyTitle: true });
        }
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
    expectedScheduleSignature: string;
    expectedDeletedVotes: number;
    expectedAffectedParticipants: number;
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
        refreshSnapshotOnError: true,
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
              messages={messages}
              format={format}
              plural={plural}
              dateFnsLocale={dateFnsLocale}
              isFullDayEvent={isFullDayEvent}
              slots={snapshot.slots}
              participants={snapshot.participants}
              value={scheduleEditorState.draft}
              expectedScheduleSignature={getScheduleSignature(scheduleEditorState.saved)}
              hasRemoteConflict={scheduleEditorState.hasRemoteConflict}
              timezone={snapshot.timezone}
              slotMinutes={snapshot.slotMinutes}
              meetingDurationMinutes={snapshot.meetingDurationMinutes}
              fullDayStartMinutes={snapshot.fullDayStartMinutes ?? null}
              isPending={isPending}
              isSaving={pendingAction === "updateSchedule"}
              onChange={(value) => dispatchScheduleEditor({ type: "edit", value })}
              onUseLatest={() => dispatchScheduleEditor({ type: "useLatest" })}
              onKeepChanges={() => dispatchScheduleEditor({ type: "keepChanges" })}
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
              isFixedDateActionDisabled={isPending || pendingAction !== null}
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
              isFixedDateActionDisabled={isPending || pendingAction !== null}
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

type ScheduleEditorCardProps = {
  messages: Messages;
  format: (template: string, values?: MessageValues) => string;
  plural: (message: PluralMessage, count: number, values?: MessageValues) => string;
  dateFnsLocale: Locale;
  isFullDayEvent: boolean;
  slots: SnapshotSlot[];
  participants: SnapshotParticipant[];
  value: ScheduleValues;
  expectedScheduleSignature: string;
  hasRemoteConflict: boolean;
  timezone: string;
  slotMinutes: number;
  meetingDurationMinutes: number;
  fullDayStartMinutes: number | null;
  isPending: boolean;
  isSaving: boolean;
  onChange: (value: ScheduleValues) => void;
  onUseLatest: () => void;
  onKeepChanges: () => void;
  onSave: (payload: {
    dates: string[];
    dayStartMinutes?: number;
    dayEndMinutes?: number;
    expectedScheduleSignature: string;
    expectedDeletedVotes: number;
    expectedAffectedParticipants: number;
  }) => void;
};

function ScheduleEditorCard({
  messages,
  format,
  plural,
  dateFnsLocale,
  isFullDayEvent,
  slots,
  participants,
  value,
  expectedScheduleSignature,
  hasRemoteConflict,
  timezone,
  slotMinutes,
  meetingDurationMinutes,
  fullDayStartMinutes,
  isPending,
  isSaving,
  onChange,
  onUseLatest,
  onKeepChanges,
  onSave,
}: ScheduleEditorCardProps) {
  const scheduleMessages = messages.manageEvent;
  const timeOptions = useMemo(() => buildTimeOptions(30), []);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const datesTriggerId = useId();
  const datesHelpId = useId();
  const datesErrorId = useId();
  const dayStartTriggerId = useId();
  const dayEndTriggerId = useId();
  const windowErrorId = useId();
  const dateLimit = isFullDayEvent ? fullDayDateLimit : timeGridDateLimit;
  const selectedDateKeys = value.dates;
  const { dayStartMinutes, dayEndMinutes } = value;

  const selectedDates = useMemo(
    () => selectedDateKeys.map((dateKey) => dateKeyToDate(dateKey)),
    [selectedDateKeys],
  );
  const nextDateKeySet = useMemo(() => new Set(selectedDateKeys), [selectedDateKeys]);

  const draftScheduleSignature = getScheduleSignature(value);
  const hasChanges = draftScheduleSignature !== expectedScheduleSignature;
  const hasNoDates = selectedDateKeys.length === 0;
  const hasTooManyDates = selectedDateKeys.length > dateLimit;
  const hasInvalidWindow = !isFullDayEvent && dayEndMinutes <= dayStartMinutes;
  const hasUnavailableFullDayDate =
    isFullDayEvent &&
    selectedDateKeys.some(
      (dateKey) => !doesZonedCivilDateExist({ dateKey, timezone }),
    );
  const hasUnavailableFullDayStart =
    isFullDayEvent &&
    fullDayStartMinutes != null &&
    selectedDateKeys.some(
      (dateKey) =>
        !isExistingZonedWallTime({
          dateKey,
          minutes: fullDayStartMinutes,
          timezone,
        }),
    );
  const hasNoValidMeetingWindow = useMemo(
    () =>
      !isFullDayEvent &&
      !hasNoDates &&
      !hasInvalidWindow &&
      getAllowedFinalSlotStarts({
        dates: selectedDateKeys,
        timezone,
        dayStartMinutes,
        dayEndMinutes,
        slotMinutes,
        meetingDurationMinutes,
      }).size === 0,
    [
      dayEndMinutes,
      dayStartMinutes,
      hasInvalidWindow,
      hasNoDates,
      isFullDayEvent,
      meetingDurationMinutes,
      selectedDateKeys,
      slotMinutes,
      timezone,
    ],
  );

  const removedSlots = useMemo(
    () => {
      const isRetained = (slot: SnapshotSlot) =>
        nextDateKeySet.has(slot.dateKey) &&
        (isFullDayEvent || (slot.minutes >= dayStartMinutes && slot.minutes < dayEndMinutes));
      const retainedSlotStarts = new Set(
        slots.filter(isRetained).map((slot) => slot.slotStart),
      );
      const removedBySlotStart = new Map<string, SnapshotSlot>();

      for (const slot of slots) {
        if (!isRetained(slot) && !retainedSlotStarts.has(slot.slotStart)) {
          removedBySlotStart.set(slot.slotStart, slot);
        }
      }

      return Array.from(removedBySlotStart.values());
    },
    [slots, nextDateKeySet, isFullDayEvent, dayStartMinutes, dayEndMinutes],
  );
  const visibleSlotCountsByParticipant = useMemo(() => {
    const slotStartsByParticipant = new Map<string, Set<string>>();
    for (const slot of slots) {
      for (const participantId of slot.participantIds) {
        const slotStarts = slotStartsByParticipant.get(participantId) ?? new Set<string>();
        slotStarts.add(slot.slotStart);
        slotStartsByParticipant.set(participantId, slotStarts);
      }
    }
    return new Map(
      Array.from(slotStartsByParticipant, ([participantId, slotStarts]) => [
        participantId,
        slotStarts.size,
      ]),
    );
  }, [slots]);
  const orphanedVotesByParticipant = useMemo(
    () =>
      new Map(
        participants
          .map((participant) => [
            participant.id,
            Math.max(
              0,
              participant.selectedSlotCount -
                (visibleSlotCountsByParticipant.get(participant.id) ?? 0),
            ),
          ] as const)
          .filter((entry) => entry[1] > 0),
      ),
    [participants, visibleSlotCountsByParticipant],
  );
  const deletedVotes = useMemo(
    () =>
      removedSlots.reduce((total, slot) => total + slot.availabilityCount, 0) +
      Array.from(orphanedVotesByParticipant.values()).reduce(
        (total, orphanedVotes) => total + orphanedVotes,
        0,
      ),
    [orphanedVotesByParticipant, removedSlots],
  );
  const affectedParticipants = useMemo(() => {
    const participantIds = new Set(orphanedVotesByParticipant.keys());
    for (const slot of removedSlots) {
      for (const participantId of slot.participantIds) {
        participantIds.add(participantId);
      }
    }
    return participantIds.size;
  }, [orphanedVotesByParticipant, removedSlots]);

  const startTimeOptions = timeOptions.filter((option) => option.value < dayEndMinutes);
  const endTimeOptions = timeOptions.filter((option) => option.value > dayStartMinutes);
  const isDateLimitReached = selectedDateKeys.length >= dateLimit;
  const hasDateError =
    hasNoDates ||
    hasTooManyDates ||
    hasUnavailableFullDayDate ||
    hasUnavailableFullDayStart;
  const hasWindowError = hasInvalidWindow || hasNoValidMeetingWindow;
  const canSave =
    hasChanges &&
    !hasDateError &&
    !hasWindowError &&
    !hasRemoteConflict &&
    !isPending;

  function updateValue(patch: Partial<ScheduleValues>) {
    onChange({
      ...value,
      ...patch,
    });
  }

  function submit() {
    if (!canSave) {
      return;
    }

    onSave({
      dates: selectedDateKeys,
      ...(isFullDayEvent ? {} : { dayStartMinutes, dayEndMinutes }),
      expectedScheduleSignature,
      expectedDeletedVotes: deletedVotes,
      expectedAffectedParticipants: affectedParticipants,
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
        {hasRemoteConflict ? (
          <div
            role="status"
            aria-live="polite"
            className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3"
          >
            <div>
              <p className="text-xs font-medium text-foreground">
                {scheduleMessages.scheduleRemoteChangeTitle}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {scheduleMessages.scheduleRemoteChangeDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setIsConfirmOpen(false);
                  setIsDatePickerOpen(false);
                  onUseLatest();
                }}
              >
                {scheduleMessages.scheduleUseLatest}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  setIsConfirmOpen(false);
                  onKeepChanges();
                }}
              >
                {scheduleMessages.scheduleKeepChanges}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={datesTriggerId} className="text-xs">
            {scheduleMessages.scheduleDatesLabel}
          </Label>
          <Popover
            open={isDatePickerOpen}
            onOpenChange={(open) => setIsDatePickerOpen(open && !isPending && !hasRemoteConflict)}
          >
            <PopoverTrigger asChild>
              <Button
                id={datesTriggerId}
                type="button"
                variant="outline"
                disabled={isPending || hasRemoteConflict}
                aria-invalid={hasDateError || undefined}
                aria-describedby={`${datesHelpId}${hasDateError ? ` ${datesErrorId}` : ""}`}
                className="h-9 w-full justify-between font-normal"
              >
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
                  disabled={(date) =>
                    isPending ||
                    hasRemoteConflict ||
                    (isDateLimitReached && !nextDateKeySet.has(dateToDateKey(date)))
                  }
                  onSelect={(dates) => {
                    const nextDateKeys = sortDateKeys((dates ?? []).map(dateToDateKey));
                    if (nextDateKeys.length <= dateLimit) {
                      updateValue({ dates: nextDateKeys });
                    }
                  }}
                  locale={dateFnsLocale}
                  className="mx-auto"
                />
              </div>
            </PopoverContent>
          </Popover>
          <p id={datesHelpId} className="text-xs text-muted-foreground">
            {format(scheduleMessages.scheduleDateLimit, { count: dateLimit })}
          </p>
          {hasDateError ? (
            <p id={datesErrorId} role="alert" className="text-xs text-destructive">
              {hasNoDates
                ? scheduleMessages.scheduleDatesRequired
                : hasTooManyDates
                  ? format(scheduleMessages.scheduleDateLimit, { count: dateLimit })
                  : hasUnavailableFullDayDate
                    ? messages.validation.eventCreate.fullDayDateUnavailable
                    : messages.validation.eventCreate.fullDayStartUnavailable}
            </p>
          ) : null}
        </div>

        {isFullDayEvent ? null : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={dayStartTriggerId} className="text-xs">
                {scheduleMessages.scheduleDayStartLabel}
              </Label>
              <Select
                value={String(dayStartMinutes)}
                disabled={isPending || hasRemoteConflict}
                onValueChange={(nextValue) =>
                  updateValue({ dayStartMinutes: Number(nextValue) })
                }
              >
                <SelectTrigger
                  id={dayStartTriggerId}
                  className="w-full"
                  aria-invalid={hasWindowError || undefined}
                  aria-describedby={hasWindowError ? windowErrorId : undefined}
                >
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
              <Label htmlFor={dayEndTriggerId} className="text-xs">
                {scheduleMessages.scheduleDayEndLabel}
              </Label>
              <Select
                value={String(dayEndMinutes)}
                disabled={isPending || hasRemoteConflict}
                onValueChange={(nextValue) =>
                  updateValue({ dayEndMinutes: Number(nextValue) })
                }
              >
                <SelectTrigger
                  id={dayEndTriggerId}
                  className="w-full"
                  aria-invalid={hasWindowError || undefined}
                  aria-describedby={hasWindowError ? windowErrorId : undefined}
                >
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

        {hasWindowError ? (
          <p id={windowErrorId} role="alert" className="text-xs text-destructive">
            {hasInvalidWindow
              ? scheduleMessages.scheduleInvalidWindow
              : format(scheduleMessages.scheduleNoValidMeetingWindow, {
                  duration: meetingDurationMinutes,
                })}
          </p>
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
              {hasRemoteConflict
                ? `${scheduleMessages.scheduleRemoteChangeTitle} ${scheduleMessages.scheduleRemoteChangeDescription}`
                : format(scheduleMessages.scheduleConfirmDescription, {
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
              disabled={!canSave || isSaving}
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
