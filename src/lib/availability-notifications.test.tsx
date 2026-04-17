import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn());

type NotificationRecord = {
  eventId: string;
  recipientEmail: string | null;
  emailManageTokenHash: string | null;
  pendingSinceAt: Date | null;
  pendingFlushAfterAt: Date | null;
  pendingParticipantIds: string[];
  pendingChangeCount: number;
  lastSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const store = {
  notifications: new Map<string, NotificationRecord>(),
};

function cloneNotification(notification: NotificationRecord | null) {
  return notification ? structuredClone(notification) : null;
}

function createBaseEvent() {
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
    manageTokenHash: "hashed-manage-token",
    createdAt: new Date("2026-04-01T08:00:00.000Z"),
    updatedAt: new Date("2026-04-01T08:00:00.000Z"),
    dates: [
      {
        id: "date_1",
        eventId: "event_1",
        dateKey: "2026-04-02",
        createdAt: new Date("2026-04-01T08:00:00.000Z"),
      },
    ],
    participants: [
      {
        id: "participant_1",
        eventId: "event_1",
        displayName: "Felix",
        displayNameNormalized: "felix",
        color: "#ef7f3b",
        editTokenHash: "hash-1",
        lastSeenAt: null,
        createdAt: new Date("2026-04-01T08:00:00.000Z"),
        updatedAt: new Date("2026-04-01T08:00:00.000Z"),
        availabilitySlots: [
          {
            slotStartAt: new Date("2026-04-02T07:00:00.000Z"),
          },
          {
            slotStartAt: new Date("2026-04-02T07:30:00.000Z"),
          },
        ],
      },
      {
        id: "participant_2",
        eventId: "event_1",
        displayName: "Nora",
        displayNameNormalized: "nora",
        color: "#6b8afd",
        editTokenHash: "hash-2",
        lastSeenAt: null,
        createdAt: new Date("2026-04-01T08:02:00.000Z"),
        updatedAt: new Date("2026-04-01T08:02:00.000Z"),
        availabilitySlots: [
          {
            slotStartAt: new Date("2026-04-02T07:00:00.000Z"),
          },
        ],
      },
    ],
  };
}

function getEventWithNotification() {
  const event = createBaseEvent();

  return {
    ...event,
    availabilityNotification: cloneNotification(store.notifications.get(event.id) ?? null),
  };
}

const prisma = {
  eventAvailabilityNotification: {
    findUnique: vi.fn(async ({ where }: { where: { eventId: string } }) =>
      cloneNotification(store.notifications.get(where.eventId) ?? null),
    ),
    findMany: vi.fn(async () =>
      Array.from(store.notifications.values())
        .filter((notification) => notification.recipientEmail && notification.pendingFlushAfterAt)
        .map((notification) => cloneNotification(notification)),
    ),
    create: vi.fn(async ({ data }: { data: Partial<NotificationRecord> & { eventId: string } }) => {
      const notification: NotificationRecord = {
        eventId: data.eventId,
        recipientEmail: data.recipientEmail ?? null,
        emailManageTokenHash: data.emailManageTokenHash ?? null,
        pendingSinceAt: data.pendingSinceAt ?? null,
        pendingFlushAfterAt: data.pendingFlushAfterAt ?? null,
        pendingParticipantIds: data.pendingParticipantIds ?? [],
        pendingChangeCount: data.pendingChangeCount ?? 0,
        lastSentAt: data.lastSentAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.notifications.set(notification.eventId, notification);
      return cloneNotification(notification);
    }),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { eventId: string };
        data: Record<string, unknown>;
      }) => {
        const existing = store.notifications.get(where.eventId);
        if (!existing) {
          throw new Error(`Missing notification ${where.eventId}`);
        }

        const next: NotificationRecord = {
          ...existing,
          updatedAt: new Date(),
        };

        for (const [key, value] of Object.entries(data)) {
          if (key === "pendingParticipantIds" && value && typeof value === "object" && "set" in value) {
            next.pendingParticipantIds = [...((value as { set: string[] }).set ?? [])];
            continue;
          }

          if (key === "pendingChangeCount" && value && typeof value === "object" && "increment" in value) {
            next.pendingChangeCount += Number(
              (value as { increment?: number }).increment ?? 0,
            );
            continue;
          }

          (next as Record<string, unknown>)[key] = value;
        }

        store.notifications.set(where.eventId, next);
        return cloneNotification(next);
      },
    ),
  },
  event: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
      where.id === "event_1" ? getEventWithNotification() : null,
    ),
  },
  $transaction: vi.fn(
    async (
      callback: (tx: typeof prisma) => Promise<unknown>,
    ) => callback(prisma),
  ),
};

vi.mock("@/lib/prisma", () => ({
  prisma,
}));

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {
      send: sendEmail,
    };
  },
}));

describe("availability notifications", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T09:00:00.000Z"));
    store.notifications.clear();
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({
      data: {
        id: "email_1",
      },
      error: null,
    });
    process.env.APP_NAME = "tempoll";
    process.env.APP_URL = "https://tempoll.app";
    process.env.APP_DEFAULT_LOCALE = "en";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "alerts@tempoll.app";
    process.env.RESEND_FROM_NAME = "tempoll";
  });

  afterEach(async () => {
    const { resetAvailabilityNotificationsForTests } = await import("./availability-notifications");
    resetAvailabilityNotificationsForTests();
    vi.useRealTimers();
  });

  it("renders digest content with private and public calls to action", async () => {
    store.notifications.set("event_1", {
      eventId: "event_1",
      recipientEmail: "owner@example.com",
      emailManageTokenHash: null,
      pendingSinceAt: new Date("2026-04-01T09:00:00.000Z"),
      pendingFlushAfterAt: new Date("2026-04-01T09:05:00.000Z"),
      pendingParticipantIds: ["participant_1", "participant_2"],
      pendingChangeCount: 2,
      lastSentAt: null,
      createdAt: new Date("2026-04-01T09:00:00.000Z"),
      updatedAt: new Date("2026-04-01T09:00:00.000Z"),
    });

    const { buildAvailabilityDigestEmail } = await import("./availability-notifications");
    const event = getEventWithNotification();
    const email = await buildAvailabilityDigestEmail(event as never);

    expect(email.subject).toContain("tempoll");
    expect(email.subject).toContain("Team Sync");
    expect(email.html).toContain("Open private organizer link");
    expect(email.html).toContain("https://tempoll.app/e/team-sync");
    expect(email.html).toContain("Felix");
    expect(email.html).toContain("Nora");
    expect(email.html).toMatch(/https:\/\/tempoll\.app\/manage\/event_1\.[A-Za-z0-9_-]+/);
    expect(email.text).toContain("Private organizer link");
  });

  it("sends one digest after the quiet period", async () => {
    const {
      queueAvailabilityDigest,
      resetAvailabilityNotificationsForTests,
    } = await import("./availability-notifications");

    await queueAvailabilityDigest({
      eventId: "event_1",
      participantId: "participant_1",
      recipientEmail: "owner@example.com",
    });

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const notification = store.notifications.get("event_1");
    expect(notification?.pendingFlushAfterAt).toBeNull();
    expect(notification?.pendingChangeCount).toBe(0);
    expect(notification?.lastSentAt).toBeInstanceOf(Date);

    resetAvailabilityNotificationsForTests();
  });

  it("extends the quiet period and combines participant changes across edits", async () => {
    const { queueAvailabilityDigest } = await import("./availability-notifications");

    await queueAvailabilityDigest({
      eventId: "event_1",
      participantId: "participant_1",
      recipientEmail: "owner@example.com",
    });

    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

    await queueAvailabilityDigest({
      eventId: "event_1",
      participantId: "participant_2",
      recipientEmail: "owner@example.com",
    });

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(sendEmail).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 1);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const payload = sendEmail.mock.calls[0]?.[0] as {
      subject: string;
      html: string;
    };
    expect(payload.subject).toContain("2 people updated Team Sync");
    expect(payload.html).toContain("Felix");
    expect(payload.html).toContain("Nora");
  });

  it("retries a digest after a send failure", async () => {
    sendEmail
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Resend is unavailable",
        },
      })
      .mockResolvedValue({
        data: {
          id: "email_2",
        },
        error: null,
      });

    const { queueAvailabilityDigest } = await import("./availability-notifications");

    await queueAvailabilityDigest({
      eventId: "event_1",
      participantId: "participant_1",
      recipientEmail: "owner@example.com",
    });

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(store.notifications.get("event_1")?.pendingFlushAfterAt).toBeInstanceOf(Date);
    expect(store.notifications.get("event_1")?.lastSentAt).toBeNull();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(store.notifications.get("event_1")?.pendingFlushAfterAt).toBeNull();
    expect(store.notifications.get("event_1")?.lastSentAt).toBeInstanceOf(Date);
  });

  it("does not restore a cleared recipient email from a stale availability save", async () => {
    store.notifications.set("event_1", {
      eventId: "event_1",
      recipientEmail: null,
      emailManageTokenHash: null,
      pendingSinceAt: null,
      pendingFlushAfterAt: null,
      pendingParticipantIds: [],
      pendingChangeCount: 0,
      lastSentAt: null,
      createdAt: new Date("2026-04-01T09:00:00.000Z"),
      updatedAt: new Date("2026-04-01T09:00:00.000Z"),
    });

    const { queueAvailabilityDigest } = await import("./availability-notifications");

    await queueAvailabilityDigest({
      eventId: "event_1",
      participantId: "participant_1",
      recipientEmail: "stale@example.com",
    });

    const notification = store.notifications.get("event_1");
    expect(notification?.recipientEmail).toBeNull();
    expect(notification?.pendingFlushAfterAt).toBeNull();
    expect(notification?.pendingParticipantIds).toEqual([]);
    expect(notification?.pendingChangeCount).toBe(0);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
