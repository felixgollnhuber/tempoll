import { beforeEach, describe, expect, it, vi } from "vitest";

import { notFound, serviceUnavailable } from "@/lib/errors";

const updateManagedEvent = vi.fn();
const getClientIp = vi.fn();
const enforceRateLimit = vi.fn();

vi.mock("@/lib/event-service", () => ({
  updateManagedEvent,
}));

vi.mock("@/lib/request", () => ({
  getClientIp,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

describe("PATCH /api/manage/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIp.mockReturnValue("127.0.0.1");
    updateManagedEvent.mockResolvedValue({});
  });

  it("returns the updated notification payload for organizer email alerts", async () => {
    updateManagedEvent.mockResolvedValue({
      notification: {
        isConfigured: true,
        recipientEmail: "owner@example.com",
        quietPeriodMinutes: 5,
        lastSentAt: null,
        pendingDigest: null,
      },
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://tempoll.example.com/api/manage/private-token", {
        method: "PATCH",
        body: JSON.stringify({
          action: "updateNotificationEmail",
          notificationEmail: "owner@example.com",
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          token: "private-token",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      notification: {
        isConfigured: true,
        recipientEmail: "owner@example.com",
        quietPeriodMinutes: 5,
        lastSentAt: null,
        pendingDigest: null,
      },
    });
  });

  it("returns 404 for invalid organizer tokens without leaking internal details", async () => {
    updateManagedEvent.mockRejectedValue(notFound("manage_key_invalid"));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://tempoll.example.com/api/manage/invalid-token", {
        method: "PATCH",
        body: JSON.stringify({
          action: "updateTitle",
          title: "Updated title",
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          token: "invalid-token",
        }),
      },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    await expect(response.json()).resolves.toEqual({
      error: "Event not found.",
    });
  });

  it("returns a generic 500 for unexpected organizer update failures", async () => {
    updateManagedEvent.mockRejectedValue(new Error("prisma failed to connect"));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://tempoll.example.com/api/manage/invalid-token", {
        method: "PATCH",
        body: JSON.stringify({
          action: "updateTitle",
          title: "Updated title",
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          token: "invalid-token",
        }),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to update event.",
    });
  });

  it("returns a localized 503 when email delivery is unavailable on the host", async () => {
    updateManagedEvent.mockRejectedValue(serviceUnavailable("notification_delivery_unavailable"));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://tempoll.example.com/api/manage/private-token", {
        method: "PATCH",
        body: JSON.stringify({
          action: "updateNotificationEmail",
          notificationEmail: "owner@example.com",
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          token: "private-token",
        }),
      },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Email alerts are not available on this host.",
    });
  });
});
