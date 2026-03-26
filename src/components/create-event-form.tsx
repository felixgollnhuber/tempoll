"use client";

import { addDays, eachDayOfInterval, format, isAfter, startOfToday } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarRangeIcon,
  ChevronDownIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { eventCreateSchema } from "@/lib/validators";

type CreateEventFormProps = {
  timezones: string[];
  timeOptions: Array<{
    value: number;
    label: string;
  }>;
};

function getRangeLabel(range: DateRange | undefined) {
  if (range?.from && range?.to) {
    return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
  }

  if (range?.from) {
    return `${format(range.from, "MMM d, yyyy")} - pick an end date`;
  }

  return "Choose a start and end date";
}

function getRangeDays(range: DateRange | undefined) {
  if (!range?.from || !range?.to) {
    return 0;
  }

  return eachDayOfInterval({
    start: range.from,
    end: range.to,
  }).length;
}

export function CreateEventForm({ timezones, timeOptions }: CreateEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const tomorrow = addDays(new Date(), 1);
    return {
      from: tomorrow,
      to: addDays(tomorrow, 2),
    };
  });
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>(() => {
    const tomorrow = addDays(new Date(), 1);
    return {
      from: tomorrow,
      to: addDays(tomorrow, 2),
    };
  });
  const [timezone, setTimezone] = useState(() => {
    const browserTimezone =
      typeof window !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null;

    return browserTimezone && timezones.includes(browserTimezone)
      ? browserTimezone
      : "Europe/Vienna";
  });
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(60);
  const [dayStartMinutes, setDayStartMinutes] = useState(9 * 60);
  const [dayEndMinutes, setDayEndMinutes] = useState(18 * 60);

  const selectedDates =
    dateRange?.from && dateRange?.to
      ? eachDayOfInterval({
          start: dateRange.from,
          end: dateRange.to,
        }).map((date) => format(date, "yyyy-MM-dd"))
      : [];

  const selectedRangeLabel = getRangeLabel(dateRange);
  const draftRangeLabel = getRangeLabel(draftDateRange);
  const selectedRangeDays = getRangeDays(dateRange);
  const draftRangeDays = getRangeDays(draftDateRange);

  const getTimeLabel = (minutes: number) =>
    timeOptions.find((option) => option.value === minutes)?.label ?? String(minutes);

  function openRangePicker(open: boolean) {
    setIsRangePickerOpen(open);
    if (open) {
      setDraftDateRange(dateRange);
    }
  }

  function applyRangeSelection() {
    if (!draftDateRange?.from || !draftDateRange?.to) {
      return;
    }

    setDateRange(draftDateRange);
    setIsRangePickerOpen(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dateRange?.from || !dateRange?.to) {
      setErrorMessage("Choose a start and end date for the event.");
      return;
    }

    const parsed = eventCreateSchema.safeParse({
      title,
      timezone,
      dates: selectedDates,
      dayStartMinutes,
      dayEndMinutes,
      slotMinutes,
      meetingDurationMinutes,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Please check your event settings.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json()) as { error?: string; manageKey?: string };
      if (!response.ok || !payload.manageKey) {
        setErrorMessage(payload.error ?? "Unable to create the event.");
        toast.error(payload.error ?? "Unable to create the event.");
        return;
      }

      toast.success("Event created");
      router.push(`/manage/${payload.manageKey}`);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Event details</CardTitle>
          <CardDescription>
            Set one date range, choose the daily window, and share a single link.
            Every day inside the selected range will appear on the availability grid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Event title</Label>
              <Input
                id="title"
                placeholder="Design review, sprint planning, dinner with friends..."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {timezones.map((timezoneOption) => (
                      <SelectItem key={timezoneOption} value={timezoneOption}>
                        {timezoneOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date range</Label>
                <Popover open={isRangePickerOpen} onOpenChange={openRangePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full justify-between font-normal"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CalendarRangeIcon className="size-4 text-muted-foreground" />
                        <span className="truncate">{selectedRangeLabel}</span>
                      </span>
                      <ChevronDownIcon className="size-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="w-[min(22rem,calc(100vw-2rem))] p-0"
                  >
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-medium">Choose event range</p>
                      <p className="text-xs text-muted-foreground">
                        Weeks start on Monday. The whole interval will be shown.
                      </p>
                    </div>
                    <div className="p-3">
                      <Calendar
                        mode="range"
                        numberOfMonths={1}
                        selected={draftDateRange}
                        defaultMonth={draftDateRange?.from ?? dateRange?.from}
                        disabled={(date) => isAfter(startOfToday(), date)}
                        weekStartsOn={1}
                        onSelect={setDraftDateRange}
                        className="mx-auto"
                      />
                    </div>
                    <div className="border-t px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{draftRangeLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {draftRangeDays > 0 ? `${draftRangeDays} days selected` : "Select a full range"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDraftDateRange(dateRange);
                              setIsRangePickerOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={applyRangeSelection}
                            disabled={!draftDateRange?.from || !draftDateRange?.to}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{selectedRangeLabel}</p>
                    <Badge variant="secondary">{selectedRangeDays} days</Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Daily start</Label>
                <Select
                  value={String(dayStartMinutes)}
                  onValueChange={(value) => setDayStartMinutes(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Daily end</Label>
                <Select
                  value={String(dayEndMinutes)}
                  onValueChange={(value) => setDayEndMinutes(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick an end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Slot size</Label>
                <Select
                  value={String(slotMinutes)}
                  onValueChange={(value) => setSlotMinutes(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose slot size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 60].map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Meeting duration</Label>
                <Select
                  value={String(meetingDurationMinutes)}
                  onValueChange={(value) => setMeetingDurationMinutes(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {[30, 60, 90, 120].map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
              Create event
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              This is the shape your event will have before anyone joins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xl font-semibold">{title || "Untitled event"}</p>
              <p className="text-sm text-muted-foreground">{timezone}</p>
            </div>
            <Separator />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Date range</dt>
                <dd className="text-right font-medium">{selectedRangeLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Days shown</dt>
                <dd className="font-medium">{selectedRangeDays}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Daily window</dt>
                <dd className="font-medium">
                  {getTimeLabel(dayStartMinutes)} - {getTimeLabel(dayEndMinutes)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Granularity</dt>
                <dd className="font-medium">{slotMinutes} min</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Ranked window</dt>
                <dd className="font-medium">{meetingDurationMinutes} min</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>What gets created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>A public event page people can join without creating an account.</p>
            <p>A private organizer page for renaming participants and closing the poll.</p>
            <p>A live availability grid that fills every day between the chosen start and end date.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
