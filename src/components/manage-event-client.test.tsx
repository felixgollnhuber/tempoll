import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildFinalizedSlot } from "@/lib/availability";
import type { ManageEventView, PublicEventSnapshot } from "@/lib/types";
import { renderWithI18n } from "@/test/render-with-i18n";
import { ManageEventClient } from "./manage-event-client";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function createManageView(options?: {
  status?: "OPEN" | "CLOSED";
  finalizedSlot?: ManageEventView["snapshot"]["finalizedSlot"];
}): ManageEventView {
  const status = options?.status ?? "OPEN";
  const finalizedSlot = options?.finalizedSlot ?? null;

  return {
    manageKey: "cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    shareUrl: "https://tempoll.app/e/test-event-xeqlxw",
    manageUrl:
      "https://tempoll.app/manage/cmn8tbq86000001pbddo4sxf.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    snapshot: {
      id: "event_1",
      slug: "test-event-xeqlxw",
      title: "Team sync",
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

function installManageFetchMock(view: ManageEventView) {
  let currentSnapshot = structuredClone(view.snapshot) as PublicEventSnapshot;
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
        | { action: "reopenEvent" };

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
      }

      return {
        ok: true,
        json: async () => ({ ok: true }),
      };
    }

    throw new Error(`Unhandled fetch call: ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof fetch;

  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ManageEventClient", () => {
  it("keeps long share links wrappable inside the sidebar cards", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    expect(screen.getByText(view.shareUrl).className).toContain("[overflow-wrap:anywhere]");
    expect(screen.getByText(view.manageUrl).className).toContain("[overflow-wrap:anywhere]");
  });

  it("places share links and the organizer sidebar stack before the heatmap in DOM order", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    const shareLinksHeading = screen.getByText("Share links");
    const bestWindowsHeading = screen.getByText("Best windows right now");
    const participantsHeading = screen.getByText("Participants");
    const availabilityHeading = screen.getByText("Availability");

    expect(screen.getAllByText("Participants")).toHaveLength(1);
    expect(
      shareLinksHeading.compareDocumentPosition(availabilityHeading) &
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

  it("renders the heatmap as a single content column when the embedded sidebar is disabled", () => {
    const view = createManageView();
    renderWithI18n(<ManageEventClient initialView={view} />);

    const heatmapLayout = document.querySelector('[data-slot="event-heatmap-layout"]');

    expect(heatmapLayout).not.toBeNull();
    expect(heatmapLayout).toHaveClass("grid-cols-1");
    expect(heatmapLayout?.className).not.toContain("xl:grid-cols-[minmax(0,1fr)_250px]");
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
      const fixedDateCard = screen
        .getAllByText("Fixed date")
        .find((element) => element.closest("[data-slot='card']"))
        ?.closest("[data-slot='card']");

      expect(fixedDateCard).not.toBeNull();
      expect(
        within(fixedDateCard as HTMLElement).getByText(/Thu, Apr 2.*09:30.*10:30/i),
      ).toBeInTheDocument();
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

    expect(screen.getAllByText("Fixed date").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Add to calendar (.ics)" })).toHaveAttribute(
      "href",
      "/api/events/test-event-xeqlxw/ics",
    );
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
    expect(
      screen.getByRole("button", {
        name: /Thu, Apr 2 09:00 · 2\/2 available/i,
      }),
    ).toHaveAttribute("data-highlighted-participant-availability", "true");
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
