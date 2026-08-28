import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import {
  buildFullDaySlotStart,
  buildScheduleSignature,
  buildSlotStart,
} from "@/lib/availability";
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
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
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
    prisma.$queryRaw.mockResolvedValue([{ id: "event_1" }]);
    prisma.$transaction.mockImplementation(
      async (operation: (transaction: typeof prisma) => Promise<unknown>) => operation(prisma),
    );
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
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.event.findUnique.mock.invocationCallOrder[1],
    );
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

  it("revalidates the final slot after a concurrent schedule change", async () => {
    const beforeLock = createManagedEventWithDates(["2026-04-02"]);
    const afterLock = createManagedEventWithDates(["2026-04-03"]);
    prisma.event.findUnique
      .mockResolvedValueOnce(beforeLock)
      .mockResolvedValueOnce(afterLock);
    const { updateManagedEvent } = await import("./event-service");
    const removedFinalSlot = buildSlotStart("2026-04-02", 9 * 60, "Europe/Vienna");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "closeEvent",
        finalSlotStart: removedFinalSlot,
      }),
    ).rejects.toMatchObject({ code: "final_slot_invalid" });

    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(publishEventUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invalid manage token before acquiring the event lock", async () => {
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.wrong-secret", {
        action: "reopenEvent",
      }),
    ).rejects.toMatchObject({ code: "manage_key_invalid" });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
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

  it("serializes participant removal with schedule preview and pruning", async () => {
    prisma.participant.deleteMany.mockResolvedValue({ count: 1 });
    const { deleteParticipant } = await import("./event-service");

    await deleteParticipant("event_1.secret", "participant_1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.participant.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "participant_1",
        eventId: "event_1",
      },
    });
    expect(publishEventUpdate).toHaveBeenCalledWith({
      eventId: "event_1",
      kind: "participant-removed",
      participantId: "participant_1",
    });
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

function schedulePreview(
  event: {
    dates: Array<{ dateKey: string }>;
    dayStartMinutes: number;
    dayEndMinutes: number;
  },
  expectedDeletedVotes = 0,
  expectedAffectedParticipants = 0,
) {
  return {
    expectedScheduleSignature: buildScheduleSignature({
      dates: event.dates.map((date) => date.dateKey),
      dayStartMinutes: event.dayStartMinutes,
      dayEndMinutes: event.dayEndMinutes,
    }),
    expectedDeletedVotes,
    expectedAffectedParticipants,
  };
}

function withParticipantSlots<T extends { id: string }>(
  event: T,
  slotStarts: string[],
) {
  return {
    ...event,
    participants: [
      {
        id: "participant_1",
        eventId: event.id,
        displayName: "Felix",
        displayNameNormalized: "felix",
        color: "#ef7f3b",
        editTokenHash: hashSecret("participant-secret"),
        createdAt: new Date("2026-03-28T10:00:00.000Z"),
        updatedAt: new Date("2026-03-28T10:00:00.000Z"),
        lastSeenAt: null,
        availabilitySlots: slotStarts.map((slotStartAt) => ({
          slotStartAt: new Date(slotStartAt),
        })),
      },
    ],
  };
}

function buildDateRange(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 4, 1 + index));
    return date.toISOString().slice(0, 10);
  });
}

describe("updateManagedEvent updateSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    prisma.event.findUnique.mockResolvedValue(createManagedEvent());
    prisma.event.update.mockResolvedValue(undefined);
    prisma.eventDate.deleteMany.mockResolvedValue({ count: 0 });
    prisma.eventDate.createMany.mockResolvedValue({ count: 0 });
    prisma.availabilitySlot.deleteMany.mockResolvedValue({ count: 0 });
    prisma.$queryRaw.mockResolvedValue([{ id: "event_1" }]);
    prisma.$transaction.mockImplementation(
      async (operation: (transaction: typeof prisma) => Promise<unknown>) => operation(prisma),
    );
    publishEventUpdate.mockResolvedValue(undefined);
  });

  it("adds a date without removing existing dates or narrowing votes", async () => {
    const event = createManagedEventWithDates(["2026-04-02"]);
    prisma.event.findUnique.mockResolvedValue(event);
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02", "2026-04-03"],
      ...schedulePreview(event),
    });

    expect(prisma.eventDate.createMany).toHaveBeenCalledWith({
      data: [{ eventId: "event_1", dateKey: "2026-04-03" }],
      skipDuplicates: true,
    });
    expect(prisma.eventDate.deleteMany).not.toHaveBeenCalled();
    // Window unchanged, so the event row is not touched.
    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(prisma.availabilitySlot.deleteMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(publishEventUpdate).toHaveBeenCalledWith({
      eventId: "event_1",
      kind: "event-updated",
      participantId: undefined,
    });
  });

  it("removes a date and prunes votes that fall outside the remaining dates", async () => {
    const baseEvent = createManagedEventWithDates(["2026-04-02", "2026-04-03"]);
    const removedSlot = buildSlotStart("2026-04-03", 9 * 60, "Europe/Vienna");
    const event = withParticipantSlots(baseEvent, [removedSlot]);
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.availabilitySlot.deleteMany.mockResolvedValue({ count: 1 });
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02"],
      ...schedulePreview(baseEvent, 1, 1),
    });

    expect(prisma.availabilitySlot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: "event_1",
          slotStartAt: {
            notIn: expect.any(Array),
          },
        }),
      }),
    );
    expect(prisma.eventDate.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event_1", dateKey: { in: ["2026-04-03"] } },
    });
    expect(prisma.eventDate.createMany).not.toHaveBeenCalled();
  });

  it("narrows the daily window and prunes out-of-window votes", async () => {
    const baseEvent = createManagedEventWithDates(["2026-04-02"]);
    const removedSlot = buildSlotStart("2026-04-02", 10 * 60 + 30, "Europe/Vienna");
    const event = withParticipantSlots(baseEvent, [removedSlot]);
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.availabilitySlot.deleteMany.mockResolvedValue({ count: 1 });
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02"],
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 10 * 60,
      ...schedulePreview(baseEvent, 1, 1),
    });

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event_1" },
      data: { dayStartMinutes: 9 * 60, dayEndMinutes: 10 * 60 },
    });
    expect(prisma.availabilitySlot.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("rejects schedule edits while the event is closed", async () => {
    const beforeLock = createManagedEventWithDates(["2026-04-02"]);
    const afterLock = createManagedEventWithDates(["2026-04-02"], { status: "CLOSED" });
    prisma.event.findUnique
      .mockResolvedValueOnce(beforeLock)
      .mockResolvedValueOnce(afterLock);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-04-02", "2026-04-03"],
        ...schedulePreview(beforeLock),
      }),
    ).rejects.toMatchObject({ code: "event_closed" });

    expect(prisma.eventDate.createMany).not.toHaveBeenCalled();
    expect(publishEventUpdate).not.toHaveBeenCalled();
  });

  it("rejects when too many dates are supplied for a time-grid event", async () => {
    const event = createManagedEventWithDates(["2026-04-02"]);
    prisma.event.findUnique.mockResolvedValue(event);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: buildDateRange(32),
        ...schedulePreview(event),
      }),
    ).rejects.toMatchObject({ code: "too_many_dates", params: { limit: 31 } });

    expect(prisma.eventDate.createMany).not.toHaveBeenCalled();
  });

  it("rejects a stale schedule baseline before applying changes", async () => {
    const event = createManagedEventWithDates(["2026-04-02", "2026-04-03"]);
    prisma.event.findUnique.mockResolvedValue(event);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-04-02"],
        expectedScheduleSignature: buildScheduleSignature({
          dates: ["2026-04-02"],
          dayStartMinutes: 9 * 60,
          dayEndMinutes: 11 * 60,
        }),
        expectedDeletedVotes: 0,
        expectedAffectedParticipants: 0,
      }),
    ).rejects.toMatchObject({ code: "schedule_changed" });

    expect(prisma.eventDate.deleteMany).not.toHaveBeenCalled();
    expect(prisma.availabilitySlot.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a stale deletion preview before mutating the schedule", async () => {
    const baseEvent = createManagedEventWithDates(["2026-04-02", "2026-04-03"]);
    const event = withParticipantSlots(baseEvent, [
      buildSlotStart("2026-04-03", 9 * 60, "Europe/Vienna"),
    ]);
    prisma.event.findUnique.mockResolvedValue(event);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-04-02"],
        ...schedulePreview(baseEvent),
      }),
    ).rejects.toMatchObject({ code: "schedule_preview_stale" });

    expect(prisma.eventDate.deleteMany).not.toHaveBeenCalled();
    expect(prisma.availabilitySlot.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a daily window that cannot fit the meeting duration", async () => {
    const event = createManagedEventWithDates(["2026-04-02"]);
    prisma.event.findUnique.mockResolvedValue(event);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-04-02"],
        dayStartMinutes: 9 * 60,
        dayEndMinutes: 9 * 60 + 30,
        ...schedulePreview(event),
      }),
    ).rejects.toMatchObject({
      code: "schedule_no_valid_meeting_window",
      params: { duration: 60 },
    });

    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(prisma.availabilitySlot.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a slot that would end after a half-hour daily boundary", async () => {
    const event = {
      ...createManagedEventWithDates(["2026-04-02"]),
      slotMinutes: 60,
    };
    prisma.event.findUnique.mockResolvedValue(event);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-04-02"],
        dayStartMinutes: 9 * 60 + 30,
        dayEndMinutes: 10 * 60 + 30,
        ...schedulePreview(event),
      }),
    ).rejects.toMatchObject({ code: "schedule_no_valid_meeting_window" });

    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it("rejects nonexistent full-day dates and configured start times", async () => {
    const skippedDateEvent = {
      ...createManagedEventWithDates(["2011-12-29"]),
      type: "FULL_DAY" as const,
      timezone: "Pacific/Apia",
    };
    prisma.event.findUnique.mockResolvedValue(skippedDateEvent);
    const { updateManagedEvent } = await import("./event-service");

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2011-12-29", "2011-12-30"],
        ...schedulePreview(skippedDateEvent),
      }),
    ).rejects.toMatchObject({ code: "full_day_date_unavailable" });

    const skippedStartEvent = {
      ...createManagedEventWithDates(["2026-03-28"]),
      type: "FULL_DAY" as const,
      fullDayStartMinutes: 2 * 60 + 30,
    };
    prisma.event.findUnique.mockResolvedValue(skippedStartEvent);

    await expect(
      updateManagedEvent("event_1.secret", {
        action: "updateSchedule",
        dates: ["2026-03-28", "2026-03-29"],
        ...schedulePreview(skippedStartEvent),
      }),
    ).rejects.toMatchObject({ code: "full_day_start_unavailable" });
  });

  it("cleans legacy orphaned votes even when the new schedule would make them valid again", async () => {
    const baseEvent = createManagedEventWithDates(["2026-04-02"]);
    const orphanedSlot = buildSlotStart("2026-04-03", 9 * 60, "Europe/Vienna");
    const event = withParticipantSlots(baseEvent, [orphanedSlot]);
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.availabilitySlot.deleteMany.mockResolvedValue({ count: 1 });
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02", "2026-04-03"],
      ...schedulePreview(baseEvent, 1, 1),
    });

    expect(prisma.availabilitySlot.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.eventDate.createMany).toHaveBeenCalledWith({
      data: [{ eventId: "event_1", dateKey: "2026-04-03" }],
      skipDuplicates: true,
    });
  });

  it("updates full-day dates without changing the daily time window", async () => {
    const baseEvent = createManagedEventWithDates(["2026-04-02", "2026-04-03"]);
    const event = {
      ...baseEvent,
      type: "FULL_DAY" as const,
    };
    const removedSlot = buildFullDaySlotStart("2026-04-03", "Europe/Vienna");
    prisma.event.findUnique.mockResolvedValue(withParticipantSlots(event, [removedSlot]));
    prisma.availabilitySlot.deleteMany.mockResolvedValue({ count: 1 });
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02", "2026-04-04"],
      ...schedulePreview(baseEvent, 1, 1),
    });

    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(prisma.eventDate.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event_1", dateKey: { in: ["2026-04-03"] } },
    });
    expect(prisma.eventDate.createMany).toHaveBeenCalledWith({
      data: [{ eventId: "event_1", dateKey: "2026-04-04" }],
      skipDuplicates: true,
    });

    expect(prisma.availabilitySlot.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("retries a transient transaction conflict without publishing twice", async () => {
    const event = createManagedEventWithDates(["2026-04-02"]);
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.$transaction
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("transaction conflict", {
          code: "P2034",
          clientVersion: "7.10.0",
        }),
      )
      .mockImplementationOnce(
        async (operation: (transaction: typeof prisma) => Promise<unknown>) => operation(prisma),
      );
    const { updateManagedEvent } = await import("./event-service");

    await updateManagedEvent("event_1.secret", {
      action: "updateSchedule",
      dates: ["2026-04-02", "2026-04-03"],
      ...schedulePreview(event),
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(publishEventUpdate).toHaveBeenCalledTimes(1);
  });
});
