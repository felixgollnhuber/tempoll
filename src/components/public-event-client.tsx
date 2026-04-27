"use client";

import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { EventHeatmap, type BoardMode, type DraftSelection } from "@/components/event-heatmap";
import { FullDayAvailability } from "@/components/full-day-availability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMeetingWindowLabels } from "@/lib/availability";
import { useI18n } from "@/lib/i18n/context";
import { buildTimezoneOptions } from "@/lib/timezone-options";
import type { PublicEventSnapshot, RealtimeEventPayload } from "@/lib/types";
import { useViewerTimezone } from "@/lib/viewer-timezone";

type PublicEventClientProps = {
  slug: string;
  shareUrl?: string;
  initialSnapshot: PublicEventSnapshot;
  timezones?: string[];
  initialSession:
    | {
        participantId: string;
        displayName: string;
      }
    | null;
};

type ParticipantSessionState =
  | {
      participantId: string;
      displayName: string;
    }
  | null;

function getInitialMode(hasEditableSession: boolean): BoardMode {
  return hasEditableSession ? "edit" : "view";
}

function getSelectedMap(snapshot: PublicEventSnapshot) {
  return snapshot.slots.reduce<DraftSelection>((acc, slot) => {
    acc[slot.slotStart] = slot.selectedByCurrentUser;
    return acc;
  }, {});
}

function getSelectedSlotStarts(snapshot: PublicEventSnapshot) {
  return snapshot.slots
    .filter((slot) => slot.selectedByCurrentUser)
    .map((slot) => slot.slotStart);
}

export function PublicEventClient({
  slug,
  shareUrl,
  initialSnapshot,
  timezones = [],
  initialSession,
}: PublicEventClientProps) {
  const { messages, format, plural, locale } = useI18n();
  const publicShareUrl = shareUrl ?? `/e/${initialSnapshot.slug}`;
  const saveAvailabilityFallback = messages.errors.routeFallbacks.saveAvailability;
  const initialHasEditableSession = Boolean(initialSession && initialSnapshot.status === "OPEN");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [session, setSession] = useState<ParticipantSessionState>(initialSession);
  const [name, setName] = useState("");
  const [selectedMap, setSelectedMap] = useState(() => getSelectedMap(initialSnapshot));
  const [mode, setMode] = useState<BoardMode>(() => getInitialMode(initialHasEditableSession));
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const localAvailabilityEchoRef = useRef<{
    participantId: string;
    expiresAt: number;
  } | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedSelectedSlotStartsRef = useRef<string[] | null>(null);
  const lastSavedSignatureRef = useRef(getSelectedSlotStarts(initialSnapshot).join("|"));
  const {
    viewerTimezone,
    viewerTimezoneSelectValue,
    setViewerTimezonePreference,
  } = useViewerTimezone(snapshot.timezone, timezones);
  const timezoneOptions = useMemo(
    () => buildTimezoneOptions(timezones, snapshot.dates[0]?.dateKey),
    [snapshot.dates, timezones],
  );

  const applySnapshot = useCallback((nextSnapshot: PublicEventSnapshot) => {
    setSnapshot(nextSnapshot);
    setSelectedMap(getSelectedMap(nextSnapshot));
    lastSavedSignatureRef.current = getSelectedSlotStarts(nextSnapshot).join("|");
  }, []);
  const canEdit = Boolean(session && snapshot.status === "OPEN");
  const shouldShowPreJoin = !session && snapshot.status === "OPEN";
  const trimmedName = name.trim();
  const canJoin =
    snapshot.status === "OPEN" && trimmedName.length >= 2 && trimmedName.length <= 32;
  const isFullDayEvent = snapshot.eventType === "full_day";
  const hasAnyAvailability = snapshot.participants.some(
    (participant) => participant.selectedSlotCount > 0,
  );
  const finalizedSlotDisplayLabel = useMemo(() => {
    if (!snapshot.finalizedSlot) {
      return null;
    }

    if (snapshot.eventType === "full_day") {
      return snapshot.finalizedSlot.label;
    }

    return formatMeetingWindowLabels({
      slotStart: snapshot.finalizedSlot.slotStart,
      slotEnd: snapshot.finalizedSlot.slotEnd,
      locale,
      timezone: viewerTimezone,
    }).label;
  }, [locale, snapshot.eventType, snapshot.finalizedSlot, viewerTimezone]);
  const suggestionsWithDisplayLabels = useMemo(
    () =>
      snapshot.suggestions.map((suggestion) => ({
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
    [locale, snapshot.eventType, snapshot.suggestions, viewerTimezone],
  );

  const fetchSnapshot = useCallback(async () => {
    const response = await fetch(`/api/events/${slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { snapshot: PublicEventSnapshot };
    applySnapshot(payload.snapshot);
  }, [applySnapshot, slug]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/events/${slug}/stream`);
    eventSource.addEventListener("event-update", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as RealtimeEventPayload;
      const localEcho = localAvailabilityEchoRef.current;

      if (
        payload.kind === "availability-saved" &&
        payload.participantId &&
        localEcho &&
        localEcho.participantId === payload.participantId &&
        localEcho.expiresAt > Date.now()
      ) {
        return;
      }

      void fetchSnapshot();
    });

    return () => eventSource.close();
  }, [fetchSnapshot, slug]);

  useEffect(() => {
    if (!canEdit) {
      return;
    }

    const handle = window.setTimeout(async () => {
      const selectedSlotStarts = snapshot.slots
        .filter((slot) => selectedMap[slot.slotStart])
        .map((slot) => slot.slotStart);

      queuedSelectedSlotStartsRef.current = selectedSlotStarts;

      if (saveInFlightRef.current) {
        return;
      }

      const drainQueue = async () => {
        if (!session) {
          return;
        }

        saveInFlightRef.current = true;

        try {
          while (queuedSelectedSlotStartsRef.current) {
            const nextSelectedSlotStarts = queuedSelectedSlotStartsRef.current;
            queuedSelectedSlotStartsRef.current = null;

            const nextSignature = nextSelectedSlotStarts.join("|");
            if (nextSignature === lastSavedSignatureRef.current) {
              continue;
            }

            localAvailabilityEchoRef.current = {
              participantId: session.participantId,
              expiresAt: Date.now() + 5_000,
            };

            const response = await fetch(`/api/events/${slug}/availability`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                selectedSlotStarts: nextSelectedSlotStarts,
              }),
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              localAvailabilityEchoRef.current = null;
              toast.error(payload.error ?? saveAvailabilityFallback);
              continue;
            }

            const payload = (await response.json()) as { snapshot?: PublicEventSnapshot };
            if (payload.snapshot) {
              applySnapshot(payload.snapshot);
            } else {
              lastSavedSignatureRef.current = nextSignature;
            }

            localAvailabilityEchoRef.current = {
              participantId: session.participantId,
              expiresAt: Date.now() + 1500,
            };
          }
        } finally {
          saveInFlightRef.current = false;

          if (queuedSelectedSlotStartsRef.current) {
            void drainQueue();
          }
        }
      };

      void drainQueue();
    }, 500);

    return () => window.clearTimeout(handle);
  }, [
    applySnapshot,
    canEdit,
    draftVersion,
    saveAvailabilityFallback,
    selectedMap,
    session,
    slug,
    snapshot.slots,
  ]);

  useEffect(() => {
    if (!canEdit) {
      setMode("view");
    }
  }, [canEdit]);

  async function handleJoin() {
    if (!canJoin) {
      return;
    }

    setJoining(true);
    setJoinError(null);

    const response = await fetch(`/api/events/${slug}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: trimmedName,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      session?: ParticipantSessionState;
    };

    setJoining(false);

    if (!response.ok || !payload.session) {
      setJoinError(payload.error ?? messages.errors.routeFallbacks.joinEvent);
      return;
    }

    setSession(payload.session);
    setMode("edit");
    setName("");
    toast.success(messages.publicEvent.joined);
    await fetchSnapshot();
  }

  const updateCell = useCallback(
    (slotStart: string, nextValue?: boolean) => {
      if (!canEdit) {
        return false;
      }

      let didChange = false;

      setSelectedMap((current) => {
        const targetValue = nextValue ?? !current[slotStart];
        if (current[slotStart] === targetValue) {
          return current;
        }

        didChange = true;
        return {
          ...current,
          [slotStart]: targetValue,
        };
      });

      if (didChange) {
        setDraftVersion((current) => current + 1);
      }

      return didChange;
    },
    [canEdit],
  );

  const shareCard = (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">{messages.publicEvent.shareTitle}</CardTitle>
        <CardDescription className="text-xs">
          {messages.publicEvent.shareDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="space-y-2">
          <Label>{messages.publicEvent.shareUrlLabel}</Label>
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {publicShareUrl}
          </div>
        </div>
        <CopyButton value={publicShareUrl} label={messages.publicEvent.copyShareUrl} />
      </CardContent>
    </Card>
  );

  const scheduleSummaryCard =
    snapshot.status === "CLOSED" && snapshot.finalizedSlot ? (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">{messages.common.fixedDate}</CardTitle>
          <CardDescription className="text-xs">
            {isFullDayEvent
              ? messages.publicEvent.fixedDayDescription
              : messages.publicEvent.fixedDateDescription}
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{finalizedSlotDisplayLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plural(
                isFullDayEvent
                  ? messages.publicEvent.fullDayFree
                  : messages.publicEvent.fullWindowFree,
                snapshot.finalizedSlot.availableCount,
              )}
            </p>
          </div>
          <Button asChild size="sm" className="w-full">
            <a href={`/api/events/${slug}/ics`}>
              {messages.common.addToCalendar}
            </a>
          </Button>
        </CardContent>
      </Card>
    ) : hasAnyAvailability ? (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">
            {isFullDayEvent
              ? messages.publicEvent.bestDaysTitle
              : messages.publicEvent.bestWindowsTitle}
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
          {suggestionsWithDisplayLabels.map((suggestion, index) => (
            <div key={suggestion.slotStart} className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                {format(messages.common.option, { count: index + 1 })}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{suggestion.displayLabel}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {plural(
                  isFullDayEvent
                    ? messages.publicEvent.fullDayFree
                    : messages.publicEvent.fullWindowFree,
                  suggestion.availableCount,
                )}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    ) : null;

  const sidebarTopContent = (
    <>
      {shareCard}
      {scheduleSummaryCard}
    </>
  );

  return (
    <div className="space-y-4">
      {shouldShowPreJoin ? (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 p-5">
            <CardTitle role="heading" aria-level={1} className="text-2xl">
              {snapshot.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {isFullDayEvent
                ? messages.publicEvent.joinDescriptionFullDay
                : messages.publicEvent.joinDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </span>
                  <h2 className="text-sm font-semibold text-foreground">
                    {messages.publicEvent.joinStepNameTitle}
                  </h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">{messages.publicEvent.yourNameLabel}</Label>
                  <Input
                    id="displayName"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={messages.publicEvent.yourNamePlaceholder}
                  />
                </div>
              </div>
              <div className="rounded-md border border-dashed bg-muted/20 p-4 text-muted-foreground">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                    2
                  </span>
                  <h2 className="text-sm font-semibold text-foreground">
                    {messages.publicEvent.joinStepAvailabilityTitle}
                  </h2>
                </div>
                <p className="text-sm">
                  {isFullDayEvent
                    ? messages.publicEvent.joinStepAvailabilityDescriptionFullDay
                    : messages.publicEvent.joinStepAvailabilityDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {isFullDayEvent
                  ? messages.publicEvent.joinGateDescriptionFullDay
                  : messages.publicEvent.joinGateDescription}
              </p>
              <Button onClick={handleJoin} disabled={joining || !canJoin} className="sm:min-w-36">
                {joining ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {messages.publicEvent.joinButton}
              </Button>
            </div>
            {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {shouldShowPreJoin ? null : isFullDayEvent ? (
        <FullDayAvailability
          snapshot={snapshot}
          mode={mode}
          onModeChange={setMode}
          canEdit={canEdit}
          selectedMap={selectedMap}
          onUpdateDay={updateCell}
          finalSlotStart={snapshot.finalizedSlot?.slotStart ?? null}
          sessionBadgeLabel={session?.displayName ?? null}
          sidebarTopContent={sidebarTopContent}
        />
      ) : (
        <EventHeatmap
          snapshot={snapshot}
          mode={mode}
          onModeChange={setMode}
          canEdit={canEdit}
          selectedMap={selectedMap}
          onUpdateCell={updateCell}
          finalSlotStart={snapshot.finalizedSlot?.slotStart ?? null}
          sessionBadgeLabel={session?.displayName ?? null}
          sidebarTopContent={sidebarTopContent}
          timezoneOptions={timezoneOptions}
          viewerTimezone={viewerTimezone}
          viewerTimezoneSelectValue={viewerTimezoneSelectValue}
          onViewerTimezoneChange={setViewerTimezonePreference}
        />
      )}
    </div>
  );
}
