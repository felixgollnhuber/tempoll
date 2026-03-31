"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { getViewerTimezone } from "@/lib/availability";

const STORAGE_KEY = "tempoll_viewer_timezone";
const VIEWER_TIMEZONE_UPDATED_EVENT = "tempoll:viewer-timezone-updated";

export const AUTOMATIC_TIMEZONE_VALUE = "__automatic__";

let cachedRawViewerTimezone: string | null | undefined;
let cachedViewerTimezone: string | null = null;

export function normalizeViewerTimezone(
  timezone: string | null | undefined,
  supportedTimezones?: readonly string[],
) {
  if (!timezone) {
    return null;
  }

  const normalizedTimezone = timezone.trim();
  if (!normalizedTimezone) {
    return null;
  }

  if (supportedTimezones && supportedTimezones.length > 0 && !supportedTimezones.includes(normalizedTimezone)) {
    return null;
  }

  return normalizedTimezone;
}

export function readStoredViewerTimezone() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawViewerTimezone = window.localStorage.getItem(STORAGE_KEY);
    if (rawViewerTimezone === cachedRawViewerTimezone) {
      return cachedViewerTimezone;
    }

    const nextViewerTimezone = normalizeViewerTimezone(rawViewerTimezone);
    cachedRawViewerTimezone = rawViewerTimezone;
    cachedViewerTimezone = nextViewerTimezone;
    return nextViewerTimezone;
  } catch {
    cachedRawViewerTimezone = null;
    cachedViewerTimezone = null;
    return null;
  }
}

export function setStoredViewerTimezone(timezone: string | null) {
  if (typeof window === "undefined") {
    return null;
  }

  const nextViewerTimezone = normalizeViewerTimezone(timezone);
  cachedRawViewerTimezone = nextViewerTimezone;
  cachedViewerTimezone = nextViewerTimezone;

  if (nextViewerTimezone) {
    window.localStorage.setItem(STORAGE_KEY, nextViewerTimezone);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  window.dispatchEvent(new Event(VIEWER_TIMEZONE_UPDATED_EVENT));
  return nextViewerTimezone;
}

export function subscribeViewerTimezone(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(VIEWER_TIMEZONE_UPDATED_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(VIEWER_TIMEZONE_UPDATED_EVENT, handleChange);
  };
}

export function getViewerTimezoneServerSnapshot() {
  return null;
}

export function resolveViewerTimezone({
  detectedTimezone,
  eventTimezone,
  storedTimezone,
  supportedTimezones,
}: {
  detectedTimezone?: string | null;
  eventTimezone: string;
  storedTimezone?: string | null;
  supportedTimezones?: readonly string[];
}) {
  return (
    normalizeViewerTimezone(storedTimezone, supportedTimezones) ??
    normalizeViewerTimezone(detectedTimezone, supportedTimezones) ??
    eventTimezone
  );
}

export function useViewerTimezone(eventTimezone: string, supportedTimezones: readonly string[]) {
  const storedViewerTimezone = useSyncExternalStore(
    subscribeViewerTimezone,
    readStoredViewerTimezone,
    getViewerTimezoneServerSnapshot,
  );
  const [detectedViewerTimezone, setDetectedViewerTimezone] = useState<string | null>(null);

  useEffect(() => {
    setDetectedViewerTimezone(normalizeViewerTimezone(getViewerTimezone(), supportedTimezones));
  }, [supportedTimezones]);

  const viewerTimezone = resolveViewerTimezone({
    detectedTimezone: detectedViewerTimezone,
    eventTimezone,
    storedTimezone: storedViewerTimezone,
    supportedTimezones,
  });
  const viewerTimezoneOverride = normalizeViewerTimezone(
    storedViewerTimezone,
    supportedTimezones,
  );
  const viewerTimezoneSelectValue = viewerTimezoneOverride ?? AUTOMATIC_TIMEZONE_VALUE;

  const setViewerTimezonePreference = useCallback((nextValue: string) => {
    setStoredViewerTimezone(nextValue === AUTOMATIC_TIMEZONE_VALUE ? null : nextValue);
  }, []);

  return {
    viewerTimezone,
    viewerTimezoneOverride,
    viewerTimezoneSelectValue,
    setViewerTimezonePreference,
  };
}
