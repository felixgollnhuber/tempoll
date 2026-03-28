import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { RecentEventsSection } from "./recent-events-section";
import { renderWithI18n } from "@/test/render-with-i18n";

describe("RecentEventsSection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses clear labels for the board and organizer actions", () => {
    window.localStorage.setItem(
      "tempoll_recent_events",
      JSON.stringify([
        {
          slug: "test-event",
          title: "Test event",
          lastViewedAt: "2026-03-28T20:35:00.000Z",
          publicUrl: "/e/test-event",
          manageUrl: "/manage/test-token",
        },
      ]),
    );

    renderWithI18n(<RecentEventsSection />, { locale: "de" });

    expect(screen.getByRole("link", { name: "Board öffnen" })).toHaveAttribute(
      "href",
      "/e/test-event",
    );
    expect(screen.getByRole("link", { name: "Event verwalten" })).toHaveAttribute(
      "href",
      "/manage/test-token",
    );
  });
});
