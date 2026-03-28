import { beforeEach, describe, expect, it, vi } from "vitest";

import { formatMessage } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";

const getServerI18n = vi.fn();

vi.mock("@/lib/i18n/server", () => ({
  getServerI18n,
}));

describe("Home metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getServerI18n.mockResolvedValue({
      locale: "en",
      messages: getMessages("en"),
      format: formatMessage,
    });
  });

  it("keeps the home copy product-focused and free-to-use", async () => {
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Free scheduling");
    expect(metadata.description).toContain("Free scheduling");
    expect(metadata.description).toContain("just a name");
  });
});
