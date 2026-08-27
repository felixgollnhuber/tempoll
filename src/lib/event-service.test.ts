import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildSlotStart, getAllowedSlotStarts } from "@/lib/availability";
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
  eventDate: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  availabilitySlot: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(async (operations: unknown[]) => operations),
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
    fullDayStartMinutes: null,
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
      isOnlineMeeting: false,
      timezone: "Europe/Vienna",
      dates: ["2026-04-02", "2026-04-03"],
      fullDayStartMinutes: 18 * 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      slotMinutes: 30,
      meetingDurationMinutes: 60,
    });

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "FULL_DAY",
          fullDayStartMinutes: 18 * 60,
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

function createManagedEventWithDates(
  dateKeys: string[],
  overrides: { status?: "OPEN" | "CLOSED" } = {},
) {
  const base = createManagedEvent();
  return {
    ...base,
    ...overrides,
    dates: dateKeys.map((dateKey, index) => ({
      id: `date_${index + 1}`,
      eventId: base.id,
      dateKey,
      createdAt: new Date("2026-03-28T10:00:00.000Z"),
    })),
  };
}

function prunedNotInIso() {
  const call = prisma.availabilitySlot.deleteMany.mock.calls[0]?.[0] as
    | { where: { eventId: string; slotStartAt: { notIn: Date[] } } }
    | undefined;
  if (!call) {
    throw new Error("availabilitySlot.deleteMany was not called");
  }
  return {
    eventId: call.where.eventId,
    allowed: call.where.slotStartAt.notIn.map((date) => date.toISOString()).sort(),
  };
}

describe("updateManagedEvent updateSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    prisma.event.findUnique.mockResolvedValue(createManagedEvent());
    prisma.event.update.mockResolvedValue(undefined);
    publishEventUpdate.mockResolvedValue(undefined);
  });

  it("adds a date without removing existing dates or narrowing votes", async () => {
    prisma.event.findUnique.mockResolvedValue(createManagedEventWithDates(["2026-04-02"]));
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02", "2026-04-03"],
    });

    expect(prisma.eventDate.createMany).toHaveBeenCalledWith({
      data: [{ eventId: "event_1", dateKey: "2026-04-03" }],
      skipDuplicates: true,
    });
    expect(prisma.eventDate.deleteMany).not.toHaveBeenCalled();
    // Window unchanged, so the event row is not touched.
    expect(prisma.event.update).not.toHaveBeenCalled();

    const expectedAllowed = Array.from(
      getAllowedSlotStarts({
        dates: ["2026-04-02", "2026-04-03"],
        timezone: "Europe/Vienna",
        dayStartMinutes: 9 * 60,
        dayEndMinutes: 11 * 60,
        slotMinutes: 30,
      }),
    ).sort();
    const pruned = prunedNotInIso();
    expect(pruned.eventId).toBe("event_1");
    expect(pruned.allowed).toEqual(expectedAllowed);
    expect(publishEventUpdate).toHaveBeenCalledWith({
      eventId: "event_1",
      kind: "event-updated",
      participantId: undefined,
    });
  });

  it("removes a date and prunes votes that fall outside the remaining dates", async () => {
    prisma.event.findUnique.mockResolvedValue(
      createManagedEventWithDates(["2026-04-02", "2026-04-03"]),
    );
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02"],
    });

    expect(prisma.eventDate.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event_1", dateKey: { in: ["2026-04-03"] } },
    });
    expect(prisma.eventDate.createMany).not.toHaveBeenCalled();

    const expectedAllowed = Array.from(
      getAllowedSlotStarts({
        dates: ["2026-04-02"],
        timezone: "Europe/Vienna",
        dayStartMinutes: 9 * 60,
        dayEndMinutes: 11 * 60,
        slotMinutes: 30,
      }),
    ).sort();
    const pruned = prunedNotInIso();
    expect(pruned.allowed).toEqual(expectedAllowed);
    // None of the still-allowed slots may fall on the removed date.
    expect(pruned.allowed.some((iso) => iso.includes("2026-04-03"))).toBe(false);
  });

  it("narrows the daily window and prunes out-of-window votes", async () => {
    prisma.event.findUnique.mockResolvedValue(createManagedEventWithDates(["2026-04-02"]));
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02"],
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 10 * 60,
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event_1" },
      data: { dayStartMinutes: 9 * 60, dayEndMinutes: 10 * 60 },
    });

    const expectedAllowed = Array.from(
      getAllowedSlotStarts({
        dates: ["2026-04-02"],
        timezone: "Europe/Vienna",
        dayStartMinutes: 9 * 60,
        dayEndMinutes: 10 * 60,
        slotMinutes: 30,
      }),
    ).sort();
    const pruned = prunedNotInIso();
    // 9:00-10:00 at 30-minute slots leaves exactly two allowed slot starts.
    expect(pruned.allowed).toHaveLength(2);
    expect(pruned.allowed).toEqual(expectedAllowed);
  });

  it("rejects schedule edits while the event is closed", async () => {
    prisma.event.findUnique.mockResolvedValue(
      createManagedEventWithDates(["2026-04-02"], { status: "CLOSED" }),
    );
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-04-02", "2026-04-03"],
      }),
    ).rejects.toMatchObject({ code: "event_closed" });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when too many dates are supplied for a time-grid event", async () => {
    prisma.event.findUnique.mockResolvedValue(createManagedEventWithDates(["2026-04-02"]));
    const { updateManagedEvent } = await import("./event-service");

    const tooManyDates = Array.from({ length: 32 }, (_unused, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `2026-05-${day}`;
    });

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: tooManyDates,
      }),
    ).rejects.toMatchObject({ code: "too_many_dates" });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
