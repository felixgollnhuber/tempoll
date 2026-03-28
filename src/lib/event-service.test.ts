import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSlotStart } from "@/lib/availability";
import { hashSecret } from "@/lib/tokens";

const prisma = {
  event: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  participant: {
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
};

const publishEventUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("@/lib/realtime", () => ({
  publishEventUpdate,
}));

function createManagedEvent() {
  return {
    id: "event_1",
    slug: "team-sync",
    title: "Team Sync",
    timezone: "Europe/Vienna",
    slotMinutes: 30,
    meetingDurationMinutes: 60,
    dayStartMinutes: 9 * 60,
    dayEndMinutes: 11 * 60,
    status: "OPEN" as const,
    finalSlotStartAt: null,
    manageTokenHash: hashSecret("secret"),
    createdAt: new Date("2026-03-28T10:00:00.000Z"),
    updatedAt: new Date("2026-03-28T10:00:00.000Z"),
    dates: [
      {
        id: "date_1",
        eventId: "event_1",
        dateKey: "2026-04-02",
        createdAt: new Date("2026-03-28T10:00:00.000Z"),
      },
    ],
    participants: [],
  };
}

describe("updateManagedEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    prisma.event.findUnique.mockResolvedValue(createManagedEvent());
    prisma.event.update.mockResolvedValue(undefined);
    publishEventUpdate.mockResolvedValue(undefined);
  });

  it("requires a fixed date before closing an event", async () => {
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateEvent",
        title: "Closed title",
        status: "CLOSED",
        finalSlotStart: null,
      }),
    ).rejects.toMatchObject({
      code: "final_slot_required",
    });

    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it("stores a valid fixed date when closing an event", async () => {
    const { updateManagedEvent } = await import("./event-service");
    const finalSlotStart = buildSlotStart("2026-04-02", 9 * 60, "Europe/Vienna");

    await updateManagedEvent("event_1.secret", {
      action: "updateEvent",
      title: "Closed title",
      status: "CLOSED",
      finalSlotStart,
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: {
        id: "event_1",
      },
      data: {
        title: "Closed title",
        status: "CLOSED",
        finalSlotStartAt: new Date(finalSlotStart),
      },
    });
  });

  it("clears the fixed date when reopening an event", async () => {
    const { updateManagedEvent } = await import("./event-service");
    const finalSlotStart = buildSlotStart("2026-04-02", 9 * 60, "Europe/Vienna");

    await updateManagedEvent("event_1.secret", {
      action: "updateEvent",
      title: "Open title",
      status: "OPEN",
      finalSlotStart,
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: {
        id: "event_1",
      },
      data: {
        title: "Open title",
        status: "OPEN",
        finalSlotStartAt: null,
      },
    });
  });
});
