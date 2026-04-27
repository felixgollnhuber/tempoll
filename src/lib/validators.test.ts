import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n/messages";
import {
  createAvailabilityMutationSchema,
  createEventCreateSchema,
} from "@/lib/validators";

const messages = getMessages("en");

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
      createEventInput("full_day", buildDateRange(90)),
    );

    expect(result.success).toBe(true);
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
});
