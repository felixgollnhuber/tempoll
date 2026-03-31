import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { getDateFnsLocale, getIntlLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/locale";
import type {
  BestTimeSuggestion,
  FinalizedEventSlot,
  PublicEventSnapshot,
  SnapshotDate,
  SnapshotParticipant,
  SnapshotSlot,
  SnapshotTimeRow,
} from "@/lib/types";

type BuildSnapshotInput = {
  id: string;
  slug: string;
  title: string;
  timezone: string;
  status: "OPEN" | "CLOSED";
  slotMinutes: number;
  meetingDurationMinutes: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  dates: string[];
  participants: Array<{
    id: string;
    displayName: string;
    color: string;
    availabilitySlotStarts: string[];
  }>;
  locale: AppLocale;
  finalSlotStart?: string | null;
  currentParticipantId?: string | null;
  viewerTimezone?: string | null;
};

type MeetingWindow = {
  dateKey: string;
  slotStart: string;
  slotEnd: string;
  slotStarts: string[];
};

export type EnumeratedEventSlot = {
  slotStart: string;
  dateKey: string;
  minutes: number;
  label: string;
};

export type ProjectedDate = {
  dateKey: string;
  label: string;
};

export type ProjectedTimeRow = {
  id: string;
  minutes: number;
  occurrence: number;
  label: string;
};

export type ProjectedSlot = SnapshotSlot & {
  projectedDateKey: string;
  projectedDateLabel: string;
  projectedMinutes: number;
  projectedTimeLabel: string;
  projectedOccurrence: number;
  projectedRowId: string;
  projectedTimeZoneShortName: string;
};

export type ProjectedBoard = {
  dates: ProjectedDate[];
  timeRows: ProjectedTimeRow[];
  slots: ProjectedSlot[];
  slotLookup: Map<string, ProjectedSlot>;
};

type MeetingWindowSummary = FinalizedEventSlot & {
  sumCount: number;
};

function isMeetingWindowSummary(
  value: MeetingWindowSummary | null,
): value is MeetingWindowSummary {
  return value !== null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function formatDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

function getDateKeyInTimezone(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function getMinutesInTimezone(date: Date, timezone: string) {
  const [hoursText = "00", minutesText = "00"] = formatInTimeZone(date, timezone, "HH:mm").split(":");
  return Number(hoursText) * 60 + Number(minutesText);
}

function getTimeZoneShortName(timezone: string, locale: AppLocale, date: Date) {
  const timeZoneNameLocale = locale === "en" ? "en-GB" : getIntlLocale(locale);
  const formatter = new Intl.DateTimeFormat(timeZoneNameLocale, {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const timeZonePart = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return timeZonePart ?? timezone;
}

export function minutesToLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${pad(hours)}:${pad(mins)}`;
}

export function buildTimeOptions(stepMinutes = 30) {
  const options: Array<{ value: number; label: string }> = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    options.push({
      value: minutes,
      label: minutesToLabel(minutes),
    });
  }

  options.push({
    value: 24 * 60,
    label: minutesToLabel(24 * 60),
  });

  return options;
}

export function sortDateKeys(dateKeys: string[]) {
  return [...new Set(dateKeys)].sort((a, b) => a.localeCompare(b));
}

export function buildSlotStart(dateKey: string, minutes: number, timezone: string) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return fromZonedTime(`${dateKey}T${pad(hours)}:${pad(mins)}:00`, timezone).toISOString();
}

function getCompactDateFormat(locale: AppLocale) {
  return locale === "de" ? "EEE, d. MMM" : "EEE, MMM d";
}

export function formatDateKeyLabel(dateKey: string, timezone: string, locale: AppLocale) {
  return formatInTimeZone(
    fromZonedTime(`${dateKey}T12:00:00`, timezone),
    timezone,
    getCompactDateFormat(locale),
    {
      locale: getDateFnsLocale(locale),
    },
  );
}

export function getViewerTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function buildTimeRows({
  slotMinutes,
  dayStartMinutes,
  dayEndMinutes,
}: {
  slotMinutes: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
}) {
  const timeRows: SnapshotTimeRow[] = [];

  for (let minutes = dayStartMinutes; minutes < dayEndMinutes; minutes += slotMinutes) {
    timeRows.push({
      minutes,
      label: minutesToLabel(minutes),
    });
  }

  return timeRows;
}

function buildSnapshotTimeRows(slots: EnumeratedEventSlot[]) {
  return [...new Set(slots.map((slot) => slot.minutes))]
    .sort((left, right) => left - right)
    .map((minutes) => ({
      minutes,
      label: minutesToLabel(minutes),
    }));
}

export function enumerateEventSlots({
  dates,
  timezone,
  dayStartMinutes,
  dayEndMinutes,
  slotMinutes,
}: {
  dates: string[];
  timezone: string;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
}) {
  const eventSlots: EnumeratedEventSlot[] = [];

  for (const dateKey of sortDateKeys(dates)) {
    const utcDayStart = fromZonedTime(`${dateKey}T00:00:00`, timezone);
    const utcNextDayStart = fromZonedTime(`${addDaysToDateKey(dateKey, 1)}T00:00:00`, timezone);

    for (
      let slotTime = utcDayStart.getTime();
      slotTime < utcNextDayStart.getTime();
      slotTime += slotMinutes * 60 * 1000
    ) {
      const slotDate = new Date(slotTime);
      if (getDateKeyInTimezone(slotDate, timezone) !== dateKey) {
        continue;
      }

      const minutes = getMinutesInTimezone(slotDate, timezone);
      if (minutes < dayStartMinutes || minutes >= dayEndMinutes) {
        continue;
      }

      eventSlots.push({
        slotStart: slotDate.toISOString(),
        dateKey,
        minutes,
        label: minutesToLabel(minutes),
      });
    }
  }

  return eventSlots;
}

function getMeetingWindowSize(slotMinutes: number, meetingDurationMinutes: number) {
  return Math.max(1, Math.floor(meetingDurationMinutes / slotMinutes));
}

export function buildMeetingWindows({
  dates,
  timezone,
  dayStartMinutes,
  dayEndMinutes,
  slotMinutes,
  meetingDurationMinutes,
}: {
  dates: string[];
  timezone: string;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  meetingDurationMinutes: number;
}) {
  const meetingWindows: MeetingWindow[] = [];
  const eventSlots = enumerateEventSlots({
    dates,
    timezone,
    dayStartMinutes,
    dayEndMinutes,
    slotMinutes,
  });
  const eventSlotsByDate = new Map<string, EnumeratedEventSlot[]>();
  for (const slot of eventSlots) {
    const existing = eventSlotsByDate.get(slot.dateKey) ?? [];
    existing.push(slot);
    eventSlotsByDate.set(slot.dateKey, existing);
  }
  const windowSize = getMeetingWindowSize(slotMinutes, meetingDurationMinutes);

  for (const dateKey of sortDateKeys(dates)) {
    const daySlots = eventSlotsByDate.get(dateKey) ?? [];

    for (let index = 0; index <= daySlots.length - windowSize; index += 1) {
      const windowSlots = daySlots.slice(index, index + windowSize);
      const slotStarts = windowSlots.map((slot) => slot.slotStart);
      const slotStart = slotStarts[0];

      if (!slotStart) {
        continue;
      }

      const slotEnd = new Date(
        new Date(slotStarts[slotStarts.length - 1]).getTime() + slotMinutes * 60 * 1000,
      ).toISOString();

      meetingWindows.push({
        dateKey,
        slotStart,
        slotEnd,
        slotStarts,
      });
    }
  }

  return meetingWindows;
}

export function formatMeetingWindowLabels({
  slotStart,
  slotEnd,
  locale,
  timezone,
  viewerTimezone,
}: {
  slotStart: string;
  slotEnd: string;
  locale: AppLocale;
  timezone: string;
  viewerTimezone?: string | null;
}) {
  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  return {
    label: `${formatInTimeZone(start, timezone, locale === "de" ? "EEE, d. MMM · HH:mm" : "EEE, MMM d · HH:mm", {
      locale: getDateFnsLocale(locale),
    })}–${formatInTimeZone(end, timezone, "HH:mm", {
      locale: getDateFnsLocale(locale),
    })}`,
    localLabel:
      viewerTimezone && viewerTimezone !== timezone
        ? `${formatInTimeZone(
            start,
            viewerTimezone,
            locale === "de" ? "EEE, d. MMM · HH:mm" : "EEE, MMM d · HH:mm",
            {
              locale: getDateFnsLocale(locale),
            },
          )}–${formatInTimeZone(end, viewerTimezone, "HH:mm", {
            locale: getDateFnsLocale(locale),
          })}`
        : null,
  };
}

export function buildProjectedBoard({
  slots,
  timezone,
  locale,
}: {
  slots: SnapshotSlot[];
  timezone: string;
  locale: AppLocale;
}): ProjectedBoard {
  const projectedSlotsBase = [...slots]
    .sort((left, right) => left.slotStart.localeCompare(right.slotStart))
    .map((slot) => {
      const slotDate = new Date(slot.slotStart);
      const projectedDateKey = getDateKeyInTimezone(slotDate, timezone);
      const projectedMinutes = getMinutesInTimezone(slotDate, timezone);

      return {
        ...slot,
        projectedDateKey,
        projectedDateLabel: formatDateKeyLabel(projectedDateKey, timezone, locale),
        projectedMinutes,
        projectedTimeLabel: minutesToLabel(projectedMinutes),
        projectedTimeZoneShortName: getTimeZoneShortName(timezone, locale, slotDate),
      };
    });
  const occurrenceByDateAndMinutes = new Map<string, number>();
  const maxOccurrenceByMinutes = new Map<number, number>();

  const projectedSlots: ProjectedSlot[] = projectedSlotsBase.map((slot) => {
    const occurrenceKey = `${slot.projectedDateKey}|${slot.projectedMinutes}`;
    const projectedOccurrence = (occurrenceByDateAndMinutes.get(occurrenceKey) ?? 0) + 1;
    occurrenceByDateAndMinutes.set(occurrenceKey, projectedOccurrence);
    maxOccurrenceByMinutes.set(
      slot.projectedMinutes,
      Math.max(maxOccurrenceByMinutes.get(slot.projectedMinutes) ?? 0, projectedOccurrence),
    );

    return {
      ...slot,
      projectedOccurrence,
      projectedRowId: `${slot.projectedMinutes}:${projectedOccurrence}`,
    };
  });

  const dates = sortDateKeys(projectedSlots.map((slot) => slot.projectedDateKey)).map((dateKey) => ({
    dateKey,
    label: formatDateKeyLabel(dateKey, timezone, locale),
  }));
  const timeRows = [...maxOccurrenceByMinutes.entries()]
    .sort(([leftMinutes], [rightMinutes]) => leftMinutes - rightMinutes)
    .flatMap(([minutes, maxOccurrence]) =>
      Array.from({ length: maxOccurrence }, (_, index) => ({
        id: `${minutes}:${index + 1}`,
        minutes,
        occurrence: index + 1,
        label: minutesToLabel(minutes),
      })),
    );
  const slotLookup = new Map(
    projectedSlots.map((slot) => [`${slot.projectedDateKey}|${slot.projectedRowId}`, slot] as const),
  );

  return {
    dates,
    timeRows,
    slots: projectedSlots,
    slotLookup,
  };
}

function summarizeMeetingWindow({
  meetingWindow,
  locale,
  slotMap,
  timezone,
  viewerTimezone,
}: {
  meetingWindow: MeetingWindow;
  locale: AppLocale;
  slotMap: Map<string, SnapshotSlot>;
  timezone: string;
  viewerTimezone?: string | null;
}): MeetingWindowSummary | null {
  const windowSlots = meetingWindow.slotStarts
    .map((slotStart) => slotMap.get(slotStart))
    .filter(Boolean) as SnapshotSlot[];

  if (windowSlots.length !== meetingWindow.slotStarts.length) {
    return null;
  }

  const participantIdSets = windowSlots.map((slot) => new Set(slot.participantIds));
  const participantIds = participantIdSets.length
    ? [...participantIdSets[0]].filter((participantId) =>
        participantIdSets.every((set) => set.has(participantId)),
      )
    : [];
  const availableCount = windowSlots.length
    ? Math.min(...windowSlots.map((slot) => slot.availabilityCount))
    : 0;
  const sumCount = windowSlots.reduce((acc, slot) => acc + slot.availabilityCount, 0);
  const labels = formatMeetingWindowLabels({
    slotStart: meetingWindow.slotStart,
    slotEnd: meetingWindow.slotEnd,
    locale,
    timezone,
    viewerTimezone,
  });

  return {
    slotStart: meetingWindow.slotStart,
    slotEnd: meetingWindow.slotEnd,
    dateKey: meetingWindow.dateKey,
    label: labels.label,
    localLabel: labels.localLabel,
    availableCount,
    participantIds,
    sumCount,
  };
}

export function buildFinalizedSlot({
  dates,
  locale,
  timezone,
  dayStartMinutes,
  dayEndMinutes,
  slotMinutes,
  meetingDurationMinutes,
  slots,
  finalSlotStart,
  viewerTimezone,
}: {
  dates: string[];
  locale: AppLocale;
  timezone: string;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  meetingDurationMinutes: number;
  slots: SnapshotSlot[];
  finalSlotStart: string;
  viewerTimezone?: string | null;
}): FinalizedEventSlot | null {
  const meetingWindow = buildMeetingWindows({
    dates,
    timezone,
    dayStartMinutes,
    dayEndMinutes,
    slotMinutes,
    meetingDurationMinutes,
  }).find((candidate) => candidate.slotStart === finalSlotStart);

  if (!meetingWindow) {
    return null;
  }

  const slotMap = new Map(slots.map((slot) => [slot.slotStart, slot]));

  const summary = summarizeMeetingWindow({
    meetingWindow,
    locale,
    slotMap,
    timezone,
    viewerTimezone,
  });

  if (!summary) {
    return null;
  }

  const { sumCount, ...finalizedSlot } = summary;
  void sumCount;
  return finalizedSlot;
}

export function buildSnapshot({
  id,
  slug,
  title,
  locale,
  timezone,
  status,
  slotMinutes,
  meetingDurationMinutes,
  dayStartMinutes,
  dayEndMinutes,
  dates,
  participants,
  finalSlotStart,
  currentParticipantId,
  viewerTimezone,
}: BuildSnapshotInput): PublicEventSnapshot {
  const sortedDates = sortDateKeys(dates);
  const enumeratedSlots = enumerateEventSlots({
    dates: sortedDates,
    timezone,
    dayStartMinutes,
    dayEndMinutes,
    slotMinutes,
  });
  const dateEntries: SnapshotDate[] = sortedDates.map((dateKey) => ({
    dateKey,
    label: formatDateKeyLabel(dateKey, timezone, locale),
  }));
  const timeRows = buildSnapshotTimeRows(enumeratedSlots);

  const participantSelections = new Map<string, Set<string>>();
  const slotParticipants = new Map<string, Set<string>>();

  for (const participant of participants) {
    const selectionSet = new Set(participant.availabilitySlotStarts);
    participantSelections.set(participant.id, selectionSet);

    for (const slotStart of selectionSet) {
      const current = slotParticipants.get(slotStart) ?? new Set<string>();
      current.add(participant.id);
      slotParticipants.set(slotStart, current);
    }
  }

  const slots: SnapshotSlot[] = enumeratedSlots.map((slot) => {
    const participantIds = Array.from(slotParticipants.get(slot.slotStart) ?? []);
    const selectedByCurrentUser = currentParticipantId
      ? participantSelections.get(currentParticipantId)?.has(slot.slotStart) ?? false
      : false;

    return {
      slotStart: slot.slotStart,
      dateKey: slot.dateKey,
      minutes: slot.minutes,
      availabilityCount: participantIds.length,
      participantIds,
      selectedByCurrentUser,
    };
  });

  const participantEntries: SnapshotParticipant[] = participants.map((participant) => ({
    id: participant.id,
    displayName: participant.displayName,
    color: participant.color,
    selectedSlotCount: participant.availabilitySlotStarts.length,
    isCurrentUser: participant.id === currentParticipantId,
  }));

  const suggestions = rankBestSuggestions({
    dates: sortedDates,
    locale,
    timezone,
    dayStartMinutes,
    dayEndMinutes,
    slotMinutes,
    meetingDurationMinutes,
    slots,
    viewerTimezone,
  });

  const finalizedSlot =
    finalSlotStart && status === "CLOSED"
      ? buildFinalizedSlot({
          dates: sortedDates,
          locale,
          timezone,
          dayStartMinutes,
          dayEndMinutes,
          slotMinutes,
          meetingDurationMinutes,
          slots,
          finalSlotStart,
          viewerTimezone,
        })
      : null;

  const currentParticipant =
    participantEntries.find((participant) => participant.isCurrentUser) ?? null;

  return {
    id,
    slug,
    title,
    timezone,
    status,
    slotMinutes,
    meetingDurationMinutes,
    dayStartMinutes,
    dayEndMinutes,
    dates: dateEntries,
    timeRows,
    slots,
    participants: participantEntries,
    suggestions,
    finalizedSlot,
    currentParticipant,
  };
}

function rankBestSuggestions({
  dates,
  locale,
  timezone,
  dayStartMinutes,
  dayEndMinutes,
  slotMinutes,
  meetingDurationMinutes,
  slots,
  viewerTimezone,
}: {
  dates: string[];
  locale: AppLocale;
  timezone: string;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  meetingDurationMinutes: number;
  slots: SnapshotSlot[];
  viewerTimezone?: string | null;
}): BestTimeSuggestion[] {
  const meetingWindows = buildMeetingWindows({
    dates,
    timezone,
    dayStartMinutes,
    dayEndMinutes,
    slotMinutes,
    meetingDurationMinutes,
  });
  const slotMap = new Map(slots.map((slot) => [slot.slotStart, slot]));

  return meetingWindows
    .map((meetingWindow) =>
      summarizeMeetingWindow({
        meetingWindow,
        locale,
        slotMap,
        timezone,
        viewerTimezone,
      }),
    )
    .filter(isMeetingWindowSummary)
    .sort((left, right) => {
      if (right.availableCount !== left.availableCount) {
        return right.availableCount - left.availableCount;
      }

      if (right.sumCount !== left.sumCount) {
        return right.sumCount - left.sumCount;
      }

      return left.slotStart.localeCompare(right.slotStart);
    })
    .slice(0, 3)
    .map((summary) => {
      const { sumCount, ...suggestion } = summary;
      void sumCount;
      return suggestion;
    });
}

export function getAllowedSlotStarts({
  dates,
  timezone,
  dayStartMinutes,
  dayEndMinutes,
  slotMinutes,
}: {
  dates: string[];
  timezone: string;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
}) {
  return new Set(
    enumerateEventSlots({
      dates,
      timezone,
      dayStartMinutes,
      dayEndMinutes,
      slotMinutes,
    }).map((slot) => slot.slotStart),
  );
}

export function getAllowedFinalSlotStarts({
  dates,
  timezone,
  dayStartMinutes,
  dayEndMinutes,
  slotMinutes,
  meetingDurationMinutes,
}: {
  dates: string[];
  timezone: string;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  meetingDurationMinutes: number;
}) {
  return new Set(
    buildMeetingWindows({
      dates,
      timezone,
      dayStartMinutes,
      dayEndMinutes,
      slotMinutes,
      meetingDurationMinutes,
    }).map((meetingWindow) => meetingWindow.slotStart),
  );
}
