import { afterEach, describe, expect, it, vi } from "vitest";

const originalWebsiteId = process.env.DATAFAST_WEBSITE_ID;
const originalDomain = process.env.DATAFAST_DOMAIN;

async function loadConfig() {
  vi.resetModules();
  const { datafastConfig } = await import("./datafast");
  return datafastConfig;
}

describe("datafast config", () => {
  afterEach(() => {
    if (originalWebsiteId === undefined) {
      delete process.env.DATAFAST_WEBSITE_ID;
    } else {
      process.env.DATAFAST_WEBSITE_ID = originalWebsiteId;
    }

    if (originalDomain === undefined) {
      delete process.env.DATAFAST_DOMAIN;
    } else {
      process.env.DATAFAST_DOMAIN = originalDomain;
    }
  });

  it("enables tracking when website id and domain are configured", async () => {
    process.env.DATAFAST_WEBSITE_ID = "dfid_abc123";
    process.env.DATAFAST_DOMAIN = "tempoll.app";

    const config = await loadConfig();

    expect(config.enabled).toBe(true);
    expect(config.websiteId).toBe("dfid_abc123");
    expect(config.domain).toBe("tempoll.app");
    expect(config.scriptSrc).toBe("https://datafa.st/js/script.cookieless.js");
    expect(config.apiProxyPath).toBe("/api/datafast/events");
  });

  it("disables tracking when website id is missing", async () => {
    delete process.env.DATAFAST_WEBSITE_ID;
    process.env.DATAFAST_DOMAIN = "tempoll.app";

    const config = await loadConfig();

    expect(config.enabled).toBe(false);
    expect(config.websiteId).toBeUndefined();
    expect(config.domain).toBe("tempoll.app");
  });

  it("disables tracking when domain is missing", async () => {
    process.env.DATAFAST_WEBSITE_ID = "dfid_abc123";
    delete process.env.DATAFAST_DOMAIN;

    const config = await loadConfig();

    expect(config.enabled).toBe(false);
    expect(config.websiteId).toBe("dfid_abc123");
    expect(config.domain).toBeUndefined();
  });

  it("trims configured values", async () => {
    process.env.DATAFAST_WEBSITE_ID = "  dfid_abc123  ";
    process.env.DATAFAST_DOMAIN = "  tempoll.app  ";

    const config = await loadConfig();

    expect(config.enabled).toBe(true);
    expect(config.websiteId).toBe("dfid_abc123");
    expect(config.domain).toBe("tempoll.app");
  });
});
