import { describe, expect, it } from "vitest";

import {
  buildMeetingWindows,
  buildSlotStart,
  buildSnapshot,
  buildTimeOptions,
  enumerateEventSlots,
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
