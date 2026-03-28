import { beforeEach, describe, expect, it, vi } from "vitest";

import { tooManyRequests } from "@/lib/errors";

const createEvent = vi.fn();
const getClientIp = vi.fn();
const enforceRateLimit = vi.fn();

vi.mock("@/lib/event-service", () => ({
  createEvent,
}));

vi.mock("@/lib/request", () => ({
  getClientIp,
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit,
}));

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns a 429 with Retry-After when the create-event limit is exceeded", async () => {
    enforceRateLimit.mockImplementation(() => {
      throw tooManyRequests("event_create_rate_limited", 900);
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://tempoll.example.com/api/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Sprint Planning",
          timezone: "Europe/Vienna",
          dates: ["2026-03-30"],
          dayStartMinutes: 540,
          dayEndMinutes: 600,
          slotMinutes: 30,
          meetingDurationMinutes: 60,
        }),
        headers: {
          "Accept-Language": "en-US",
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    await expect(response.json()).resolves.toEqual({
      error: "Too many event creation attempts. Please wait a few minutes and try again.",
    });
  });
});
