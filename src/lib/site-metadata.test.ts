import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n/messages";
import { buildDefaultMetadata } from "@/lib/site-metadata";

describe("buildDefaultMetadata", () => {
  it("sets product-focused social defaults and a metadata base", () => {
    const metadata = buildDefaultMetadata(getMessages("en"));

    expect(metadata.metadataBase?.toString()).toBe("http://localhost:3000/");
    expect(metadata.description).toContain("Free scheduling");
    expect(metadata.openGraph).toMatchObject({
      title: "tempoll | Free scheduling without accounts",
      description: expect.stringContaining("just a name"),
      siteName: "tempoll",
    });
    expect(metadata.openGraph?.images).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/opengraph-image" })]),
    );
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "tempoll | Free scheduling without accounts",
    });
    expect(metadata.twitter?.images).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/twitter-image" })]),
    );
  });
});
