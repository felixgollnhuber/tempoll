"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  Loader2Icon,
  LockIcon,
  UsersIcon,
} from "lucide-react";
import {
  Fragment,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
type BoardMode = "edit" | "view";
type PaintSession = {
  pointerId: number;
  value: boolean;
  paintedKeys: Set<string>;
};

const GRID_TIME_COLUMN_WIDTH_PX = 72;
const GRID_DAY_COLUMN_MIN_WIDTH_PX = 84;

function slotKey(dateKey: string, minutes: number) {
  return `${dateKey}-${minutes}`;
}

function getInitialMode(hasEditableSession: boolean): BoardMode {
  return hasEditableSession ? "edit" : "view";
}

function getHeatColor(availabilityCount: number) {
  if (availabilityCount >= 6) {
    return "bg-primary/80";
  }

  if (availabilityCount === 5) {
    return "bg-primary/65";
  }

  if (availabilityCount === 4) {
    return "bg-primary/50";
  }

  if (availabilityCount === 3) {
    return "bg-primary/36";
  }

  if (availabilityCount === 2) {
    return "bg-primary/24";
  }

  if (availabilityCount === 1) {
    return "bg-primary/12";
  }

  return "bg-background";
}

function getCurrentUserSelectionClass(isSelected: boolean) {
  if (!isSelected) {
    return "";
  }

  return "outline outline-2 -outline-offset-2 outline-primary/85 ring-2 ring-inset ring-background";
}

function getActiveViewSelectionClass(isActive: boolean) {
  if (!isActive) {
    return "";
  }

  return "ring-2 ring-inset ring-foreground/20";
}

function getParticipantHighlightStyle({
  isHighlighted,
  participantColor,
}: {
  isHighlighted: boolean;
  participantColor?: string;
}): CSSProperties | undefined {
  if (!isHighlighted || !participantColor) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(135deg, transparent 0%, transparent 56%, ${participantColor}99 56%, ${participantColor}99 69%, transparent 69%, transparent 100%)`,
  };
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

function getVisibleDayCount(containerWidth: number, totalDays: number) {
  if (totalDays === 0) {
    return 0;
  }

  if (containerWidth <= 0) {
    return totalDays;
  }

  const fullGridWidth = GRID_TIME_COLUMN_WIDTH_PX + totalDays * GRID_DAY_COLUMN_MIN_WIDTH_PX;
  if (containerWidth >= fullGridWidth) {
    return totalDays;
  }

  const availableWidth = Math.max(
    containerWidth - GRID_TIME_COLUMN_WIDTH_PX,
    GRID_DAY_COLUMN_MIN_WIDTH_PX,
  );

  return Math.max(1, Math.floor(availableWidth / GRID_DAY_COLUMN_MIN_WIDTH_PX));
}

function clampVisibleDateStartIndex(startIndex: number, totalDays: number, visibleDayCount: number) {
  const maxStartIndex = Math.max(totalDays - visibleDayCount, 0);
  return Math.min(Math.max(startIndex, 0), maxStartIndex);
}

function getVisibleRangeLabel(dates: PublicEventSnapshot["dates"]) {
  if (!dates.length) {
    return "";
  }

  if (dates.length === 1) {
    return dates[0].label;
  }

  return `${dates[0].label} to ${dates[dates.length - 1].label}`;
}

function getSlotElementFromPoint(clientX: number, clientY: number) {
  const elements =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    const slotElement = element.closest<HTMLElement>("[data-slot-key]");
    if (slotElement instanceof HTMLButtonElement) {
      return slotElement;
    }
  }

  return null;
}

function getSlotCoordinatesFromElement(element: HTMLElement) {
  const dateKey = element.dataset.dateKey;
  const minutes = Number(element.dataset.minutes);
  if (!dateKey || Number.isNaN(minutes)) {
    return null;
  }

  return {
    dateKey,
    minutes,
    key: element.dataset.slotKey ?? slotKey(dateKey, minutes),
  };
}

export function PublicEventClient({
  slug,
  initialSnapshot,
  initialSession,
}: PublicEventClientProps) {
  const initialHasEditableSession = Boolean(initialSession && initialSnapshot.status === "OPEN");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [session, setSession] = useState<ParticipantSessionState>(initialSession);
  const [name, setName] = useState("");
  const [selectedMap, setSelectedMap] = useState(() => getSelectedMap(initialSnapshot));
  const [mode, setMode] = useState<BoardMode>(() => getInitialMode(initialHasEditableSession));
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [gridContainerWidth, setGridContainerWidth] = useState(0);
  const [visibleDateStartIndex, setVisibleDateStartIndex] = useState(0);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const paintSessionRef = useRef<PaintSession | null>(null);
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
  const canEdit = Boolean(session && snapshot.status === "OPEN");

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
  }, [applySnapshot, canEdit, draftVersion, selectedMap, session, slug, snapshot.slots]);

  useEffect(() => {
    if (!canEdit) {
      setMode("view");
      paintSessionRef.current = null;
    }
  }, [canEdit]);

  useEffect(() => {
    if (mode === "edit") {
      setActiveSlotKey(null);
    }
  }, [mode]);

  const measureGridContainer = useCallback(() => {
    const nextWidth = gridContainerRef.current?.clientWidth || window.innerWidth;
    setGridContainerWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  useEffect(() => {
    measureGridContainer();

    const handleResize = () => {
      measureGridContainer();
    };

    window.addEventListener("resize", handleResize);

    if (!gridContainerRef.current || typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver(() => {
      measureGridContainer();
    });
    observer.observe(gridContainerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [measureGridContainer]);

  useEffect(() => {
    if (!activeParticipantId) {
      return;
    }

    const participantExists = snapshot.participants.some((participant) => participant.id === activeParticipantId);
    if (!participantExists) {
      setActiveParticipantId(null);
    }
  }, [activeParticipantId, snapshot.participants]);

  const currentParticipantId = session?.participantId ?? snapshot.currentParticipant?.id ?? null;
  const slotMap = useMemo(
    () =>
      new Map(
        snapshot.slots.map((slot) => {
          const key = slotKey(slot.dateKey, slot.minutes);
          const selectedByCurrentUser = selectedMap[key] ?? false;
          let participantIds = slot.participantIds;

          if (currentParticipantId) {
            if (selectedByCurrentUser && !slot.selectedByCurrentUser) {
              participantIds = slot.participantIds.includes(currentParticipantId)
                ? slot.participantIds
                : [...slot.participantIds, currentParticipantId];
            } else if (!selectedByCurrentUser && slot.selectedByCurrentUser) {
              participantIds = slot.participantIds.filter(
                (participantId) => participantId !== currentParticipantId,
              );
            }
          }

          return [
            key,
            {
              ...slot,
              participantIds,
              availabilityCount: participantIds.length,
              selectedByCurrentUser,
            },
          ];
        }),
      ),
    [currentParticipantId, selectedMap, snapshot.slots],
  );
  const dateLabelsByKey = useMemo(
    () => new Map(snapshot.dates.map((date) => [date.dateKey, date.label])),
    [snapshot.dates],
  );
  const timeLabelsByMinutes = useMemo(
    () => new Map(snapshot.timeRows.map((timeRow) => [timeRow.minutes, timeRow.label])),
    [snapshot.timeRows],
  );
  const participantNamesById = useMemo(
    () => new Map(snapshot.participants.map((participant) => [participant.id, participant.displayName])),
    [snapshot.participants],
  );
  const participantColorById = useMemo(
    () => new Map(snapshot.participants.map((participant) => [participant.id, participant.color])),
    [snapshot.participants],
  );
  const participantsWithAvailability = useMemo(
    () => snapshot.participants.filter((participant) => participant.selectedSlotCount > 0),
    [snapshot.participants],
  );
  const cellHeightClass = getCellHeightClass(snapshot.slotMinutes);
  const visibleDayCount = useMemo(
    () => getVisibleDayCount(gridContainerWidth, snapshot.dates.length),
    [gridContainerWidth, snapshot.dates.length],
  );
  const usesDateWindowing = visibleDayCount > 0 && visibleDayCount < snapshot.dates.length;
  const clampedVisibleDateStartIndex = useMemo(
    () =>
      clampVisibleDateStartIndex(visibleDateStartIndex, snapshot.dates.length, visibleDayCount || 1),
    [visibleDateStartIndex, snapshot.dates.length, visibleDayCount],
  );
  const visibleDates = useMemo(() => {
    if (!usesDateWindowing) {
      return snapshot.dates;
    }

    return snapshot.dates.slice(
      clampedVisibleDateStartIndex,
      clampedVisibleDateStartIndex + visibleDayCount,
    );
  }, [clampedVisibleDateStartIndex, snapshot.dates, usesDateWindowing, visibleDayCount]);
  const visibleDateKeys = useMemo(
    () => new Set(visibleDates.map((date) => date.dateKey)),
    [visibleDates],
  );
  const canShowPreviousDates = usesDateWindowing && clampedVisibleDateStartIndex > 0;
  const canShowNextDates =
    usesDateWindowing &&
    clampedVisibleDateStartIndex + visibleDates.length < snapshot.dates.length;
  const visibleRangeLabel = useMemo(() => getVisibleRangeLabel(visibleDates), [visibleDates]);
  const activeParticipant =
    activeParticipantId
      ? snapshot.participants.find((participant) => participant.id === activeParticipantId) ?? null
      : null;
  const activeSlot = activeSlotKey ? (slotMap.get(activeSlotKey) ?? null) : null;
  const activeSlotDetails = useMemo(() => {
    if (!activeSlot) {
      return null;
    }

    const availableSet = new Set(activeSlot.participantIds);

    return {
      slot: activeSlot,
      dateLabel: dateLabelsByKey.get(activeSlot.dateKey) ?? activeSlot.dateKey,
      timeLabel: timeLabelsByMinutes.get(activeSlot.minutes) ?? "",
      availableParticipants: snapshot.participants.filter((participant) =>
        availableSet.has(participant.id),
      ),
      unavailableParticipants: participantsWithAvailability.filter(
        (participant) => !availableSet.has(participant.id),
      ),
    };
  }, [activeSlot, dateLabelsByKey, participantsWithAvailability, snapshot.participants, timeLabelsByMinutes]);

  useEffect(() => {
    setVisibleDateStartIndex((current) =>
      clampVisibleDateStartIndex(current, snapshot.dates.length, visibleDayCount || 1),
    );
  }, [snapshot.dates.length, visibleDayCount]);

  useEffect(() => {
    if (!activeSlotKey || mode !== "view") {
      return;
    }

    const slot = slotMap.get(activeSlotKey);
    if (!slot || !visibleDateKeys.has(slot.dateKey)) {
      setActiveSlotKey(null);
    }
  }, [activeSlotKey, mode, slotMap, visibleDateKeys]);

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
    setMode("edit");
    setName("");
    toast.success("You joined the event");
    await fetchSnapshot();
  }

  const updateCell = useCallback(
    (dateKey: string, minutes: number, nextValue?: boolean) => {
      if (!canEdit) {
        return false;
      }

      const key = slotKey(dateKey, minutes);
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

  const moveVisibleDateWindow = useCallback(
    (direction: -1 | 1) => {
      setVisibleDateStartIndex((current) =>
        clampVisibleDateStartIndex(current + direction, snapshot.dates.length, visibleDayCount || 1),
      );
    },
    [snapshot.dates.length, visibleDayCount],
  );

  const paintCellInSession = useCallback(
    (session: PaintSession, dateKey: string, minutes: number) => {
      const key = slotKey(dateKey, minutes);
      if (session.paintedKeys.has(key)) {
        return;
      }

      session.paintedKeys.add(key);
      updateCell(dateKey, minutes, session.value);
    },
    [updateCell],
  );

  const continuePaintSession = useCallback(
    (clientX: number, clientY: number, fallbackDateKey: string, fallbackMinutes: number) => {
      const session = paintSessionRef.current;
      if (!session) {
        return;
      }

      const slotElement = getSlotElementFromPoint(clientX, clientY);
      const nextSlot =
        slotElement ? getSlotCoordinatesFromElement(slotElement) : null;

      if (nextSlot) {
        paintCellInSession(session, nextSlot.dateKey, nextSlot.minutes);
        return;
      }

      paintCellInSession(session, fallbackDateKey, fallbackMinutes);
    },
    [paintCellInSession],
  );

  const endPaintSession = useCallback((pointerId?: number) => {
    const session = paintSessionRef.current;
    if (!session) {
      return;
    }

    if (pointerId !== undefined && session.pointerId !== pointerId) {
      return;
    }

    paintSessionRef.current = null;
  }, []);

  const handleCellPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      dateKey: string,
      minutes: number,
      isSelectedByCurrentUser: boolean,
    ) => {
      if (!event.isPrimary || mode !== "edit" || !canEdit) {
        return;
      }

      event.preventDefault();

      const nextValue = !isSelectedByCurrentUser;
      const nextSession: PaintSession = {
        pointerId: event.pointerId,
        value: nextValue,
        paintedKeys: new Set(),
      };

      paintSessionRef.current = nextSession;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      paintCellInSession(nextSession, dateKey, minutes);
    },
    [canEdit, mode, paintCellInSession],
  );

  const handleCellPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, dateKey: string, minutes: number) => {
      const session = paintSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      continuePaintSession(event.clientX, event.clientY, dateKey, minutes);
    },
    [continuePaintSession],
  );

  const handleCellPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, dateKey: string, minutes: number) => {
      const session = paintSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      continuePaintSession(event.clientX, event.clientY, dateKey, minutes);

      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }

      endPaintSession(event.pointerId);
    },
    [continuePaintSession, endPaintSession],
  );

  function toggleParticipantHighlight(participantId: string) {
    setActiveParticipantId((current) => (current === participantId ? null : participantId));
  }

  function participantList() {
    return (
      <div className="space-y-2">
        {snapshot.participants.map((participant) => (
          <button
            key={participant.id}
            type="button"
            aria-pressed={activeParticipantId === participant.id}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeParticipantId === participant.id
                ? "border-foreground/10 bg-background/90 shadow-sm"
                : "",
            )}
            onClick={() => toggleParticipantHighlight(participant.id)}
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
            {activeParticipantId === participant.id ? (
              <span className="text-[11px] font-medium text-muted-foreground">Highlighting</span>
            ) : null}
          </button>
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
                    <span className="size-3 rounded-[3px] bg-primary/24 outline outline-2 -outline-offset-2 outline-primary/85 ring-1 ring-inset ring-background" />
                    your availability
                  </span>
                ) : null}
                {activeParticipant ? (
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="size-3 rounded-[3px] border bg-background"
                      style={getParticipantHighlightStyle({
                        isHighlighted: true,
                        participantColor: activeParticipant.color,
                      })}
                    />
                    {activeParticipant.displayName} highlighted
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
          <CardHeader className="flex flex-col gap-3 p-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Availability</CardTitle>
              <CardDescription className="text-xs">
                {mode === "edit"
                  ? usesDateWindowing
                    ? "Tap or drag to paint your availability. Use the arrows to move day by day."
                    : "Click or drag across the grid to paint your availability while keeping the team heatmap in view."
                  : usesDateWindowing
                    ? "Select a slot to inspect availability. Use the arrows to move through the date range."
                    : "Click any slot to see who is available and who is not."}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-md border bg-muted/30 p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "edit" ? "secondary" : "ghost"}
                className="h-7 px-3"
                aria-pressed={mode === "edit"}
                disabled={!canEdit}
                onClick={() => setMode("edit")}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "view" ? "secondary" : "ghost"}
                className="h-7 px-3"
                aria-pressed={mode === "view"}
                onClick={() => setMode("view")}
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {usesDateWindowing ? (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label="Show previous days"
                    disabled={!canShowPreviousDates}
                    onClick={() => moveVisibleDateWindow(-1)}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1 text-center">
                    <p aria-live="polite" className="truncate text-xs font-medium text-foreground">
                      {visibleRangeLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Days {clampedVisibleDateStartIndex + 1}
                      {" - "}
                      {clampedVisibleDateStartIndex + visibleDates.length} of {snapshot.dates.length}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label="Show next days"
                    disabled={!canShowNextDates}
                    onClick={() => moveVisibleDateWindow(1)}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              ) : null}

              <div ref={gridContainerRef} className="overflow-hidden rounded-md border">
                <div
                  className={cn(
                    "grid gap-px bg-border select-none",
                    mode === "edit" && canEdit ? "touch-none" : "touch-pan-y",
                  )}
                  style={{
                    gridTemplateColumns: `${GRID_TIME_COLUMN_WIDTH_PX}px repeat(${visibleDates.length}, minmax(${GRID_DAY_COLUMN_MIN_WIDTH_PX}px, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 top-0 z-30 bg-background" />
                  {visibleDates.map((date) => {
                    const parts = splitDateLabel(date.label);

                    return (
                      <div
                        key={date.dateKey}
                        className="sticky top-0 z-20 flex min-w-[84px] flex-col items-center justify-center bg-background px-2 py-1 text-center"
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
                      {visibleDates.map((date) => {
                        const key = slotKey(date.dateKey, timeRow.minutes);
                        const slot = slotMap.get(key);
                        if (!slot) {
                          return null;
                        }

                        const availableNames = slot.participantIds
                          .map((participantId) => participantNamesById.get(participantId))
                          .filter(Boolean) as string[];
                        const availabilityTitle = availableNames.length
                          ? `${date.label} ${timeRow.label} · ${slot.availabilityCount}/${snapshot.participants.length} available · ${availableNames.join(", ")}`
                          : `${date.label} ${timeRow.label} · nobody available`;

                        const isActiveViewSlot = mode === "view" && activeSlotKey === key;
                        const isHighlightedParticipantAvailable = activeParticipantId
                          ? slot.participantIds.includes(activeParticipantId)
                          : false;

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-label={availabilityTitle}
                            aria-pressed={mode === "edit" ? slot.selectedByCurrentUser : isActiveViewSlot}
                            title={availabilityTitle}
                            data-slot-key={key}
                            data-date-key={date.dateKey}
                            data-minutes={timeRow.minutes}
                            data-current-user-selected={slot.selectedByCurrentUser ? "true" : undefined}
                            data-highlighted-participant-availability={
                              isHighlightedParticipantAvailable ? "true" : undefined
                            }
                            className={cn(
                              "min-w-[84px] border-0 transition-colors focus-visible:relative focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                              cellHeightClass,
                              mode === "edit" && canEdit
                                ? "cursor-crosshair touch-none hover:brightness-[0.98]"
                                : "cursor-pointer hover:brightness-[0.99]",
                              getHeatColor(slot.availabilityCount),
                              getCurrentUserSelectionClass(slot.selectedByCurrentUser),
                              getActiveViewSelectionClass(isActiveViewSlot),
                            )}
                            style={getParticipantHighlightStyle({
                              isHighlighted: isHighlightedParticipantAvailable,
                              participantColor: activeParticipantId
                                ? participantColorById.get(activeParticipantId)
                                : undefined,
                            })}
                            onPointerDown={(event) =>
                              handleCellPointerDown(
                                event,
                                date.dateKey,
                                timeRow.minutes,
                                slot.selectedByCurrentUser,
                              )
                            }
                            onPointerMove={(event) =>
                              handleCellPointerMove(event, date.dateKey, timeRow.minutes)
                            }
                            onPointerUp={(event) =>
                              handleCellPointerEnd(event, date.dateKey, timeRow.minutes)
                            }
                            onPointerCancel={(event) =>
                              handleCellPointerEnd(event, date.dateKey, timeRow.minutes)
                            }
                            onLostPointerCapture={(event) => {
                              endPaintSession(event.pointerId);
                            }}
                            onClick={() => {
                              if (mode !== "view") {
                                return;
                              }

                              setActiveSlotKey(key);
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
            </div>
            {mode === "view" ? (
              <div className="mt-4 rounded-md border bg-muted/10 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Slot details</h3>
                  {activeSlotDetails ? (
                    <p className="text-xs text-muted-foreground">
                      {activeSlotDetails.dateLabel} · {activeSlotDetails.timeLabel} ·{" "}
                      {activeSlotDetails.slot.availabilityCount}/{snapshot.participants.length} available
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select a slot in the heatmap to inspect availability for that time.
                    </p>
                  )}
                </div>

                {activeSlotDetails ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                        Available
                      </h4>
                      {activeSlotDetails.availableParticipants.length ? (
                        <div className="space-y-2">
                          {activeSlotDetails.availableParticipants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center gap-3 rounded-md border bg-background/80 px-3 py-2"
                            >
                              <span
                                className="size-2.5 rounded-full shadow-sm"
                                style={{ background: participant.color }}
                              />
                              <span className="text-sm font-medium text-foreground">
                                {participant.displayName}
                                {participant.isCurrentUser ? " (you)" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nobody is available in this slot.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                        Not available
                      </h4>
                      {activeSlotDetails.unavailableParticipants.length ? (
                        <div className="space-y-2">
                          {activeSlotDetails.unavailableParticipants.map((participant) => (
                            <div
                              key={participant.id}
                              className="flex items-center gap-3 rounded-md border border-dashed bg-background/60 px-3 py-2"
                            >
                              <span
                                className="size-2.5 rounded-full opacity-65 shadow-sm"
                                style={{ background: participant.color }}
                              />
                              <span className="text-sm font-medium text-foreground">
                                {participant.displayName}
                                {participant.isCurrentUser ? " (you)" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Everyone with at least one selection is available here.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
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
              Click a participant to highlight their availability on the grid.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">{participantList()}</CardContent>
        </Card>
      </aside>
    </div>
  );
}
