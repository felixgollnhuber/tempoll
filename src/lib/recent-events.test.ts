import { describe, expect, it } from "vitest";

import { mergeRecentEvents, type RecentEventEntry } from "./recent-events";

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
});
