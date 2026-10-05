import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readStoredViewerTimezone,
  resolveViewerTimezone,
  setStoredViewerTimezone,
  useViewerTimezone,
} from "./viewer-timezone";

const getViewerTimezone = vi.hoisted(() => vi.fn(() => "America/New_York"));

vi.mock("@/lib/availability", () => ({ getViewerTimezone }));

const supportedTimezones = ["Europe/Vienna", "America/New_York", "UTC"];

describe("viewer timezone helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStoredViewerTimezone(null);
    getViewerTimezone.mockReturnValue("America/New_York");
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

  it("updates the browser timezone when supported options change", () => {
    const { result, rerender } = renderHook(
      ({ options }) => useViewerTimezone("Europe/Vienna", options),
      { initialProps: { options: ["Europe/Vienna"] } },
    );
    expect(result.current.viewerTimezone).toBe("Europe/Vienna");

    rerender({ options: supportedTimezones });
    expect(result.current.viewerTimezone).toBe("America/New_York");

    act(() => result.current.setViewerTimezonePreference("UTC"));
    expect(result.current.viewerTimezone).toBe("UTC");
  });

  it("hydrates using the event timezone before applying the browser timezone", async () => {
    function TimezoneProbe() {
      const { viewerTimezone } = useViewerTimezone("Europe/Vienna", supportedTimezones);
      return createElement("span", null, viewerTimezone);
    }

    const container = document.createElement("div");
    container.innerHTML = renderToString(createElement(TimezoneProbe));
    expect(container.textContent).toBe("Europe/Vienna");
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;

    await act(async () => {
      root = hydrateRoot(container, createElement(TimezoneProbe), { onRecoverableError });
    });
    expect(container.textContent).toBe("America/New_York");
    expect(onRecoverableError).not.toHaveBeenCalled();

    act(() => root?.unmount());
  });
});
