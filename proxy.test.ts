import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

const getParticipantSessionCookieFromEditLink = vi.fn();

vi.mock("@/lib/event-service", () => ({
  getParticipantSessionCookieFromEditLink,
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_SETUP_COMPLETE = "true";
  });

  it("consumes participant edit links, sets the session cookie, and redirects to the canonical event URL", async () => {
    getParticipantSessionCookieFromEditLink.mockResolvedValue({
      cookieName: "tempoll_session_test-event",
      cookieValue: "participant_1.secret-token",
    });

    const request = new NextRequest(
      "https://tempoll.example.com/e/test-event?participantId=participant_1&token=secret-token",
    );

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://tempoll.example.com/e/test-event");
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.cookies.get("tempoll_session_test-event")?.value).toBe("participant_1.secret-token");
  });

  it("strips participant tokens from the URL even when the bootstrap lookup fails", async () => {
    getParticipantSessionCookieFromEditLink.mockResolvedValue(null);

    const request = new NextRequest(
      "https://tempoll.example.com/e/test-event?participantId=participant_1&token=invalid",
    );

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://tempoll.example.com/e/test-event");
    expect(response.cookies.get("tempoll_session_test-event")).toBeUndefined();
  });
});
