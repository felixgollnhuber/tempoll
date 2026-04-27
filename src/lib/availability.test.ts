import { describe, expect, it } from "vitest";

import {
  buildFullDaySlotStart,
  buildMeetingWindows,
  buildSlotStart,
  buildSnapshot,
  buildTimeOptions,
  enumerateEventSlots,
  enumerateFullDayEventSlots,
  getAllowedFullDaySlotStarts,
  getAllowedFinalSlotStarts,
  getAllowedSlotStarts,
} from "./availability";

describe("availability helpers", () => {
  it("includes 24:00 as the final time option", () => {
    const options = buildTimeOptions(30);
    const lastOption = options.at(-1);

    expect(lastOption).toEqual({
      value: 24 * 60,
      label: "24:00",
    });
  });

  it("builds stable UTC slot timestamps from a local date and timezone", () => {
    expect(buildSlotStart("2026-04-10", 9 * 60, "Europe/Vienna")).toBe(
      "2026-04-10T07:00:00.000Z",
    );
  });

  it("skips nonexistent spring-forward wall times when enumerating event slots", () => {
    const slots = enumerateEventSlots({
      dates: ["2026-03-29"],
      timezone: "Europe/Vienna",
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 4 * 60,
      slotMinutes: 30,
    });

    expect(slots.map((slot) => slot.label)).toEqual(["01:00", "01:30", "03:00", "03:30"]);
    expect(getAllowedSlotStarts({
      dates: ["2026-03-29"],
      timezone: "Europe/Vienna",
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 4 * 60,
      slotMinutes: 30,
    })).toEqual(new Set(slots.map((slot) => slot.slotStart)));
  });

  it("keeps repeated fall-back wall times as distinct slots", () => {
    const slots = enumerateEventSlots({
      dates: ["2026-10-25"],
      timezone: "Europe/Vienna",
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 4 * 60,
      slotMinutes: 30,
    });

    expect(slots.filter((slot) => slot.label === "02:00")).toHaveLength(2);
    expect(slots.filter((slot) => slot.label === "02:30")).toHaveLength(2);
    expect(new Set(slots.filter((slot) => slot.label === "02:00").map((slot) => slot.slotStart)).size).toBe(2);
  });

  it("handles US daylight-saving transitions with the same instant-based enumeration", () => {
    const springForwardSlots = enumerateEventSlots({
      dates: ["2026-03-08"],
      timezone: "America/New_York",
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 4 * 60,
      slotMinutes: 30,
    });

    expect(springForwardSlots.map((slot) => slot.label)).toEqual(["01:00", "01:30", "03:00", "03:30"]);
  });

  it("ranks best windows by strongest full-duration overlap", () => {
    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "design-review",
      title: "Design Review",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "OPEN",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 12 * 60,
      dates: ["2026-04-10"],
      finalSlotStart: null,
      participants: [
        {
          id: "p1",
          displayName: "Alice",
          color: "red",
          availabilitySlotStarts: [
            buildSlotStart("2026-04-10", 9 * 60, "Europe/Vienna"),
            buildSlotStart("2026-04-10", 9 * 60 + 30, "Europe/Vienna"),
            buildSlotStart("2026-04-10", 10 * 60, "Europe/Vienna"),
          ],
        },
        {
          id: "p2",
          displayName: "Bob",
          color: "blue",
          availabilitySlotStarts: [
            buildSlotStart("2026-04-10", 9 * 60, "Europe/Vienna"),
            buildSlotStart("2026-04-10", 9 * 60 + 30, "Europe/Vienna"),
          ],
        },
        {
          id: "p3",
          displayName: "Carla",
          color: "green",
          availabilitySlotStarts: [
            buildSlotStart("2026-04-10", 9 * 60, "Europe/Vienna"),
            buildSlotStart("2026-04-10", 9 * 60 + 30, "Europe/Vienna"),
            buildSlotStart("2026-04-10", 10 * 60 + 30, "Europe/Vienna"),
          ],
        },
      ],
    });

    expect(snapshot.suggestions[0]?.availableCount).toBe(3);
    expect(snapshot.suggestions[0]?.slotStart).toBe(
      buildSlotStart("2026-04-10", 9 * 60, "Europe/Vienna"),
    );
    expect(snapshot.finalizedSlot).toBeNull();
  });

  it("builds one canonical slot per date for full-day events", () => {
    const slots = enumerateFullDayEventSlots({
      dates: ["2026-04-11", "2026-04-10"],
      timezone: "Europe/Vienna",
    });

    expect(slots).toEqual([
      {
        slotStart: buildFullDaySlotStart("2026-04-10", "Europe/Vienna"),
        dateKey: "2026-04-10",
        minutes: 0,
        label: "All day",
      },
      {
        slotStart: buildFullDaySlotStart("2026-04-11", "Europe/Vienna"),
        dateKey: "2026-04-11",
        minutes: 0,
        label: "All day",
      },
    ]);
    expect(getAllowedFullDaySlotStarts({
      dates: ["2026-04-10"],
      timezone: "Europe/Vienna",
    })).toEqual(new Set([buildFullDaySlotStart("2026-04-10", "Europe/Vienna")]));
  });

  it("aggregates and ranks full-day availability by day", () => {
    const firstDay = buildFullDaySlotStart("2026-04-10", "Europe/Vienna");
    const secondDay = buildFullDaySlotStart("2026-04-11", "Europe/Vienna");

    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "offsite-days",
      title: "Offsite Days",
      eventType: "full_day",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "OPEN",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      dates: ["2026-04-10", "2026-04-11"],
      finalSlotStart: null,
      currentParticipantId: "p1",
      participants: [
        {
          id: "p1",
          displayName: "Alice",
          color: "red",
          availabilitySlotStarts: [firstDay],
        },
        {
          id: "p2",
          displayName: "Bob",
          color: "blue",
          availabilitySlotStarts: [firstDay, secondDay],
        },
      ],
    });

    expect(snapshot.timeRows).toEqual([]);
    expect(snapshot.slots).toHaveLength(2);
    expect(snapshot.slots[0]).toMatchObject({
      slotStart: firstDay,
      availabilityCount: 2,
      selectedByCurrentUser: true,
    });
    expect(snapshot.suggestions[0]).toMatchObject({
      slotStart: firstDay,
      label: "Fri, Apr 10",
      availableCount: 2,
    });
  });

  it("builds a finalized full-day slot from the stored day start", () => {
    const fullDaySlot = buildFullDaySlotStart("2026-04-10", "Europe/Vienna");

    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "offsite-days",
      title: "Offsite Days",
      eventType: "full_day",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "CLOSED",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      dates: ["2026-04-10"],
      finalSlotStart: fullDaySlot,
      participants: [
        {
          id: "p1",
          displayName: "Alice",
          color: "red",
          availabilitySlotStarts: [fullDaySlot],
        },
      ],
    });

    expect(snapshot.finalizedSlot).toMatchObject({
      slotStart: fullDaySlot,
      dateKey: "2026-04-10",
      label: "Fri, Apr 10",
      availableCount: 1,
    });
  });

  it("builds a finalized slot from the stored start and clears invalid starts", () => {
    const validSlotStart = buildSlotStart("2026-04-10", 9 * 60, "Europe/Vienna");

    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "design-review",
      title: "Design Review",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "CLOSED",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      dates: ["2026-04-10"],
      finalSlotStart: validSlotStart,
      participants: [
        {
          id: "p1",
          displayName: "Alice",
          color: "red",
          availabilitySlotStarts: [
            validSlotStart,
            buildSlotStart("2026-04-10", 9 * 60 + 30, "Europe/Vienna"),
          ],
        },
        {
          id: "p2",
          displayName: "Bob",
          color: "blue",
          availabilitySlotStarts: [
            validSlotStart,
            buildSlotStart("2026-04-10", 9 * 60 + 30, "Europe/Vienna"),
          ],
        },
      ],
    });

    expect(snapshot.finalizedSlot).toMatchObject({
      slotStart: validSlotStart,
      availableCount: 2,
    });

    const invalidSnapshot = buildSnapshot({
      id: "event_1",
      slug: "design-review",
      title: "Design Review",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "CLOSED",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      dates: ["2026-04-10"],
      finalSlotStart: buildSlotStart("2026-04-10", 10 * 60 + 30, "Europe/Vienna"),
      participants: [
        {
          id: "p1",
          displayName: "Alice",
          color: "red",
          availabilitySlotStarts: [validSlotStart],
        },
      ],
    });

    expect(invalidSnapshot.finalizedSlot).toBeNull();
  });

  it("derives allowed final slots from the same DST-safe meeting windows used for ranking", () => {
    const expectedMeetingWindows = buildMeetingWindows({
      dates: ["2026-03-29"],
      timezone: "Europe/Vienna",
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 4 * 60,
      slotMinutes: 30,
      meetingDurationMinutes: 60,
    });

    expect(getAllowedFinalSlotStarts({
      dates: ["2026-03-29"],
      timezone: "Europe/Vienna",
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 4 * 60,
      slotMinutes: 30,
      meetingDurationMinutes: 60,
    })).toEqual(new Set(expectedMeetingWindows.map((meetingWindow) => meetingWindow.slotStart)));
  });
});
