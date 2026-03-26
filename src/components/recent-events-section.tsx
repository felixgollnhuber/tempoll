"use client";

import Link from "next/link";
import { Clock3Icon, LockIcon, Trash2Icon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearRecentEvents,
  getRecentEventsServerSnapshot,
  readRecentEvents,
  removeRecentEvent,
  subscribeRecentEvents,
} from "@/lib/recent-events";

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function RecentEventsSection() {
  const entries = useSyncExternalStore(
    subscribeRecentEvents,
    readRecentEvents,
    getRecentEventsServerSnapshot,
  );

  return (
    <section id="recent-events" className="scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Recent events</p>
          <h2 className="text-3xl font-semibold tracking-tight">Open boards you visited before</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Saved only in this browser. Organizer links are marked as private.
          </p>
        </div>
        {entries.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => clearRecentEvents()}>
            Clear all
          </Button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>No recent events yet</CardTitle>
            <CardDescription>
              Open a public board or organizer page and it will appear here for quick access.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.slug}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{entry.title}</CardTitle>
                    <CardDescription className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock3Icon className="size-3" />
                        Last opened {formatTimestamp(entry.lastViewedAt)}
                      </span>
                    </CardDescription>
                  </div>
                  {entry.manageUrl ? (
                    <Badge variant="outline" className="gap-1">
                      <LockIcon className="size-3" />
                      Private link saved
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.publicUrl ? (
                    <Button asChild size="sm">
                      <Link href={entry.publicUrl}>Open public</Link>
                    </Button>
                  ) : null}
                  {entry.manageUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={entry.manageUrl}>Open organizer</Link>
                    </Button>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => removeRecentEvent(entry.slug)}
                >
                  <Trash2Icon className="size-4" />
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
