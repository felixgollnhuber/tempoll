import { describe, expect, it } from "vitest";

import { buildSlotStart, buildSnapshot } from "./availability";

describe("availability helpers", () => {
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
      timezone: "Europe/Vienna",
      status: "OPEN",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 12 * 60,
      dates: ["2026-04-10"],
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
  });
});
