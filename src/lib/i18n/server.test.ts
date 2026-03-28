import { describe, expect, it } from "vitest";

import { resolveLocale } from "@/lib/i18n/server";

describe("resolveLocale", () => {
  it("prefers the locale cookie over Accept-Language", () => {
    expect(
      resolveLocale({
        cookieLocale: "en",
        acceptLanguage: "de-AT,de;q=0.9,en;q=0.8",
        defaultLocale: "de",
      }),
    ).toBe("en");
  });

  it("normalizes German browser locales", () => {
    expect(
      resolveLocale({
        acceptLanguage: "de-AT,de;q=0.9,en;q=0.8",
        defaultLocale: "en",
      }),
    ).toBe("de");
  });

  it("normalizes English browser locales", () => {
    expect(
      resolveLocale({
        acceptLanguage: "en-US,en;q=0.9,de;q=0.8",
        defaultLocale: "de",
      }),
    ).toBe("en");
  });

  it("falls back to the configured default locale for unsupported languages", () => {
    expect(
      resolveLocale({
        acceptLanguage: "fr-FR,fr;q=0.9",
        defaultLocale: "de",
      }),
    ).toBe("de");
  });
});
