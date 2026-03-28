import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicEventSnapshot = vi.fn();

vi.mock("@/lib/event-service", () => ({
  getPublicEventSnapshot,
}));

describe("GET /api/events/[slug]/ics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a calendar file for closed events with a fixed date", async () => {
    getPublicEventSnapshot.mockResolvedValue({
      snapshot: {
        slug: "team-sync",
        title: "Team Sync",
        timezone: "Europe/Vienna",
        status: "CLOSED",
        finalizedSlot: {
          slotStart: "2026-04-02T07:00:00.000Z",
          slotEnd: "2026-04-02T08:00:00.000Z",
          dateKey: "2026-04-02",
          label: "Thu, Apr 2 · 09:00-10:00",
          localLabel: null,
          availableCount: 2,
          participantIds: ["p1", "p2"],
        },
      },
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("https://tempoll.example.com/api/events/team-sync/ics"), {
      params: Promise.resolve({
        slug: "team-sync",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(response.headers.get("content-disposition")).toContain("tempoll-team-sync.ics");

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:Team Sync");
    expect(body).toContain("DTSTART;TZID=Europe/Vienna:20260402T090000");
    expect(body).toContain("URL:http://localhost:3000/e/team-sync");
  });

  it("returns 404 when no fixed date exists", async () => {
    getPublicEventSnapshot.mockResolvedValue({
      snapshot: {
        slug: "team-sync",
        title: "Team Sync",
        timezone: "Europe/Vienna",
        status: "OPEN",
        finalizedSlot: null,
      },
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("https://tempoll.example.com/api/events/team-sync/ics"), {
      params: Promise.resolve({
        slug: "team-sync",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Event not found.",
    });
  });
});
