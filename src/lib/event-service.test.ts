import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSlotStart } from "@/lib/availability";
import { hashSecret } from "@/lib/tokens";

const prisma = {
  event: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  participant: {
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
};

const publishEventUpdate = vi.fn();
const updateNotificationRecipient = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("@/lib/realtime", () => ({
  publishEventUpdate,
}));

vi.mock("@/lib/availability-notifications", () => ({
  ensureAvailabilityDigestSchedulerStarted: vi.fn(),
  queueAvailabilityDigest: vi.fn(),
  buildManageEventNotificationState: vi.fn(() => ({
    isConfigured: true,
    recipientEmail: null,
    quietPeriodMinutes: 5,
    lastSentAt: null,
    pendingDigest: null,
  })),
  updateNotificationRecipient,
}));

function createManagedEvent() {
  return {
    id: "event_1",
    slug: "team-sync",
    title: "Team Sync",
    type: "TIME_GRID" as const,
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
    availabilityNotification: null,
    participants: [],
  };
}

describe("updateManagedEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    prisma.event.findUnique.mockResolvedValue(createManagedEvent());
    prisma.event.create.mockResolvedValue({
      id: "event_1",
      slug: "team-sync",
    });
    prisma.event.update.mockResolvedValue(undefined);
    publishEventUpdate.mockResolvedValue(undefined);
    updateNotificationRecipient.mockResolvedValue({
      isConfigured: true,
      recipientEmail: "owner@example.com",
      quietPeriodMinutes: 5,
      lastSentAt: null,
      pendingDigest: null,
    });
  });

  it("stores a valid fixed date when closing an event", async () => {
    const { updateManagedEvent } = await import("./event-service");
    const finalSlotStart = buildSlotStart("2026-04-02", 9 * 60, "Europe/Vienna");

    await updateManagedEvent("event_1.secret", {
      action: "closeEvent",
      finalSlotStart,
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: {
        id: "event_1",
      },
      data: {
        status: "CLOSED",
        finalSlotStartAt: new Date(finalSlotStart),
      },
    });
  });

  it("rejects invalid fixed date updates", async () => {
    const { updateManagedEvent } = await import("./event-service");
    const invalidFinalSlotStart = buildSlotStart("2026-04-02", 10 * 60 + 30, "Europe/Vienna");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateFixedDate",
        finalSlotStart: invalidFinalSlotStart,
      }),
    ).rejects.toMatchObject({
      code: "final_slot_invalid",
    });

    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it("clears the fixed date when reopening an event", async () => {
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "reopenEvent",
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: {
        id: "event_1",
      },
      data: {
        status: "OPEN",
        finalSlotStartAt: null,
      },
    });
  });

  it("updates only the title when requested", async () => {
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateTitle",
      title: "Renamed sync",
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: {
        id: "event_1",
      },
      data: {
        title: "Renamed sync",
      },
    });
  });

  it("updates organizer notification email settings", async () => {
    const { updateManagedEvent } = await import("./event-service");

    const result = await updateManagedEvent("event_1.secret", {
      action: "updateNotificationEmail",
      notificationEmail: "owner@example.com",
    });

    expect(updateNotificationRecipient).toHaveBeenCalledWith("event_1", "owner@example.com");
    expect(result).toEqual({
      notification: {
        isConfigured: true,
        recipientEmail: "owner@example.com",
        quietPeriodMinutes: 5,
        lastSentAt: null,
        pendingDigest: null,
      },
    });
  });

  it("creates a full-day event with the Prisma event type", async () => {
    const { createEvent } = await import("./event-service");
    prisma.event.findUnique.mockResolvedValueOnce(null);

    await createEvent({
      eventType: "full_day",
      title: "Offsite Days",
      timezone: "Europe/Vienna",
      dates: ["2026-04-02", "2026-04-03"],
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      slotMinutes: 30,
      meetingDurationMinutes: 60,
    });

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "FULL_DAY",
          title: "Offsite Days",
          dates: {
            createMany: {
              data: [{ dateKey: "2026-04-02" }, { dateKey: "2026-04-03" }],
            },
          },
        }),
      }),
    );
  });

  it("clears organizer notification email settings", async () => {
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateNotificationEmail",
      notificationEmail: "",
    });

    expect(updateNotificationRecipient).toHaveBeenCalledWith("event_1", "");
  });
});
