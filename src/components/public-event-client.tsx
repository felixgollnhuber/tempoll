"use client";

import { CalendarDaysIcon, Clock3Icon, Loader2Icon, LockIcon, UsersIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PublicEventSnapshot, RealtimeEventPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

type PublicEventClientProps = {
  slug: string;
  initialSnapshot: PublicEventSnapshot;
  initialSession:
    | {
        participantId: string;
        displayName: string;
        editToken: string;
      }
    | null;
};

type ParticipantSessionState =
  | {
      participantId: string;
      displayName: string;
      editToken: string;
    }
  | null;

type DraftSelection = Record<string, boolean>;

function slotKey(dateKey: string, minutes: number) {
  return `${dateKey}-${minutes}`;
}

function getHeatColor(slot: { availabilityCount: number; selectedByCurrentUser: boolean }) {
  if (slot.selectedByCurrentUser) {
    return "bg-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]";
  }

  if (slot.availabilityCount >= 6) {
    return "bg-primary/80";
  }

  if (slot.availabilityCount === 5) {
    return "bg-primary/65";
  }

  if (slot.availabilityCount === 4) {
    return "bg-primary/50";
  }

  if (slot.availabilityCount === 3) {
    return "bg-primary/36";
  }

  if (slot.availabilityCount === 2) {
    return "bg-primary/24";
  }

  if (slot.availabilityCount === 1) {
    return "bg-primary/12";
  }

  return "bg-background";
}

function getCellHeightClass(slotMinutes: number) {
  if (slotMinutes <= 15) {
    return "h-4";
  }

  if (slotMinutes <= 30) {
    return "h-5";
  }

  return "h-7";
}

function splitDateLabel(label: string) {
  const [weekday, monthDay] = label.split(", ");

  return {
    weekday: weekday ?? label,
    monthDay: monthDay ?? "",
  };
}

function isMajorTimeLabel(minutes: number) {
  return minutes % 60 === 0;
}

function getSelectedMap(snapshot: PublicEventSnapshot) {
  return snapshot.slots.reduce<DraftSelection>((acc, slot) => {
    acc[slotKey(slot.dateKey, slot.minutes)] = slot.selectedByCurrentUser;
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
  initialSnapshot,
  initialSession,
}: PublicEventClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [session, setSession] = useState<ParticipantSessionState>(initialSession);
  const [name, setName] = useState("");
  const [selectedMap, setSelectedMap] = useState(() => getSelectedMap(initialSnapshot));
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const dragValue = useRef<boolean | null>(null);
  const localAvailabilityEchoRef = useRef<{
    participantId: string;
    expiresAt: number;
  } | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedSelectedSlotStartsRef = useRef<string[] | null>(null);
  const lastSavedSignatureRef = useRef(getSelectedSlotStarts(initialSnapshot).join("|"));

  const applySnapshot = useCallback((nextSnapshot: PublicEventSnapshot) => {
    setSnapshot(nextSnapshot);
    setSelectedMap(getSelectedMap(nextSnapshot));
    lastSavedSignatureRef.current = getSelectedSlotStarts(nextSnapshot).join("|");
  }, []);

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
    if (!session || snapshot.status === "CLOSED") {
      return;
    }

    const handle = window.setTimeout(async () => {
      const selectedSlotStarts = snapshot.slots
        .filter((slot) => selectedMap[slotKey(slot.dateKey, slot.minutes)])
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
                participantId: session.participantId,
                editToken: session.editToken,
                selectedSlotStarts: nextSelectedSlotStarts,
              }),
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              localAvailabilityEchoRef.current = null;
              toast.error(payload.error ?? "Unable to save availability.");
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
  }, [applySnapshot, draftVersion, selectedMap, session, slug, snapshot.slots, snapshot.status]);

  const slotMap = useMemo(
    () =>
      new Map(
        snapshot.slots.map((slot) => [
          slotKey(slot.dateKey, slot.minutes),
          {
            ...slot,
            selectedByCurrentUser: selectedMap[slotKey(slot.dateKey, slot.minutes)] ?? false,
          },
        ]),
      ),
    [selectedMap, snapshot.slots],
  );
  const participantNamesById = useMemo(
    () => new Map(snapshot.participants.map((participant) => [participant.id, participant.displayName])),
    [snapshot.participants],
  );
  const cellHeightClass = getCellHeightClass(snapshot.slotMinutes);

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
      session?: ParticipantSessionState & { editUrl: string };
    };

    setJoining(false);

    if (!response.ok || !payload.session) {
      setJoinError(payload.error ?? "Unable to join event.");
      return;
    }

    setSession(payload.session);
    setName("");
    toast.success("You joined the event");
    await fetchSnapshot();
  }

  function updateCell(dateKey: string, minutes: number, nextValue?: boolean) {
    if (!session || snapshot.status === "CLOSED") {
      return;
    }

    const key = slotKey(dateKey, minutes);
    const targetValue = nextValue ?? !selectedMap[key];

    setSelectedMap((current) => ({
      ...current,
      [key]: targetValue,
    }));
    setDraftVersion((current) => current + 1);
  }

  function participantList() {
    return (
      <div className="space-y-2">
        {snapshot.participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span
                className="size-2.5 rounded-full shadow-sm"
                style={{ background: participant.color }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {participant.displayName}
                  {participant.isCurrentUser ? " (you)" : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {participant.selectedSlotCount} selected slots
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDaysIcon className="size-3" />
                    {snapshot.dates.length} days
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3Icon className="size-3" />
                    {snapshot.slotMinutes}-minute grid
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="size-3" />
                    {snapshot.participants.length} participants
                  </span>
                </div>
                <div>
                  <CardTitle className="text-2xl">{snapshot.title}</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Times shown in <span className="font-medium text-foreground">{snapshot.timezone}</span>
                  </CardDescription>
                </div>
              </div>
              {snapshot.status === "CLOSED" ? (
                <Badge variant="destructive" className="h-7 px-2.5 text-xs">
                  <LockIcon className="size-3.5" />
                  Closed
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="font-medium">Legend</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] border bg-background" />
                  empty
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-3 rounded-[3px] bg-primary/24" />
                  some overlap
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-3 rounded-[3px] bg-primary/65" />
                  high overlap
                </span>
                {session ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="size-3 rounded-[3px] bg-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]" />
                    your selection
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {session ? (
                  <Badge variant="secondary" className="h-7 px-2.5 text-xs">
                    {session.displayName}
                  </Badge>
                ) : null}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="xl:hidden">
                      Participants
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
                    <SheetHeader>
                      <SheetTitle>Participants</SheetTitle>
                    </SheetHeader>
                    <div className="pb-6">{participantList()}</div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </CardHeader>
        </Card>

        {!session ? (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Join this board</CardTitle>
              <CardDescription className="text-xs">
                Enter your name to start selecting the times that work for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="displayName">Your name</Label>
                  <Input
                    id="displayName"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex, Nora, Product team..."
                  />
                </div>
                <Button onClick={handleJoin} disabled={joining || snapshot.status === "CLOSED"}>
                  {joining ? <Loader2Icon className="size-4 animate-spin" /> : null}
                  Join event
                </Button>
              </div>
              {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 pb-2">
            <div>
              <CardTitle className="text-base">Availability</CardTitle>
              <CardDescription className="text-xs">
                Drag across the grid to paint availability.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto rounded-md border">
              <div
                className="grid min-w-max gap-px bg-border"
                style={{
                  gridTemplateColumns: `4.5rem repeat(${snapshot.dates.length}, minmax(4.75rem, 1fr))`,
                }}
                onPointerUp={() => {
                  dragValue.current = null;
                }}
                onPointerLeave={() => {
                  dragValue.current = null;
                }}
              >
                <div className="sticky left-0 top-0 z-30 bg-background" />
                {snapshot.dates.map((date) => {
                  const parts = splitDateLabel(date.label);

                  return (
                    <div
                      key={date.dateKey}
                      className="sticky top-0 z-20 flex min-w-[4.75rem] flex-col items-center justify-center bg-background px-2 py-1 text-center"
                    >
                      <span className="text-[11px] font-semibold leading-none text-foreground">
                        {parts.weekday}
                      </span>
                      <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                        {parts.monthDay}
                      </span>
                    </div>
                  );
                })}
                {snapshot.timeRows.map((timeRow) => (
                  <Fragment key={timeRow.minutes}>
                    <div
                      className={cn(
                        "sticky left-0 z-10 flex items-center justify-end bg-background px-2 text-[11px] font-medium text-muted-foreground",
                        cellHeightClass,
                      )}
                    >
                      {isMajorTimeLabel(timeRow.minutes) ? timeRow.label : ""}
                    </div>
                    {snapshot.dates.map((date) => {
                      const slot = slotMap.get(slotKey(date.dateKey, timeRow.minutes));
                      if (!slot) {
                        return null;
                      }

                      const availableNames = slot.participantIds
                        .map((participantId) => participantNamesById.get(participantId))
                        .filter(Boolean) as string[];
                      const availabilityTitle = availableNames.length
                        ? `${date.label} ${timeRow.label} · ${slot.availabilityCount}/${snapshot.participants.length} available · ${availableNames.join(", ")}`
                        : `${date.label} ${timeRow.label} · nobody available`;

                      return (
                        <button
                          key={`${date.dateKey}-${timeRow.minutes}`}
                          type="button"
                          aria-pressed={slot.selectedByCurrentUser}
                          title={availabilityTitle}
                          className={cn(
                            "min-w-[4.75rem] border-0 transition-colors hover:brightness-[0.98] focus-visible:relative focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                            cellHeightClass,
                            getHeatColor(slot),
                          )}
                          disabled={!session || snapshot.status === "CLOSED"}
                          onPointerDown={() => {
                            const nextValue = !slot.selectedByCurrentUser;
                            dragValue.current = nextValue;
                            updateCell(date.dateKey, timeRow.minutes, nextValue);
                          }}
                          onPointerEnter={() => {
                            if (dragValue.current === null) {
                              return;
                            }

                            updateCell(date.dateKey, timeRow.minutes, dragValue.current);
                          }}
                        >
                          <span className="sr-only">{availabilityTitle}</span>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="hidden space-y-4 xl:block">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Best matching windows</CardTitle>
            <CardDescription className="text-xs">
              Ranked by overlap across the full {snapshot.meetingDurationMinutes}-minute meeting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {snapshot.suggestions.map((suggestion, index) => (
              <div
                key={suggestion.slotStart}
                className="rounded-md border bg-muted/20 px-3 py-2"
              >
                <p className="text-[11px] font-medium text-muted-foreground">
                  Option {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{suggestion.label}</p>
                {suggestion.localLabel ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Your timezone: {suggestion.localLabel}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {suggestion.availableCount} participants free for the full window
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Participants</CardTitle>
            <CardDescription className="text-xs">
              Open visibility keeps coordination simple and transparent.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">{participantList()}</CardContent>
        </Card>
      </aside>
    </div>
  );
}
