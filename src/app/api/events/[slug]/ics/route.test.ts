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
        location: "Office 3.2",
        isOnlineMeeting: true,
        meetingLink: "https://meet.example.com/team-sync",
        eventType: "time_grid",
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
    const response = await GET(
      new Request("https://tempoll.example.com/api/events/team-sync/ics", {
        headers: {
          "Accept-Language": "en-US",
        },
      }),
      {
        params: Promise.resolve({
          slug: "team-sync",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(response.headers.get("content-disposition")).toContain("tempoll-team-sync.ics");

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:Team Sync");
    expect(body).toContain("LOCATION:Online meeting");
    expect(body).not.toContain("Office 3.2");
    expect(body).toContain("Meeting link: https://meet.example.com/team-sync");
    expect(body).toContain("DTSTART;TZID=Europe/Vienna:20260402T090000");
    expect(body).toContain("URL:http://localhost:3000/e/team-sync");
  });

  it("returns an all-day calendar file for closed full-day events", async () => {
    getPublicEventSnapshot.mockResolvedValue({
      snapshot: {
        slug: "offsite-days",
        title: "Offsite Days",
        eventType: "full_day",
        timezone: "Europe/Vienna",
        status: "CLOSED",
        finalizedSlot: {
          slotStart: "2026-04-01T22:00:00.000Z",
          slotEnd: "2026-04-02T22:00:00.000Z",
          dateKey: "2026-04-02",
          label: "Thu, Apr 2",
          localLabel: null,
          availableCount: 2,
          participantIds: ["p1", "p2"],
        },
      },
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://tempoll.example.com/api/events/offsite-days/ics", {
        headers: {
          "Accept-Language": "en-US",
        },
      }),
      {
        params: Promise.resolve({
          slug: "offsite-days",
        }),
      },
    );

    const body = await response.text();
    expect(body).toContain("DTSTART;VALUE=DATE:20260402");
    expect(body).toContain("DTEND;VALUE=DATE:20260403");
    expect(body).not.toContain("DTSTART;TZID=");
  });

  it("returns a timed calendar file for closed full-day events with a start time", async () => {
    getPublicEventSnapshot.mockResolvedValue({
      snapshot: {
        slug: "class-reunion",
        title: "Class Reunion",
        eventType: "full_day",
        timezone: "Europe/Vienna",
        fullDayStartMinutes: 18 * 60,
        meetingDurationMinutes: 60,
        status: "CLOSED",
        finalizedSlot: {
          slotStart: "2026-04-01T22:00:00.000Z",
          slotEnd: "2026-04-02T17:00:00.000Z",
          dateKey: "2026-04-02",
          label: "Thu, Apr 2 · 18:00",
          localLabel: null,
          availableCount: 2,
          participantIds: ["p1", "p2"],
        },
      },
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://tempoll.example.com/api/events/class-reunion/ics", {
        headers: {
          "Accept-Language": "en-US",
        },
      }),
      {
        params: Promise.resolve({
          slug: "class-reunion",
        }),
      },
    );

    const body = await response.text();
    expect(body).toContain("DTSTART;TZID=Europe/Vienna:20260402T180000");
    expect(body).toContain("DTEND;TZID=Europe/Vienna:20260402T190000");
    expect(body).not.toContain("VALUE=DATE");
  });

  it("returns 404 when no fixed date exists", async () => {
    getPublicEventSnapshot.mockResolvedValue({
      snapshot: {
        slug: "team-sync",
        title: "Team Sync",
        eventType: "time_grid",
        timezone: "Europe/Vienna",
        status: "OPEN",
        finalizedSlot: null,
      },
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://tempoll.example.com/api/events/team-sync/ics", {
        headers: {
          "Accept-Language": "en-US",
        },
      }),
      {
        params: Promise.resolve({
          slug: "team-sync",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Event not found.",
    });
  });
});
