import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicEventClient } from "./public-event-client";
import type { PublicEventSnapshot } from "@/lib/types";

function createSnapshot(options?: {
  status?: PublicEventSnapshot["status"];
  withCurrentUser?: boolean;
}): PublicEventSnapshot {
  const status = options?.status ?? "OPEN";
  const withCurrentUser = options?.withCurrentUser ?? true;

  return {
    id: "event_1",
    slug: "test-event",
    title: "Test Event",
    timezone: "Europe/Vienna",
    status,
    slotMinutes: 30,
    meetingDurationMinutes: 60,
    dayStartMinutes: 9 * 60,
    dayEndMinutes: 10 * 60,
    dates: [
      { dateKey: "2026-03-30", label: "Mon, Mar 30" },
      { dateKey: "2026-03-31", label: "Tue, Mar 31" },
    ],
    timeRows: [
      { minutes: 9 * 60, label: "09:00" },
      { minutes: 9 * 60 + 30, label: "09:30" },
    ],
    slots: [
      {
        slotStart: "2026-03-30T07:00:00.000Z",
        dateKey: "2026-03-30",
        minutes: 9 * 60,
        availabilityCount: 2,
        participantIds: ["p1", "p2"],
        selectedByCurrentUser: withCurrentUser,
      },
      {
        slotStart: "2026-03-31T07:00:00.000Z",
        dateKey: "2026-03-31",
        minutes: 9 * 60,
        availabilityCount: 2,
        participantIds: ["p2", "p3"],
        selectedByCurrentUser: false,
      },
      {
        slotStart: "2026-03-30T07:30:00.000Z",
        dateKey: "2026-03-30",
        minutes: 9 * 60 + 30,
        availabilityCount: 1,
        participantIds: ["p2"],
        selectedByCurrentUser: false,
      },
      {
        slotStart: "2026-03-31T07:30:00.000Z",
        dateKey: "2026-03-31",
        minutes: 9 * 60 + 30,
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
        selectedSlotCount: withCurrentUser ? 1 : 0,
        isCurrentUser: withCurrentUser,
      },
      {
        id: "p2",
        displayName: "Gabriel",
        color: "#22b8a0",
        selectedSlotCount: 2,
        isCurrentUser: false,
      },
      {
        id: "p3",
        displayName: "Nora",
        color: "#6b8afd",
        selectedSlotCount: 1,
        isCurrentUser: false,
      },
      {
        id: "p4",
        displayName: "Sam",
        color: "#a36cf7",
        selectedSlotCount: 0,
        isCurrentUser: false,
      },
    ],
    suggestions: [],
    currentParticipant: withCurrentUser
      ? {
          id: "p1",
          displayName: "Felix",
          color: "#ef7f3b",
          selectedSlotCount: 1,
          isCurrentUser: true,
        }
      : null,
  };
}

describe("PublicEventClient", () => {
  it("keeps the heatmap visible in edit mode while marking the current user's slots", () => {
    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
          editToken: "secret",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");

    const cell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 2\/4 available/i,
    });

    expect(cell).toHaveAttribute("data-current-user-selected", "true");
    expect(cell.className).toContain("bg-primary/24");
    expect(screen.queryByText("Slot details")).not.toBeInTheDocument();
  });

  it("switches to view mode and shows available plus unavailable participants for a slot", () => {
    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
          editToken: "secret",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    const cell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 2\/4 available/i,
    });
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
    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
          editToken: "secret",
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
    expect(availableCell).toHaveAttribute("data-highlighted-participant-availability", "true");
    expect(unavailableCell).not.toHaveAttribute("data-highlighted-participant-availability");
    expect(availableCell.getAttribute("style")).toContain("linear-gradient");

    fireEvent.click(participantButton);

    expect(participantButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Gabriel highlighted")).not.toBeInTheDocument();
    expect(availableCell).not.toHaveAttribute("data-highlighted-participant-availability");
  });

  it("keeps edit interactions on the grid and does not open slot details while painting", () => {
    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot()}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
          editToken: "secret",
        }}
      />,
    );

    const firstCell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:30 · 1\/4 available/i,
    });
    const secondCell = screen.getByRole("button", {
      name: /Tue, Mar 31 09:30 · nobody available/i,
    });

    fireEvent.pointerDown(firstCell);
    fireEvent.pointerEnter(secondCell);

    expect(firstCell).toHaveAttribute("aria-pressed", "true");
    expect(secondCell).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Slot details")).not.toBeInTheDocument();
  });

  it("stays in view mode when there is no editable session", () => {
    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ withCurrentUser: false })}
        initialSession={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Click any slot to see who is available and who is not\./i)).toBeInTheDocument();
  });

  it("stays in view mode when the event is closed", () => {
    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ status: "CLOSED" })}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
          editToken: "secret",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "true");
  });
});
