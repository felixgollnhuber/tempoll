"use client";

import Link from "next/link";
import { Clock3Icon, FlaskConicalIcon, LockIcon, Trash2Icon } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearRecentEvents,
  getRecentEventsServerSnapshot,
  mergeDevSeedRecentEvents,
  readRecentEvents,
  removeRecentEvent,
  subscribeRecentEvents,
} from "@/lib/recent-events";
import { useI18n } from "@/lib/i18n/context";

function formatTimestamp(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type RecentEventsSectionProps = {
  devModeEnabled?: boolean;
};

export function RecentEventsSection({ devModeEnabled = false }: RecentEventsSectionProps) {
  const { messages, intlLocale, format } = useI18n();
  const storedEntries = useSyncExternalStore(
    subscribeRecentEvents,
    readRecentEvents,
    getRecentEventsServerSnapshot,
  );
  const entries = useMemo(
    () => mergeDevSeedRecentEvents(storedEntries, devModeEnabled),
    [devModeEnabled, storedEntries],
  );

  return (
    <section id="recent-events" className="scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{messages.recentEvents.eyebrow}</p>
          <h2 className="text-3xl font-semibold tracking-tight">{messages.recentEvents.title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {messages.recentEvents.description}
          </p>
        </div>
        {storedEntries.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => clearRecentEvents()}>
            {messages.recentEvents.clearAll}
          </Button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{messages.recentEvents.emptyTitle}</CardTitle>
            <CardDescription>
              {messages.recentEvents.emptyDescription}
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
                        {format(messages.recentEvents.lastOpened, {
                          timestamp: formatTimestamp(entry.lastViewedAt, intlLocale),
                        })}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {entry.devSeed ? (
                      <Badge variant="secondary" className="gap-1">
                        <FlaskConicalIcon className="size-3" />
                        {messages.recentEvents.devSeed}
                      </Badge>
                    ) : null}
                    {entry.manageUrl ? (
                      <Badge variant="outline" className="gap-1">
                        <LockIcon className="size-3" />
                        {messages.recentEvents.privateLinkSaved}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.publicUrl ? (
                    <Button asChild size="sm">
                      <Link href={entry.publicUrl}>{messages.recentEvents.openPublic}</Link>
                    </Button>
                  ) : null}
                  {entry.manageUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={entry.manageUrl}>{messages.recentEvents.openOrganizer}</Link>
                    </Button>
                  ) : null}
                </div>
                {entry.devOnly ? (
                  <p className="text-xs text-muted-foreground">
                    {messages.recentEvents.devSeedDescription}
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => removeRecentEvent(entry.slug)}
                  >
                    <Trash2Icon className="size-4" />
                    {messages.recentEvents.remove}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
