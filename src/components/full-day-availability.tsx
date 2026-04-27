"use client";

import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  LockIcon,
  UsersIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { BoardMode } from "@/components/event-heatmap";
import { useI18n } from "@/lib/i18n/context";
import type { PublicEventSnapshot, SnapshotParticipant, SnapshotSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

export type FullDayDraftSelection = Record<string, boolean>;

type FullDayAvailabilityProps = {
  snapshot: PublicEventSnapshot;
  mode?: BoardMode;
  onModeChange?: (mode: BoardMode) => void;
  canEdit: boolean;
  selectedMap?: FullDayDraftSelection;
  onUpdateDay?: (slotStart: string, nextValue?: boolean) => boolean;
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
  activeParticipantId?: string | null;
  onActiveParticipantChange?: (participantId: string | null) => void;
  description?: string;
};

type PaintSession = {
  pointerId: number;
  value: boolean;
  paintedKeys: Set<string>;
};

function getHeatColor(availabilityCount: number, maxAvailabilityCount: number) {
  if (availabilityCount <= 0 || maxAvailabilityCount <= 0) {
    return "bg-background";
  }

  const ratio = availabilityCount / maxAvailabilityCount;

  if (ratio >= 1) {
    return "bg-primary/80";
  }

  if (ratio >= 0.6) {
    return "bg-primary/50";
  }

  if (ratio >= 0.3) {
    return "bg-primary/24";
  }

  return "bg-primary/12";
}

function getSelectedMap(snapshot: PublicEventSnapshot) {
  return snapshot.slots.reduce<FullDayDraftSelection>((acc, slot) => {
    acc[slot.slotStart] = slot.selectedByCurrentUser;
    return acc;
  }, {});
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateKey(dateKey: string) {
  const [year = 0, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function formatMonthLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getWeekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const mondayFirstDate = new Date(2026, 0, 5 + index);
    return new Intl.DateTimeFormat(locale, { weekday: "short" })
      .format(mondayFirstDate)
      .replace(/\.$/, "")
      .slice(0, 2)
      .toUpperCase();
  });
}

function getCalendarDates(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const dates: Array<Date | null> = Array.from({ length: leadingEmptyDays }, () => null);

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    dates.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (dates.length % 7 !== 0) {
    dates.push(null);
  }

  while (dates.length < 42) {
    dates.push(null);
  }

  return dates;
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

function getDisabledDayStyle(): CSSProperties {
  return {
    backgroundColor: "var(--muted)",
    backgroundImage:
      "repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in oklab, var(--muted-foreground) 18%, transparent) 6px 12px)",
  };
}

function getDayLabel(snapshot: PublicEventSnapshot, slot: SnapshotSlot) {
  return snapshot.dates.find((date) => date.dateKey === slot.dateKey)?.label ?? slot.dateKey;
}

function getDayElementFromPoint(clientX: number, clientY: number) {
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

    const dayElement = element.closest<HTMLElement>("[data-slot-key]");
    if (dayElement instanceof HTMLButtonElement) {
      return dayElement;
    }
  }

  return null;
}

function getSlotStartFromElement(element: HTMLElement) {
  return element.dataset.slotStart ?? null;
}

function getIsNarrowViewport() {
  return typeof window !== "undefined" ? window.innerWidth < 768 : false;
}

type FullDayCalendarMonth = {
  key: string;
  monthDate: Date;
  slots: SnapshotSlot[];
};

function buildCalendarMonths(slots: SnapshotSlot[]) {
  const months = new Map<string, FullDayCalendarMonth>();

  for (const slot of slots) {
    const key = getMonthKey(slot.dateKey);
    const existing = months.get(key);
    if (existing) {
      existing.slots.push(slot);
      continue;
    }

    months.set(key, {
      key,
      monthDate: parseDateKey(`${key}-01`),
      slots: [slot],
    });
  }

  return Array.from(months.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((month) => ({
      ...month,
      slots: [...month.slots].sort((left, right) => left.dateKey.localeCompare(right.dateKey)),
    }));
}

export function FullDayAvailability({
  snapshot,
  mode = "view",
  onModeChange,
  canEdit,
  selectedMap,
  onUpdateDay,
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
  activeParticipantId: activeParticipantIdProp,
  onActiveParticipantChange,
  description,
}: FullDayAvailabilityProps) {
  const { messages, format, plural, intlLocale } = useI18n();
  const [activeSlotStart, setActiveSlotStart] = useState<string | null>(null);
  const [internalActiveParticipantId, setInternalActiveParticipantId] = useState<string | null>(
    null,
  );
  const [mobileMonthIndex, setMobileMonthIndex] = useState(0);
  const [isNarrowViewport, setIsNarrowViewport] = useState(getIsNarrowViewport);
  const paintSessionRef = useRef<PaintSession | null>(null);
  const activeParticipantId =
    activeParticipantIdProp === undefined ? internalActiveParticipantId : activeParticipantIdProp;
  const effectiveSelectedMap = selectedMap ?? getSelectedMap(snapshot);
  const currentParticipantId = snapshot.currentParticipant?.id ?? null;
  const supportsEditing = canEdit && mode === "edit" && Boolean(onUpdateDay);
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
  const slots = useMemo(() => Array.from(slotMap.values()), [slotMap]);
  const calendarMonths = useMemo(() => buildCalendarMonths(slots), [slots]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(intlLocale), [intlLocale]);
  const clampedMobileMonthIndex = Math.min(
    Math.max(mobileMonthIndex, 0),
    Math.max(calendarMonths.length - 1, 0),
  );
  const mobileMonth = calendarMonths[clampedMobileMonthIndex] ?? null;
  const canShowPreviousMonth = clampedMobileMonthIndex > 0;
  const canShowNextMonth = clampedMobileMonthIndex < calendarMonths.length - 1;
  const maxAvailabilityCount = useMemo(
    () => slots.reduce((currentMax, slot) => Math.max(currentMax, slot.availabilityCount), 0),
    [slots],
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
  const activeSlot = activeSlotStart ? slotMap.get(activeSlotStart) ?? null : null;
  const activeSlotDetails = activeSlot
    ? {
        slot: activeSlot,
        dateLabel: getDayLabel(snapshot, activeSlot),
        availableParticipants: snapshot.participants.filter((participant) =>
          activeSlot.participantIds.includes(participant.id),
        ),
        unavailableParticipants: participantsWithAvailability.filter(
          (participant) => !activeSlot.participantIds.includes(participant.id),
        ),
        isFinalSlotStart: finalSlotStart === activeSlot.slotStart,
      }
    : null;
  const shouldShowFixedDateAction = showFixedDateAction && Boolean(onFixedDateAction);
  const supportsPainting = supportsEditing && Boolean(onUpdateDay);

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowViewport(getIsNarrowViewport());
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function getAvailabilityTitle(slot: SnapshotSlot) {
    const dateLabel = getDayLabel(snapshot, slot);
    const availableNames = slot.participantIds
      .map((participantId) => participantNamesById.get(participantId))
      .filter(Boolean) as string[];

    return availableNames.length
      ? format(messages.publicEvent.availableOnDayTitle, {
          date: dateLabel,
          available: slot.availabilityCount,
          total: snapshot.participants.length,
          names: availableNames.join(", "),
        })
      : format(messages.publicEvent.nobodyAvailableOnDayTitle, {
          date: dateLabel,
        });
  }

  function selectDay(slot: SnapshotSlot, nextValue?: boolean) {
    if (supportsEditing) {
      onUpdateDay?.(slot.slotStart, nextValue);
      return;
    }

    setActiveSlotStart(slot.slotStart);
  }

  const paintDayInSession = useCallback(
    (session: PaintSession, slotStart: string) => {
      if (!onUpdateDay) {
        return;
      }

      if (session.paintedKeys.has(slotStart)) {
        return;
      }

      session.paintedKeys.add(slotStart);
      onUpdateDay(slotStart, session.value);
    },
    [onUpdateDay],
  );

  const continuePaintSession = useCallback(
    (clientX: number, clientY: number, fallbackSlotStart: string) => {
      const session = paintSessionRef.current;
      if (!session) {
        return;
      }

      const dayElement = getDayElementFromPoint(clientX, clientY);
      const nextSlotStart = dayElement ? getSlotStartFromElement(dayElement) : null;

      if (nextSlotStart) {
        paintDayInSession(session, nextSlotStart);
        return;
      }

      paintDayInSession(session, fallbackSlotStart);
    },
    [paintDayInSession],
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

  const handleDayPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      slotStart: string,
      isSelectedByCurrentUser: boolean,
    ) => {
      if (!event.isPrimary || !supportsPainting) {
        return;
      }

      event.preventDefault();

      const nextSession: PaintSession = {
        pointerId: event.pointerId,
        value: !isSelectedByCurrentUser,
        paintedKeys: new Set(),
      };

      paintSessionRef.current = nextSession;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      paintDayInSession(nextSession, slotStart);
    },
    [paintDayInSession, supportsPainting],
  );

  const handleDayPointerMove = useCallback(
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

  const handleDayPointerEnd = useCallback(
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

  function moveMobileMonth(direction: -1 | 1) {
    setMobileMonthIndex((current) =>
      Math.min(Math.max(current + direction, 0), Math.max(calendarMonths.length - 1, 0)),
    );
  }

  function renderCalendarMonth(month: FullDayCalendarMonth, mobile = false) {
    const monthSlotMap = new Map(month.slots.map((slot) => [slot.dateKey, slot]));
    const calendarDates = getCalendarDates(month.monthDate);

    function renderCalendarDay(date: Date | null, index: number) {
      if (!date) {
        return (
          <div
            key={`empty-${month.key}-${index}`}
            aria-hidden="true"
            className="aspect-square bg-background"
          />
        );
      }

      const dateKey = formatDateKey(date);
      const slot = monthSlotMap.get(dateKey);
      const isActiveDay = slot ? activeSlotStart === slot.slotStart : false;
      const isSelectedByCurrentUser = slot
        ? supportsEditing && slot.selectedByCurrentUser
        : false;
      const isHighlightedParticipantAvailable =
        slot && activeParticipantId ? slot.participantIds.includes(activeParticipantId) : false;
      const isFinalSlotStart = Boolean(slot && finalSlotStart === slot.slotStart);
      const availabilityTitle = slot ? getAvailabilityTitle(slot) : dateKey;
      const dayStyle = slot
        ? getParticipantHighlightStyle({
            isHighlighted: isHighlightedParticipantAvailable,
            participantColor: activeParticipantId
              ? participantColorById.get(activeParticipantId)
              : undefined,
          })
        : getDisabledDayStyle();

      return (
        <button
          key={dateKey}
          type="button"
          disabled={!slot}
          aria-label={availabilityTitle}
          aria-pressed={slot ? (supportsEditing ? slot.selectedByCurrentUser : isActiveDay) : false}
          title={slot ? availabilityTitle : undefined}
          data-slot-key={slot?.slotStart}
          data-slot-start={slot?.slotStart}
          data-current-user-selected={isSelectedByCurrentUser ? "true" : undefined}
          data-final-slot-start={isFinalSlotStart ? "true" : undefined}
          className={cn(
            "flex aspect-square min-h-0 w-full min-w-0 flex-col items-start justify-between border-0 p-2 text-left text-xs transition-colors focus-visible:relative focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
            slot
              ? getHeatColor(slot.availabilityCount, maxAvailabilityCount)
              : "cursor-not-allowed text-muted-foreground/55 disabled:opacity-100",
            slot && supportsPainting ? "cursor-crosshair touch-none hover:brightness-[0.98]" : "",
            slot && !supportsEditing ? "hover:brightness-[0.99]" : "",
            isSelectedByCurrentUser &&
              "outline outline-2 -outline-offset-2 outline-primary ring-2 ring-inset ring-background",
            isActiveDay && "ring-2 ring-inset ring-foreground/20",
            isFinalSlotStart && "bg-amber-100 ring-1 ring-inset ring-amber-600/80",
          )}
          style={dayStyle}
          onPointerDown={(event) => {
            if (slot) {
              handleDayPointerDown(event, slot.slotStart, slot.selectedByCurrentUser);
            }
          }}
          onPointerMove={(event) => {
            if (slot) {
              handleDayPointerMove(event, slot.slotStart);
            }
          }}
          onPointerUp={(event) => {
            if (slot) {
              handleDayPointerEnd(event, slot.slotStart);
            }
          }}
          onPointerCancel={(event) => {
            if (slot) {
              handleDayPointerEnd(event, slot.slotStart);
            }
          }}
          onLostPointerCapture={(event) => {
            endPaintSession(event.pointerId);
          }}
          onClick={(event) => {
            if (slot) {
              if (supportsEditing && event.detail !== 0) {
                return;
              }

              selectDay(slot);
            }
          }}
        >
          <span className={cn("font-medium", slot ? "text-foreground" : "")}>
            {date.getDate()}
          </span>
          {slot ? (
            <span className="text-[11px] text-muted-foreground">
              {slot.availabilityCount}/{snapshot.participants.length}
            </span>
          ) : null}
        </button>
      );
    }

    return (
      <div
        key={month.key}
        className={cn(
          "w-full min-w-0 rounded-md border bg-background/60 p-3 shadow-sm",
          mobile ? "block" : "",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {formatMonthLabel(month.monthDate, intlLocale)}
          </h3>
          <span className="text-xs text-muted-foreground">
            {plural(messages.publicEvent.daysSummary, month.slots.length)}
          </span>
        </div>
        <div className="overflow-hidden rounded-md border bg-border">
          <div className="grid grid-cols-7 gap-px">
            {weekdayLabels.map((weekdayLabel) => (
              <div
                key={weekdayLabel}
                className="flex h-7 items-center justify-center bg-background text-[0.68rem] font-medium tracking-[0.08em] text-muted-foreground"
              >
                {weekdayLabel}
              </div>
            ))}
            {calendarDates.map((date, index) => renderCalendarDay(date, index))}
          </div>
        </div>
      </div>
    );
  }

  function getParticipantLabel(participant: SnapshotParticipant) {
    return participant.isCurrentUser
      ? format(messages.publicEvent.participantYou, {
          name: participant.displayName,
        })
      : participant.displayName;
  }

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
                    messages.publicEvent.participantSelectedDays,
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

  return (
    <div
      data-slot="full-day-availability-layout"
      className={cn(
        "grid min-w-0 gap-4",
        showSidebar ? "xl:grid-cols-[minmax(0,1fr)_250px]" : "grid-cols-1",
      )}
    >
      <div className="min-w-0 space-y-4">
        {sidebarTopContent ? (
          <div data-slot="full-day-mobile-sidebar" className="space-y-4 xl:hidden">
            {sidebarTopContent}
          </div>
        ) : null}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="gap-3 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDaysIcon className="size-3" />
                    {plural(messages.publicEvent.daysSummary, snapshot.dates.length)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckIcon className="size-3" />
                    {messages.publicEvent.fullDaySummary}
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
                      {snapshot.timezone}
                    </CardDescription>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sessionBadgeLabel ? (
                  <Badge variant="secondary" className="h-7 px-2.5 text-xs">
                    {sessionBadgeLabel}
                  </Badge>
                ) : null}
                {showStatusBadge && displayStatus === "CLOSED" ? (
                  <Badge variant="destructive" className="h-7 px-2.5 text-xs">
                    <LockIcon className="size-3.5" />
                    {messages.common.closed}
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 p-4 pt-0">
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{messages.publicEvent.availabilityTitle}</CardTitle>
                  <CardDescription className="text-xs">
                    {description ??
                      (supportsEditing
                        ? messages.publicEvent.fullDayAvailabilityDescriptionEdit
                        : messages.publicEvent.fullDayAvailabilityDescriptionView)}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {showModeToggle ? (
                    <div className="inline-flex rounded-md border bg-muted/30 p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={mode === "edit" ? "secondary" : "ghost"}
                        className="h-7 px-3"
                        aria-pressed={mode === "edit"}
                        disabled={!canEdit}
                        onClick={() => onModeChange?.("edit")}
                      >
                        {messages.publicEvent.editMode}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mode === "view" ? "secondary" : "ghost"}
                        className="h-7 px-3"
                        aria-pressed={mode === "view"}
                        onClick={() => onModeChange?.("view")}
                      >
                        {messages.publicEvent.viewMode}
                      </Button>
                    </div>
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

              {isNarrowViewport && mobileMonth ? (
                <div className="space-y-3">
                  {calendarMonths.length > 1 ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label={messages.publicEvent.showPreviousDays}
                        disabled={!canShowPreviousMonth}
                        onClick={() => moveMobileMonth(-1)}
                      >
                        <ChevronLeftIcon className="size-4" />
                      </Button>
                      <div className="min-w-0 flex-1 text-center">
                        <p className="truncate text-xs font-medium text-foreground">
                          {formatMonthLabel(mobileMonth.monthDate, intlLocale)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {clampedMobileMonthIndex + 1}/{calendarMonths.length}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label={messages.publicEvent.showNextDays}
                        disabled={!canShowNextMonth}
                        onClick={() => moveMobileMonth(1)}
                      >
                        <ChevronRightIcon className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                  {renderCalendarMonth(mobileMonth, true)}
                </div>
              ) : null}

              {!isNarrowViewport ? (
                <div className="grid justify-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),22rem))]">
                  {calendarMonths.map((month) => renderCalendarMonth(month))}
                </div>
              ) : null}
            </div>

            {!supportsEditing ? (
              <div className="mt-4 rounded-md border bg-muted/10 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {messages.publicEvent.dayDetailsTitle}
                  </h3>
                  {activeSlotDetails ? (
                    <p className="text-xs text-muted-foreground">
                      {format(messages.publicEvent.dayDetailsSummary, {
                        date: activeSlotDetails.dateLabel,
                        available: activeSlotDetails.slot.availabilityCount,
                        total: snapshot.participants.length,
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {messages.publicEvent.dayDetailsPrompt}
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
                            {messages.publicEvent.nobodyAvailableOnDay}
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
                            {messages.publicEvent.everyoneAvailableOnDay}
                          </p>
                        )}
                      </div>
                    </div>

                    {shouldShowFixedDateAction ? (
                      <div className="rounded-md border bg-background/70 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {messages.publicEvent.finalDayFits}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {displayStatus === "OPEN"
                                ? messages.manageEvent.fixedDayActionCloseDescription
                                : activeSlotDetails.isFinalSlotStart
                                  ? messages.manageEvent.fixedDayActionSelectedDescription
                                  : messages.manageEvent.fixedDayActionUpdateDescription}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={activeSlotDetails.isFinalSlotStart ? "secondary" : "default"}
                            disabled={isFixedDateActionPending || activeSlotDetails.isFinalSlotStart}
                            onClick={() => onFixedDateAction?.(activeSlotDetails.slot.slotStart)}
                          >
                            {isFixedDateActionPending ? (
                              <Loader2Icon className="size-4 animate-spin" />
                            ) : null}
                            {displayStatus === "OPEN"
                              ? messages.manageEvent.setFixedDayAndCloseEvent
                              : activeSlotDetails.isFinalSlotStart
                                ? messages.common.fixedDaySelected
                                : messages.manageEvent.updateFixedDay}
                          </Button>
                        </div>
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
