import { beforeEach, describe, expect, it } from "vitest";

import {
  readStoredViewerTimezone,
  resolveViewerTimezone,
  setStoredViewerTimezone,
} from "./viewer-timezone";

const supportedTimezones = ["Europe/Vienna", "America/New_York", "UTC"];

describe("viewer timezone helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStoredViewerTimezone(null);
  });

  it("persists timezone overrides in browser storage", () => {
    expect(readStoredViewerTimezone()).toBeNull();

    setStoredViewerTimezone("America/New_York");

    expect(readStoredViewerTimezone()).toBe("America/New_York");

    setStoredViewerTimezone(null);

    expect(readStoredViewerTimezone()).toBeNull();
  });

  it("uses the detected browser timezone when no override is stored", () => {
    expect(
      resolveViewerTimezone({
        detectedTimezone: "America/New_York",
        eventTimezone: "Europe/Vienna",
        storedTimezone: null,
        supportedTimezones,
      }),
    ).toBe("America/New_York");
  });

  it("falls back to the detected timezone when a stored override is invalid", () => {
    expect(
      resolveViewerTimezone({
        detectedTimezone: "America/New_York",
        eventTimezone: "Europe/Vienna",
        storedTimezone: "Mars/Phobos",
        supportedTimezones,
      }),
    ).toBe("America/New_York");
  });

  it("falls back to the event timezone when neither override nor detected timezone is usable", () => {
    expect(
      resolveViewerTimezone({
        detectedTimezone: "Mars/Phobos",
        eventTimezone: "Europe/Vienna",
        storedTimezone: null,
        supportedTimezones,
      }),
    ).toBe("Europe/Vienna");
  });
});
