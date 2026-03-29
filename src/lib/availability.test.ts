import { describe, expect, it } from "vitest";

import { buildSlotStart, buildSnapshot, buildTimeOptions } from "./availability";

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
});
