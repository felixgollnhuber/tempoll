import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManageEventClient } from "./manage-event-client";
import type { ManageEventView } from "@/lib/types";

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

describe("ManageEventClient", () => {
  it("keeps long share links wrappable inside the sidebar cards", () => {
    const view = createManageView();
    render(<ManageEventClient initialView={view} />);

    expect(screen.getByText(view.shareUrl).className).toContain("[overflow-wrap:anywhere]");
    expect(screen.getByText(view.manageUrl).className).toContain("[overflow-wrap:anywhere]");
  });

  it("places share links and the organizer sidebar stack before the heatmap in DOM order", () => {
    const view = createManageView();
    render(<ManageEventClient initialView={view} />);

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

  it("renders the heatmap and lets the organizer select a fixed date on closed events", () => {
    const view = createManageView({ status: "CLOSED" });
    render(<ManageEventClient initialView={view} />);

    expect(screen.getByText("Availability")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Thu, Apr 2 09:00 · 2\/2 available/i,
      }),
    );

    expect(
      screen.getByText("This slot fits the full 60-minute meeting."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set fixed date" }));

    expect(screen.getByText("Fixed date")).toBeInTheDocument();
    expect(screen.getByText(/Thu, Apr 2.*09:00.*10:00/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
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
    render(<ManageEventClient initialView={view} />);

    expect(screen.getByText("Fixed date")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to calendar (.ics)" })).toHaveAttribute(
      "href",
      "/api/events/test-event-xeqlxw/ics",
    );
  });

  it("combines participant management and highlighting in one sidebar card", () => {
    const view = createManageView();
    render(<ManageEventClient initialView={view} />);

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

    render(<ManageEventClient initialView={view} />);

    expect(screen.queryByText("Best windows right now")).not.toBeInTheDocument();
  });
});
