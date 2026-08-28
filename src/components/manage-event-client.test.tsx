import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildFinalizedSlot, buildScheduleSignature, buildSnapshot } from "@/lib/availability";
import type { ManageEventView, PublicEventSnapshot } from "@/lib/types";
import { renderWithI18n } from "@/test/render-with-i18n";
import { ManageEventClient } from "./manage-event-client";

const mockedGetViewerTimezone = vi.hoisted(() => vi.fn(() => "Europe/Vienna"));
const mockedToastError = vi.hoisted(() => vi.fn());
const mockedToastSuccess = vi.hoisted(() => vi.fn());
const defaultTimezones = ["Europe/Vienna", "America/New_York", "UTC"];
const defaultEventSource = globalThis.EventSource;

function installEventSourceCapture() {
  const listeners = new Map<string, Array<(event: Event) => void>>();

  class CapturingEventSource {
    addEventListener(type: string, listener: EventListener) {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    }

    close() {}
  }

  Object.defineProperty(globalThis, "EventSource", {
    configurable: true,
    writable: true,
    value: CapturingEventSource,
  });

  return {
    emit(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        listener(new Event(type));
      }
    },
  };
}

vi.mock("@/lib/availability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/availability")>();

  return {
    ...actual,
    getViewerTimezone: mockedGetViewerTimezone,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: mockedToastError,
    success: mockedToastSuccess,
  },
}));

function createManageView(options?: {
  status?: "OPEN" | "CLOSED";
  finalizedSlot?: ManageEventView["snapshot"]["finalizedSlot"];
  recipientEmail?: string | null;
  notificationsConfigured?: boolean;
}): ManageEventView {
  const status = options?.status ?? "OPEN";
  const finalizedSlot = options?.finalizedSlot ?? null;
  const recipientEmail =
    options && "recipientEmail" in options ? options.recipientEmail ?? null : "owner@example.com";

  return {
    manageKey: "cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    shareUrl: "https://tempoll.app/e/test-event-xeqlxw",
    manageUrl:
      "https://tempoll.app/manage/cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    notification: {
      isConfigured: options?.notificationsConfigured ?? true,
      recipientEmail,
      quietPeriodMinutes: 5,
      lastSentAt: "2026-04-01T08:00:00.000Z",
      pendingDigest: {
        participantCount: 2,
        flushAfterAt: "2026-04-02T07:35:00.000Z",
      },
    },
    snapshot: {
      id: "event_1",
      slug: "test-event-xeqlxw",
      title: "Team sync",
      location: null,
      isOnlineMeeting: false,
      meetingLink: null,
      eventType: "time_grid",
      timezone: "Europe/Vienna",
      status,
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 11 * 60,
      dates: [{ dateKey: "2026-04-02", label: "Thu, Apr 2" }],
      timeRows: [
        { minutes: 9 * 60, label: "09:00" },
        { minutes: 9 * 60 + 30, label: "09:30" },
        { minutes: 10 * 60, label: "10:00" },
      ],
      slots: [
        {
          slotStart: "2026-04-02T07:00:00.000Z",
          dateKey: "2026-04-02",
          minutes: 9 * 60,
          availabilityCount: 2,
          participantIds: ["participant_1", "participant_2"],
          selectedByCurrentUser: false,
        },
        {
          slotStart: "2026-04-02T07:30:00.000Z",
          dateKey: "2026-04-02",
          minutes: 9 * 60 + 30,
          availabilityCount: 2,
          participantIds: ["participant_1", "participant_2"],
          selectedByCurrentUser: false,
        },
        {
          slotStart: "2026-04-02T08:00:00.000Z",
          dateKey: "2026-04-02",
          minutes: 10 * 60,
          availabilityCount: 1,
          participantIds: ["participant_1"],
          selectedByCurrentUser: false,
        },
      ],
      participants: [
        {
          id: "participant_1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: 3,
          isCurrentUser: false,
        },
        {
          id: "participant_2",
          displayName: "Nora",
          color: "#6b8afd",
          selectedSlotCount: 2,
          isCurrentUser: false,
        },
      ],
      suggestions: [
        {
          slotStart: "2026-04-02T07:00:00.000Z",
          slotEnd: "2026-04-02T08:00:00.000Z",
          dateKey: "2026-04-02",
          label: "Thu, Apr 2 · 09:00-10:00",
          localLabel: null,
          availableCount: 2,
          participantIds: ["participant_1", "participant_2"],
        },
      ],
      finalizedSlot,
      currentParticipant: null,
    },
  };
}

function buildPublishedFinalizedSlot(
  snapshot: PublicEventSnapshot,
  finalSlotStart: string,
): NonNullable<PublicEventSnapshot["finalizedSlot"]> {
  const finalizedSlot = buildFinalizedSlot({
    eventType: snapshot.eventType,
    dates: snapshot.dates.map((date) => date.dateKey),
    locale: "en",
    timezone: snapshot.timezone,
    dayStartMinutes: snapshot.dayStartMinutes,
    dayEndMinutes: snapshot.dayEndMinutes,
    slotMinutes: snapshot.slotMinutes,
    meetingDurationMinutes: snapshot.meetingDurationMinutes,
    slots: snapshot.slots,
    finalSlotStart,
  });

  if (!finalizedSlot) {
    throw new Error(`Could not build finalized slot for ${finalSlotStart}`);
  }

  return finalizedSlot;
}

function getCalendarDayButton(date: Date) {
  const dataDay = date.toLocaleDateString("en-US");
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-day]")).find(
    (candidate) => candidate.dataset.day === dataDay,
  );

  if (!button) {
    throw new Error(`Calendar day button ${dataDay} was not found.`);
  }

  return button;
}

function createFullDayManageView(): ManageEventView {
  const view = createManageView();

  return {
    ...view,
    snapshot: {
      ...view.snapshot,
      id: "event_full_day",
      slug: "full-day-event",
      title: "Offsite days",
      eventType: "full_day",
      dates: [
        { dateKey: "2026-04-02", label: "Thu, Apr 2" },
        { dateKey: "2026-04-03", label: "Fri, Apr 3" },
      ],
      timeRows: [],
      slots: [
        {
          slotStart: "2026-04-01T22:00:00.000Z",
          dateKey: "2026-04-02",
          minutes: 0,
          availabilityCount: 2,
          participantIds: ["participant_1", "participant_2"],
          selectedByCurrentUser: false,
        },
        {
          slotStart: "2026-04-02T22:00:00.000Z",
          dateKey: "2026-04-03",
          minutes: 0,
          availabilityCount: 1,
          participantIds: ["participant_1"],
          selectedByCurrentUser: false,
        },
      ],
      participants: [
        {
          id: "participant_1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: 2,
          isCurrentUser: false,
        },
        {
          id: "participant_2",
          displayName: "Nora",
          color: "#6b8afd",
          selectedSlotCount: 1,
          isCurrentUser: false,
        },
      ],
      suggestions: [
        {
          slotStart: "2026-04-01T22:00:00.000Z",
          slotEnd: "2026-04-02T22:00:00.000Z",
          dateKey: "2026-04-02",
          label: "Thu, Apr 2",
          localLabel: null,
          availableCount: 2,
          participantIds: ["participant_1", "participant_2"],
        },
      ],
      finalizedSlot: null,
      currentParticipant: null,
    },
  };
}

function installManageFetchMock(view: ManageEventView) {
  let currentSnapshot = structuredClone(view.snapshot) as PublicEventSnapshot;
  let currentNotification = structuredClone(view.notification);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === `/api/events/${view.snapshot.slug}`) {
      return {
        ok: true,
        json: async () => ({
          snapshot: currentSnapshot,
        }),
      };
    }

    if (url === `/api/manage/${view.manageKey}` && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)) as
        | { action: "updateTitle"; title: string }
        | { action: "closeEvent"; finalSlotStart: string }
        | { action: "updateFixedDate"; finalSlotStart: string }
        | { action: "reopenEvent" }
        | { action: "updateNotificationEmail"; notificationEmail?: string }
        | {
            action: "updateSchedule";
            dates: string[];
            dayStartMinutes?: number;
            dayEndMinutes?: number;
          };

      switch (payload.action) {
        case "updateTitle":
          currentSnapshot = {
            ...currentSnapshot,
            title: payload.title.trim(),
          };
          break;
        case "closeEvent":
        case "updateFixedDate":
          currentSnapshot = {
            ...currentSnapshot,
            status: "CLOSED",
            finalizedSlot: buildPublishedFinalizedSlot(currentSnapshot, payload.finalSlotStart),
          };
          break;
        case "reopenEvent":
          currentSnapshot = {
            ...currentSnapshot,
            status: "OPEN",
            finalizedSlot: null,
          };
          break;
        case "updateNotificationEmail":
          currentNotification = {
            ...currentNotification,
            recipientEmail: payload.notificationEmail?.trim().toLowerCase() || null,
            pendingDigest: payload.notificationEmail ? currentNotification.pendingDigest : null,
          };
          break;
        case "updateSchedule": {
          const nextDateKeys = new Set(payload.dates);
          const nextDayStartMinutes = payload.dayStartMinutes ?? currentSnapshot.dayStartMinutes;
          const nextDayEndMinutes = payload.dayEndMinutes ?? currentSnapshot.dayEndMinutes;
          currentSnapshot = {
            ...currentSnapshot,
            dates: payload.dates.map((dateKey) => ({ dateKey, label: dateKey })),
            dayStartMinutes: nextDayStartMinutes,
            dayEndMinutes: nextDayEndMinutes,
            timeRows: currentSnapshot.timeRows.filter(
              (row) => row.minutes >= nextDayStartMinutes && row.minutes < nextDayEndMinutes,
            ),
            slots: currentSnapshot.slots.filter(
              (slot) =>
                nextDateKeys.has(slot.dateKey) &&
                (currentSnapshot.eventType === "full_day" ||
                  (slot.minutes >= nextDayStartMinutes && slot.minutes < nextDayEndMinutes)),
            ),
          };
          break;
        }
      }

      return {
        ok: true,
        json: async () => ({ ok: true, notification: currentNotification }),
      };
    }

    throw new Error(`Unhandled fetch call: ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  Object.assign(fetchMock, {
    setCurrentSnapshot(nextSnapshot: PublicEventSnapshot) {
      currentSnapshot = structuredClone(nextSnapshot) as PublicEventSnapshot;
    },
  });

  return fetchMock as typeof fetchMock & {
    setCurrentSnapshot: (snapshot: PublicEventSnapshot) => void;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetViewerTimezone.mockReturnValue("Europe/Vienna");
  window.localStorage.clear();
  Object.defineProperty(globalThis, "EventSource", {
    configurable: true,
    writable: true,
    value: defaultEventSource,
  });
});

describe("ManageEventClient", () => {
  it("keeps long share links wrappable inside the sidebar cards", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.getByText(view.shareUrl).className).toContain("[overflow-wrap:anywhere]");
    expect(screen.getByText(view.manageUrl).className).toContain("[overflow-wrap:anywhere]");
  });

  it("places the unified organizer sidebar stack before the heatmap in DOM order", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    const eventStatusHeading = screen.getByText("Event status");
    const shareLinksHeading = screen.getByText("Share links");
    const emailAlertsHeading = screen.getByText("Email alerts");
    const bestWindowsHeading = screen.getByText("Best windows right now");
    const participantsHeading = screen.getByText("Participants");
    const availabilityHeading = screen.getByText("Availability");

    expect(screen.getAllByText("Participants")).toHaveLength(1);
    expect(
      eventStatusHeading.compareDocumentPosition(shareLinksHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      shareLinksHeading.compareDocumentPosition(availabilityHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      emailAlertsHeading.compareDocumentPosition(availabilityHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      bestWindowsHeading.compareDocumentPosition(availabilityHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      participantsHeading.compareDocumentPosition(availabilityHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the top manage card compact and renders the heatmap as a single content column", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    const heatmapLayout = document.querySelector('[data-slot="event-heatmap-layout"]');

    expect(heatmapLayout).not.toBeNull();
    expect(heatmapLayout).toHaveClass("grid-cols-1");
    expect(heatmapLayout?.className).not.toContain("xl:grid-cols-[minmax(0,1fr)_250px]");
    expect(document.body.innerHTML).not.toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
  });

  it("shows the shared timezone selector on the organizer heatmap", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} timezones={defaultTimezones} />);

    expect(screen.getByRole("combobox", { name: "Display timezone" })).toBeInTheDocument();
    expect(screen.queryByText(/Host: Europe\/Vienna/)).not.toBeInTheDocument();
  });

  it("updates organizer heatmap labels and best windows after a manual timezone override", async () => {
    const user = userEvent.setup();
    const view = createManageView();

    renderWithI18n(<ManageEventClient initialView={view} timezones={defaultTimezones} />);

    await user.click(screen.getByRole("combobox", { name: "Display timezone" }));
    await user.type(screen.getByPlaceholderText("Search timezones..."), "new");

    expect(screen.getByRole("option", { name: /America\/New_York/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Europe\/Vienna/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /America\/New_York/ }));

    expect(screen.getByRole("combobox", { name: "Display timezone" })).toHaveTextContent(
      "America/New_York",
    );
    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00 / 03:00")).not.toBeInTheDocument();
    expect(screen.getByText("Thu, Apr 2 · 03:00-04:00")).toBeInTheDocument();
  });

  it("shows local fixed-date labels on the organizer page after a manual timezone override", async () => {
    const user = userEvent.setup();
    const finalizedSlot = buildPublishedFinalizedSlot(
      createManageView().snapshot,
      "2026-04-02T07:00:00.000Z",
    );
    const view = createManageView({
      status: "CLOSED",
      finalizedSlot,
    });

    renderWithI18n(<ManageEventClient initialView={view} timezones={defaultTimezones} />);

    await user.click(screen.getByRole("combobox", { name: "Display timezone" }));
    await user.click(screen.getByRole("option", { name: /America\/New_York/ }));

    expect(screen.getByText("Thu, Apr 2 · 03:00-04:00")).toBeInTheDocument();
  });

  it("closes the event directly from the selected slot without requiring a separate save", async () => {
    const user = userEvent.setup();
    const view = createManageView();
    const fetchMock = installManageFetchMock(view);
    renderWithI18n(<ManageEventClient initialView={view} />);

    await user.click(
      screen.getByRole("button", {
        name: /Thu, Apr 2 09:00 · 2\/2 available/i,
      }),
    );

    expect(screen.getByText("This slot fits the full 60-minute meeting.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set fixed date and close event" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save title" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set fixed date and close event" }));

    await waitFor(() => {
      expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
      expect(screen.getByRole("link", { name: "Add to calendar (.ics)" })).toBeInTheDocument();
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      action: "closeEvent",
      finalSlotStart: "2026-04-02T07:00:00.000Z",
    });
  });

  it("closes a full-day event from the selected day", async () => {
    const user = userEvent.setup();
    const view = createFullDayManageView();
    const fetchMock = installManageFetchMock(view);
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.getByText("Best days right now")).toBeInTheDocument();
    expect(screen.getByText("Full-day poll")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Thu, Apr 2 · 2\/2 available/i,
      }),
    );

    expect(screen.getByText("This day can be published as the fixed day.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set fixed day and close event" }));

    await waitFor(() => {
      expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
      expect(screen.getByRole("link", { name: "Add to calendar (.ics)" })).toBeInTheDocument();
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      action: "closeEvent",
      finalSlotStart: "2026-04-01T22:00:00.000Z",
    });
  });

  it("updates the published fixed date directly on closed events", async () => {
    const user = userEvent.setup();
    const initialFinalizedSlot = buildPublishedFinalizedSlot(
      createManageView().snapshot,
      "2026-04-02T07:00:00.000Z",
    );
    const view = createManageView({
      status: "CLOSED",
      finalizedSlot: initialFinalizedSlot,
    });
    const fetchMock = installManageFetchMock(view);
    renderWithI18n(<ManageEventClient initialView={view} />);

    await user.click(
      screen.getByRole("button", {
        name: /Thu, Apr 2 09:30 · 2\/2 available/i,
      }),
    );

    expect(screen.getByRole("button", { name: "Update fixed date" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Update fixed date" }));

    await waitFor(() => {
      expect(screen.getByText(/Thu, Apr 2.*09:30.*10:30/i)).toBeInTheDocument();
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      action: "updateFixedDate",
      finalSlotStart: "2026-04-02T07:30:00.000Z",
    });
  });

  it("requires confirmation before reopening a closed event", async () => {
    const user = userEvent.setup();
    const initialFinalizedSlot = buildPublishedFinalizedSlot(
      createManageView().snapshot,
      "2026-04-02T07:00:00.000Z",
    );
    const view = createManageView({
      status: "CLOSED",
      finalizedSlot: initialFinalizedSlot,
    });
    const fetchMock = installManageFetchMock(view);
    renderWithI18n(<ManageEventClient initialView={view} />);

    await user.click(screen.getByRole("button", { name: "Reopen event" }));

    expect(screen.getByText("Reopen this event?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reopen and clear fixed date" }));

    await waitFor(() => {
      expect(screen.getByText("Open for edits")).toBeInTheDocument();
      expect(screen.queryByText("Reopen this event?")).not.toBeInTheDocument();
      expect(screen.queryAllByText("Fixed date")).toHaveLength(0);
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      action: "reopenEvent",
    });
  });

  it("saves the title independently from closing and reopening actions", async () => {
    const user = userEvent.setup();
    const view = createManageView();
    const fetchMock = installManageFetchMock(view);
    renderWithI18n(<ManageEventClient initialView={view} />);

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Updated team sync");

    const saveTitleButton = screen.getByRole("button", { name: "Save title" });
    expect(saveTitleButton).toBeInTheDocument();

    await user.click(saveTitleButton);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Save title" })).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Updated team sync")).toBeInTheDocument();
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      action: "updateTitle",
      title: "Updated team sync",
    });
  });

  it("shows email alert scheduling details in the organizer sidebar", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.getByText("Email alerts")).toBeInTheDocument();
    expect(screen.getByDisplayValue("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Each email includes a fresh private organizer link. Treat it as sensitive.")).toBeInTheDocument();
  });

  it("saves the organizer notification email without refreshing the snapshot", async () => {
    const user = userEvent.setup();
    const view = createManageView({
      recipientEmail: null,
    });
    const fetchMock = installManageFetchMock(view);
    renderWithI18n(<ManageEventClient initialView={view} />);

    const input = screen.getByLabelText("Send alerts to");
    await user.type(input, "owner@example.com");
    await user.click(screen.getByRole("button", { name: "Save email" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Send alerts to")).toHaveValue("owner@example.com");
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      action: "updateNotificationEmail",
      notificationEmail: "owner@example.com",
    });
  });

  it("shows an unavailable note when email alerts are disabled on the host", () => {
    const view = createManageView({
      notificationsConfigured: false,
      recipientEmail: null,
    });
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.getByText("Email alerts are not available on this host right now.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Send alerts to")).not.toBeInTheDocument();
  });

  it("shows the saved fixed date with an .ics export link", () => {
    const view = createManageView({
      status: "CLOSED",
      finalizedSlot: {
        slotStart: "2026-04-02T07:00:00.000Z",
        slotEnd: "2026-04-02T08:00:00.000Z",
        dateKey: "2026-04-02",
        label: "Thu, Apr 2 · 09:00-10:00",
        localLabel: null,
        availableCount: 2,
        participantIds: ["participant_1", "participant_2"],
      },
    });
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.getByText("Event status")).toBeInTheDocument();
    expect(screen.getAllByText("Fixed date")).toHaveLength(1);
    expect(screen.getAllByText("Closed")).toHaveLength(1);
    expect(screen.queryByText("Times shown in Europe/Vienna")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to calendar (.ics)" })).toHaveAttribute(
      "href",
      "/api/events/test-event-xeqlxw/ics",
    );
  });

  it("hides duplicate closed-state suggestions when the published fixed date already matches the best slot", () => {
    const finalizedSlot = buildPublishedFinalizedSlot(
      createManageView().snapshot,
      "2026-04-02T07:00:00.000Z",
    );
    const view = createManageView({
      status: "CLOSED",
      finalizedSlot,
    });
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.queryByText("Best windows right now")).not.toBeInTheDocument();
  });

  it("combines participant management and highlighting in one sidebar card", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    const participantRow = screen
      .getAllByRole("button", {
        name: /Felix/i,
      })
      .find((element) => element.tagName === "DIV");

    expect(participantRow).toBeDefined();

    fireEvent.click(participantRow!);

    expect(participantRow).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Highlighting")).toBeInTheDocument();
    const participantColorDot = participantRow?.querySelector('[data-slot="participant-color-dot"]');
    expect(participantColorDot).not.toBeNull();
    expect(participantColorDot).toHaveClass("size-3", "shrink-0", "rounded-full");
    const highlightedCell = screen.getByRole("button", {
      name: /Thu, Apr 2 09:00 · 2\/2 available/i,
    });

    expect(highlightedCell).toHaveAttribute("data-highlighted-participant-availability", "true");

    const highlightStyle = highlightedCell.getAttribute("style") ?? "";
    expect(highlightStyle).toContain("repeating-linear-gradient");
    expect(highlightStyle).toContain("color-mix");
    expect(highlightStyle).toContain("outline");
    expect(highlightStyle).not.toContain("box-shadow");
  });

  it("hides best windows before anyone has entered availability", () => {
    const view = createManageView();
    view.snapshot.participants = view.snapshot.participants.map((participant) => ({
      ...participant,
      selectedSlotCount: 0,
    }));
    view.snapshot.suggestions = view.snapshot.suggestions.map((suggestion) => ({
      ...suggestion,
      availableCount: 0,
      participantIds: [],
    }));

    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.queryByText("Best windows right now")).not.toBeInTheDocument();
  });

  it("shows the dates & times editor while the event is open and hides it once closed", () => {
    const openView = createManageView({ status: "OPEN" });
    const { unmount } = renderWithI18n(<ManageEventClient initialView={openView} />);
    expect(screen.getByText("Dates & times")).toBeInTheDocument();
    unmount();

    const closedView = createManageView({
      status: "CLOSED",
      finalizedSlot: buildPublishedFinalizedSlot(
        createManageView().snapshot,
        "2026-04-02T07:00:00.000Z",
      ),
    });
    renderWithI18n(<ManageEventClient initialView={closedView} />);
    expect(screen.queryByText("Dates & times")).not.toBeInTheDocument();
  });

  it("saves a widened daily window immediately without a confirmation dialog", async () => {
    const view = createManageView();
    const fetchMock = installManageFetchMock(view);
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);

    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));

    expect(screen.queryByText("Delete marked availability?")).not.toBeInTheDocument();

    await waitFor(() => {
      const scheduleCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === `/api/manage/${view.manageKey}` &&
          (init as RequestInit | undefined)?.method === "PATCH" &&
          String((init as RequestInit).body).includes("updateSchedule"),
      );
      expect(scheduleCall).toBeTruthy();
      const body = JSON.parse(String((scheduleCall![1] as RequestInit).body));
      expect(body).toMatchObject({
        action: "updateSchedule",
        dates: ["2026-04-02"],
        dayStartMinutes: 9 * 60,
        dayEndMinutes: 11 * 60 + 30,
        expectedScheduleSignature: buildScheduleSignature({
          dates: ["2026-04-02"],
          dayStartMinutes: 9 * 60,
          dayEndMinutes: 11 * 60,
        }),
        expectedDeletedVotes: 0,
        expectedAffectedParticipants: 0,
      });
    });
  });

  it("confirms before saving a change that deletes marked availability", async () => {
    const view = createManageView();
    const fetchMock = installManageFetchMock(view);
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);

    // Narrowing the day to 10:00 removes the 10:00 slot, which has one vote.
    const dailyEnd = screen.getByRole("combobox", { name: "Daily end" });
    await user.click(dailyEnd);
    await user.click(screen.getByRole("option", { name: "10:00" }));
    expect(dailyEnd).toHaveTextContent("10:00");
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));

    expect(await screen.findByText("Delete marked availability?")).toBeInTheDocument();
    expect(
      screen.getByText(/1 availability mark across 1 participant/),
    ).toBeInTheDocument();

    // No PATCH should be sent until the organizer confirms.
    expect(
      fetchMock.mock.calls.some(
        ([, init]) =>
          (init as RequestInit | undefined)?.method === "PATCH" &&
          String((init as RequestInit).body).includes("updateSchedule"),
      ),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "Delete and save" }));

    await waitFor(() => {
      const scheduleCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input) === `/api/manage/${view.manageKey}` &&
          (init as RequestInit | undefined)?.method === "PATCH" &&
          String((init as RequestInit).body).includes("updateSchedule"),
      );
      expect(scheduleCall).toBeTruthy();
      const body = JSON.parse(String((scheduleCall![1] as RequestInit).body));
      expect(body).toMatchObject({
        action: "updateSchedule",
        dates: ["2026-04-02"],
        dayEndMinutes: 10 * 60,
        expectedDeletedVotes: 1,
        expectedAffectedParticipants: 1,
      });
    });
  });

  it("blocks a daily window that cannot fit the full meeting duration", async () => {
    const view = createManageView();
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);

    const dailyEnd = screen.getByRole("combobox", { name: "Daily end" });
    await user.click(dailyEnd);
    await user.click(screen.getByRole("option", { name: "09:30" }));

    expect(
      screen.getByText("Choose dates and times with room for the full 60-minute meeting."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("combobox", { name: "Daily start" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(dailyEnd).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Save dates & times" })).toBeDisabled();
  });

  it("blocks a schedule when an added date has no finalizable meeting window", async () => {
    const view = createManageView();
    view.snapshot = buildSnapshot({
      id: view.snapshot.id,
      slug: view.snapshot.slug,
      title: view.snapshot.title,
      eventType: "time_grid",
      locale: "en",
      timezone: "Europe/Vienna",
      status: "OPEN",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 2 * 60,
      dayEndMinutes: 3 * 60,
      dates: ["2026-03-30"],
      participants: [],
      finalSlotStart: null,
    });
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByLabelText("Dates"));
    await user.click(getCalendarDayButton(new Date(2026, 2, 29)));

    expect(
      screen.getByText("Choose dates and times with room for the full 60-minute meeting."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "Save dates & times" })).toBeDisabled();
  });

  it("associates the date label and empty-selection error with the calendar trigger", async () => {
    const view = createManageView();
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);

    const datesTrigger = screen.getByLabelText("Dates");
    expect(datesTrigger).toHaveAccessibleDescription("You can select up to 31 dates.");

    await user.click(datesTrigger);
    await user.click(getCalendarDayButton(new Date(2026, 3, 2)));

    const error = screen.getByText("Pick at least one date.");
    expect(error).toHaveAttribute("role", "alert");
    expect(datesTrigger).toHaveAttribute("aria-invalid", "true");
    expect(datesTrigger.getAttribute("aria-describedby")).toContain(error.id);
  });

  it("keeps the date selection stable at the time-grid limit", async () => {
    const view = createManageView();
    const extraDates = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(2026, 4, 1 + index);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;
    });
    view.snapshot.dates = ["2026-04-02", ...extraDates].map((dateKey) => ({
      dateKey,
      label: dateKey,
    }));
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByLabelText("Dates"));

    const unselectedDay = getCalendarDayButton(new Date(2026, 3, 3));
    expect(unselectedDay).toBeDisabled();
    expect(screen.getByText("You can select up to 31 dates.")).toBeInTheDocument();

    await user.click(getCalendarDayButton(new Date(2026, 3, 2)));
    expect(screen.getByText("30 dates")).toBeInTheDocument();
    expect(getCalendarDayButton(new Date(2026, 3, 3))).not.toBeDisabled();
  });

  it("updates full-day dates without sending daily time fields", async () => {
    const view = createFullDayManageView();
    const fetchMock = installManageFetchMock(view);
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.queryByRole("combobox", { name: "Daily start" })).not.toBeInTheDocument();
    expect(screen.getByText("You can select up to 366 dates.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Dates"));
    await user.click(getCalendarDayButton(new Date(2026, 3, 3)));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));
    await user.click(await screen.findByRole("button", { name: "Delete and save" }));

    await waitFor(() => {
      const scheduleCall = fetchMock.mock.calls.find(([, init]) =>
        String((init as RequestInit | undefined)?.body).includes("updateSchedule"),
      );
      expect(scheduleCall).toBeTruthy();
      const body = JSON.parse(String((scheduleCall![1] as RequestInit).body));
      expect(body).toMatchObject({
        action: "updateSchedule",
        dates: ["2026-04-02"],
        expectedDeletedVotes: 1,
        expectedAffectedParticipants: 1,
      });
      expect(body).not.toHaveProperty("dayStartMinutes");
      expect(body).not.toHaveProperty("dayEndMinutes");
    });
  });

  it("preserves a dirty schedule draft when another organizer changes the schedule", async () => {
    const eventSource = installEventSourceCapture();
    const view = createManageView();
    const fetchMock = installManageFetchMock(view);
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));

    fetchMock.setCurrentSnapshot({
      ...view.snapshot,
      dayEndMinutes: 12 * 60,
    });
    eventSource.emit("event-update");

    expect(await screen.findByText("The schedule changed elsewhere.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Daily end" })).toHaveTextContent("11:30");
    expect(screen.getByRole("button", { name: "Save dates & times" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Keep my changes" }));
    expect(screen.queryByText("The schedule changed elsewhere.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save dates & times" })).toBeEnabled();
  });

  it("shows a fallback error and keeps the schedule retryable when the request fails", async () => {
    const view = createManageView();
    const user = userEvent.setup();
    global.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith("Unable to update event.");
    });
    expect(mockedToastSuccess).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save dates & times" })).toBeEnabled(),
    );
  });

  it("disables the fixed-date action while a schedule save is in flight", async () => {
    const view = createManageView();
    const baseFetch = installManageFetchMock(view);
    let resolveSchedule!: (response: Response) => void;
    const scheduleResponse = new Promise<Response>((resolve) => {
      resolveSchedule = resolve;
    });
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (
        String(input) === `/api/manage/${view.manageKey}` &&
        String(init?.body).includes("updateSchedule")
      ) {
        return scheduleResponse;
      }
      return baseFetch(input, init) as unknown as Promise<Response>;
    }) as unknown as typeof fetch;
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(
      screen.getByRole("button", { name: /Thu, Apr 2 09:00 · 2\/2 available/i }),
    );
    const fixedDateAction = screen.getByRole("button", {
      name: "Set fixed date and close event",
    });
    expect(fixedDateAction).toBeEnabled();

    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));
    await waitFor(() => expect(fixedDateAction).toBeDisabled());

    resolveSchedule({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
    await waitFor(() => expect(fixedDateAction).toBeEnabled());
  });

  it("ignores an older schedule refresh that resolves after a newer one", async () => {
    const eventSource = installEventSourceCapture();
    const view = createManageView();
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    global.fetch = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse) as unknown as typeof fetch;

    renderWithI18n(<ManageEventClient initialView={view} />);
    eventSource.emit("event-update");
    eventSource.emit("event-update");

    resolveSecond({
      ok: true,
      json: async () => ({
        snapshot: {
          ...view.snapshot,
          dayEndMinutes: 12 * 60,
        },
      }),
    } as Response);
    expect(await screen.findByRole("combobox", { name: "Daily end" })).toHaveTextContent("12:00");

    resolveFirst({
      ok: true,
      json: async () => ({
        snapshot: {
          ...view.snapshot,
          dayEndMinutes: 11 * 60 + 30,
        },
      }),
    } as Response);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Daily end" })).toHaveTextContent("12:00"),
    );
  });

  it("applies a valid schedule refresh when a later refresh fails", async () => {
    const eventSource = installEventSourceCapture();
    const view = createManageView();
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({ ok: false } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(<ManageEventClient initialView={view} />);
    eventSource.emit("event-update");
    eventSource.emit("event-update");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    resolveFirst({
      ok: true,
      json: async () => ({
        snapshot: {
          ...view.snapshot,
          status: "CLOSED",
        },
      }),
    } as Response);

    await waitFor(() => expect(screen.getAllByText("Closed").length).toBeGreaterThan(0));
  });

  it("applies a later valid schedule refresh after an earlier refresh was applied", async () => {
    const eventSource = installEventSourceCapture();
    const view = createManageView();
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(secondResponse)
      .mockResolvedValue({ ok: false } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithI18n(<ManageEventClient initialView={view} />);
    eventSource.emit("event-update");
    eventSource.emit("event-update");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    resolveFirst({
      ok: true,
      json: async () => ({
        snapshot: {
          ...view.snapshot,
          dayEndMinutes: 11 * 60 + 30,
        },
      }),
    } as Response);
    expect(await screen.findByRole("combobox", { name: "Daily end" })).toHaveTextContent("11:30");

    resolveSecond({
      ok: true,
      json: async () => ({
        snapshot: {
          ...view.snapshot,
          status: "CLOSED",
        },
      }),
    } as Response);

    await waitFor(() => expect(screen.getAllByText("Closed").length).toBeGreaterThan(0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not let an older refresh overwrite a local participant rename", async () => {
    const eventSource = installEventSourceCapture();
    const view = createManageView();
    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    let eventRefreshCount = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === `/api/events/${view.snapshot.slug}`) {
        eventRefreshCount += 1;
        return eventRefreshCount === 1
          ? refreshResponse
          : Promise.resolve({ ok: false } as Response);
      }

      if (String(input) === `/api/manage/${view.manageKey}` && init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        } as Response);
      }

      throw new Error(`Unhandled fetch call: ${String(input)}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    eventSource.emit("event-update");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const participantInput = screen.getByDisplayValue("Felix");
    await user.clear(participantInput);
    await user.type(participantInput, "Felix Updated");
    await user.tab();
    await waitFor(() => expect(screen.getByText("Felix Updated")).toBeInTheDocument());

    resolveRefresh({
      ok: true,
      json: async () => ({ snapshot: view.snapshot }),
    } as Response);

    await waitFor(() => expect(eventRefreshCount).toBe(2));
    expect(screen.getByText("Felix Updated")).toBeInTheDocument();
  });

  it("preserves a dirty draft while another organizer closes and reopens the event", async () => {
    const eventSource = installEventSourceCapture();
    const view = createManageView();
    const fetchMock = installManageFetchMock(view);
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));

    fetchMock.setCurrentSnapshot({ ...view.snapshot, status: "CLOSED" });
    eventSource.emit("event-update");
    await waitFor(() => expect(screen.queryByText("Dates & times")).not.toBeInTheDocument());

    fetchMock.setCurrentSnapshot({ ...view.snapshot, status: "OPEN" });
    eventSource.emit("event-update");
    expect(await screen.findByRole("combobox", { name: "Daily end" })).toHaveTextContent("11:30");
  });

  it("includes legacy orphaned votes in an additive schedule confirmation", async () => {
    const view = createManageView();
    view.snapshot.participants = view.snapshot.participants.map((participant) =>
      participant.id === "participant_1"
        ? { ...participant, selectedSlotCount: participant.selectedSlotCount + 1 }
        : participant,
    );
    const fetchMock = installManageFetchMock(view);
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));

    expect(await screen.findByText(/1 availability mark across 1 participant/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete and save" }));

    await waitFor(() => {
      const scheduleCall = fetchMock.mock.calls.find(([, init]) =>
        String((init as RequestInit | undefined)?.body).includes("updateSchedule"),
      );
      const body = JSON.parse(String((scheduleCall?.[1] as RequestInit).body));
      expect(body).toMatchObject({
        expectedDeletedVotes: 1,
        expectedAffectedParticipants: 1,
      });
    });
  });

  it("refreshes after a malformed successful schedule response", async () => {
    const view = createManageView();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return {
          ok: true,
          json: async () => {
            throw new Error("invalid json");
          },
        };
      }

      expect(String(input)).toBe(`/api/events/${view.snapshot.slug}`);
      return {
        ok: true,
        json: async () => ({ snapshot: view.snapshot }),
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(mockedToastError).toHaveBeenCalledWith("Unable to update event.");
  });

  it("does not drop a participant rename while a schedule request is pending", async () => {
    const view = createManageView();
    const baseFetch = installManageFetchMock(view);
    let resolveSchedule!: (response: Response) => void;
    const scheduleResponse = new Promise<Response>((resolve) => {
      resolveSchedule = resolve;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(init?.body).includes("updateSchedule")) {
        return scheduleResponse;
      }
      return baseFetch(input, init) as unknown as Promise<Response>;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    renderWithI18n(<ManageEventClient initialView={view} />);
    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "11:30" }));
    await user.click(screen.getByRole("button", { name: "Save dates & times" }));

    const participantInput = screen.getByDisplayValue("Felix");
    await user.clear(participantInput);
    await user.type(participantInput, "Felix Updated");
    await user.tab();

    await waitFor(() =>
      expect(
        baseFetch.mock.calls.some(([, init]) =>
          String((init as RequestInit | undefined)?.body).includes("renameParticipant"),
        ),
      ).toBe(true),
    );

    resolveSchedule({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save dates & times" })).toBeEnabled(),
    );
  });
});
