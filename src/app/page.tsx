import { Fragment } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon, Clock3Icon, SparklesIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentEventsSection } from "@/components/recent-events-section";
import { isDevModeEnabled } from "@/lib/dev-mode";
import { getServerI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const sampleCounts = [
  [1, 2, 2, 1],
  [2, 4, 5, 2],
  [3, 5, 6, 4],
  [1, 3, 4, 3],
  [0, 2, 3, 2],
];

function SampleCell({ count }: { count: number }) {
  const backgrounds = [
    "bg-background",
    "bg-chart-1/30",
    "bg-chart-1/45",
    "bg-chart-2/40",
    "bg-chart-2/55",
    "bg-primary/65",
    "bg-primary/80",
  ];

  return <div className={`aspect-square rounded-md border ${backgrounds[count] ?? backgrounds[0]}`} />;
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

  return (
    <main className="flex-1 pb-24">
      <section className="app-shell pt-10 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              {messages.home.badge}
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
                {messages.home.title}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                {messages.home.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/new" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                {messages.home.primaryCta}
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/#recent-events"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {messages.home.secondaryCta}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: SparklesIcon,
                  title: messages.home.features.liveHeatmap.title,
                  copy: messages.home.features.liveHeatmap.copy,
                },
                {
                  icon: Clock3Icon,
                  title: messages.home.features.rankedWindows.title,
                  copy: messages.home.features.rankedWindows.copy,
                },
                {
                  icon: UsersIcon,
                  title: messages.home.features.simpleSharing.title,
                  copy: messages.home.features.simpleSharing.copy,
                },
              ].map((feature) => (
                <Card key={feature.title}>
                  <CardHeader className="space-y-3">
                    <feature.icon className="size-5 text-primary" />
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.copy}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{messages.home.preview.title}</CardTitle>
                <CardDescription>{messages.home.preview.description}</CardDescription>
              </div>
              <Badge>{format(messages.home.preview.participants, { count: 6 })}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-2 text-center text-xs text-muted-foreground">
                  <span />
                  {messages.home.preview.dayLabels.map((day) => (
                    <span key={day} className="rounded-md bg-background px-2 py-1 shadow-sm">
                      {day}
                    </span>
                  ))}
                  {["09:00", "11:00", "13:00", "15:00", "17:00"].map((time, rowIndex) => (
                    <Fragment key={time}>
                      <span className="flex items-center pr-2 text-left font-medium text-foreground">
                        {time}
                      </span>
                      {sampleCounts[rowIndex].map((count, columnIndex) => (
                        <SampleCell key={`${time}-${columnIndex}`} count={count} />
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {messages.home.preview.topOptionLabels.map((slot, index) => (
                  <div key={slot} className="rounded-lg border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(messages.common.option, { count: index + 1 })}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{slot}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(messages.home.preview.topOptionsAttendees, { count: 4 })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="app-shell mt-20 grid gap-6 lg:grid-cols-3">
        {[
          {
            title: messages.home.highlights.asyncCollaboration.title,
            description: messages.home.highlights.asyncCollaboration.description,
          },
          {
            title: messages.home.highlights.selfHosting.title,
            description: messages.home.highlights.selfHosting.description,
          },
          {
            title: messages.home.highlights.modernTeams.title,
            description: messages.home.highlights.modernTeams.description,
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className="text-sm leading-6">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="app-shell mt-20">
        <RecentEventsSection devModeEnabled={devModeEnabled} />
      </section>
    </main>
  );
}
