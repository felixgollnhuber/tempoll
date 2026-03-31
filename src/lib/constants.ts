export const participantColors = [
  "oklch(0.78 0.17 52)",
  "oklch(0.7 0.16 168)",
  "oklch(0.68 0.18 22)",
  "oklch(0.76 0.13 250)",
  "oklch(0.72 0.18 112)",
  "oklch(0.78 0.14 345)",
  "oklch(0.69 0.18 200)",
  "oklch(0.74 0.17 84)",
];

export const slotMinuteOptions = [15, 30, 60] as const;
export const meetingDurationOptions = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360] as const;

export const popularTimezones = [
  "UTC",
  "Europe/Vienna",
  "Europe/Berlin",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function getSupportedTimezones() {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : popularTimezones;

  return Array.from(new Set([...popularTimezones, ...supported])).sort();
}
