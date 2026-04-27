import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildFullDaySlotStart, buildSlotStart } from "@/lib/availability";
import { hashSecret } from "@/lib/tokens";

const prisma = {
  participant: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  availabilitySlot: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

const publishEventUpdate = vi.fn();
const queueAvailabilityDigest = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("@/lib/realtime", () => ({
  publishEventUpdate,
}));

vi.mock("@/lib/availability-notifications", () => ({
  ensureAvailabilityDigestSchedulerStarted: vi.fn(),
  queueAvailabilityDigest,
  buildManageEventNotificationState: vi.fn(),
  updateNotificationRecipient: vi.fn(),
}));

function createParticipantForMutation(selectedSlotStarts: string[], recipientEmail = "owner@example.com") {
  return {
    id: "participant_1",
    eventId: "event_1",
    displayName: "Felix",
    color: "#ef7f3b",
    editTokenHash: hashSecret("secret-token"),
    availabilitySlots: selectedSlotStarts.map((slotStartAt) => ({
      slotStartAt: new Date(slotStartAt),
    })),
    event: {
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
      manageTokenHash: hashSecret("organizer-secret"),
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
      availabilityNotification: recipientEmail
        ? {
            eventId: "event_1",
            recipientEmail,
          }
        : null,
    },
  };
}

function createEventSnapshotSource(selectedSlotStarts: string[]) {
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
    manageTokenHash: hashSecret("organizer-secret"),
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
    participants: [
      {
        id: "participant_1",
        displayName: "Felix",
        color: "#ef7f3b",
        createdAt: new Date("2026-03-28T10:00:00.000Z"),
        availabilitySlots: selectedSlotStarts.map((slotStartAt) => ({
          slotStartAt: new Date(slotStartAt),
        })),
      },
    ],
  };
}

describe("saveAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );
    prisma.participant.update.mockResolvedValue(undefined);
    prisma.availabilitySlot.deleteMany.mockResolvedValue(undefined);
    prisma.availabilitySlot.createMany.mockResolvedValue(undefined);
  });

  it("does not publish or queue a digest when the selection did not change", async () => {
    const selectedSlotStart = buildSlotStart("2026-04-02", 9 * 60, "Europe/Vienna");
    prisma.participant.findUnique.mockResolvedValue(createParticipantForMutation([selectedSlotStart]));
    prisma.event.findUnique.mockResolvedValue(createEventSnapshotSource([selectedSlotStart]));

    const { saveAvailability } = await import("./event-service");

    await saveAvailability(
      "team-sync",
      "en",
      {
        selectedSlotStarts: [selectedSlotStart],
      },
      "participant_1.secret-token",
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(publishEventUpdate).not.toHaveBeenCalled();
    expect(queueAvailabilityDigest).not.toHaveBeenCalled();
    expect(prisma.participant.update).toHaveBeenCalledWith({
      where: {
        id: "participant_1",
      },
      data: {
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it("queues a digest after a real availability change", async () => {
    const existingSlotStart = buildSlotStart("2026-04-02", 9 * 60, "Europe/Vienna");
    const nextSlotStart = buildSlotStart("2026-04-02", 9 * 60 + 30, "Europe/Vienna");
    prisma.participant.findUnique.mockResolvedValue(createParticipantForMutation([existingSlotStart]));
    prisma.event.findUnique.mockResolvedValue(createEventSnapshotSource([nextSlotStart]));

    const { saveAvailability } = await import("./event-service");

    await saveAvailability(
      "team-sync",
      "en",
      {
        selectedSlotStarts: [nextSlotStart],
      },
      "participant_1.secret-token",
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(publishEventUpdate).toHaveBeenCalledWith({
      eventId: "event_1",
      kind: "availability-saved",
      participantId: "participant_1",
    });
    expect(queueAvailabilityDigest).toHaveBeenCalledWith({
      eventId: "event_1",
      participantId: "participant_1",
      recipientEmail: "owner@example.com",
    });
  });

  it("accepts canonical full-day slots for full-day events", async () => {
    const fullDaySlotStart = buildFullDaySlotStart("2026-04-02", "Europe/Vienna");
    const participant = createParticipantForMutation([]);
    (participant.event as unknown as { type: "FULL_DAY" }).type = "FULL_DAY";
    participant.event.dayStartMinutes = 0;
    participant.event.dayEndMinutes = 24 * 60;
    const eventSource = createEventSnapshotSource([fullDaySlotStart]);
    (eventSource as unknown as { type: "FULL_DAY" }).type = "FULL_DAY";
    eventSource.dayStartMinutes = 0;
    eventSource.dayEndMinutes = 24 * 60;
    prisma.participant.findUnique.mockResolvedValue(participant);
    prisma.event.findUnique.mockResolvedValue(eventSource);

    const { saveAvailability } = await import("./event-service");

    await saveAvailability(
      "team-sync",
      "en",
      {
        selectedSlotStarts: [fullDaySlotStart],
      },
      "participant_1.secret-token",
    );

    expect(prisma.availabilitySlot.createMany).toHaveBeenCalledWith({
      data: [
        {
          eventId: "event_1",
          participantId: "participant_1",
          slotStartAt: new Date(fullDaySlotStart),
        },
      ],
    });
  });
});
