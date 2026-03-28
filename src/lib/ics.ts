import { formatInTimeZone } from "date-fns-tz";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsTimestamp(date: Date) {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function formatIcsZonedDateTime(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyyMMdd'T'HHmmss");
}

export function buildEventCalendarFile({
  slug,
  title,
  timezone,
  slotStart,
  slotEnd,
  url,
  generatedAt = new Date(),
}: {
  slug: string;
  title: string;
  timezone: string;
  slotStart: string;
  slotEnd: string;
  url: string;
  generatedAt?: Date;
}) {
  const uid = `${slug}-${slotStart}@tempoll`;
  const description = `Scheduled with tempoll: ${url}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tempoll//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${formatIcsTimestamp(generatedAt)}`,
    `DTSTART;TZID=${timezone}:${formatIcsZonedDateTime(new Date(slotStart), timezone)}`,
    `DTEND;TZID=${timezone}:${formatIcsZonedDateTime(new Date(slotEnd), timezone)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${escapeIcsText(url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
