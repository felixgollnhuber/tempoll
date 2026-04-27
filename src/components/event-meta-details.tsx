"use client";

import { ExternalLinkIcon, MapPinIcon, VideoIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import type { PublicEventSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventMetaDetailsProps = {
  snapshot: Pick<PublicEventSnapshot, "location" | "isOnlineMeeting" | "meetingLink">;
  className?: string;
};

export function EventMetaDetails({ snapshot, className }: EventMetaDetailsProps) {
  const { messages } = useI18n();

  const location = snapshot.isOnlineMeeting ? null : snapshot.location;

  if (!location && !snapshot.isOnlineMeeting) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {location ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{location}</span>
        </span>
      ) : null}
      {snapshot.isOnlineMeeting ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <VideoIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{messages.publicEvent.onlineMeeting}</span>
        </span>
      ) : null}
      {snapshot.isOnlineMeeting && snapshot.meetingLink ? (
        <a
          href={snapshot.meetingLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{messages.publicEvent.meetingLink}</span>
        </a>
      ) : null}
    </div>
  );
}
