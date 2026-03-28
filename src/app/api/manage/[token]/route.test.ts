import { beforeEach, describe, expect, it, vi } from "vitest";

import { notFound } from "@/lib/errors";

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
  });

  it("returns 404 for invalid organizer tokens without leaking internal details", async () => {
    updateManagedEvent.mockRejectedValue(notFound("Event not found.", "manage_key_invalid"));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://tempoll.example.com/api/manage/invalid-token", {
        method: "PATCH",
        body: JSON.stringify({
          action: "updateEvent",
          title: "Updated title",
          status: "OPEN",
          finalSlotStart: null,
        }),
        headers: {
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
          action: "updateEvent",
          title: "Updated title",
          status: "OPEN",
          finalSlotStart: null,
        }),
        headers: {
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
});
