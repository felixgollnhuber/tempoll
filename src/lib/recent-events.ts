export type RecentEventEntry = {
  slug: string;
  title: string;
  lastViewedAt: string;
  publicUrl?: string;
  manageUrl?: string;
  lastViewedPublicAt?: string;
  lastViewedManageAt?: string;
};

export type DisplayRecentEventEntry = RecentEventEntry & {
  devSeed: boolean;
  devOnly: boolean;
};

export type RecentEventUpdate = {
  slug: string;
  title: string;
  viewedAt: string;
  publicUrl?: string;
  manageUrl?: string;
};

const STORAGE_KEY = "tempoll_recent_events";
const MAX_RECENT_EVENTS = 20;
const RECENT_EVENTS_UPDATED_EVENT = "tempoll:recent-events-updated";
const EMPTY_RECENT_EVENTS: RecentEventEntry[] = [];
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

let cachedRawRecentEvents: string | null | undefined;
let cachedRecentEvents: RecentEventEntry[] = EMPTY_RECENT_EVENTS;

function sortRecentEvents(entries: RecentEventEntry[]) {
  return [...entries]
    .sort((left, right) => right.lastViewedAt.localeCompare(left.lastViewedAt))
    .slice(0, MAX_RECENT_EVENTS);
}

function updateRecentEventsCache(entries: RecentEventEntry[]) {
  cachedRecentEvents = sortRecentEvents(entries);
  cachedRawRecentEvents =
    cachedRecentEvents.length > 0 ? JSON.stringify(cachedRecentEvents) : null;
  return cachedRecentEvents;
}

export function mergeRecentEvents(
  existingEntries: RecentEventEntry[],
  update: RecentEventUpdate,
) {
  const existing = existingEntries.find((entry) => entry.slug === update.slug);
  const merged: RecentEventEntry = {
    slug: update.slug,
    title: update.title || existing?.title || update.slug,
    lastViewedAt: update.viewedAt,
    publicUrl: update.publicUrl ?? existing?.publicUrl,
    manageUrl: update.manageUrl ?? existing?.manageUrl,
    lastViewedPublicAt: update.publicUrl
      ? update.viewedAt
      : existing?.lastViewedPublicAt,
    lastViewedManageAt: update.manageUrl
      ? update.viewedAt
      : existing?.lastViewedManageAt,
  };

  const remaining = existingEntries.filter((entry) => entry.slug !== update.slug);
  return sortRecentEvents([merged, ...remaining]);
}

export function mergeDevSeedRecentEvents(
  userEntries: RecentEventEntry[],
  devModeEnabled: boolean,
): DisplayRecentEventEntry[] {
  const devSeedSlugs = new Set(DEV_SEED_RECENT_EVENTS.map((entry) => entry.slug));
  const userDisplayEntries = userEntries.map((entry) => ({
    ...entry,
    devSeed: devModeEnabled && devSeedSlugs.has(entry.slug),
    devOnly: false,
  }));

  if (!devModeEnabled) {
    return userDisplayEntries;
  }

  const userSlugs = new Set(userEntries.map((entry) => entry.slug));
  const devOnlyEntries = DEV_SEED_RECENT_EVENTS.filter((entry) => !userSlugs.has(entry.slug)).map(
    (entry) => ({
      ...entry,
      devSeed: true,
      devOnly: true,
    }),
  );

  return sortRecentEvents([...userDisplayEntries, ...devOnlyEntries]).map((entry) => ({
    ...entry,
    devSeed: devSeedSlugs.has(entry.slug),
    devOnly: devOnlyEntries.some((devEntry) => devEntry.slug === entry.slug),
  }));
}

export function readRecentEvents() {
  if (typeof window === "undefined") {
    return EMPTY_RECENT_EVENTS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawRecentEvents) {
      return cachedRecentEvents;
    }

    if (!raw) {
      cachedRawRecentEvents = null;
      cachedRecentEvents = EMPTY_RECENT_EVENTS;
      return cachedRecentEvents;
    }

    const parsed = JSON.parse(raw) as RecentEventEntry[];
    cachedRawRecentEvents = raw;
    cachedRecentEvents = sortRecentEvents(parsed);
    return cachedRecentEvents;
  } catch {
    cachedRawRecentEvents = null;
    cachedRecentEvents = EMPTY_RECENT_EVENTS;
    return cachedRecentEvents;
  }
}

function writeRecentEvents(entries: RecentEventEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  updateRecentEventsCache(entries);

  if (cachedRawRecentEvents) {
    window.localStorage.setItem(STORAGE_KEY, cachedRawRecentEvents);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  window.dispatchEvent(new Event(RECENT_EVENTS_UPDATED_EVENT));
}

export function subscribeRecentEvents(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(RECENT_EVENTS_UPDATED_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(RECENT_EVENTS_UPDATED_EVENT, handleChange);
  };
}

export function getRecentEventsServerSnapshot() {
  return EMPTY_RECENT_EVENTS;
}

export function saveRecentEvent(update: RecentEventUpdate) {
  const nextEntries = mergeRecentEvents(readRecentEvents(), update);
  writeRecentEvents(nextEntries);
  return nextEntries;
}

export function removeRecentEvent(slug: string) {
  const nextEntries = readRecentEvents().filter((entry) => entry.slug !== slug);
  writeRecentEvents(nextEntries);
  return nextEntries;
}

export function clearRecentEvents() {
  if (typeof window === "undefined") {
    return EMPTY_RECENT_EVENTS;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  cachedRawRecentEvents = null;
  cachedRecentEvents = EMPTY_RECENT_EVENTS;
  window.dispatchEvent(new Event(RECENT_EVENTS_UPDATED_EVENT));
  return cachedRecentEvents;
}
