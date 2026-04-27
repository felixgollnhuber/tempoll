import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildFinalizedSlot } from "@/lib/availability";
import type { ManageEventView, PublicEventSnapshot } from "@/lib/types";
import { renderWithI18n } from "@/test/render-with-i18n";
import { ManageEventClient } from "./manage-event-client";

const mockedGetViewerTimezone = vi.hoisted(() => vi.fn(() => "Europe/Vienna"));
const defaultTimezones = ["Europe/Vienna", "America/New_York", "UTC"];

vi.mock("@/lib/availability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/availability")>();

  return {
    ...actual,
    getViewerTimezone: mockedGetViewerTimezone,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
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
        | { action: "updateNotificationEmail"; notificationEmail?: string };

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
      }

      return {
        ok: true,
        json: async () => ({ ok: true, notification: currentNotification }),
      };
    }

    throw new Error(`Unhandled fetch call: ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetViewerTimezone.mockReturnValue("Europe/Vienna");
  window.localStorage.clear();
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
});
