import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatMessage } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";

const getServerI18n = vi.fn();
const getManageEventView = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound,
}));

vi.mock("@/lib/i18n/server", () => ({
  getServerI18n,
}));

vi.mock("@/lib/event-service", () => ({
  getManageEventView,
}));

vi.mock("@/components/manage-event-client", () => ({
  ManageEventClient: () => null,
}));

vi.mock("@/components/recent-event-tracker", () => ({
  RecentEventTracker: () => null,
}));

describe("Manage page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getServerI18n.mockResolvedValue({
      locale: "en",
      messages: getMessages("en"),
      format: formatMessage,
    });
    getManageEventView.mockResolvedValue({
      snapshot: {
        title: "Quarterly planning",
      },
    });
  });

  it("keeps private organizer links generic and noindex", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata({
      params: Promise.resolve({
        token: "private-token",
      }),
    });

    expect(metadata.title).toBe("Private organizer page");
    expect(metadata.description).toBe(
      "This is a private tempoll organizer link. Keep it safe and do not share it publicly.",
    );
    expect(metadata.openGraph?.title).toBe("Private organizer page · tempoll");
    expect(metadata.description).not.toContain("Quarterly planning");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      noimageindex: true,
    });
  });
});
