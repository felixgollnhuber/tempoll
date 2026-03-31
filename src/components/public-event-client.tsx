"use client";

import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { EventHeatmap, type BoardMode, type DraftSelection } from "@/components/event-heatmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMeetingWindowLabels } from "@/lib/availability";
import { useI18n } from "@/lib/i18n/context";
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
    acc[`${slot.dateKey}-${slot.minutes}`] = slot.selectedByCurrentUser;
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

  const applySnapshot = useCallback((nextSnapshot: PublicEventSnapshot) => {
    setSnapshot(nextSnapshot);
    setSelectedMap(getSelectedMap(nextSnapshot));
    lastSavedSignatureRef.current = getSelectedSlotStarts(nextSnapshot).join("|");
  }, []);
  const canEdit = Boolean(session && snapshot.status === "OPEN");
  const hasAnyAvailability = snapshot.participants.some(
    (participant) => participant.selectedSlotCount > 0,
  );
  const finalizedSlotLocalLabel = useMemo(() => {
    if (!snapshot.finalizedSlot) {
      return null;
    }

    return formatMeetingWindowLabels({
      slotStart: snapshot.finalizedSlot.slotStart,
      slotEnd: snapshot.finalizedSlot.slotEnd,
      locale,
      timezone: snapshot.timezone,
      viewerTimezone,
    }).localLabel;
  }, [locale, snapshot.finalizedSlot, snapshot.timezone, viewerTimezone]);
  const suggestionsWithLocalLabels = useMemo(
    () =>
      snapshot.suggestions.map((suggestion) => ({
        ...suggestion,
        localLabel: formatMeetingWindowLabels({
          slotStart: suggestion.slotStart,
          slotEnd: suggestion.slotEnd,
          locale,
          timezone: snapshot.timezone,
          viewerTimezone,
        }).localLabel,
      })),
    [locale, snapshot.suggestions, snapshot.timezone, viewerTimezone],
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
        .filter((slot) => selectedMap[`${slot.dateKey}-${slot.minutes}`])
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
    setJoining(true);
    setJoinError(null);

    const response = await fetch(`/api/events/${slug}/participants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: name,
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
    (dateKey: string, minutes: number, nextValue?: boolean) => {
      if (!canEdit) {
        return false;
      }

      const key = `${dateKey}-${minutes}`;
      let didChange = false;

      setSelectedMap((current) => {
        const targetValue = nextValue ?? !current[key];
        if (current[key] === targetValue) {
          return current;
        }

        didChange = true;
        return {
          ...current,
          [key]: targetValue,
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
            {messages.publicEvent.fixedDateDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{snapshot.finalizedSlot.label}</p>
            {finalizedSlotLocalLabel ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {format(messages.publicEvent.yourTimezone, {
                  label: finalizedSlotLocalLabel,
                })}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plural(messages.publicEvent.fullWindowFree, snapshot.finalizedSlot.availableCount)}
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
          <CardTitle className="text-sm">{messages.publicEvent.bestWindowsTitle}</CardTitle>
          <CardDescription className="text-xs">
            {format(messages.publicEvent.bestWindowsDescription, {
              duration: snapshot.meetingDurationMinutes,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {suggestionsWithLocalLabels.map((suggestion, index) => (
            <div key={suggestion.slotStart} className="rounded-md border bg-muted/20 px-3 py-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                {format(messages.common.option, { count: index + 1 })}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{suggestion.label}</p>
              {suggestion.localLabel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {format(messages.publicEvent.yourTimezone, {
                    label: suggestion.localLabel,
                  })}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {plural(messages.publicEvent.fullWindowFree, suggestion.availableCount)}
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
      {!session ? (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">{messages.publicEvent.joinTitle}</CardTitle>
            <CardDescription className="text-xs">
              {messages.publicEvent.joinDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="displayName">{messages.publicEvent.yourNameLabel}</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={messages.publicEvent.yourNamePlaceholder}
                />
              </div>
              <Button onClick={handleJoin} disabled={joining || snapshot.status === "CLOSED"}>
                {joining ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {messages.publicEvent.joinButton}
              </Button>
            </div>
            {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
          </CardContent>
        </Card>
      ) : null}

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
        timezones={timezones}
        viewerTimezone={viewerTimezone}
        viewerTimezoneSelectValue={viewerTimezoneSelectValue}
        onViewerTimezoneChange={setViewerTimezonePreference}
      />
    </div>
  );
}
