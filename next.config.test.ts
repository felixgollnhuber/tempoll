import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("next config security headers", () => {
  it("applies no-store and no-referrer headers to manage pages and APIs", async () => {
    const headers = await nextConfig.headers?.();

    const managePageHeaders = headers?.find((entry) => entry.source === "/manage/:path*");
    const manageApiHeaders = headers?.find((entry) => entry.source === "/api/manage/:path*");

    expect(managePageHeaders?.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Cache-Control",
          value: "private, no-store, max-age=0, must-revalidate",
        }),
        expect.objectContaining({
          key: "Referrer-Policy",
          value: "no-referrer",
        }),
      ]),
    );

    expect(manageApiHeaders?.headers).toEqual(managePageHeaders?.headers);
  });
});
