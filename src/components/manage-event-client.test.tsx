import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManageEventClient } from "./manage-event-client";
import type { ManageEventView } from "@/lib/types";

function createManageView(): ManageEventView {
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
      status: "OPEN",
      slotMinutes: 30,
      meetingDurationMinutes: 60,
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 17 * 60,
      dates: [],
      timeRows: [],
      slots: [],
      participants: [
        {
          id: "participant_1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: 3,
          isCurrentUser: false,
        },
      ],
      suggestions: [
        {
          slotStart: "2026-04-02T11:30:00.000Z",
          slotEnd: "2026-04-02T12:30:00.000Z",
          dateKey: "2026-04-02",
          label: "Thu, Apr 2 · 13:30-14:30",
          localLabel: "Thu, Apr 2 · 13:30-14:30",
          availableCount: 3,
          participantIds: ["participant_1"],
        },
      ],
      currentParticipant: null,
    },
  };
}

describe("ManageEventClient", () => {
  it("keeps long share links wrappable inside the sidebar cards", () => {
    const view = createManageView();
    const { container } = render(<ManageEventClient initialView={view} />);

    const layout = container.firstElementChild;

    expect(layout?.className).toContain("xl:grid-cols-[minmax(0,1fr)_340px]");
    expect(screen.getByText(view.shareUrl).className).toContain("[overflow-wrap:anywhere]");
    expect(screen.getByText(view.manageUrl).className).toContain("[overflow-wrap:anywhere]");
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
