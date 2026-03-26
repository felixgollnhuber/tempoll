import { Fragment } from "react";
import Link from "next/link";
import { ArrowRightIcon, Clock3Icon, SparklesIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentEventsSection } from "@/components/recent-events-section";
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

export default function Home() {
  return (
    <main className="flex-1 pb-24">
      <section className="app-shell pt-10 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              Self-hosted, realtime, account-free
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
                A cleaner When2Meet for modern teams.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Create an event, share the link, and let people paint their availability on a live heatmap.
                The organizer gets a private manage page and everyone else can join with just a name.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/new" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                Create an event
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/#recent-events"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Recent events
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: SparklesIcon,
                  title: "Live heatmap",
                  copy: "Availability updates in real time while participants fill in the grid.",
                },
                {
                  icon: Clock3Icon,
                  title: "Ranked windows",
                  copy: "The best meeting slots are suggested automatically for the full duration.",
                },
                {
                  icon: UsersIcon,
                  title: "Simple sharing",
                  copy: "Participants join with a name only while organizers keep a private manage link.",
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
                <CardTitle>Thursday design review</CardTitle>
                <CardDescription>Preview of the shared availability board</CardDescription>
              </div>
              <Badge>6 participants</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-2 text-center text-xs text-muted-foreground">
                  <span />
                  {["Tue", "Wed", "Thu", "Fri"].map((day) => (
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
                {[
                  "Thu · 13:00-14:00",
                  "Wed · 11:00-12:00",
                  "Fri · 15:00-16:00",
                ].map((slot, index) => (
                  <div key={slot} className="rounded-lg border bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground">Option {index + 1}</p>
                    <p className="mt-2 text-sm font-semibold">{slot}</p>
                    <p className="mt-1 text-xs text-muted-foreground">4+ attendees available</p>
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
            title: "Designed for async collaboration",
            description:
              "Participants can join in seconds, paint over their free time, and see the shared shape emerge in real time.",
          },
          {
            title: "Built for self-hosting",
            description:
              "Prisma, Postgres and a Docker or Coolify deployment path keep the stack operationally simple and fully yours.",
          },
          {
            title: "Made for modern teams",
            description:
              "Clear hierarchy, strong mobile behavior and ranked time windows keep the decision process compact.",
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
        <RecentEventsSection />
      </section>
    </main>
  );
}
