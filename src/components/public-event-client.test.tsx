import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicEventClient } from "./public-event-client";
import type { PublicEventSnapshot } from "@/lib/types";

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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PublicEventClient", () => {
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

    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={null}
      />,
    );

    expect(screen.queryByText("Best matching windows")).not.toBeInTheDocument();
  });

  it("keeps the heatmap visible in edit mode while marking the current user's slots", () => {
    render(
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
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    const cell = screen.getByRole("button", {
      name: /Mon, Mar 30 09:00 · 2\/4 available/i,
    });

    expect(screen.queryByText("your availability")).not.toBeInTheDocument();
    expect(cell).not.toHaveAttribute("data-current-user-selected");
    expect(cell.className).not.toContain("outline-primary/85");

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

  it("shows day navigation when the date range overflows and moves the visible window one day at a time", async () => {
    setViewportWidth(240);

    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={createSnapshot({ dayCount: 5 })}
        initialSession={{
          participantId: "p1",
          displayName: "Felix",
        }}
      />,
    );

    expect(await screen.findByText("Mon, Mar 30 to Tue, Mar 31")).toBeInTheDocument();
    expect(await screen.findByText("Days 1 - 2 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show previous days" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Show next days" }));

    expect(await screen.findByText("Tue, Mar 31 to Wed, Apr 1")).toBeInTheDocument();
    expect(await screen.findByText("Days 2 - 3 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show previous days" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Show next days" }));
    fireEvent.click(screen.getByRole("button", { name: "Show next days" }));

    expect(await screen.findByText("Thu, Apr 2 to Fri, Apr 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show next days" })).toBeDisabled();
  });

  it("keeps edit interactions on the grid and does not open slot details while painting", () => {
    render(
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

    render(
      <PublicEventClient
        slug="test-event"
        initialSnapshot={snapshot}
        initialSession={null}
      />,
    );

    expect(screen.getByText("Fixed date")).toBeInTheDocument();
    expect(screen.queryByText("Best matching windows")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to calendar (.ics)" })).toHaveAttribute(
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
});
