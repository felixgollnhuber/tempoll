import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { getDateFnsLocale } from "@/lib/i18n/format";
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
  const timeRows = buildTimeRows({
    slotMinutes,
    dayStartMinutes,
    dayEndMinutes,
  });
  const windowSize = getMeetingWindowSize(slotMinutes, meetingDurationMinutes);

  for (const dateKey of sortDateKeys(dates)) {
    for (let index = 0; index <= timeRows.length - windowSize; index += 1) {
      const windowRows = timeRows.slice(index, index + windowSize);
      const slotStarts = windowRows.map((timeRow) => buildSlotStart(dateKey, timeRow.minutes, timezone));
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
  const dateEntries: SnapshotDate[] = sortedDates.map((dateKey) => ({
    dateKey,
    label: formatDateKeyLabel(dateKey, timezone, locale),
  }));
  const timeRows = buildTimeRows({
    slotMinutes,
    dayStartMinutes,
    dayEndMinutes,
  });

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

  const slots: SnapshotSlot[] = [];
  for (const dateKey of sortedDates) {
    for (const timeRow of timeRows) {
      const slotStart = buildSlotStart(dateKey, timeRow.minutes, timezone);
      const participantIds = Array.from(slotParticipants.get(slotStart) ?? []);
      const selectedByCurrentUser = currentParticipantId
        ? participantSelections.get(currentParticipantId)?.has(slotStart) ?? false
        : false;

      slots.push({
        slotStart,
        dateKey,
        minutes: timeRow.minutes,
        availabilityCount: participantIds.length,
        participantIds,
        selectedByCurrentUser,
      });
    }
  }

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
  const allowed = new Set<string>();
  const timeRows = buildTimeRows({
    slotMinutes,
    dayStartMinutes,
    dayEndMinutes,
  });

  for (const dateKey of dates) {
    for (const timeRow of timeRows) {
      allowed.add(buildSlotStart(dateKey, timeRow.minutes, timezone));
    }
  }

  return allowed;
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
