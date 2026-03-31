import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import type { TimezoneOption } from "@/lib/types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getDateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${pad(month)}-${pad(day)}`;
}

function normalizeReferenceDateKey(referenceDateKey?: string) {
  if (referenceDateKey) {
    return referenceDateKey;
  }

  return getDateKeyFromDate(new Date());
}

function parseOffsetMinutes(offsetText: string) {
  const match = offsetText.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return 0;
  }

  const [, sign, hoursText, minutesText] = match;
  const multiplier = sign === "-" ? -1 : 1;
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  return multiplier * (hours * 60 + minutes);
}

export function formatGmtOffset(offsetMinutes: number) {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }

  return `GMT${sign}${hours}:${pad(minutes)}`;
}

export function getTimezoneOffsetMinutes(timezone: string, referenceDateKey?: string) {
  const dateKey = normalizeReferenceDateKey(referenceDateKey);
  const referenceInstant = fromZonedTime(`${dateKey}T12:00:00`, timezone);
  const offsetText = formatInTimeZone(referenceInstant, timezone, "XXX");
  return parseOffsetMinutes(offsetText);
}

export function buildTimezoneOptions(
  timezones: readonly string[],
  referenceDateKey?: string,
): TimezoneOption[] {
  return [...new Set(timezones)]
    .map((value) => {
      const offsetMinutes = getTimezoneOffsetMinutes(value, referenceDateKey);

      return {
        value,
        offsetMinutes,
        label: `(${formatGmtOffset(offsetMinutes)}) ${value}`,
      };
    })
    .sort(
      (left, right) =>
        left.offsetMinutes - right.offsetMinutes || left.value.localeCompare(right.value),
    );
}

export function findTimezoneOption(
  options: readonly TimezoneOption[],
  timezone: string,
) {
  return options.find((option) => option.value === timezone) ?? null;
}

export function getReferenceDateKeyFromDate(date: Date) {
  return getDateKeyFromDate(date);
}
