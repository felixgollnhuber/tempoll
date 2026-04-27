import "server-only";

import type { RecentEventEntry } from "@/lib/recent-events";

const DEV_SEED_RECENT_EVENTS: RecentEventEntry[] = [
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

export function getDevSeedRecentEvents() {
  return DEV_SEED_RECENT_EVENTS;
}
