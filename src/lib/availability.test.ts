import { describe, expect, it } from "vitest";

import {
  buildFullDaySlotStart,
  buildMeetingWindows,
  buildSlotStart,
  buildSnapshot,
  buildTimeOptions,
  doesZonedCivilDateExist,
  enumerateEventSlots,
  enumerateFullDayEventSlots,
  formatFullDayDateLabel,
  getAllowedFullDaySlotStarts,
  getAllowedFinalSlotStarts,
  getAllowedSlotStarts,
  isExistingZonedWallTime,
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

  it("adds the optional start time to full-day suggestion labels", () => {
    const firstDay = buildFullDaySlotStart("2026-04-10", "Europe/Vienna");

    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "class-reunion",
      title: "Class Reunion",
      eventType: "full_day",
      locale: "en",
      timezone: "Europe/Vienna",
      fullDayStartMinutes: 18 * 60,
      status: "OPEN",
      slotMinutes: 30,
      meetingDurationMinutes: 180,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      dates: ["2026-04-10"],
      finalSlotStart: null,
      participants: [
        {
          id: "p1",
          displayName: "Alice",
          color: "red",
          availabilitySlotStarts: [firstDay],
        },
      ],
    });

    expect(snapshot.fullDayStartMinutes).toBe(18 * 60);
    expect(snapshot.suggestions[0]).toMatchObject({
      slotStart: firstDay,
      slotEnd: "2026-04-10T17:00:00.000Z",
      label: "Fri, Apr 10 · 18:00",
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

  it("does not combine repeated fallback-hour occurrences into an overlong meeting", () => {
    const windows = buildMeetingWindows({
      dates: ["2026-10-25"],
      timezone: "Europe/Vienna",
      dayStartMinutes: 2 * 60,
      dayEndMinutes: 2 * 60 + 30,
      slotMinutes: 30,
      meetingDurationMinutes: 60,
    });

    expect(windows).toEqual([]);
  });

  it("rejects a meeting window that exists only inside the spring-forward gap", () => {
    expect(
      getAllowedFinalSlotStarts({
        dates: ["2026-03-29"],
        timezone: "Europe/Vienna",
        dayStartMinutes: 2 * 60,
        dayEndMinutes: 3 * 60,
        slotMinutes: 30,
        meetingDurationMinutes: 60,
      }),
    ).toEqual(new Set());
  });

  it("rejects meetings whose real DST-adjusted end is after the daily end", () => {
    expect(
      getAllowedFinalSlotStarts({
        dates: ["2026-03-29"],
        timezone: "Europe/Vienna",
        dayStartMinutes: 1 * 60,
        dayEndMinutes: 2 * 60 + 30,
        slotMinutes: 30,
        meetingDurationMinutes: 60,
      }),
    ).toEqual(new Set());
  });

  it("rejects a slot-aligned meeting that extends past a half-hour daily boundary", () => {
    expect(
      getAllowedFinalSlotStarts({
        dates: ["2026-04-02"],
        timezone: "Europe/Vienna",
        dayStartMinutes: 9 * 60 + 30,
        dayEndMinutes: 10 * 60 + 30,
        slotMinutes: 60,
        meetingDurationMinutes: 60,
      }),
    ).toEqual(new Set());
  });

  it("keeps rendering a legacy finalized DST window while rejecting it for new closes", () => {
    const finalSlotStart = buildSlotStart("2026-03-29", 1 * 60, "Europe/Vienna");
    const secondSlotStart = new Date(new Date(finalSlotStart).getTime() + 30 * 60 * 1000).toISOString();
    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "legacy-dst-event",
      title: "Legacy DST event",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "CLOSED",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 1 * 60,
      dayEndMinutes: 2 * 60 + 30,
      dates: ["2026-03-29"],
      finalSlotStart,
      participants: [
        {
          id: "participant_1",
          displayName: "Felix",
          color: "red",
          availabilitySlotStarts: [finalSlotStart, secondSlotStart],
        },
      ],
    });

    expect(snapshot.finalizedSlot).not.toBeNull();
    expect(snapshot.finalizedSlot?.slotStart).toBe(finalSlotStart);
  });

  it("detects nonexistent full-day civil dates and timed starts", () => {
    expect(
      doesZonedCivilDateExist({
        dateKey: "2011-12-30",
        timezone: "Pacific/Apia",
      }),
    ).toBe(false);
    expect(
      doesZonedCivilDateExist({
        dateKey: "2026-09-06",
        timezone: "America/Santiago",
      }),
    ).toBe(true);
    expect(
      doesZonedCivilDateExist({
        dateKey: "2000-01-15",
        timezone: "Africa/Khartoum",
      }),
    ).toBe(true);
    expect(
      isExistingZonedWallTime({
        dateKey: "2011-12-30",
        minutes: 0,
        timezone: "Pacific/Apia",
      }),
    ).toBe(false);
    expect(
      isExistingZonedWallTime({
        dateKey: "2026-03-29",
        minutes: 2 * 60 + 30,
        timezone: "Europe/Vienna",
      }),
    ).toBe(false);
    expect(
      isExistingZonedWallTime({
        dateKey: "2026-10-25",
        minutes: 2 * 60 + 30,
        timezone: "Europe/Vienna",
      }),
    ).toBe(true);
    expect(
      formatFullDayDateLabel({
        dateKey: "2026-03-29",
        fullDayStartMinutes: 2 * 60 + 30,
        timezone: "Europe/Vienna",
        locale: "en",
      }),
    ).toContain("01:30");
  });

  it("keeps a stable full-day identity when a valid civil date skips midnight", () => {
    const slotStart = buildFullDaySlotStart("2026-09-06", "America/Santiago");

    expect(slotStart).toBe("2026-09-06T03:00:00.000Z");
    expect(
      getAllowedFullDaySlotStarts({
        dates: ["2026-09-06"],
        timezone: "America/Santiago",
      }),
    ).toEqual(new Set([slotStart]));

    const snapshot = buildSnapshot({
      id: "event_1",
      slug: "santiago-day",
      title: "Santiago Day",
      eventType: "full_day",
      locale: "en",
      timezone: "America/Santiago",
      status: "CLOSED",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 0,
      dayEndMinutes: 24 * 60,
      dates: ["2026-09-06"],
      finalSlotStart: slotStart,
      participants: [
        {
          id: "p1",
          displayName: "Felix",
          color: "red",
          availabilitySlotStarts: [slotStart],
        },
      ],
    });

    expect(snapshot.slots[0]?.slotStart).toBe(slotStart);
    expect(snapshot.finalizedSlot?.slotStart).toBe(slotStart);
  });

  it("enumerates the complete time-grid day before a skipped-midnight transition", () => {
    const slots = enumerateEventSlots({
      dates: ["2026-09-05"],
      timezone: "America/Santiago",
      dayStartMinutes: 0,
      dayEndMinutes: 24 * 60,
      slotMinutes: 60,
    });

    expect(slots).toHaveLength(24);
    expect(slots.at(-1)?.minutes).toBe(23 * 60);
  });

  it("keeps a valid civil date whose timezone skips local noon", () => {
    expect(
      enumerateFullDayEventSlots({
        dates: ["2000-01-15"],
        timezone: "Africa/Khartoum",
      }),
    ).toHaveLength(1);
    expect(
      enumerateEventSlots({
        dates: ["2000-01-15"],
        timezone: "Africa/Khartoum",
        dayStartMinutes: 0,
        dayEndMinutes: 24 * 60,
        slotMinutes: 60,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("finds the exact first instant after a historical sub-minute midnight jump", () => {
    const slots = enumerateEventSlots({
      dates: ["1914-01-01"],
      timezone: "America/Manaus",
      dayStartMinutes: 0,
      dayEndMinutes: 60,
      slotMinutes: 15,
    });

    expect(slots[0]?.slotStart).toBe("1914-01-01T04:00:04.000Z");
  });

  it("builds a full-day snapshot at the supported upper year boundary", () => {
    expect(() =>
      buildSnapshot({
        id: "event_1",
        slug: "far-future-event",
        title: "Far future event",
        eventType: "full_day",
        locale: "en",
        timezone: "UTC",
        status: "OPEN",
        slotMinutes: 30,
        meetingDurationMinutes: 60,
        dayStartMinutes: 0,
        dayEndMinutes: 24 * 60,
        dates: ["9998-12-31"],
        finalSlotStart: null,
        participants: [],
      }),
    ).not.toThrow();
  });
});
