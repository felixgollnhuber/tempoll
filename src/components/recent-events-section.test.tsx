import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { RecentEventsSection } from "./recent-events-section";
import type { RecentEventEntry } from "@/lib/recent-events";
import { renderWithI18n } from "@/test/render-with-i18n";

const devSeedEntries: RecentEventEntry[] = [
  {
    slug: "dev-team-sync",
    title: "Dev Team Sync",
    lastViewedAt: "2026-04-27T12:00:00.000Z",
    publicUrl: "/e/dev-team-sync",
    manageUrl: "/manage/dev_team_sync.manage-dev-team-sync",
    lastViewedPublicAt: "2026-04-27T12:00:00.000Z",
    lastViewedManageAt: "2026-04-27T12:00:00.000Z",
  },
  {
    slug: "dev-product-planning",
    title: "Product Planning",
    lastViewedAt: "2026-04-27T11:59:00.000Z",
    publicUrl: "/e/dev-product-planning",
    manageUrl: "/manage/dev_product_planning.manage-dev-product-planning",
    lastViewedPublicAt: "2026-04-27T11:59:00.000Z",
    lastViewedManageAt: "2026-04-27T11:59:00.000Z",
  },
  {
    slug: "dev-closed-review",
    title: "Closed Design Review",
    lastViewedAt: "2026-04-27T11:58:00.000Z",
    publicUrl: "/e/dev-closed-review",
    manageUrl: "/manage/dev_closed_review.manage-dev-closed-review",
    lastViewedPublicAt: "2026-04-27T11:58:00.000Z",
    lastViewedManageAt: "2026-04-27T11:58:00.000Z",
  },
];

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

  it("shows seeded dev events when dev mode is enabled", () => {
    renderWithI18n(<RecentEventsSection devSeedEntries={devSeedEntries} />);

    expect(screen.getByText("Dev Team Sync")).toBeInTheDocument();
    expect(screen.getByText("Product Planning")).toBeInTheDocument();
    expect(screen.getByText("Closed Design Review")).toBeInTheDocument();
    expect(screen.getAllByText("Dev seed")).toHaveLength(3);
    expect(
      screen.getAllByText(
        "Shown because dev mode is enabled. It is not stored in your browser history.",
      ),
    ).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("keeps saved user events visually separate from dev seeds", () => {
    window.localStorage.setItem(
      "tempoll_recent_events",
      JSON.stringify([
        {
          slug: "real-event",
          title: "Real event",
          lastViewedAt: "2026-04-27T20:35:00.000Z",
          publicUrl: "/e/real-event",
        },
      ]),
    );

    renderWithI18n(<RecentEventsSection devSeedEntries={devSeedEntries} />);

    expect(screen.getByText("Real event")).toBeInTheDocument();
    expect(screen.getAllByText("Dev seed")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
  });
});
