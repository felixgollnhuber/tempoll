"use client";

import { useEffect } from "react";

import { saveRecentEvent } from "@/lib/recent-events";

type RecentEventTrackerProps = {
  slug: string;
  title: string;
  publicUrl?: string;
  manageUrl?: string;
};

export function RecentEventTracker({
  slug,
  title,
  publicUrl,
  manageUrl,
}: RecentEventTrackerProps) {
  useEffect(() => {
    saveRecentEvent({
      slug,
      title,
      publicUrl,
      manageUrl,
      viewedAt: new Date().toISOString(),
    });
  }, [manageUrl, publicUrl, slug, title]);

  return null;
}
