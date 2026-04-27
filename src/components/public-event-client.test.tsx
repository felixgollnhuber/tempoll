import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicEventClient } from "./public-event-client";
import { renderWithI18n } from "@/test/render-with-i18n";
import type { PublicEventSnapshot } from "@/lib/types";

const mockedGetViewerTimezone = vi.hoisted(() => vi.fn(() => "Europe/Vienna"));
const defaultTimezones = ["Europe/Vienna", "America/New_York", "UTC"];

vi.mock("@/lib/availability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/availability")>();

  return {
    ...actual,
    getViewerTimezone: mockedGetViewerTimezone,
  };
});

function createSnapshot(options?: {
  status?: PublicEventSnapshot["status"];
  withCurrentUser?: boolean;
  dayCount?: number;
  finalizedSlot?: PublicEventSnapshot["finalizedSlot"];
}): PublicEventSnapshot {
  const status = options?.status ?? "OPEN";
  const withCurrentUser = options?.withCurrentUser ?? true;
  const dayCount = options?.dayCount ?? 2;
  const dates = [
    { dateKey: "2026-03-30", label: "Mon, Mar 30" },
    { dateKey: "2026-03-31", label: "Tue, Mar 31" },
    { dateKey: "2026-04-01", label: "Wed, Apr 1" },
    { dateKey: "2026-04-02", label: "Thu, Apr 2" },
    { dateKey: "2026-04-03", label: "Fri, Apr 3" },
    { dateKey: "2026-04-04", label: "Sat, Apr 4" },
    { dateKey: "2026-04-05", label: "Sun, Apr 5" },
  ].slice(0, dayCount);
  const timeRows = [
    { minutes: 9 * 60, label: "09:00" },
    { minutes: 9 * 60 + 30, label: "09:30" },
  ];
  const slots = dates.flatMap((date, index) => {
    const firstParticipantIds =
      index === 0 ? (withCurrentUser ? ["p1", "p2"] : ["p2"]) : index === 1 ? ["p2", "p3"] : [];
    const secondParticipantIds = index === 0 ? ["p2"] : [];

    return [
      {
        slotStart: `${date.dateKey}T07:00:00.000Z`,
        dateKey: date.dateKey,
        minutes: timeRows[0].minutes,
        availabilityCount: firstParticipantIds.length,
        participantIds: firstParticipantIds,
        selectedByCurrentUser: withCurrentUser && index === 0,
      },
      {
        slotStart: `${date.dateKey}T07:30:00.000Z`,
        dateKey: date.dateKey,
        minutes: timeRows[1].minutes,
        availabilityCount: secondParticipantIds.length,
        participantIds: secondParticipantIds,
        selectedByCurrentUser: false,
      },
    ];
  });
  const participantDefinitions = [
    { id: "p1", displayName: "Felix", color: "#ef7f3b" },
    { id: "p2", displayName: "Gabriel", color: "#22b8a0" },
    { id: "p3", displayName: "Nora", color: "#6b8afd" },
    { id: "p4", displayName: "Sam", color: "#a36cf7" },
  ];
  const selectedSlotCountByParticipant = new Map(
    participantDefinitions.map((participant) => [participant.id, 0]),
  );

  for (const slot of slots) {
    for (const participantId of slot.participantIds) {
      selectedSlotCountByParticipant.set(
        participantId,
        (selectedSlotCountByParticipant.get(participantId) ?? 0) + 1,
      );
    }
  }

  return {
    id: "event_1",
    slug: "test-event",
    title: "Test Event",
    eventType: "time_grid",
    timezone: "Europe/Vienna",
    status,
    slotMinutes: 30,
    meetingDurationMinutes: 60,
    dayStartMinutes: 9 * 60,
    dayEndMinutes: 10 * 60,
    dates,
    timeRows,
    slots,
    participants: participantDefinitions.map((participant) => ({
      ...participant,
      selectedSlotCount: selectedSlotCountByParticipant.get(participant.id) ?? 0,
      isCurrentUser: withCurrentUser && participant.id === "p1",
    })),
    suggestions: [],
    finalizedSlot: options?.finalizedSlot ?? null,
    currentParticipant: withCurrentUser
      ? {
          id: "p1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: selectedSlotCountByParticipant.get("p1") ?? 0,
          isCurrentUser: true,
        }
      : null,
  };
}

function createFullDaySnapshot(): PublicEventSnapshot {
  return {
    id: "event_full_day",
    slug: "full-day-event",
    title: "Full Day Event",
    eventType: "full_day",
    timezone: "Europe/Vienna",
    status: "OPEN",
    slotMinutes: 30,
    meetingDurationMinutes: 60,
    dayStartMinutes: 9 * 60,
    dayEndMinutes: 10 * 60,
    dates: [
      { dateKey: "2026-03-30", label: "Mon, Mar 30" },
      { dateKey: "2026-03-31", label: "Tue, Mar 31" },
      { dateKey: "2026-04-01", label: "Wed, Apr 1" },
    ],
    timeRows: [],
    slots: [
      {
        slotStart: "2026-03-29T22:00:00.000Z",
        dateKey: "2026-03-30",
        minutes: 0,
        availabilityCount: 0,
        participantIds: [],
        selectedByCurrentUser: false,
      },
      {
        slotStart: "2026-03-31T22:00:00.000Z",
        dateKey: "2026-04-01",
        minutes: 0,
        availabilityCount: 0,
        participantIds: [],
        selectedByCurrentUser: false,
      },
      {
        slotStart: "2026-03-30T22:00:00.000Z",
        dateKey: "2026-03-31",
        minutes: 0,
        availabilityCount: 1,
        participantIds: ["p2"],
        selectedByCurrentUser: false,
      },
    ],
    participants: [
      {
        id: "p1",
        displayName: "Felix",
        color: "#ef7f3b",
        selectedSlotCount: 0,
        isCurrentUser: true,
      },
      {
        id: "p2",
        displayName: "Nora",
        color: "#6b8afd",
        selectedSlotCount: 1,
        isCurrentUser: false,
      },
    ],
    suggestions: [
      {
        slotStart: "2026-03-30T22:00:00.000Z",
        slotEnd: "2026-03-31T22:00:00.000Z",
        dateKey: "2026-03-31",
        label: "Tue, Mar 31",
        localLabel: null,
        availableCount: 1,
        participantIds: ["p2"],
      },
    ],
    finalizedSlot: null,
    currentParticipant: {
      id: "p1",
      displayName: "Felix",
      color: "#ef7f3b",
      selectedSlotCount: 0,
      isCurrentUser: true,
    },
  };
}

function recalculateParticipantSelectionCounts(snapshot: PublicEventSnapshot) {
  const selectedSlotCountByParticipant = new Map(
    snapshot.participants.map((participant) => [participant.id, 0]),
  );

  for (const slot of snapshot.slots) {
    for (const participantId of slot.participantIds) {
      selectedSlotCountByParticipant.set(
        participantId,
        (selectedSlotCountByParticipant.get(participantId) ?? 0) + 1,
      );
    }
  }

  snapshot.participants = snapshot.participants.map((participant) => ({
    ...participant,
    selectedSlotCount: selectedSlotCountByParticipant.get(participant.id) ?? 0,
  }));

  if (snapshot.currentParticipant) {
    snapshot.currentParticipant = {
      ...snapshot.currentParticipant,
      selectedSlotCount: selectedSlotCountByParticipant.get(snapshot.currentParticipant.id) ?? 0,
    };
  }
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  setViewportWidth(1024);
  mockedGetViewerTimezone.mockReturnValue("Europe/Vienna");
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PublicEventClient", () => {
  it("renders localized controls in German", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        shareUrl="https://tempoll.app/e/test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
      { locale: "de" },
    );

    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ansehen" })).toBeInTheDocument();
    expect(screen.getByText("Verfügbarkeit")).toBeInTheDocument();
    // Share card appears in both the mobile slot and the xl+ sidebar slot.
    expect(screen.getAllByText("Board teilen")).toHaveLength(2);
    expect(screen.getAllByText("https://tempoll.app/e/test-event")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Öffentliche URL kopieren" })).toHaveLength(2);
  });

  it("keeps a mobile spacing wrapper around sidebar cards", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        shareUrl="https://tempoll.app/e/test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    const mobileSidebar = document.querySelector<HTMLElement>(
      '[data-slot="event-heatmap-mobile-sidebar"]',
    );

    expect(mobileSidebar).not.toBeNull();
    expect(mobileSidebar).toHaveClass("space-y-4");
    expect(within(mobileSidebar!).getByText("Share this board")).toBeInTheDocument();
    expect(within(mobileSidebar!).getByText("Best matching windows")).toBeInTheDocument();
  });

  it("shows only the projected viewer timezone when it differs", () => {
    mockedGetViewerTimezone.mockReturnValue("America/New_York");

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        shareUrl="https://tempoll.app/e/test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(screen.queryByText(/Host: Europe\/Vienna/)).not.toBeInTheDocument();
    expect(screen.getByText(/Times shown in .*America\/New_York/)).toBeInTheDocument();
    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00 / 03:00")).not.toBeInTheDocument();
  });

  it("shows a timezone selector even when the detected timezone matches the event timezone", async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        shareUrl="https://tempoll.app/e/test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
        timezones={defaultTimezones}
      />,
    );

    const timezoneSelect = screen.getByRole("combobox", {
      name: "Display timezone",
    });

    expect(timezoneSelect).toBeInTheDocument();
    expect(timezoneSelect).toHaveTextContent("Automatic");

    await user.click(timezoneSelect);
    await user.click(screen.getByRole("option", { name: /America\/New_York/ }));

    expect(screen.getByRole("combobox", { name: "Display timezone" })).toHaveTextContent(
      "America/New_York",
    );
    expect(screen.queryByText(/Host: Europe\/Vienna/)).not.toBeInTheDocument();
    expect(screen.getByText(/Times shown in .*America\/New_York/)).toBeInTheDocument();
    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00 / 03:00")).not.toBeInTheDocument();
  });

  it("renders local suggestion labels after a manual timezone override", async () => {
    const user = userEvent.setup();
    const snapshot = createSnapshot({ withCurrentUser: false });
    snapshot.suggestions = [
      {
        slotStart: "2026-03-30T07:00:00.000Z",
        slotEnd: "2026-03-30T08:00:00.000Z",
        dateKey: "2026-03-30",
        label: "Mon, Mar 30 · 09:00-10:00",
        localLabel: null,
        availableCount: 2,
        participantIds: ["p1", "p2"],
      },
    ];

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
        timezones={defaultTimezones}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Display timezone" }));
    await user.click(screen.getByRole("option", { name: /America\/New_York/ }));

    expect(screen.getAllByText("Mon, Mar 30 · 03:00-04:00")).toHaveLength(2);
  });

  it("renders local fixed-date labels after a manual timezone override", async () => {
    const user = userEvent.setup();
    const snapshot = createSnapshot({
      status: "CLOSED",
      finalizedSlot: {
        slotStart: "2026-03-30T07:00:00.000Z",
        slotEnd: "2026-03-30T08:00:00.000Z",
        dateKey: "2026-03-30",
        label: "Mon, Mar 30 · 09:00-10:00",
        localLabel: null,
        availableCount: 2,
        participantIds: ["p1", "p2"],
      },
    });

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={null}
        timezones={defaultTimezones}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Display timezone" }));
    await user.click(screen.getByRole("option", { name: /America\/New_York/ }));

    expect(screen.getAllByText("Mon, Mar 30 · 03:00-04:00")).toHaveLength(2);
  });

  it("reads a stored timezone override on remount", async () => {
    const user = userEvent.setup();
    const props = {
      slug: "test-event",
      shareUrl: "https://tempoll.app/e/test-event",
      initialSnapshot: createSnapshot(),
      initialSession: {
        participantId: "p1",
        displayName: "Felix",
      },
      timezones: defaultTimezones,
    };
    const firstRender = renderWithI18n(<PublicEventClient {...props} />);

    await user.click(screen.getByRole("combobox", { name: "Display timezone" }));
    await user.click(screen.getByRole("option", { name: /America\/New_York/ }));

    firstRender.unmount();

    renderWithI18n(<PublicEventClient {...props} />);

    expect(screen.getByRole("combobox", { name: "Display timezone" })).toHaveTextContent(
      "America/New_York",
    );
    expect(screen.getByText(/Times shown in .*America\/New_York/)).toBeInTheDocument();
  });

  it("keeps repeated fallback-hour slots distinct and saves canonical slot starts", async () => {
    vi.useFakeTimers();
    const initialSnapshot: PublicEventSnapshot = {
      id: "event_dst",
      slug: "test-event",
      title: "DST Event",
      eventType: "time_grid",
      timezone: "Europe/Vienna",
      status: "OPEN",
      slotMinutes: 60,
      meetingDurationMinutes: 60,
      dayStartMinutes: 2 * 60,
      dayEndMinutes: 4 * 60,
      dates: [{ dateKey: "2026-10-25", label: "Sun, Oct 25" }],
      timeRows: [{ minutes: 2 * 60, label: "02:00" }],
      slots: [
        {
          slotStart: "2026-10-25T00:00:00.000Z",
          dateKey: "2026-10-25",
          minutes: 2 * 60,
          availabilityCount: 1,
          participantIds: ["p1"],
          selectedByCurrentUser: true,
        },
        {
          slotStart: "2026-10-25T01:00:00.000Z",
          dateKey: "2026-10-25",
          minutes: 2 * 60,
          availabilityCount: 0,
          participantIds: [],
          selectedByCurrentUser: false,
        },
      ],
      participants: [
        {
          id: "p1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: 1,
          isCurrentUser: true,
        },
      ],
      suggestions: [],
      finalizedSlot: null,
      currentParticipant: {
        id: "p1",
        displayName: "Felix",
        color: "#ef7f3b",
        selectedSlotCount: 1,
        isCurrentUser: true,
      },
    };
    const savedSnapshot: PublicEventSnapshot = {
      ...initialSnapshot,
      slots: initialSnapshot.slots.map((slot) =>
        slot.slotStart === "2026-10-25T01:00:00.000Z"
          ? {
              ...slot,
              availabilityCount: 1,
              participantIds: ["p1"],
              selectedByCurrentUser: true,
            }
          : slot,
      ),
      participants: [
        {
          id: "p1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: 2,
          isCurrentUser: true,
        },
      ],
      currentParticipant: {
        id: "p1",
        displayName: "Felix",
        color: "#ef7f3b",
        selectedSlotCount: 2,
        isCurrentUser: true,
      },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/events/test-event/availability") {
        expect(init?.method).toBe("PUT");
        return {
          ok: true,
          json: async () => ({ snapshot: savedSnapshot }),
        };
      }

      throw new Error(`Unhandled fetch call: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={initialSnapshot}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
        timezones={defaultTimezones}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Sun, Oct 25 02:00 CEST · 1\/1 available/i }),
    ).toBeInTheDocument();

    const secondHourSlot = screen.getByRole("button", {
      name: /Sun, Oct 25 02:00 CET · nobody available/i,
    });

    fireEvent.pointerDown(secondHourSlot, {
      pointerId: 1,
      isPrimary: true,
    });
    fireEvent.pointerUp(secondHourSlot, {
      pointerId: 1,
      isPrimary: true,
    });
    await vi.advanceTimersByTimeAsync(600);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      selectedSlotStarts: ["2026-10-25T00:00:00.000Z", "2026-10-25T01:00:00.000Z"],
    });

    vi.useRealTimers();
  });

  it("renders a full-day picker and saves selected days", async () => {
    vi.useFakeTimers();
    const initialSnapshot = createFullDaySnapshot();
    const savedSnapshot: PublicEventSnapshot = {
      ...initialSnapshot,
      slots: initialSnapshot.slots.map((slot) =>
        slot.slotStart === "2026-03-29T22:00:00.000Z"
          ? {
              ...slot,
              availabilityCount: 1,
              participantIds: ["p1"],
              selectedByCurrentUser: true,
            }
          : slot,
      ),
      participants: initialSnapshot.participants.map((participant) =>
        participant.id === "p1"
          ? {
              ...participant,
              selectedSlotCount: 1,
            }
          : participant,
      ),
      currentParticipant: initialSnapshot.currentParticipant
        ? {
            ...initialSnapshot.currentParticipant,
            selectedSlotCount: 1,
          }
        : null,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/events/full-day-event/availability") {
        expect(init?.method).toBe("PUT");
        return {
          ok: true,
          json: async () => ({ snapshot: savedSnapshot }),
        };
      }

      throw new Error(`Unhandled fetch call: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(
      <PublicEventClient
        slug="full-day-event"
        initialSnapshot={initialSnapshot}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(screen.getByText("Full-day poll")).toBeInTheDocument();
    expect(screen.getAllByText("March 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("April 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MO").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "2026-03-01" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: /Mon, Mar 30 · nobody available/i }));
    await vi.advanceTimersByTimeAsync(600);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      selectedSlotStarts: ["2026-03-29T22:00:00.000Z"],
    });

    vi.useRealTimers();
  });

  it("lets full-day participants switch to view mode without saving", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(
      <PublicEventClient
        slug="full-day-event"
        initialSnapshot={createFullDaySnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(screen.queryByText("Day details")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Mon, Mar 30 · nobody available/i }));

    expect(screen.getByText("Day details")).toBeInTheDocument();
    expect(screen.getByText("Mon, Mar 30 · 0/2 available")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("paints full-day availability while dragging across days", async () => {
    vi.useFakeTimers();
    const initialSnapshot = createFullDaySnapshot();
    const savedSnapshot: PublicEventSnapshot = {
      ...initialSnapshot,
      slots: initialSnapshot.slots.map((slot) =>
        slot.slotStart === "2026-03-29T22:00:00.000Z" ||
        slot.slotStart === "2026-03-31T22:00:00.000Z"
          ? {
              ...slot,
              availabilityCount: 1,
              participantIds: ["p1"],
              selectedByCurrentUser: true,
            }
          : slot,
      ),
      participants: initialSnapshot.participants.map((participant) =>
        participant.id === "p1"
          ? {
              ...participant,
              selectedSlotCount: 2,
            }
          : participant,
      ),
      currentParticipant: initialSnapshot.currentParticipant
        ? {
            ...initialSnapshot.currentParticipant,
            selectedSlotCount: 2,
          }
        : null,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/events/full-day-event/availability") {
        expect(init?.method).toBe("PUT");
        return {
          ok: true,
          json: async () => ({ snapshot: savedSnapshot }),
        };
      }

      throw new Error(`Unhandled fetch call: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(
      <PublicEventClient
        slug="full-day-event"
        initialSnapshot={initialSnapshot}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    const firstDay = screen.getByRole("button", {
      name: /Mon, Mar 30 · nobody available/i,
    });
    const secondDay = screen.getByRole("button", {
      name: /Wed, Apr 1 · nobody available/i,
    });

    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => [secondDay]),
    });

    fireEvent.pointerDown(firstDay, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 });
    fireEvent.pointerMove(firstDay, { isPrimary: true, pointerId: 1, clientX: 16, clientY: 16 });
    fireEvent.pointerUp(firstDay, { isPrimary: true, pointerId: 1, clientX: 16, clientY: 16 });
    await vi.advanceTimersByTimeAsync(600);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      selectedSlotStarts: ["2026-03-29T22:00:00.000Z", "2026-03-31T22:00:00.000Z"],
    });

    vi.useRealTimers();
  });

  it("hides best matching windows before anyone has selected availability", () => {
    const snapshot = createSnapshot({ withCurrentUser: false });
    snapshot.slots = snapshot.slots.map((slot) => ({
      ...slot,
      availabilityCount: 0,
      participantIds: [],
      selectedByCurrentUser: false,
    }));
    snapshot.participants = snapshot.participants.map((participant) => ({
      ...participant,
      selectedSlotCount: 0,
      isCurrentUser: false,
    }));
    snapshot.suggestions = [
      {
        slotStart: "2026-03-30T07:00:00.000Z",
        slotEnd: "2026-03-30T08:00:00.000Z",
        dateKey: "2026-03-30",
        label: "Mon, Mar 30 · 09:00-10:00",
        localLabel: null,
        availableCount: 0,
        participantIds: [],
      },
    ];

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={null}
      />,
    );

    expect(screen.queryByText("Best matching windows")).not.toBeInTheDocument();
  });

  it("keeps the heatmap visible in edit mode while marking the current user's slots", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");

    const cell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 2\/4 available/i,
    });

    expect(cell).toHaveAttribute("data-current-user-selected", "true");
    expect(cell.className).toContain("bg-primary/80");
    expect(cell.className).toContain("outline-primary");
    expect(screen.queryByText("Slot details")).not.toBeInTheDocument();
  });

  it("uses relative overlap buckets for cells and legend based on the current maximum overlap", () => {
    const snapshot = createSnapshot({ status: "CLOSED", withCurrentUser: false });
    snapshot.slots = snapshot.slots.map((slot) => {
      if (slot.slotStart === "2026-03-30T07:00:00.000Z") {
        return {
          ...slot,
          participantIds: ["p1", "p2", "p3"],
          availabilityCount: 3,
        };
      }

      if (slot.slotStart === "2026-03-31T07:00:00.000Z") {
        return {
          ...slot,
          participantIds: ["p1", "p2"],
          availabilityCount: 2,
        };
      }

      if (slot.slotStart === "2026-03-30T07:30:00.000Z") {
        return {
          ...slot,
          participantIds: ["p1"],
          availabilityCount: 1,
        };
      }

      return {
        ...slot,
        participantIds: [],
        availabilityCount: 0,
      };
    });
    recalculateParticipantSelectionCounts(snapshot);

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={null}
      />,
    );

    const countThreeCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 3\/4 available/i,
    });
    const countTwoCell = screen.getByRole("button", {
      name: /Tue, Mar 31 09:00 · 2\/4 available/i,
    });
    const countOneCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:30 · 1\/4 available/i,
    });

    expect(countThreeCell.className).toContain("bg-primary/80");
    expect(countTwoCell.className).toContain("bg-primary/50");
    expect(countOneCell.className).toContain("bg-primary/24");

    const someOverlapSwatch = screen.getByText("some overlap").querySelector("span");
    const highOverlapSwatch = screen.getByText("high overlap").querySelector("span");

    expect(someOverlapSwatch).not.toBeNull();
    expect(highOverlapSwatch).not.toBeNull();
    expect(someOverlapSwatch?.className).toContain("bg-primary/24");
    expect(highOverlapSwatch?.className).toContain("bg-primary/80");
  });

  it("switches to view mode and shows available plus unavailable participants for a slot", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    const cell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 2\/4 available/i,
    });

    expect(screen.queryByText("your availability")).not.toBeInTheDocument();
    expect(cell).not.toHaveAttribute("data-current-user-selected");
    expect(cell.className).not.toContain("outline-primary");

    fireEvent.click(cell);

    expect(screen.getByText("Slot details")).toBeInTheDocument();
    expect(screen.getByText("Mon, Mar 30 · 09:00 · 2/4 available")).toBeInTheDocument();

    const availableSection = screen.getByRole("heading", { name: "Available" }).parentElement;
    const unavailableSection = screen.getByRole("heading", { name: "Not available" }).parentElement;

    expect(availableSection).not.toBeNull();
    expect(unavailableSection).not.toBeNull();

    expect(within(availableSection!).getByText("Felix (you)")).toBeInTheDocument();
    expect(within(availableSection!).getByText("Gabriel")).toBeInTheDocument();
    expect(within(unavailableSection!).getByText("Nora")).toBeInTheDocument();
    expect(within(unavailableSection!).queryByText("Sam")).not.toBeInTheDocument();
  });

  it("highlights a clicked participant's availability on the grid and toggles it off again", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    const participantButton = screen.getByRole("button", { name: /^Gabriel/i });
    const availableCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:30 · 1\/4 available/i,
    });
    const unavailableCell = screen.getByRole("button", {
      name: /Tue, Mar 31 09:30 · nobody available/i,
    });

    fireEvent.click(participantButton);

    expect(participantButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Gabriel highlighted")).toBeInTheDocument();
    const participantColorDot = participantButton.querySelector('[data-slot="participant-color-dot"]');
    expect(participantColorDot).not.toBeNull();
    expect(participantColorDot).toHaveClass("size-2.5", "shrink-0", "rounded-full");
    expect(availableCell).toHaveAttribute("data-highlighted-participant-availability", "true");
    expect(unavailableCell).not.toHaveAttribute("data-highlighted-participant-availability");
    const highlightStyle = availableCell.getAttribute("style") ?? "";
    expect(highlightStyle).toContain("repeating-linear-gradient");
    expect(highlightStyle).toContain("color-mix");
    expect(highlightStyle).toContain("outline");
    expect(highlightStyle).not.toContain("box-shadow");

    fireEvent.click(participantButton);

    expect(participantButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Gabriel highlighted")).not.toBeInTheDocument();
    expect(availableCell).not.toHaveAttribute("data-highlighted-participant-availability");
  });

  it("shows day navigation when the date range overflows and moves the visible window one day at a time", async () => {
    setViewportWidth(240);

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ dayCount: 5 })}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(await screen.findByText("More days ahead")).toBeInTheDocument();
    expect(await screen.findByText("Mon, Mar 30 - Tue, Mar 31")).toBeInTheDocument();
    expect(await screen.findByText("Days 1 - 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show previous days" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Show next days" }));

    expect(await screen.findByText("Tue, Mar 31 - Wed, Apr 1")).toBeInTheDocument();
    expect(await screen.findByText("Days 2 - 3 of 5")).toBeInTheDocument();
    expect(screen.getByText("More days available")).toBeInTheDocument();
    expect(screen.queryByText("More days ahead")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show previous days" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Show next days" }));
    fireEvent.click(screen.getByRole("button", { name: "Show next days" }));

    expect(await screen.findByText("Thu, Apr 2 - Fri, Apr 3")).toBeInTheDocument();
    expect(screen.getByText("Earlier days available")).toBeInTheDocument();
    expect(screen.queryByText("More days ahead")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show next days" })).toBeDisabled();
  });

  it("keeps edit interactions on the grid and does not open slot details while painting", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    const firstCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:30 · 1\/4 available/i,
    });
    const secondCell = screen.getByRole("button", {
      name: /Tue, Mar 31 09:30 · nobody available/i,
    });

    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => [secondCell]),
    });

    fireEvent.pointerDown(firstCell, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 });
    fireEvent.pointerMove(firstCell, { isPrimary: true, pointerId: 1, clientX: 16, clientY: 16 });
    fireEvent.pointerUp(firstCell, { isPrimary: true, pointerId: 1, clientX: 16, clientY: 16 });

    expect(firstCell).toHaveAttribute("aria-pressed", "true");
    expect(secondCell).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Slot details")).not.toBeInTheDocument();
  });

  it("shows the join flow and hides the heatmap for open events without a session", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ withCurrentUser: false })}
        initialSession={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "Test Event" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Enter your name" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select availability" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join event" })).toBeDisabled();
    expect(document.querySelector('[data-slot="event-heatmap-grid"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("keeps the join button disabled until the name matches backend length limits", async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ withCurrentUser: false })}
        initialSession={null}
      />,
    );

    const nameInput = screen.getByLabelText("Your name");
    const joinButton = screen.getByRole("button", { name: "Join event" });

    await user.type(nameInput, "A");
    expect(joinButton).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, "Al");
    expect(joinButton).toBeEnabled();

    await user.clear(nameInput);
    await user.type(nameInput, "A".repeat(33));
    expect(joinButton).toBeDisabled();
  });

  it("shows the heatmap after a participant joins", async () => {
    const user = userEvent.setup();
    const joinedSnapshot = createSnapshot();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/events/test-event/participants") {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual({
          displayName: "Felix",
        });
        return {
          ok: true,
          json: async () => ({
            session: {
              participantId: "p1",
              displayName: "Felix",
            },
          }),
        };
      }

      if (String(input) === "/api/events/test-event") {
        return {
          ok: true,
          json: async () => ({ snapshot: joinedSnapshot }),
        };
      }

      throw new Error(`Unhandled fetch call: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ withCurrentUser: false })}
        initialSession={null}
      />,
    );

    await user.type(screen.getByLabelText("Your name"), " Felix ");
    await user.click(screen.getByRole("button", { name: "Join event" }));

    expect(await screen.findByRole("button", { name: "Edit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(document.querySelector('[data-slot="event-heatmap-grid"]')).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Enter your name" })).not.toBeInTheDocument();
  });

  it("keeps join errors visible before the heatmap is shown", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "This name is already taken." }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ withCurrentUser: false })}
        initialSession={null}
      />,
    );

    await user.type(screen.getByLabelText("Your name"), "Felix");
    await user.click(screen.getByRole("button", { name: "Join event" }));

    expect(await screen.findByText("This name is already taken.")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="event-heatmap-grid"]')).toBeNull();
  });

  it("shows closed events without requiring a participant session", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ status: "CLOSED", withCurrentUser: false })}
        initialSession={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Click any slot to see who is available and who is not\./i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Enter your name" })).not.toBeInTheDocument();
  });

  it("stays in view mode when the event is closed", () => {
    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ status: "CLOSED" })}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the fixed date and marks it on the heatmap for closed events", () => {
    const snapshot = createSnapshot({
      status: "CLOSED",
      finalizedSlot: {
        slotStart: "2026-03-30T07:00:00.000Z",
        slotEnd: "2026-03-30T08:00:00.000Z",
        dateKey: "2026-03-30",
        label: "Mon, Mar 30 · 09:00-10:00",
        localLabel: null,
        availableCount: 1,
        participantIds: ["p2"],
      },
    });
    snapshot.suggestions = [
      {
        slotStart: "2026-03-31T07:00:00.000Z",
        slotEnd: "2026-03-31T08:00:00.000Z",
        dateKey: "2026-03-31",
        label: "Tue, Mar 31 · 09:00-10:00",
        localLabel: null,
        availableCount: 2,
        participantIds: ["p2", "p3"],
      },
    ];

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={null}
      />,
    );

    // "Fixed date" title appears in both the mobile slot and the xl+ sidebar slot.
    expect(screen.getAllByText("Fixed date")).toHaveLength(2);
    expect(screen.queryByText("Best matching windows")).not.toBeInTheDocument();
    // "Add to calendar" link appears in both slots.
    expect(screen.getAllByRole("link", { name: "Add to calendar (.ics)" })[0]).toHaveAttribute(
      "href",
      "/api/events/test-event/ics",
    );

    const firstCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 2\/4 available/i,
    });
    const secondCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:30 · 1\/4 available/i,
    });

    expect(firstCell).toHaveAttribute("data-final-slot-start", "true");
    expect(firstCell).toHaveAttribute("data-final-slot-window", "true");
    expect(secondCell).toHaveAttribute("data-final-slot-window", "true");
    expect(firstCell.className).toContain("bg-amber-100");
    expect(secondCell.className).toContain("bg-amber-100");
    expect(firstCell.className).toBe(secondCell.className);
  });

  it("renders the share card in the DOM on mobile viewports", () => {
    setViewportWidth(390);

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        shareUrl="https://tempoll.app/e/test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    // The share card appears in both the mobile slot and the xl+ sidebar slot,
    // so the URL and copy button are present in the DOM at any viewport width.
    expect(screen.getAllByText("https://tempoll.app/e/test-event")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Copy public URL" })).toHaveLength(2);
  });

  it("uses narrower day columns on mobile viewports to show more days at once", async () => {
    setViewportWidth(390);

    renderWithI18n(
      <PublicEventClient
        slug="test-event"
        shareUrl="https://tempoll.app/e/test-event"
        initialSnapshot={createSnapshot({ dayCount: 7 })}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
      { locale: "de" },
    );

    await waitFor(() => {
      expect(screen.getByText("Verfügbarkeit")).toBeInTheDocument();
      const heatmapGrid = document.querySelector<HTMLElement>(
        '[data-slot="event-heatmap-grid"]',
      );

      expect(heatmapGrid).not.toBeNull();
      expect(heatmapGrid?.style.gridTemplateColumns).toContain("minmax(72px, 1fr)");
    });
  });
});
