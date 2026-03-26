import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import type {
  BestTimeSuggestion,
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
  currentParticipantId?: string | null;
  viewerTimezone?: string | null;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function minutesToLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${pad(hours)}:${pad(mins)}`;
}

export function buildTimeOptions(stepMinutes = 30) {
  return Array.from({ length: (24 * 60) / stepMinutes }, (_, index) => {
    const minutes = index * stepMinutes;
    return {
      value: minutes,
      label: minutesToLabel(minutes),
    };
  });
}

export function sortDateKeys(dateKeys: string[]) {
  return [...new Set(dateKeys)].sort((a, b) => a.localeCompare(b));
}

export function buildSlotStart(dateKey: string, minutes: number, timezone: string) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return fromZonedTime(
    `${dateKey}T${pad(hours)}:${pad(mins)}:00`,
    timezone,
  ).toISOString();
}

export function formatDateKeyLabel(dateKey: string, timezone: string) {
  return formatInTimeZone(
    fromZonedTime(`${dateKey}T12:00:00`, timezone),
    timezone,
    "EEE, MMM d",
  );
}

export function getViewerTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function buildSnapshot({
  id,
  slug,
  title,
  timezone,
  status,
  slotMinutes,
  meetingDurationMinutes,
  dayStartMinutes,
  dayEndMinutes,
  dates,
  participants,
  currentParticipantId,
  viewerTimezone,
}: BuildSnapshotInput): PublicEventSnapshot {
  const sortedDates = sortDateKeys(dates);
  const dateEntries: SnapshotDate[] = sortedDates.map((dateKey) => ({
    dateKey,
    label: formatDateKeyLabel(dateKey, timezone),
  }));

  const timeRows: SnapshotTimeRow[] = [];
  for (let minutes = dayStartMinutes; minutes < dayEndMinutes; minutes += slotMinutes) {
    timeRows.push({
      minutes,
      label: minutesToLabel(minutes),
    });
  }

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
    slotMinutes,
    meetingDurationMinutes,
    timezone,
    viewerTimezone,
    timeRows,
    dates: sortedDates,
    slots,
  });

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
    currentParticipant,
  };
}

function rankBestSuggestions({
  slotMinutes,
  meetingDurationMinutes,
  timezone,
  viewerTimezone,
  timeRows,
  dates,
  slots,
}: {
  slotMinutes: number;
  meetingDurationMinutes: number;
  timezone: string;
  viewerTimezone?: string | null;
  timeRows: SnapshotTimeRow[];
  dates: string[];
  slots: SnapshotSlot[];
}): BestTimeSuggestion[] {
  const windowSize = Math.max(1, Math.floor(meetingDurationMinutes / slotMinutes));
  const slotMap = new Map<string, SnapshotSlot>();

  for (const slot of slots) {
    slotMap.set(`${slot.dateKey}-${slot.minutes}`, slot);
  }

  const ranked: Array<BestTimeSuggestion & { minCount: number; sumCount: number }> = [];

  for (const dateKey of dates) {
    for (let index = 0; index <= timeRows.length - windowSize; index += 1) {
      const windowRows = timeRows.slice(index, index + windowSize);
      const windowSlots = windowRows
        .map((row) => slotMap.get(`${dateKey}-${row.minutes}`))
        .filter(Boolean) as SnapshotSlot[];

      if (windowSlots.length !== windowSize) {
        continue;
      }

      const participantIdSets = windowSlots.map((slot) => new Set(slot.participantIds));
      const overlapIds = [...participantIdSets[0]].filter((participantId) =>
        participantIdSets.every((set) => set.has(participantId)),
      );

      const minCount = Math.min(...windowSlots.map((slot) => slot.availabilityCount));
      const sumCount = windowSlots.reduce((acc, slot) => acc + slot.availabilityCount, 0);
      const start = windowSlots[0].slotStart;
      const end = new Date(
        new Date(windowSlots[windowSlots.length - 1].slotStart).getTime() +
          slotMinutes * 60 * 1000,
      );

      const label = `${formatInTimeZone(new Date(start), timezone, "EEE, MMM d · HH:mm")}–${formatInTimeZone(
        end,
        timezone,
        "HH:mm",
      )}`;
      const localLabel =
        viewerTimezone && viewerTimezone !== timezone
          ? `${formatInTimeZone(new Date(start), viewerTimezone, "EEE, MMM d · HH:mm")}–${formatInTimeZone(
              end,
              viewerTimezone,
              "HH:mm",
            )}`
          : null;

      ranked.push({
        slotStart: start,
        slotEnd: end.toISOString(),
        dateKey,
        label,
        localLabel,
        availableCount: minCount,
        participantIds: overlapIds,
        minCount,
        sumCount,
      });
    }
  }

  return ranked
    .sort((left, right) => {
      if (right.minCount !== left.minCount) {
        return right.minCount - left.minCount;
      }

      if (right.sumCount !== left.sumCount) {
        return right.sumCount - left.sumCount;
      }

      return left.slotStart.localeCompare(right.slotStart);
    })
    .slice(0, 3)
    .map((suggestion) => ({
      slotStart: suggestion.slotStart,
      slotEnd: suggestion.slotEnd,
      dateKey: suggestion.dateKey,
      label: suggestion.label,
      localLabel: suggestion.localLabel,
      availableCount: suggestion.availableCount,
      participantIds: suggestion.participantIds,
    }));
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

  for (const dateKey of dates) {
    for (let minutes = dayStartMinutes; minutes < dayEndMinutes; minutes += slotMinutes) {
      allowed.add(buildSlotStart(dateKey, minutes, timezone));
    }
  }

  return allowed;
}
