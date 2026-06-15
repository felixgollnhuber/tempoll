import { Fragment } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecentEventsSection } from "@/components/recent-events-section";
import { isDevModeEnabled } from "@/lib/dev-mode";
import { getDevSeedRecentEvents } from "@/lib/dev-seed-recent-events";
import { getServerI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const githubRepositoryUrl = "https://github.com/felixgollnhuber/tempoll";

const sampleCounts = [
  [1, 2, 2, 1],
  [2, 4, 5, 2],
  [3, 5, 6, 4],
  [1, 3, 4, 3],
  [0, 2, 3, 2],
];

const sampleTimes = ["09:00", "11:00", "13:00", "15:00", "17:00"];

const maxSampleAvailability = Math.max(...sampleCounts.flat());

function sampleCellClass(count: number) {
  if (count <= 0) return "bg-background";
  const ratio = count / maxSampleAvailability;
  if (ratio >= 1) return "bg-primary/80";
  if (ratio >= 0.8) return "bg-primary/65";
  if (ratio >= 0.6) return "bg-primary/50";
  if (ratio >= 0.4) return "bg-primary/36";
  if (ratio >= 0.2) return "bg-primary/24";
  return "bg-primary/12";
}

function SampleCell({ count }: { count: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "aspect-square cursor-crosshair transition-[filter] duration-150 motion-reduce:transition-none hover:brightness-[0.97]",
        sampleCellClass(count),
      )}
    />
  );
}

function InlineSeparator() {
  return (
    <span aria-hidden="true" className="select-none text-primary/60">
      ·
    </span>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return {
    description: messages.metadata.description,
  };
}

export default async function Home() {
  const { messages, format } = await getServerI18n();
  const devModeEnabled = isDevModeEnabled();
  const devSeedEntries = devModeEnabled ? getDevSeedRecentEvents() : [];
  const lastTitleIndex = messages.home.titleLines.length - 1;

  return (
    <main className="flex-1 pb-24">
      <section className="app-shell pt-12 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-16">
          <div className="space-y-10">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {messages.home.eyebrow.map((item, index) => (
                <Fragment key={item}>
                  {index > 0 ? <InlineSeparator /> : null}
                  <span>{item}</span>
                </Fragment>
              ))}
            </p>

            <h1 className="font-heading text-[clamp(2.5rem,7vw,4rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-foreground">
              {messages.home.titleLines.map((line, index) => (
                <span key={index} className="block">
                  {line}
                  {index === lastTitleIndex ? (
                    <span className="text-primary">{messages.home.titleAccent}</span>
                  ) : null}
                </span>
              ))}
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {messages.home.description}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/new" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                {messages.home.primaryCta}
                <ArrowRightIcon className="size-4" />
              </Link>
              <a
                href={githubRepositoryUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "gap-2",
                )}
              >
                {messages.home.secondaryCta}
                <ArrowUpRightIcon className="size-4" />
              </a>
            </div>

            <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {messages.home.specStrip.map((item, index) => (
                <Fragment key={item}>
                  {index > 0 ? <InlineSeparator /> : null}
                  <span>{item}</span>
                </Fragment>
              ))}
            </p>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 border-b border-border/70 bg-muted/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {messages.home.preview.eyebrow}
                </p>
                <Badge variant="secondary" className="font-medium">
                  {format(messages.home.preview.participants, { count: 6 })}
                </Badge>
              </div>
              <div>
                <CardTitle className="text-lg">{messages.home.preview.title}</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {messages.home.preview.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="overflow-hidden rounded-md border border-border/70">
                <div className="grid grid-cols-[2.75rem_repeat(4,minmax(0,1fr))] gap-px bg-border/60 text-[10px]">
                  <div className="bg-background py-1" aria-hidden="true" />
                  {messages.home.preview.dayLabels.map((day) => (
                    <div
                      key={day}
                      className="bg-background py-1 text-center font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  {sampleTimes.map((time, rowIndex) => (
                    <Fragment key={time}>
                      <div className="flex items-center justify-end bg-background pr-2 font-medium tabular-nums text-muted-foreground">
                        {time}
                      </div>
                      {sampleCounts[rowIndex].map((count, columnIndex) => (
                        <SampleCell key={`${time}-${columnIndex}`} count={count} />
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {messages.home.preview.topOptionsTitle}
                </p>
                <ol className="divide-y divide-border/60">
                  {messages.home.preview.topOptionLabels.map((slot, index) => (
                    <li
                      key={slot}
                      className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                    >
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className="font-heading text-xs font-semibold tabular-nums text-primary">
                          {format(messages.home.preview.topOptionRank, {
                            rank: index + 1,
                          })}
                        </span>
                        <span className="truncate font-medium text-foreground">
                          {slot}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {format(messages.home.preview.topOptionsAttendees, {
                          count: 6 - index,
                        })}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="app-shell mt-24 sm:mt-32">
        <RecentEventsSection devSeedEntries={devSeedEntries} />
      </section>
    </main>
  );
}
