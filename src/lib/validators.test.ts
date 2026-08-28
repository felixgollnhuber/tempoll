import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n/messages";
import {
  createAvailabilityMutationSchema,
  createEventCreateSchema,
  createManageUpdateSchema,
} from "@/lib/validators";

const messages = getMessages("en");
const schedulePreview = {
  expectedScheduleSignature: '[["2026-04-02"],540,1020]',
  expectedDeletedVotes: 0,
  expectedAffectedParticipants: 0,
};

function buildDateRange(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 3, 1 + index));
    return date.toISOString().slice(0, 10);
  });
}

function createEventInput(eventType: "time_grid" | "full_day", dates: string[]) {
  return {
    eventType,
    title: "Planning event",
    timezone: "Europe/Vienna",
    dates,
    dayStartMinutes: 9 * 60,
    dayEndMinutes: 17 * 60,
    slotMinutes: 30,
    meetingDurationMinutes: 60,
  };
}

describe("validators", () => {
  it("keeps the 31-day date range limit for time-slot events", () => {
    const result = createEventCreateSchema(messages).safeParse(
      createEventInput("time_grid", buildDateRange(32)),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["dates"],
      message: "Time-slot events can include up to 31 days.",
    });
  });

  it("allows full-day events with more than 31 days", () => {
    const result = createEventCreateSchema(messages).safeParse(
      {
        ...createEventInput("full_day", buildDateRange(90)),
        fullDayStartMinutes: 18 * 60,
      },
    );

    expect(result.success).toBe(true);
    expect(result.data?.fullDayStartMinutes).toBe(18 * 60);
  });

  it("rejects full-day events with extremely long date ranges", () => {
    const result = createEventCreateSchema(messages).safeParse(
      createEventInput("full_day", buildDateRange(367)),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["dates"],
      message: "Full-day events can include up to 366 days.",
    });
  });

  it("accepts optional location for in-person events", () => {
    const result = createEventCreateSchema(messages).safeParse({
      ...createEventInput("time_grid", buildDateRange(1)),
      location: "Office 3.2",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      location: "Office 3.2",
      isOnlineMeeting: false,
    });
  });

  it("accepts online meeting details without keeping a location", () => {
    const result = createEventCreateSchema(messages).safeParse({
      ...createEventInput("time_grid", buildDateRange(1)),
      location: "Office 3.2",
      isOnlineMeeting: true,
      meetingLink: "https://meet.example.com/planning",
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("location");
    expect(result.data).toMatchObject({
      isOnlineMeeting: true,
      meetingLink: "https://meet.example.com/planning",
    });
  });

  it("requires meeting links to be full http or https URLs", () => {
    const result = createEventCreateSchema(messages).safeParse({
      ...createEventInput("time_grid", buildDateRange(1)),
      isOnlineMeeting: true,
      meetingLink: "meet.example.com/planning",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["meetingLink"],
      message: "Use a full meeting link including http:// or https://.",
    });
  });

  it("allows long full-day availability payloads beyond the old 1000-slot cap", () => {
    const selectedSlotStarts = Array.from({ length: 1001 }, (_, index) =>
      new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
    );

    expect(
      createAvailabilityMutationSchema().safeParse({
        selectedSlotStarts,
      }).success,
    ).toBe(true);
  });

  it("allows all slots across 31 full fallback days at 15-minute granularity", () => {
    const selectedSlotStarts = Array.from({ length: 3100 }, (_, index) =>
      new Date(Date.UTC(2026, 0, 1, 0, index * 15)).toISOString(),
    );

    expect(
      createAvailabilityMutationSchema().safeParse({
        selectedSlotStarts,
      }).success,
    ).toBe(true);
  });

  it("accepts an updateSchedule action with dates and an optional daily window", () => {
    const withWindow = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["2026-04-02", "2026-04-03"],
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 17 * 60,
      ...schedulePreview,
    });
    expect(withWindow.success).toBe(true);

    const datesOnly = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["2026-04-02"],
      ...schedulePreview,
    });
    expect(datesOnly.success).toBe(true);
  });

  it("rejects an updateSchedule action with no dates", () => {
    const result = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: [],
      ...schedulePreview,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["dates"]);
  });

  it("rejects an updateSchedule window where the end is not after the start", () => {
    const result = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["2026-04-02"],
      dayStartMinutes: 17 * 60,
      dayEndMinutes: 9 * 60,
      ...schedulePreview,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["dayEndMinutes"],
    });
  });

  it("rejects impossible calendar dates but accepts a real leap day", () => {
    const invalidCreate = createEventCreateSchema(messages).safeParse(
      createEventInput("time_grid", ["2026-02-30"]),
    );
    const invalidUpdate = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["2026-04-31"],
      ...schedulePreview,
    });
    const unsupportedEarlyYear = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["0001-01-01"],
      ...schedulePreview,
    });
    const unsupportedFinalYear = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["9999-12-31"],
      ...schedulePreview,
    });
    const leapDay = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["2024-02-29"],
      ...schedulePreview,
    });
    const upperBoundary = createManageUpdateSchema(messages).safeParse({
      action: "updateSchedule",
      dates: ["9998-12-31"],
      ...schedulePreview,
    });

    expect(invalidCreate.success).toBe(false);
    expect(invalidCreate.error?.issues[0]?.path).toEqual(["dates", 0]);
    expect(invalidUpdate.success).toBe(false);
    expect(invalidUpdate.error?.issues[0]?.path).toEqual(["dates", 0]);
    expect(unsupportedEarlyYear.success).toBe(false);
    expect(unsupportedFinalYear.success).toBe(false);
    expect(leapDay.success).toBe(true);
    expect(upperBoundary.success).toBe(true);
  });

  it("rejects invalid timezones and unsafe slot configurations without enumeration", () => {
    const invalidTimezone = createEventCreateSchema(messages).safeParse({
      ...createEventInput("full_day", ["2026-04-02"]),
      timezone: "Not/AZone",
    });
    const zeroSlotSize = createEventCreateSchema(messages).safeParse({
      ...createEventInput("time_grid", ["0001-01-01"]),
      slotMinutes: 0,
    });
    const oversizedDates = createEventCreateSchema(messages).safeParse(
      createEventInput("time_grid", buildDateRange(400)),
    );

    expect(invalidTimezone.success).toBe(false);
    expect(invalidTimezone.error?.issues.some((issue) => issue.path[0] === "timezone")).toBe(true);
    expect(zeroSlotSize.success).toBe(false);
    expect(oversizedDates.success).toBe(false);
  });

  it("requires a finalizable meeting window when creating a time-grid event", () => {
    const result = createEventCreateSchema(messages).safeParse({
      ...createEventInput("time_grid", ["2026-04-02"]),
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 9 * 60 + 30,
      meetingDurationMinutes: 60,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ["dayEndMinutes"],
        message: "Choose dates and a daily window with room for the full meeting duration.",
      }),
    );
  });

  it("requires every time-grid date to have a finalizable meeting window", () => {
    const result = createEventCreateSchema(messages).safeParse({
      ...createEventInput("time_grid", ["2026-03-29", "2026-03-30"]),
      dayStartMinutes: 2 * 60,
      dayEndMinutes: 3 * 60,
      meetingDurationMinutes: 60,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ["dayEndMinutes"],
        message: "Choose dates and a daily window with room for the full meeting duration.",
      }),
    );
  });

  it("rejects nonexistent full-day dates and timed starts", () => {
    const skippedDate = createEventCreateSchema(messages).safeParse({
      ...createEventInput("full_day", ["2011-12-30"]),
      timezone: "Pacific/Apia",
    });
    const skippedStart = createEventCreateSchema(messages).safeParse({
      ...createEventInput("full_day", ["2026-03-29"]),
      timezone: "Europe/Vienna",
      fullDayStartMinutes: 2 * 60 + 30,
    });
    const fallbackStart = createEventCreateSchema(messages).safeParse({
      ...createEventInput("full_day", ["2026-10-25"]),
      timezone: "Europe/Vienna",
      fullDayStartMinutes: 2 * 60 + 30,
    });
    const midnightGapDate = createEventCreateSchema(messages).safeParse({
      ...createEventInput("full_day", ["2026-09-06"]),
      timezone: "America/Santiago",
    });
    const midnightGapTimedStart = createEventCreateSchema(messages).safeParse({
      ...createEventInput("full_day", ["2026-09-06"]),
      timezone: "America/Santiago",
      fullDayStartMinutes: 0,
    });

    expect(skippedDate.success).toBe(false);
    expect(skippedDate.error?.issues.some((issue) => issue.path[0] === "dates")).toBe(true);
    expect(skippedStart.success).toBe(false);
    expect(
      skippedStart.error?.issues.some((issue) => issue.path[0] === "fullDayStartMinutes"),
    ).toBe(true);
    expect(fallbackStart.success).toBe(true);
    expect(midnightGapDate.success).toBe(true);
    expect(midnightGapTimedStart.success).toBe(false);
  });
});
