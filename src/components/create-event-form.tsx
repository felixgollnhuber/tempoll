"use client";

import { addDays, eachDayOfInterval, format, isAfter, startOfToday } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarRangeIcon,
  ChevronDownIcon,
  CheckIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import {
  defaultCreateEventDefaults,
} from "@/lib/create-event-defaults";
import { meetingDurationOptions, slotMinuteOptions } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/context";
import { buildTimezoneOptions } from "@/lib/timezone-options";
import { cn } from "@/lib/utils";
import { createEventCreateSchema } from "@/lib/validators";

type CreateEventFormProps = {
  timezones: string[];
  timeOptions: Array<{
    value: number;
    label: string;
  }>;
  notificationsConfigured: boolean;
};

const eventFieldOrder = [
  "title",
  "notificationEmail",
  "timezone",
  "dates",
  "weekdays",
  "dayStartMinutes",
  "dayEndMinutes",
  "slotMinutes",
  "meetingDurationMinutes",
] as const;

type EventField = (typeof eventFieldOrder)[number];
type EventFormErrors = Partial<Record<EventField, string>>;

const eventFieldIds: Record<EventField, string> = {
  title: "title",
  notificationEmail: "notification-email",
  timezone: "timezone-trigger",
  dates: "date-range-trigger",
  weekdays: "weekday-filter",
  dayStartMinutes: "day-start-trigger",
  dayEndMinutes: "day-end-trigger",
  slotMinutes: "slot-size-trigger",
  meetingDurationMinutes: "meeting-duration-trigger",
};

const eventFieldSet = new Set<EventField>(eventFieldOrder);

const weekdayOptions = [
  { value: 1, messageKey: "monday", defaultSelected: true },
  { value: 2, messageKey: "tuesday", defaultSelected: true },
  { value: 3, messageKey: "wednesday", defaultSelected: true },
  { value: 4, messageKey: "thursday", defaultSelected: true },
  { value: 5, messageKey: "friday", defaultSelected: true },
  { value: 6, messageKey: "saturday", defaultSelected: false },
  { value: 0, messageKey: "sunday", defaultSelected: false },
] as const;

const defaultSelectedWeekdays = weekdayOptions
  .filter((weekday) => weekday.defaultSelected)
  .map((weekday) => weekday.value);

function sortWeekdays(values: number[]) {
  return [...values].sort(
    (left, right) =>
      weekdayOptions.findIndex((weekday) => weekday.value === left) -
      weekdayOptions.findIndex((weekday) => weekday.value === right),
  );
}

function getRangeLabel(
  range: DateRange | undefined,
  localeLabel: string,
  messages: ReturnType<typeof useI18n>["messages"],
  dateFnsLocale: ReturnType<typeof useI18n>["dateFnsLocale"],
) {
  if (range?.from && range?.to) {
    return `${format(range.from, localeLabel, { locale: dateFnsLocale })} - ${format(range.to, localeLabel, { locale: dateFnsLocale })}`;
  }

  if (range?.from) {
    return messages.createEvent.range.noEndDate.replace(
      "{from}",
      format(range.from, localeLabel, { locale: dateFnsLocale }),
    );
  }

  return messages.createEvent.dateRangePlaceholder;
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

function getFilteredRangeDays(range: DateRange | undefined, selectedWeekdays: number[]) {
  if (!range?.from || !range?.to) {
    return 0;
  }

  const selectedWeekdaySet = new Set(selectedWeekdays);

  return eachDayOfInterval({
    start: range.from,
    end: range.to,
  }).filter((date) => selectedWeekdaySet.has(date.getDay())).length;
}

function expandRangeToDateKeys(range: DateRange, selectedWeekdays: number[]) {
  if (!range.from || !range.to) {
    return [];
  }

  const selectedWeekdaySet = new Set(selectedWeekdays);

  return eachDayOfInterval({
    start: range.from,
    end: range.to,
  })
    .filter((date) => selectedWeekdaySet.has(date.getDay()))
    .map((date) => format(date, "yyyy-MM-dd"));
}

export function CreateEventForm({
  timezones,
  timeOptions,
  notificationsConfigured,
}: CreateEventFormProps) {
  const router = useRouter();
  const { messages, plural, format: formatMessage, dateFnsLocale, locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EventFormErrors>({});
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
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
  const [slotMinutes, setSlotMinutes] = useState(defaultCreateEventDefaults.slotMinutes);
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(60);
  const [dayStartMinutes, setDayStartMinutes] = useState(
    defaultCreateEventDefaults.dayStartMinutes,
  );
  const [dayEndMinutes, setDayEndMinutes] = useState(
    defaultCreateEventDefaults.dayEndMinutes,
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    defaultSelectedWeekdays,
  );

  const compactDateLabel = locale === "de" ? "d. MMM yyyy" : "MMM d, yyyy";
  const selectedRangeLabel = getRangeLabel(dateRange, compactDateLabel, messages, dateFnsLocale);
  const draftRangeLabel = getRangeLabel(
    draftDateRange,
    compactDateLabel,
    messages,
    dateFnsLocale,
  );
  const selectedRangeDays = getRangeDays(dateRange);
  const draftRangeDays = getRangeDays(draftDateRange);
  const selectedFilteredRangeDays = getFilteredRangeDays(dateRange, selectedWeekdays);
  const timezoneOptions = useMemo(
    () =>
      buildTimezoneOptions(
        timezones,
        format(dateRange?.from ?? startOfToday(), "yyyy-MM-dd"),
      ),
    [dateRange?.from, timezones],
  );
  const selectedTimezoneOption = useMemo(
    () => timezoneOptions.find((option) => option.value === timezone) ?? null,
    [timezone, timezoneOptions],
  );

  const getTimeLabel = (minutes: number) =>
    timeOptions.find((option) => option.value === minutes)?.label ??
    (minutes === 24 * 60 ? "24:00" : String(minutes));

  const startTimeOptions = timeOptions.filter((option) => option.value < dayEndMinutes);
  const endTimeOptions = timeOptions.filter((option) => option.value > dayStartMinutes);

  function clearErrors(...fields: EventField[]) {
    setErrorMessage(null);

    if (fields.length === 0) {
      return;
    }

    setFieldErrors((current) => {
      let hasChanges = false;
      const next = { ...current };

      for (const field of fields) {
        if (!next[field]) {
          continue;
        }

        delete next[field];
        hasChanges = true;
      }

      return hasChanges ? next : current;
    });
  }

  function focusField(field: EventField) {
    window.requestAnimationFrame(() => {
      document.getElementById(eventFieldIds[field])?.focus();
    });
  }

  function getFieldErrors(
    issues: Array<{
      message: string;
      path: PropertyKey[];
    }>,
  ) {
    const nextErrors: EventFormErrors = {};

    for (const issue of issues) {
      const field = issue.path[0];

      if (typeof field !== "string" || !eventFieldSet.has(field as EventField)) {
        continue;
      }

      nextErrors[field as EventField] ??= issue.message;
    }

    return nextErrors;
  }

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
    clearErrors("dates");
    setIsRangePickerOpen(false);
  }

  function toggleWeekday(value: number) {
    setSelectedWeekdays((current) => {
      if (current.includes(value)) {
        return current.filter((weekday) => weekday !== value);
      }

      return sortWeekdays([...current, value]);
    });
    clearErrors("weekdays", "dates");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!dateRange?.from || !dateRange?.to) {
      setFieldErrors({
        dates: messages.validation.eventCreate.dateRangeRequired,
      });
      focusField("dates");
      return;
    }

    const selectedDates = expandRangeToDateKeys(dateRange, selectedWeekdays);

    if (selectedDates.length === 0) {
      setFieldErrors({
        weekdays: messages.validation.eventCreate.weekdayRequired,
      });
      focusField("weekdays");
      return;
    }

    const parsed = createEventCreateSchema(messages).safeParse({
      title,
      notificationEmail: notificationsConfigured ? notificationEmail : undefined,
      timezone,
      dates: selectedDates,
      dayStartMinutes,
      dayEndMinutes,
      slotMinutes,
      meetingDurationMinutes,
    });

    if (!parsed.success) {
      const nextErrors = getFieldErrors(parsed.error.issues);
      setFieldErrors(nextErrors);

      const firstInvalidField = eventFieldOrder.find((field) => nextErrors[field]);
      if (firstInvalidField) {
        focusField(firstInvalidField);
        return;
      }

      setErrorMessage(messages.createEvent.genericSettingsError);
      return;
    }

    setFieldErrors({});
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
        setErrorMessage(payload.error ?? messages.createEvent.createFailed);
        toast.error(payload.error ?? messages.createEvent.createFailed);
        return;
      }

      toast.success(messages.createEvent.created);
      router.push(`/manage/${payload.manageKey}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{messages.createEvent.eventDetailsTitle}</CardTitle>
          <CardDescription>
            {messages.createEvent.eventDetailsDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">{messages.createEvent.titleLabel}</Label>
              <Input
                id="title"
                placeholder={messages.createEvent.titlePlaceholder}
                value={title}
                aria-invalid={fieldErrors.title ? true : undefined}
                aria-describedby={fieldErrors.title ? "title-error" : undefined}
                className={cn(
                  fieldErrors.title &&
                    "border-destructive focus-visible:ring-destructive/20",
                )}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearErrors("title");
                }}
              />
              {fieldErrors.title ? (
                <p id="title-error" className="text-sm text-destructive">
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>

            {notificationsConfigured ? (
              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.notificationEmail}>
                  {messages.createEvent.notificationEmailLabel}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {messages.createEvent.notificationEmailDescription}
                </p>
                <Input
                  id={eventFieldIds.notificationEmail}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={messages.createEvent.notificationEmailPlaceholder}
                  value={notificationEmail}
                  aria-invalid={fieldErrors.notificationEmail ? true : undefined}
                  aria-describedby={
                    fieldErrors.notificationEmail ? "notification-email-error" : undefined
                  }
                  className={cn(
                    fieldErrors.notificationEmail &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                  onChange={(event) => {
                    setNotificationEmail(event.target.value);
                    clearErrors("notificationEmail");
                  }}
                />
                {fieldErrors.notificationEmail ? (
                  <p id="notification-email-error" className="text-sm text-destructive">
                    {fieldErrors.notificationEmail}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                {messages.createEvent.notificationEmailUnavailable}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.timezone}>{messages.createEvent.timezoneLabel}</Label>
                <Select
                  value={timezone}
                  onValueChange={(value) => {
                    setTimezone(value);
                    clearErrors("timezone");
                  }}
                >
                  <SelectTrigger
                    id={eventFieldIds.timezone}
                    aria-invalid={fieldErrors.timezone ? true : undefined}
                    aria-describedby={fieldErrors.timezone ? "timezone-error" : undefined}
                    className={cn(
                      fieldErrors.timezone &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder={messages.createEvent.timezonePlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {timezoneOptions.map((timezoneOption) => (
                      <SelectItem key={timezoneOption.value} value={timezoneOption.value}>
                        {timezoneOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.timezone ? (
                  <p id="timezone-error" className="text-sm text-destructive">
                    {fieldErrors.timezone}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.dates}>{messages.createEvent.dateRangeLabel}</Label>
                <Popover open={isRangePickerOpen} onOpenChange={openRangePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      id={eventFieldIds.dates}
                      type="button"
                      variant="outline"
                      aria-invalid={fieldErrors.dates ? true : undefined}
                      aria-describedby={fieldErrors.dates ? "dates-error" : undefined}
                      className={cn(
                        "h-9 w-full justify-between font-normal",
                        fieldErrors.dates && "border-destructive",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CalendarRangeIcon className="size-4 text-muted-foreground" />
                        <span className="truncate">{selectedRangeLabel}</span>
                      </span>
                      <span className="ml-3 flex shrink-0 items-center gap-2">
                        {selectedRangeDays > 0 ? (
                          <Badge variant="secondary" className="rounded-full px-2.5">
                            {plural(messages.createEvent.range.days, selectedRangeDays)}
                          </Badge>
                        ) : null}
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="w-[min(22rem,calc(100vw-2rem))] p-0"
                  >
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-medium">{messages.createEvent.dateRangeOpenTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {messages.createEvent.dateRangeOpenDescription}
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
                        locale={dateFnsLocale}
                        className="mx-auto"
                      />
                    </div>
                    <div className="border-t px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{draftRangeLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {draftRangeDays > 0
                              ? formatMessage(messages.createEvent.range.selected, {
                                  count: plural(messages.createEvent.range.days, draftRangeDays),
                                })
                              : messages.createEvent.range.selectFullRange}
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
                            {messages.common.cancel}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={applyRangeSelection}
                            disabled={!draftDateRange?.from || !draftDateRange?.to}
                          >
                            {messages.common.apply}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {fieldErrors.dates ? (
                  <p id="dates-error" className="text-sm text-destructive">
                    {fieldErrors.dates}
                  </p>
                ) : null}
              </div>

              <fieldset
                id={eventFieldIds.weekdays}
                tabIndex={-1}
                aria-describedby={
                  fieldErrors.weekdays
                    ? "weekday-filter-description weekday-filter-error"
                    : "weekday-filter-description"
                }
                aria-invalid={fieldErrors.weekdays ? true : undefined}
                className="space-y-2 rounded-md focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:col-span-2"
              >
                <legend className="sr-only">{messages.createEvent.weekdays.label}</legend>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{messages.createEvent.weekdays.label}</span>
                  <Badge variant="secondary" className="rounded-full px-2.5">
                    {plural(messages.createEvent.range.days, selectedFilteredRangeDays)}
                  </Badge>
                </div>
                <p id="weekday-filter-description" className="text-sm text-muted-foreground">
                  {messages.createEvent.weekdays.description}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {weekdayOptions.map((weekday) => {
                    const isSelected = selectedWeekdays.includes(weekday.value);
                    const weekdayMessage =
                      messages.createEvent.weekdays.options[weekday.messageKey];

                    return (
                      <label
                        key={weekday.value}
                        className={cn(
                          "flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          aria-label={weekdayMessage.label}
                          checked={isSelected}
                          onChange={() => toggleWeekday(weekday.value)}
                        />
                        <span className="min-w-0" aria-hidden="true">
                          <span className="block font-medium">{weekdayMessage.shortLabel}</span>
                          <span className="block truncate text-xs">{weekdayMessage.label}</span>
                        </span>
                        {isSelected ? <CheckIcon className="size-4 shrink-0" aria-hidden="true" /> : null}
                      </label>
                    );
                  })}
                </div>
                {fieldErrors.weekdays ? (
                  <p id="weekday-filter-error" className="text-sm text-destructive">
                    {fieldErrors.weekdays}
                  </p>
                ) : null}
              </fieldset>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.dayStartMinutes}>{messages.createEvent.dailyStartLabel}</Label>
                <Select
                  value={String(dayStartMinutes)}
                  onValueChange={(value) => {
                    setDayStartMinutes(Number(value));
                    clearErrors("dayStartMinutes", "dayEndMinutes");
                  }}
                >
                  <SelectTrigger
                    id={eventFieldIds.dayStartMinutes}
                    aria-invalid={fieldErrors.dayStartMinutes ? true : undefined}
                    aria-describedby={
                      fieldErrors.dayStartMinutes ? "day-start-error" : undefined
                    }
                    className={cn(
                      fieldErrors.dayStartMinutes &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder={messages.createEvent.dailyStartPlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {startTimeOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.dayStartMinutes ? (
                  <p id="day-start-error" className="text-sm text-destructive">
                    {fieldErrors.dayStartMinutes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.dayEndMinutes}>{messages.createEvent.dailyEndLabel}</Label>
                <Select
                  value={String(dayEndMinutes)}
                  onValueChange={(value) => {
                    setDayEndMinutes(Number(value));
                    clearErrors("dayStartMinutes", "dayEndMinutes");
                  }}
                >
                  <SelectTrigger
                    id={eventFieldIds.dayEndMinutes}
                    aria-invalid={fieldErrors.dayEndMinutes ? true : undefined}
                    aria-describedby={fieldErrors.dayEndMinutes ? "day-end-error" : undefined}
                    className={cn(
                      fieldErrors.dayEndMinutes &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder={messages.createEvent.dailyEndPlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {endTimeOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.dayEndMinutes ? (
                  <p id="day-end-error" className="text-sm text-destructive">
                    {fieldErrors.dayEndMinutes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.slotMinutes}>{messages.createEvent.slotSizeLabel}</Label>
                <Select
                  value={String(slotMinutes)}
                  onValueChange={(value) => {
                    setSlotMinutes(Number(value));
                    clearErrors("slotMinutes", "meetingDurationMinutes");
                  }}
                >
                  <SelectTrigger
                    id={eventFieldIds.slotMinutes}
                    aria-invalid={fieldErrors.slotMinutes ? true : undefined}
                    aria-describedby={fieldErrors.slotMinutes ? "slot-size-error" : undefined}
                    className={cn(
                      fieldErrors.slotMinutes &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder={messages.createEvent.slotSizePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {slotMinuteOptions.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {formatMessage(messages.createEvent.minutesShort, { count: minutes })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.slotMinutes ? (
                  <p id="slot-size-error" className="text-sm text-destructive">
                    {fieldErrors.slotMinutes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.meetingDurationMinutes}>
                  {messages.createEvent.meetingDurationLabel}
                </Label>
                <Select
                  value={String(meetingDurationMinutes)}
                  onValueChange={(value) => {
                    setMeetingDurationMinutes(Number(value));
                    clearErrors("slotMinutes", "meetingDurationMinutes");
                  }}
                >
                  <SelectTrigger
                    id={eventFieldIds.meetingDurationMinutes}
                    aria-invalid={fieldErrors.meetingDurationMinutes ? true : undefined}
                    aria-describedby={
                      fieldErrors.meetingDurationMinutes
                        ? "meeting-duration-error"
                        : undefined
                    }
                    className={cn(
                      fieldErrors.meetingDurationMinutes &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder={messages.createEvent.meetingDurationPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingDurationOptions.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {formatMessage(messages.createEvent.minutesShort, { count: minutes })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.meetingDurationMinutes ? (
                  <p id="meeting-duration-error" className="text-sm text-destructive">
                    {fieldErrors.meetingDurationMinutes}
                  </p>
                ) : null}
              </div>
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
              {messages.createEvent.createButton}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>{messages.createEvent.previewTitle}</CardTitle>
            <CardDescription>
              {messages.createEvent.previewDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xl font-semibold">{title || messages.createEvent.untitledEvent}</p>
              <p className="text-sm text-muted-foreground">
                {selectedTimezoneOption?.label ?? timezone}
              </p>
            </div>
            <Separator />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{messages.createEvent.previewFields.dateRange}</dt>
                <dd className="text-right font-medium">{selectedRangeLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{messages.createEvent.previewFields.daysShown}</dt>
                <dd className="font-medium">{selectedFilteredRangeDays}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{messages.createEvent.previewFields.dailyWindow}</dt>
                <dd className="font-medium">
                  {getTimeLabel(dayStartMinutes)} - {getTimeLabel(dayEndMinutes)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{messages.createEvent.previewFields.granularity}</dt>
                <dd className="font-medium">
                  {formatMessage(messages.createEvent.minutesShort, { count: slotMinutes })}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{messages.createEvent.previewFields.rankedWindow}</dt>
                <dd className="font-medium">
                  {formatMessage(messages.createEvent.minutesShort, {
                    count: meetingDurationMinutes,
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>{messages.createEvent.whatGetsCreatedTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{messages.createEvent.whatGetsCreatedItems.publicPage}</p>
            <p>{messages.createEvent.whatGetsCreatedItems.privatePage}</p>
            <p>{messages.createEvent.whatGetsCreatedItems.liveGrid}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
