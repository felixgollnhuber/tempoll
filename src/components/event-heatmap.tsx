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
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { EventMetaDetails } from "@/components/event-meta-details";
import { TimezoneCombobox } from "@/components/timezone-combobox";
import {
  buildFinalizedSlot,
  buildProjectedBoard,
  getAllowedFinalSlotStarts,
  minutesToLabel,
} from "@/lib/availability";
import { useI18n } from "@/lib/i18n/context";
import { findTimezoneOption } from "@/lib/timezone-options";
import type { PublicEventSnapshot, SnapshotParticipant, TimezoneOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type DraftSelection = Record<string, boolean>;
export type BoardMode = "edit" | "view";

type PaintSession = {
  pointerId: number;
  value: boolean;
  paintedKeys: Set<string>;
};

type DescriptionOptions = {
  mode: BoardMode;
  usesDateWindowing: boolean;
};

type EventHeatmapProps = {
  snapshot: PublicEventSnapshot;
  mode: BoardMode;
  onModeChange?: (mode: BoardMode) => void;
  canEdit: boolean;
  selectedMap?: DraftSelection;
  onUpdateCell?: (slotStart: string, nextValue?: boolean) => boolean;
  displayStatus?: PublicEventSnapshot["status"];
  finalSlotStart: string | null;
  showStatusBadge?: boolean;
  showTitleBlock?: boolean;
  showFixedDateAction?: boolean;
  onFixedDateAction?: (slotStart: string) => void;
  isFixedDateActionPending?: boolean;
  sessionBadgeLabel?: string | null;
  showModeToggle?: boolean;
  showSidebar?: boolean;
  sidebarTopContent?: ReactNode;
  timezoneOptions?: TimezoneOption[];
  viewerTimezone: string;
  viewerTimezoneSelectValue: string;
  onViewerTimezoneChange: (timezone: string) => void;
  activeParticipantId?: string | null;
  onActiveParticipantChange?: (participantId: string | null) => void;
  getDescription?: (options: DescriptionOptions) => string;
};

const GRID_TIME_COLUMN_WIDTH_PX = 72;
const GRID_DAY_COLUMN_MIN_WIDTH_PX = 84;
const GRID_DAY_COLUMN_MOBILE_MIN_WIDTH_PX = 72;
const GRID_DAY_COLUMN_MOBILE_BREAKPOINT_PX = 640;

function getHeatColor(availabilityCount: number, maxAvailabilityCount: number) {
  if (availabilityCount <= 0 || maxAvailabilityCount <= 0) {
    return "bg-background";
  }

  const ratio = availabilityCount / maxAvailabilityCount;

  if (ratio >= 1) {
    return "bg-primary/80";
  }

  if (ratio >= 0.8) {
    return "bg-primary/65";
  }

  if (ratio >= 0.6) {
    return "bg-primary/50";
  }

  if (ratio >= 0.4) {
    return "bg-primary/36";
  }

  if (ratio >= 0.2) {
    return "bg-primary/24";
  }

  return "bg-primary/12";
}

function getCurrentUserSelectionClass(isSelected: boolean) {
  if (!isSelected) {
    return "";
  }

  return "outline outline-2 -outline-offset-2 outline-primary ring-2 ring-inset ring-background";
}

function getActiveViewSelectionClass(isActive: boolean) {
  if (!isActive) {
    return "";
  }

  return "ring-2 ring-inset ring-foreground/20";
}

function getFinalizedSlotClass(isInFinalSlotWindow: boolean) {
  if (!isInFinalSlotWindow) {
    return "";
  }

  return "bg-amber-100 ring-1 ring-inset ring-amber-600/80";
}

function withOverlayAlpha(color: string, alphaPercent: number) {
  return `color-mix(in oklab, ${color} ${alphaPercent}%, transparent)`;
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
    backgroundImage: [
      `repeating-linear-gradient(135deg, ${withOverlayAlpha(participantColor, 88)} 0 7px, transparent 7px 14px)`,
      `linear-gradient(${withOverlayAlpha(participantColor, 24)}, ${withOverlayAlpha(participantColor, 24)})`,
    ].join(", "),
    outline: `2px solid ${withOverlayAlpha(participantColor, 92)}`,
    outlineOffset: "-2px",
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
    acc[slot.slotStart] = slot.selectedByCurrentUser;
    return acc;
  }, {});
}

function getVisibleDayCount(containerWidth: number, totalDays: number) {
  if (totalDays === 0) {
    return 0;
  }

  if (containerWidth <= 0) {
    return totalDays;
  }

  const dayColumnMinWidth = getGridDayColumnMinWidth(containerWidth);
  const fullGridWidth = GRID_TIME_COLUMN_WIDTH_PX + totalDays * dayColumnMinWidth;
  if (containerWidth >= fullGridWidth) {
    return totalDays;
  }

  const availableWidth = Math.max(containerWidth - GRID_TIME_COLUMN_WIDTH_PX, dayColumnMinWidth);

  return Math.max(1, Math.floor(availableWidth / dayColumnMinWidth));
}

function getGridDayColumnMinWidth(containerWidth: number) {
  if (containerWidth > 0 && containerWidth < GRID_DAY_COLUMN_MOBILE_BREAKPOINT_PX) {
    return GRID_DAY_COLUMN_MOBILE_MIN_WIDTH_PX;
  }

  return GRID_DAY_COLUMN_MIN_WIDTH_PX;
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

  return `${dates[0].label} - ${dates[dates.length - 1].label}`;
}

function getSlotElementFromPoint(clientX: number, clientY: number) {
  const elements =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : typeof document.elementFromPoint === "function"
        ? [document.elementFromPoint(clientX, clientY)].filter(Boolean)
        : [];

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

function getSlotStartFromElement(element: HTMLElement) {
  const slotStart = element.dataset.slotStart;
  if (!slotStart) {
    return null;
  }

  return slotStart;
}

function getDefaultDescription(
  { mode, usesDateWindowing }: DescriptionOptions,
  messages: ReturnType<typeof useI18n>["messages"],
) {
  if (mode === "edit") {
    return usesDateWindowing
      ? messages.publicEvent.availabilityDescriptionEditWindowed
      : messages.publicEvent.availabilityDescriptionEdit;
  }

  return usesDateWindowing
    ? messages.publicEvent.availabilityDescriptionViewWindowed
    : messages.publicEvent.availabilityDescriptionView;
}

export function EventHeatmap({
  snapshot,
  mode,
  onModeChange,
  canEdit,
  selectedMap,
  onUpdateCell,
  displayStatus = snapshot.status,
  finalSlotStart,
  showStatusBadge = true,
  showTitleBlock = true,
  showFixedDateAction = false,
  onFixedDateAction,
  isFixedDateActionPending = false,
  sessionBadgeLabel = null,
  showModeToggle = true,
  showSidebar = true,
  sidebarTopContent,
  timezoneOptions = [],
  viewerTimezone,
  viewerTimezoneSelectValue,
  onViewerTimezoneChange,
  activeParticipantId: activeParticipantIdProp,
  onActiveParticipantChange,
  getDescription,
}: EventHeatmapProps) {
  const { messages, format, plural, locale } = useI18n();
  const [activeSlotStart, setActiveSlotStart] = useState<string | null>(null);
  const [internalActiveParticipantId, setInternalActiveParticipantId] = useState<string | null>(
    null,
  );
  const [gridContainerWidth, setGridContainerWidth] = useState(0);
  const [visibleDateStartIndex, setVisibleDateStartIndex] = useState(0);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const paintSessionRef = useRef<PaintSession | null>(null);
  const effectiveSelectedMap = selectedMap ?? getSelectedMap(snapshot);
  const supportsPainting = canEdit && Boolean(onUpdateCell);
  const currentParticipantId = snapshot.currentParticipant?.id ?? null;
  const activeParticipantId =
    activeParticipantIdProp === undefined ? internalActiveParticipantId : activeParticipantIdProp;
  const cellHeightClass = getCellHeightClass(snapshot.slotMinutes);
  const getParticipantLabel = useCallback(
    (participant: SnapshotParticipant) =>
      participant.isCurrentUser
        ? format(messages.publicEvent.participantYou, {
            name: participant.displayName,
          })
        : participant.displayName,
    [format, messages.publicEvent.participantYou],
  );
  const slotStartSelections = useMemo(
    () =>
      getAllowedFinalSlotStarts({
        dates: snapshot.dates.map((date) => date.dateKey),
        timezone: snapshot.timezone,
        dayStartMinutes: snapshot.dayStartMinutes,
        dayEndMinutes: snapshot.dayEndMinutes,
        slotMinutes: snapshot.slotMinutes,
        meetingDurationMinutes: snapshot.meetingDurationMinutes,
      }),
    [
      snapshot.dates,
      snapshot.dayEndMinutes,
      snapshot.dayStartMinutes,
      snapshot.meetingDurationMinutes,
      snapshot.slotMinutes,
      snapshot.timezone,
    ],
  );

  useEffect(() => {
    if (mode === "edit") {
      setActiveSlotStart(null);
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

    const participantExists = snapshot.participants.some(
      (participant) => participant.id === activeParticipantId,
    );
    if (!participantExists) {
      if (activeParticipantIdProp === undefined) {
        setInternalActiveParticipantId(null);
      }
      onActiveParticipantChange?.(null);
    }
  }, [activeParticipantId, activeParticipantIdProp, onActiveParticipantChange, snapshot.participants]);

  const slotMap = useMemo(
    () =>
      new Map(
        snapshot.slots.map((slot) => {
          const selectedByCurrentUser = effectiveSelectedMap[slot.slotStart] ?? false;
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
            slot.slotStart,
            {
              ...slot,
              participantIds,
              availabilityCount: participantIds.length,
              selectedByCurrentUser,
            },
          ];
        }),
      ),
    [currentParticipantId, effectiveSelectedMap, snapshot.slots],
  );
  const projectedBoard = useMemo(
    () =>
      buildProjectedBoard({
        slots: Array.from(slotMap.values()),
        timezone: viewerTimezone,
        locale,
      }),
    [locale, slotMap, viewerTimezone],
  );
  const projectedSlotMap = useMemo(
    () => new Map(projectedBoard.slots.map((slot) => [slot.slotStart, slot])),
    [projectedBoard.slots],
  );
  const maxAvailabilityCount = useMemo(
    () =>
      Array.from(slotMap.values()).reduce(
        (currentMax, slot) => Math.max(currentMax, slot.availabilityCount),
        0,
      ),
    [slotMap],
  );
  const someOverlapLegendClass = getHeatColor(maxAvailabilityCount > 0 ? 1 : 0, maxAvailabilityCount);
  const highOverlapLegendClass = getHeatColor(maxAvailabilityCount, maxAvailabilityCount);
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
  const dayColumnMinWidth = useMemo(
    () => getGridDayColumnMinWidth(gridContainerWidth),
    [gridContainerWidth],
  );
  const visibleDayCount = useMemo(
    () => getVisibleDayCount(gridContainerWidth, projectedBoard.dates.length),
    [gridContainerWidth, projectedBoard.dates.length],
  );
  const usesDateWindowing = visibleDayCount > 0 && visibleDayCount < projectedBoard.dates.length;
  const clampedVisibleDateStartIndex = useMemo(
    () =>
      clampVisibleDateStartIndex(visibleDateStartIndex, projectedBoard.dates.length, visibleDayCount || 1),
    [visibleDateStartIndex, projectedBoard.dates.length, visibleDayCount],
  );
  const visibleDates = useMemo(() => {
    if (!usesDateWindowing) {
      return projectedBoard.dates;
    }

    return projectedBoard.dates.slice(
      clampedVisibleDateStartIndex,
      clampedVisibleDateStartIndex + visibleDayCount,
    );
  }, [clampedVisibleDateStartIndex, projectedBoard.dates, usesDateWindowing, visibleDayCount]);
  const visibleDateKeys = useMemo(() => new Set(visibleDates.map((date) => date.dateKey)), [visibleDates]);
  const canShowPreviousDates = usesDateWindowing && clampedVisibleDateStartIndex > 0;
  const canShowNextDates =
    usesDateWindowing &&
    clampedVisibleDateStartIndex + visibleDates.length < projectedBoard.dates.length;
  const dayWindowPrompt =
    canShowPreviousDates && canShowNextDates
      ? messages.publicEvent.moreDaysAvailable
      : canShowNextDates
        ? messages.publicEvent.moreDaysAhead
        : canShowPreviousDates
          ? messages.publicEvent.earlierDaysAvailable
          : messages.publicEvent.moreDaysAvailable;
  const visibleRangeLabel = useMemo(() => getVisibleRangeLabel(visibleDates), [visibleDates]);
  const viewerTimezoneOption = useMemo(
    () => findTimezoneOption(timezoneOptions, viewerTimezone),
    [timezoneOptions, viewerTimezone],
  );
  const visibleProjectedSlots = useMemo(
    () => projectedBoard.slots.filter((slot) => visibleDateKeys.has(slot.projectedDateKey)),
    [projectedBoard.slots, visibleDateKeys],
  );
  const visibleTimeRows = useMemo(() => {
    const maxOccurrenceByMinutes = new Map<number, number>();

    for (const slot of visibleProjectedSlots) {
      maxOccurrenceByMinutes.set(
        slot.projectedMinutes,
        Math.max(maxOccurrenceByMinutes.get(slot.projectedMinutes) ?? 0, slot.projectedOccurrence),
      );
    }

    return [...maxOccurrenceByMinutes.entries()]
      .sort(([leftMinutes], [rightMinutes]) => leftMinutes - rightMinutes)
      .flatMap(([minutes, maxOccurrence]) =>
        Array.from({ length: maxOccurrence }, (_, index) => ({
          id: `${minutes}:${index + 1}`,
          minutes,
          occurrence: index + 1,
          label: minutesToLabel(minutes),
        })),
      );
  }, [visibleProjectedSlots]);
  const visibleTimeRowLabels = useMemo(() => {
    const maxOccurrenceByMinutes = new Map<number, number>();

    for (const slot of visibleProjectedSlots) {
      maxOccurrenceByMinutes.set(
        slot.projectedMinutes,
        Math.max(maxOccurrenceByMinutes.get(slot.projectedMinutes) ?? 0, slot.projectedOccurrence),
      );
    }

    return new Map(
      visibleTimeRows.map((timeRow) => {
        const maxOccurrence = maxOccurrenceByMinutes.get(timeRow.minutes) ?? 0;
        if (maxOccurrence < 2) {
          return [timeRow.id, timeRow.label] as const;
        }

        const representativeSlot = visibleProjectedSlots.find(
          (slot) =>
            slot.projectedMinutes === timeRow.minutes &&
            slot.projectedOccurrence === timeRow.occurrence,
        );

        return [
          timeRow.id,
          representativeSlot
            ? `${timeRow.label} ${representativeSlot.projectedTimeZoneShortName}`
            : timeRow.label,
        ] as const;
      }),
    );
  }, [visibleProjectedSlots, visibleTimeRows]);
  const activeParticipant =
    activeParticipantId
      ? snapshot.participants.find((participant) => participant.id === activeParticipantId) ?? null
      : null;
  const activeSlot = activeSlotStart ? (projectedSlotMap.get(activeSlotStart) ?? null) : null;
  const activeSlotDetails = useMemo(() => {
    if (!activeSlot) {
      return null;
    }

    const availableSet = new Set(activeSlot.participantIds);

    return {
      slot: activeSlot,
      dateLabel: activeSlot.projectedDateLabel,
      timeLabel: visibleTimeRowLabels.get(activeSlot.projectedRowId) ?? activeSlot.projectedTimeLabel,
      availableParticipants: snapshot.participants.filter((participant) =>
        availableSet.has(participant.id),
      ),
      unavailableParticipants: participantsWithAvailability.filter(
        (participant) => !availableSet.has(participant.id),
      ),
      isValidFinalSlotStart: slotStartSelections.has(activeSlot.slotStart),
      isFinalSlotStart: finalSlotStart === activeSlot.slotStart,
    };
  }, [
    activeSlot,
    finalSlotStart,
    participantsWithAvailability,
    slotStartSelections,
    snapshot.participants,
    visibleTimeRowLabels,
  ]);

  const finalizedSlot = useMemo(() => {
    if (!finalSlotStart) {
      return null;
    }

    return buildFinalizedSlot({
      dates: snapshot.dates.map((date) => date.dateKey),
      locale,
      timezone: snapshot.timezone,
      dayStartMinutes: snapshot.dayStartMinutes,
      dayEndMinutes: snapshot.dayEndMinutes,
      slotMinutes: snapshot.slotMinutes,
      meetingDurationMinutes: snapshot.meetingDurationMinutes,
      slots: Array.from(slotMap.values()),
      finalSlotStart,
      viewerTimezone,
    });
  }, [
    finalSlotStart,
    locale,
    slotMap,
    snapshot.dates,
    snapshot.dayEndMinutes,
    snapshot.dayStartMinutes,
    snapshot.meetingDurationMinutes,
    snapshot.slotMinutes,
    snapshot.timezone,
    viewerTimezone,
  ]);
  const finalizedSlotKeys = useMemo(() => {
    if (!finalizedSlot) {
      return new Set<string>();
    }

    const rangeStart = new Date(finalizedSlot.slotStart).getTime();
    const rangeEnd = new Date(finalizedSlot.slotEnd).getTime();

    return new Set(
      projectedBoard.slots
        .filter((slot) => {
          const slotTime = new Date(slot.slotStart).getTime();
          return slotTime >= rangeStart && slotTime < rangeEnd;
        })
        .map((slot) => slot.slotStart),
    );
  }, [finalizedSlot, projectedBoard.slots]);

  useEffect(() => {
    setVisibleDateStartIndex((current) =>
      clampVisibleDateStartIndex(current, projectedBoard.dates.length, visibleDayCount || 1),
    );
  }, [projectedBoard.dates.length, visibleDayCount]);

  useEffect(() => {
    if (!activeSlotStart || mode !== "view") {
      return;
    }

    const slot = projectedSlotMap.get(activeSlotStart);
    if (!slot || !visibleDateKeys.has(slot.projectedDateKey)) {
      setActiveSlotStart(null);
    }
  }, [activeSlotStart, mode, projectedSlotMap, visibleDateKeys]);

  const moveVisibleDateWindow = useCallback(
    (direction: -1 | 1) => {
      setVisibleDateStartIndex((current) =>
        clampVisibleDateStartIndex(
          current + direction,
          projectedBoard.dates.length,
          visibleDayCount || 1,
        ),
      );
    },
    [projectedBoard.dates.length, visibleDayCount],
  );

  const paintCellInSession = useCallback(
    (session: PaintSession, slotStart: string) => {
      if (!onUpdateCell) {
        return;
      }

      if (session.paintedKeys.has(slotStart)) {
        return;
      }

      session.paintedKeys.add(slotStart);
      onUpdateCell(slotStart, session.value);
    },
    [onUpdateCell],
  );

  const continuePaintSession = useCallback(
    (clientX: number, clientY: number, fallbackSlotStart: string) => {
      const session = paintSessionRef.current;
      if (!session) {
        return;
      }

      const slotElement = getSlotElementFromPoint(clientX, clientY);
      const nextSlotStart = slotElement ? getSlotStartFromElement(slotElement) : null;

      if (nextSlotStart) {
        paintCellInSession(session, nextSlotStart);
        return;
      }

      paintCellInSession(session, fallbackSlotStart);
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
      slotStart: string,
      isSelectedByCurrentUser: boolean,
    ) => {
      if (!event.isPrimary || mode !== "edit" || !supportsPainting) {
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
      paintCellInSession(nextSession, slotStart);
    },
    [mode, paintCellInSession, supportsPainting],
  );

  const handleCellPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, slotStart: string) => {
      const session = paintSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      continuePaintSession(event.clientX, event.clientY, slotStart);
    },
    [continuePaintSession],
  );

  const handleCellPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, slotStart: string) => {
      const session = paintSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      continuePaintSession(event.clientX, event.clientY, slotStart);

      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }

      endPaintSession(event.pointerId);
    },
    [continuePaintSession, endPaintSession],
  );

  function toggleParticipantHighlight(participantId: string) {
    const nextParticipantId = activeParticipantId === participantId ? null : participantId;

    if (activeParticipantIdProp === undefined) {
      setInternalActiveParticipantId(nextParticipantId);
    }

    onActiveParticipantChange?.(nextParticipantId);
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
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                data-slot="participant-color-dot"
                className="size-2.5 shrink-0 rounded-full shadow-sm"
                style={{ background: participant.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{getParticipantLabel(participant)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {plural(
                    messages.publicEvent.participantSelectedSlots,
                    participant.selectedSlotCount,
                  )}
                </p>
              </div>
            </div>
            {activeParticipantId === participant.id ? (
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                {messages.publicEvent.participantHighlighting}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    );
  }

  const description = getDescription
    ? getDescription({
        mode,
        usesDateWindowing,
      })
    : getDefaultDescription(
        {
          mode,
          usesDateWindowing,
        },
        messages,
      );
  const shouldShowFixedDateAction = showFixedDateAction && Boolean(onFixedDateAction);
  const viewerTimezoneSelectId = "viewer-timezone-trigger";

  return (
    <div
      data-slot="event-heatmap-layout"
      className={cn(
        "grid min-w-0 gap-4",
        showSidebar ? "xl:grid-cols-[minmax(0,1fr)_250px]" : "grid-cols-1",
      )}
    >
      <div className="min-w-0 space-y-4">
        {sidebarTopContent ? (
          <div data-slot="event-heatmap-mobile-sidebar" className="space-y-4 xl:hidden">
            {sidebarTopContent}
          </div>
        ) : null}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="gap-3 p-4">
            <div
              className={cn(
                "flex flex-col gap-3",
                showTitleBlock || showStatusBadge
                  ? "lg:flex-row lg:items-start lg:justify-between"
                  : undefined,
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDaysIcon className="size-3" />
                    {plural(messages.publicEvent.daysSummary, projectedBoard.dates.length)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3Icon className="size-3" />
                    {format(messages.publicEvent.gridSummary, { count: snapshot.slotMinutes })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="size-3" />
                    {plural(messages.publicEvent.participantsSummary, snapshot.participants.length)}
                  </span>
                </div>
                {showTitleBlock ? (
                  <div>
                    <CardTitle className="text-2xl">{snapshot.title}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {format(messages.publicEvent.timesShownIn, {
                        timezone: viewerTimezoneOption?.label ?? viewerTimezone,
                      })}
                    </CardDescription>
                    <EventMetaDetails snapshot={snapshot} className="mt-2" />
                  </div>
                ) : null}
              </div>
              {showStatusBadge && displayStatus === "CLOSED" ? (
                <Badge variant="destructive" className="h-7 px-2.5 text-xs">
                  <LockIcon className="size-3.5" />
                  {messages.common.closed}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="font-medium">{messages.publicEvent.legend}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-[3px] border bg-background" />
                  {messages.publicEvent.legendEmpty}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className={cn("size-3 rounded-[3px]", someOverlapLegendClass)} />
                  {messages.publicEvent.legendSomeOverlap}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className={cn("size-3 rounded-[3px]", highOverlapLegendClass)} />
                  {messages.publicEvent.legendHighOverlap}
                </span>
                {supportsPainting && mode === "edit" ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="size-3 rounded-[3px] bg-primary/24 outline outline-2 -outline-offset-2 outline-primary ring-1 ring-inset ring-background" />
                    {messages.publicEvent.legendYourAvailability}
                  </span>
                ) : null}
                {finalizedSlot ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="size-3 rounded-[3px] bg-amber-100 ring-1 ring-inset ring-amber-600/80" />
                    {messages.publicEvent.legendFixedDate}
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
                    {format(messages.publicEvent.legendHighlighted, {
                      name: activeParticipant.displayName,
                    })}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {sessionBadgeLabel ? (
                  <Badge variant="secondary" className="h-7 px-2.5 text-xs">
                    {sessionBadgeLabel}
                  </Badge>
                ) : null}
                {showSidebar ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="xl:hidden">
                        {messages.common.participants}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
                      <SheetHeader>
                        <SheetTitle>{messages.common.participants}</SheetTitle>
                      </SheetHeader>
                      <div className="pb-6">{participantList()}</div>
                    </SheetContent>
                  </Sheet>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 p-4 pt-0">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{messages.publicEvent.availabilityTitle}</CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={viewerTimezoneSelectId}
                      className="whitespace-nowrap text-xs text-muted-foreground"
                    >
                      {messages.publicEvent.viewerTimezoneLabel}
                    </Label>
                    <TimezoneCombobox
                      id={viewerTimezoneSelectId}
                      label={messages.publicEvent.viewerTimezoneLabel}
                      value={viewerTimezoneSelectValue}
                      options={timezoneOptions}
                      onValueChange={onViewerTimezoneChange}
                      placeholder={messages.publicEvent.viewerTimezoneLabel}
                      size="sm"
                      includeAutomatic
                    />
                  </div>
                  {showModeToggle ? (
                    <SegmentedControl>
                      <SegmentedControlItem
                        active={mode === "edit"}
                        disabled={!supportsPainting}
                        onClick={() => onModeChange?.("edit")}
                      >
                        {messages.publicEvent.editMode}
                      </SegmentedControlItem>
                      <SegmentedControlItem
                        active={mode === "view"}
                        onClick={() => onModeChange?.("view")}
                      >
                        {messages.publicEvent.viewMode}
                      </SegmentedControlItem>
                    </SegmentedControl>
                  ) : null}
                </div>
              </div>

              {usesDateWindowing ? (
                <div className="flex items-stretch gap-2 rounded-md border border-primary/30 bg-primary/10 p-2 shadow-sm">
                  <Button
                    type="button"
                    variant={canShowPreviousDates ? "secondary" : "outline"}
                    size="sm"
                    aria-label={messages.publicEvent.showPreviousDays}
                    disabled={!canShowPreviousDates}
                    className="h-auto self-stretch px-3"
                    onClick={() => moveVisibleDateWindow(-1)}
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1 text-center">
                    <p className="text-[11px] font-semibold uppercase text-primary">
                      {dayWindowPrompt}
                    </p>
                    <p aria-live="polite" className="mt-1 truncate text-sm font-semibold text-foreground">
                      {visibleRangeLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(messages.publicEvent.dayWindowSummary, {
                        start: clampedVisibleDateStartIndex + 1,
                        end: clampedVisibleDateStartIndex + visibleDates.length,
                        total: projectedBoard.dates.length,
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={canShowNextDates ? "default" : "outline"}
                    size="sm"
                    aria-label={messages.publicEvent.showNextDays}
                    disabled={!canShowNextDates}
                    className="h-auto self-stretch px-3"
                    onClick={() => moveVisibleDateWindow(1)}
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              ) : null}

              <div ref={gridContainerRef} className="min-w-0 overflow-hidden rounded-md border">
                <div
                  data-slot="event-heatmap-grid"
                  className={cn(
                    "grid gap-px bg-border select-none",
                    mode === "edit" && supportsPainting ? "touch-none" : "touch-pan-y",
                  )}
                  style={{
                    gridTemplateColumns: `${GRID_TIME_COLUMN_WIDTH_PX}px repeat(${visibleDates.length}, minmax(${dayColumnMinWidth}px, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 top-0 z-30 bg-background" />
                  {visibleDates.map((date) => {
                    const parts = splitDateLabel(date.label);

                    return (
                      <div
                        key={date.dateKey}
                        className="sticky top-0 z-20 flex flex-col items-center justify-center bg-background px-2 py-1 text-center"
                        style={{ minWidth: `${dayColumnMinWidth}px` }}
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
                  {visibleTimeRows.map((timeRow) => (
                    <Fragment key={timeRow.id}>
                      <div
                        className={cn(
                          "sticky left-0 z-10 flex items-center justify-end bg-background px-2 text-[11px] font-medium text-muted-foreground",
                          cellHeightClass,
                        )}
                      >
                        {isMajorTimeLabel(timeRow.minutes)
                          ? visibleTimeRowLabels.get(timeRow.id) ?? timeRow.label
                          : ""}
                      </div>
                      {visibleDates.map((date) => {
                        const slot = projectedBoard.slotLookup.get(`${date.dateKey}|${timeRow.id}`);
                        if (!slot) {
                          return (
                            <div
                              key={`${date.dateKey}-${timeRow.id}`}
                              className={cn("bg-background", cellHeightClass)}
                              style={{ minWidth: `${dayColumnMinWidth}px` }}
                            />
                          );
                        }

                        const availableNames = slot.participantIds
                          .map((participantId) => participantNamesById.get(participantId))
                          .filter(Boolean) as string[];
                        const timeLabel =
                          visibleTimeRowLabels.get(slot.projectedRowId) ?? slot.projectedTimeLabel;
                        const availabilityTitle = availableNames.length
                          ? format(messages.publicEvent.availableCountTitle, {
                              date: slot.projectedDateLabel,
                              time: timeLabel,
                              available: slot.availabilityCount,
                              total: snapshot.participants.length,
                              names: availableNames.join(", "),
                            })
                          : format(messages.publicEvent.nobodyAvailableTitle, {
                              date: slot.projectedDateLabel,
                              time: timeLabel,
                            });

                        const isActiveViewSlot = mode === "view" && activeSlotStart === slot.slotStart;
                        const showCurrentUserSelection = supportsPainting && mode === "edit" && slot.selectedByCurrentUser;
                        const isHighlightedParticipantAvailable = activeParticipantId
                          ? slot.participantIds.includes(activeParticipantId)
                          : false;
                        const isInFinalSlotWindow = finalizedSlotKeys.has(slot.slotStart);
                        const isFinalSlotStart = finalSlotStart === slot.slotStart;

                        return (
                          <button
                            key={slot.slotStart}
                            type="button"
                            aria-label={availabilityTitle}
                            aria-pressed={mode === "edit" ? slot.selectedByCurrentUser : isActiveViewSlot}
                            title={availabilityTitle}
                            data-slot-key={slot.slotStart}
                            data-slot-start={slot.slotStart}
                            data-current-user-selected={
                              showCurrentUserSelection ? "true" : undefined
                            }
                            data-highlighted-participant-availability={
                              isHighlightedParticipantAvailable ? "true" : undefined
                            }
                            data-final-slot-window={isInFinalSlotWindow ? "true" : undefined}
                            data-final-slot-start={isFinalSlotStart ? "true" : undefined}
                            className={cn(
                              "border-0 transition-colors focus-visible:relative focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                              cellHeightClass,
                              mode === "edit" && supportsPainting
                                ? "cursor-crosshair touch-none hover:brightness-[0.98]"
                                : "cursor-pointer hover:brightness-[0.99]",
                              isInFinalSlotWindow
                                ? ""
                                : getHeatColor(slot.availabilityCount, maxAvailabilityCount),
                              getCurrentUserSelectionClass(showCurrentUserSelection),
                              getActiveViewSelectionClass(isActiveViewSlot),
                              getFinalizedSlotClass(isInFinalSlotWindow),
                            )}
                            style={{
                              minWidth: `${dayColumnMinWidth}px`,
                              ...getParticipantHighlightStyle({
                                isHighlighted: isHighlightedParticipantAvailable,
                                participantColor: activeParticipantId
                                  ? participantColorById.get(activeParticipantId)
                                  : undefined,
                              }),
                            }}
                            onPointerDown={(event) =>
                              handleCellPointerDown(
                                event,
                                slot.slotStart,
                                slot.selectedByCurrentUser,
                              )
                            }
                            onPointerMove={(event) => handleCellPointerMove(event, slot.slotStart)}
                            onPointerUp={(event) => handleCellPointerEnd(event, slot.slotStart)}
                            onPointerCancel={(event) => handleCellPointerEnd(event, slot.slotStart)}
                            onLostPointerCapture={(event) => {
                              endPaintSession(event.pointerId);
                            }}
                            onClick={() => {
                              if (mode !== "view") {
                                return;
                              }

                              setActiveSlotStart(slot.slotStart);
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
                  <h3 className="text-sm font-semibold text-foreground">
                    {messages.publicEvent.slotDetailsTitle}
                  </h3>
                  {activeSlotDetails ? (
                    <p className="text-xs text-muted-foreground">
                      {format(messages.publicEvent.slotDetailsSummary, {
                        date: activeSlotDetails.dateLabel,
                        time: activeSlotDetails.timeLabel,
                        available: activeSlotDetails.slot.availabilityCount,
                        total: snapshot.participants.length,
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {messages.publicEvent.slotDetailsPrompt}
                    </p>
                  )}
                </div>

                {activeSlotDetails ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                          {messages.publicEvent.available}
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
                                  {getParticipantLabel(participant)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {messages.publicEvent.nobodyAvailableInSlot}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                          {messages.publicEvent.unavailable}
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
                                  {getParticipantLabel(participant)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {messages.publicEvent.everyoneAvailableHere}
                          </p>
                        )}
                      </div>
                    </div>

                    {shouldShowFixedDateAction ? (
                      <div className="rounded-md border bg-background/70 p-3">
                        {activeSlotDetails.isValidFinalSlotStart ? (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {format(messages.publicEvent.finalSlotFits, {
                                  duration: snapshot.meetingDurationMinutes,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {displayStatus === "OPEN"
                                  ? messages.manageEvent.fixedDateActionCloseDescription
                                  : activeSlotDetails.isFinalSlotStart
                                    ? messages.manageEvent.fixedDateActionSelectedDescription
                                    : messages.manageEvent.fixedDateActionUpdateDescription}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={activeSlotDetails.isFinalSlotStart ? "secondary" : "default"}
                              disabled={
                                isFixedDateActionPending || activeSlotDetails.isFinalSlotStart
                              }
                              onClick={() => onFixedDateAction?.(activeSlotDetails.slot.slotStart)}
                            >
                              {isFixedDateActionPending ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : null}
                              {displayStatus === "OPEN"
                                ? messages.manageEvent.setFixedDateAndCloseEvent
                                : activeSlotDetails.isFinalSlotStart
                                  ? messages.common.fixedDateSelected
                                  : messages.manageEvent.updateFixedDate}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {format(messages.publicEvent.finalSlotOutOfRange, {
                              duration: snapshot.meetingDurationMinutes,
                            })}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {showSidebar ? (
        <aside className="hidden min-w-0 space-y-4 xl:block">
          {sidebarTopContent}

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">{messages.common.participants}</CardTitle>
              <CardDescription className="text-xs">
                {messages.publicEvent.participantsSidebarDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">{participantList()}</CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}
