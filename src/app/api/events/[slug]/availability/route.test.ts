import { beforeEach, describe, expect, it, vi } from "vitest";

import { unauthorized } from "@/lib/errors";

const saveAvailability = vi.fn();
const cookies = vi.fn();
const getClientIp = vi.fn();
const enforceRateLimit = vi.fn();

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/event-service", () => ({
  saveAvailability,
}));

vi.mock("@/lib/request", () => ({
  getClientIp,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

describe("PUT /api/events/[slug]/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIp.mockReturnValue("127.0.0.1");
    cookies.mockResolvedValue({
      get: vi.fn(() => ({
        value: "participant_1.secret-token",
      })),
    });
  });

  it("authenticates availability updates from the participant session cookie", async () => {
    saveAvailability.mockResolvedValue({
      snapshot: {
        id: "event_1",
      },
    });

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://tempoll.example.com/api/events/test-event/availability", {
        method: "PUT",
        body: JSON.stringify({
          selectedSlotStarts: ["2026-03-30T07:00:00.000Z"],
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          slug: "test-event",
        }),
      },
    );

    expect(saveAvailability).toHaveBeenCalledWith(
      "test-event",
      "en",
      {
        selectedSlotStarts: ["2026-03-30T07:00:00.000Z"],
      },
      "participant_1.secret-token",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });

  it("returns the domain-auth error for missing or expired participant sessions", async () => {
    saveAvailability.mockRejectedValue(unauthorized("participant_session_missing"));

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://tempoll.example.com/api/events/test-event/availability", {
        method: "PUT",
        body: JSON.stringify({
          selectedSlotStarts: [],
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          slug: "test-event",
        }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Your editing session is no longer valid. Reopen your participant link or join the event again.",
    });
  });

  it("hides unexpected internal errors behind a generic 500 response", async () => {
    saveAvailability.mockRejectedValue(new Error("database connection reset"));

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://tempoll.example.com/api/events/test-event/availability", {
        method: "PUT",
        body: JSON.stringify({
          selectedSlotStarts: [],
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
      {
        params: Promise.resolve({
          slug: "test-event",
        }),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to save availability.",
    });
  });
});
