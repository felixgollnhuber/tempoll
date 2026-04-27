import { describe, expect, it } from "vitest";

import {
  mergeDevSeedRecentEvents,
  mergeRecentEvents,
  type RecentEventEntry,
} from "./recent-events";

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

describe("recent event helpers", () => {
  it("merges public and organizer visits into a single slug entry", () => {
    const initial: RecentEventEntry[] = [
      {
        slug: "design-review",
        title: "Design review",
        lastViewedAt: "2026-03-24T10:00:00.000Z",
        publicUrl: "/e/design-review",
        lastViewedPublicAt: "2026-03-24T10:00:00.000Z",
      },
    ];

    const merged = mergeRecentEvents(initial, {
      slug: "design-review",
      title: "Design review",
      manageUrl: "/manage/abc123",
      viewedAt: "2026-03-25T09:30:00.000Z",
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      slug: "design-review",
      publicUrl: "/e/design-review",
      manageUrl: "/manage/abc123",
      lastViewedAt: "2026-03-25T09:30:00.000Z",
      lastViewedPublicAt: "2026-03-24T10:00:00.000Z",
      lastViewedManageAt: "2026-03-25T09:30:00.000Z",
    });
  });

  it("sorts entries by most recent activity", () => {
    const merged = mergeRecentEvents(
      [
        {
          slug: "alpha",
          title: "Alpha",
          lastViewedAt: "2026-03-20T08:00:00.000Z",
        },
      ],
      {
        slug: "beta",
        title: "Beta",
        publicUrl: "/e/beta",
        viewedAt: "2026-03-21T08:00:00.000Z",
      },
    );

    expect(merged.map((entry) => entry.slug)).toEqual(["beta", "alpha"]);
  });

  it("adds dev seed events only when dev mode is enabled", () => {
    expect(mergeDevSeedRecentEvents([], [])).toEqual([]);

    const merged = mergeDevSeedRecentEvents([], devSeedEntries);

    expect(merged.map((entry) => entry.slug)).toEqual([
      "dev-team-sync",
      "dev-product-planning",
      "dev-closed-review",
    ]);
    expect(merged.every((entry) => entry.devSeed)).toBe(true);
    expect(merged.every((entry) => entry.devOnly)).toBe(true);
  });

  it("keeps a locally saved dev seed entry marked as a dev seed", () => {
    const merged = mergeDevSeedRecentEvents(
      [
        {
          slug: "dev-team-sync",
          title: "Dev Team Sync",
          lastViewedAt: "2026-04-27T20:00:00.000Z",
          publicUrl: "/e/dev-team-sync",
        },
      ],
      devSeedEntries,
    );

    const savedSeed = merged.find((entry) => entry.slug === "dev-team-sync");

    expect(savedSeed).toMatchObject({
      manageUrl: "/manage/dev_team_sync.manage-dev-team-sync",
      devSeed: true,
      devOnly: false,
    });
  });

  it("does not let dev-only seeds evict real recent events", () => {
    const userEntries = Array.from({ length: 20 }, (_, index) => ({
      slug: `real-event-${index}`,
      title: `Real event ${index}`,
      lastViewedAt: `2026-04-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      publicUrl: `/e/real-event-${index}`,
    }));

    const merged = mergeDevSeedRecentEvents(userEntries, devSeedEntries);

    expect(merged).toHaveLength(23);
    expect(merged.filter((entry) => !entry.devSeed)).toHaveLength(20);
    expect(merged.slice(0, 20).every((entry) => !entry.devOnly)).toBe(true);
    expect(merged.slice(20).every((entry) => entry.devOnly)).toBe(true);
  });
});
