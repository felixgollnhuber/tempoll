import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatMessage } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";

const getServerI18n = vi.fn();
const getPublicEventSnapshot = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound,
}));

vi.mock("@/lib/i18n/server", () => ({
  getServerI18n,
}));

vi.mock("@/lib/event-service", () => ({
  getPublicEventSnapshot,
}));

vi.mock("@/components/public-event-client", () => ({
  PublicEventClient: () => null,
}));

vi.mock("@/components/recent-event-tracker", () => ({
  RecentEventTracker: () => null,
}));

describe("Event page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getServerI18n.mockResolvedValue({
      locale: "en",
      messages: getMessages("en"),
      format: formatMessage,
    });
    getPublicEventSnapshot.mockResolvedValue({
      snapshot: {
        title: "Thursday design review",
      },
      participant: null,
    });
  });

  it("combines the event title with the tempoll product message", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({
        slug: "design-review",
      }),
    });

    expect(getPublicEventSnapshot).toHaveBeenCalledWith("design-review", "en");
    expect(metadata.title).toBe("Thursday design review");
    expect(metadata.description).toBe(
      "Join Thursday design review on tempoll. Free to use, no account needed.",
    );
    expect(metadata.openGraph).toMatchObject({
      title: "Thursday design review · tempoll",
      description: "Join Thursday design review on tempoll. Free to use, no account needed.",
      url: "/e/design-review",
    });
    expect(metadata.twitter?.images).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/twitter-image" })]),
    );
  });
});
