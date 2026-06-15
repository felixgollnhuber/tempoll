"use client";

import { addDays, addMonths, eachDayOfInterval, format, isAfter, startOfToday } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ChevronDownIcon,
  CheckIcon,
  Clock3Icon,
  LinkIcon,
  Loader2Icon,
  MapPinIcon,
  VideoIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { TimezoneCombobox } from "@/components/timezone-combobox";
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
import {
  defaultCreateEventDefaults,
} from "@/lib/create-event-defaults";
import { meetingDurationOptions, slotMinuteOptions } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/context";
import { buildTimezoneOptions } from "@/lib/timezone-options";
import type { EventType } from "@/lib/types";
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
  "eventType",
  "title",
  "location",
  "isOnlineMeeting",
  "meetingLink",
  "notificationEmail",
  "timezone",
  "dates",
  "weekdays",
  "fullDayStartMinutes",
  "dayStartMinutes",
  "dayEndMinutes",
  "slotMinutes",
  "meetingDurationMinutes",
] as const;

type EventField = (typeof eventFieldOrder)[number];
type EventFormErrors = Partial<Record<EventField, string>>;

const eventFieldIds: Record<EventField, string> = {
  eventType: "event-type",
  title: "title",
  location: "location",
  isOnlineMeeting: "event-format",
  meetingLink: "meeting-link",
  notificationEmail: "notification-email",
  timezone: "timezone-trigger",
  dates: "date-range-trigger",
  weekdays: "weekday-filter",
  fullDayStartMinutes: "full-day-start-trigger",
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

function getDefaultDateRange(eventType: EventType, today: Date): DateRange {
  if (eventType === "full_day") {
    return {
      from: today,
      to: addMonths(today, 1),
    };
  }

  const tomorrow = addDays(today, 1);
  return {
    from: tomorrow,
    to: addDays(tomorrow, 2),
  };
}

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
  const [initialDateRange] = useState(() => getDefaultDateRange("time_grid", startOfToday()));
  const [eventType, setEventType] = useState<EventType>("time_grid");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isOnlineMeeting, setIsOnlineMeeting] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>(initialDateRange);
  const [usesDefaultDateRange, setUsesDefaultDateRange] = useState(true);
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
  const [fullDayStartMinutes, setFullDayStartMinutes] = useState<number | undefined>(undefined);
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
  const selectedEventTypeLabel =
    eventType === "full_day"
      ? messages.createEvent.eventTypeFullDay
      : messages.createEvent.eventTypeTimeGrid;

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
    setUsesDefaultDateRange(false);
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

  function selectEventType(nextEventType: EventType) {
    if (usesDefaultDateRange) {
      const nextDefaultRange = getDefaultDateRange(nextEventType, startOfToday());
      setDateRange(nextDefaultRange);
      setDraftDateRange(nextDefaultRange);
      clearErrors("dates", "weekdays");
    }

    setEventType(nextEventType);
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
      eventType,
      title,
      location: isOnlineMeeting ? undefined : location,
      isOnlineMeeting,
      meetingLink: isOnlineMeeting ? meetingLink : undefined,
      notificationEmail: notificationsConfigured ? notificationEmail : undefined,
      timezone,
      dates: selectedDates,
      fullDayStartMinutes: eventType === "full_day" ? fullDayStartMinutes : undefined,
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
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
      <form className="space-y-12" onSubmit={onSubmit}>
        <FormSection
          index="01"
          title={messages.createEvent.sections.basics.title}
          description={messages.createEvent.sections.basics.description}
        >
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label id={eventFieldIds.isOnlineMeeting}>
                  {messages.createEvent.eventFormatLabel}
                </Label>
                <div
                  role="radiogroup"
                  aria-labelledby={eventFieldIds.isOnlineMeeting}
                  className="flex h-10 w-full items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-xs sm:w-fit"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!isOnlineMeeting}
                    className={cn(
                      "flex h-full flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-md)-2px)] px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-initial sm:px-5",
                      !isOnlineMeeting
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                    onClick={() => {
                      setIsOnlineMeeting(false);
                      setMeetingLink("");
                      clearErrors("isOnlineMeeting", "meetingLink");
                    }}
                  >
                    <MapPinIcon className="size-4" aria-hidden="true" />
                    {messages.createEvent.inPersonLabel}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isOnlineMeeting}
                    className={cn(
                      "flex h-full flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-md)-2px)] px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-initial sm:px-5",
                      isOnlineMeeting
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                    onClick={() => {
                      setIsOnlineMeeting(true);
                      setLocation("");
                      clearErrors("isOnlineMeeting", "location");
                    }}
                  >
                    <VideoIcon className="size-4" aria-hidden="true" />
                    {messages.createEvent.onlineMeetingLabel}
                  </button>
                </div>
              </div>

              {isOnlineMeeting ? (
                <div className="space-y-2">
                  <Label htmlFor={eventFieldIds.meetingLink}>
                    {messages.createEvent.meetingLinkLabel}
                  </Label>
                  <div className="relative">
                    <LinkIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={eventFieldIds.meetingLink}
                      type="url"
                      inputMode="url"
                      value={meetingLink}
                      placeholder={messages.createEvent.meetingLinkPlaceholder}
                      aria-invalid={fieldErrors.meetingLink ? true : undefined}
                      aria-describedby={fieldErrors.meetingLink ? "meeting-link-error" : undefined}
                      className={cn(
                        "pl-9",
                        fieldErrors.meetingLink &&
                          "border-destructive focus-visible:ring-destructive/20",
                      )}
                      onChange={(event) => {
                        setMeetingLink(event.target.value);
                        clearErrors("meetingLink");
                      }}
                    />
                  </div>
                  {fieldErrors.meetingLink ? (
                    <p id="meeting-link-error" className="text-sm text-destructive">
                      {fieldErrors.meetingLink}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor={eventFieldIds.location}>{messages.createEvent.locationLabel}</Label>
                  <div className="relative">
                    <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={eventFieldIds.location}
                      value={location}
                      placeholder={messages.createEvent.locationPlaceholder}
                      aria-invalid={fieldErrors.location ? true : undefined}
                      aria-describedby={fieldErrors.location ? "location-error" : undefined}
                      className={cn(
                        "pl-9",
                        fieldErrors.location &&
                          "border-destructive focus-visible:ring-destructive/20",
                      )}
                      onChange={(event) => {
                        setLocation(event.target.value);
                        clearErrors("location");
                      }}
                    />
                  </div>
                  {fieldErrors.location ? (
                    <p id="location-error" className="text-sm text-destructive">
                      {fieldErrors.location}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
        </FormSection>

        <FormSection
          index="02"
          title={messages.createEvent.sections.kind.title}
          description={messages.createEvent.sections.kind.description}
        >
            <div className="space-y-2">
              <Label id={eventFieldIds.eventType}>{messages.createEvent.eventTypeLabel}</Label>
              <div
                role="radiogroup"
                aria-labelledby={eventFieldIds.eventType}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={eventType === "time_grid"}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    eventType === "time_grid"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/40",
                  )}
                  onClick={() => {
                    selectEventType("time_grid");
                    clearErrors("eventType");
                  }}
                >
                  <Clock3Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      eventType === "time_grid" ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {messages.createEvent.eventTypeTimeGrid}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {messages.createEvent.eventTypeTimeGridDescription}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={eventType === "full_day"}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    eventType === "full_day"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/40",
                  )}
                  onClick={() => {
                    selectEventType("full_day");
                    clearErrors(
                      "eventType",
                      "dayStartMinutes",
                      "dayEndMinutes",
                      "slotMinutes",
                      "meetingDurationMinutes",
                    );
                  }}
                >
                  <CalendarDaysIcon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      eventType === "full_day" ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {messages.createEvent.eventTypeFullDay}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {messages.createEvent.eventTypeFullDayDescription}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {notificationsConfigured ? (
              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.notificationEmail}>
                  {messages.createEvent.notificationEmailLabel}
                </Label>
                <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
                {messages.createEvent.notificationEmailUnavailable}
              </p>
            )}
        </FormSection>

        <FormSection
          index="03"
          title={messages.createEvent.sections.timing.title}
          description={messages.createEvent.sections.timing.description}
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={eventFieldIds.timezone}>{messages.createEvent.timezoneLabel}</Label>
                <TimezoneCombobox
                  id={eventFieldIds.timezone}
                  label={messages.createEvent.timezoneLabel}
                  value={timezone}
                  onValueChange={(value) => {
                    setTimezone(value);
                    clearErrors("timezone");
                  }}
                  options={timezoneOptions}
                  placeholder={messages.createEvent.timezonePlaceholder}
                  invalid={Boolean(fieldErrors.timezone)}
                  describedBy={fieldErrors.timezone ? "timezone-error" : undefined}
                />
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
        </FormSection>

        {eventType === "time_grid" ? (
          <FormSection
            index="04"
            title={messages.createEvent.sections.grid.title}
            description={messages.createEvent.sections.grid.description}
          >
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {messages.createEvent.dailyWindowLabel}
              </legend>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                <div>
                  <Label htmlFor={eventFieldIds.dayStartMinutes} className="sr-only">
                    {messages.createEvent.dailyStartLabel}
                  </Label>
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
                        "w-full",
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
                </div>
                <ArrowRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <Label htmlFor={eventFieldIds.dayEndMinutes} className="sr-only">
                    {messages.createEvent.dailyEndLabel}
                  </Label>
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
                      aria-describedby={
                        fieldErrors.dayEndMinutes ? "day-end-error" : undefined
                      }
                      className={cn(
                        "w-full",
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
                </div>
              </div>
              {fieldErrors.dayStartMinutes ? (
                <p id="day-start-error" className="text-sm text-destructive">
                  {fieldErrors.dayStartMinutes}
                </p>
              ) : null}
              {fieldErrors.dayEndMinutes ? (
                <p id="day-end-error" className="text-sm text-destructive">
                  {fieldErrors.dayEndMinutes}
                </p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {messages.createEvent.granularityLabel}
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={eventFieldIds.slotMinutes} className="sr-only">
                    {messages.createEvent.slotSizeLabel}
                  </Label>
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
                      aria-describedby={
                        fieldErrors.slotMinutes ? "slot-size-error" : undefined
                      }
                      className={cn(
                        "w-full",
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
                </div>
                <div>
                  <Label htmlFor={eventFieldIds.meetingDurationMinutes} className="sr-only">
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
                        "w-full",
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
                </div>
              </div>
              {fieldErrors.slotMinutes ? (
                <p id="slot-size-error" className="text-sm text-destructive">
                  {fieldErrors.slotMinutes}
                </p>
              ) : null}
              {fieldErrors.meetingDurationMinutes ? (
                <p id="meeting-duration-error" className="text-sm text-destructive">
                  {fieldErrors.meetingDurationMinutes}
                </p>
              ) : null}
            </fieldset>
          </FormSection>
        ) : (
          <FormSection
            index="04"
            title={messages.createEvent.sections.startTime.title}
            description={messages.createEvent.sections.startTime.description}
          >
            <div className="max-w-md space-y-2">
              <Label htmlFor={eventFieldIds.fullDayStartMinutes}>
                {messages.createEvent.fullDayStartTimeLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {messages.createEvent.fullDayStartTimeDescription}
              </p>
              <Select
                value={
                  fullDayStartMinutes === undefined
                    ? "none"
                    : String(fullDayStartMinutes)
                }
                onValueChange={(value) => {
                  setFullDayStartMinutes(value === "none" ? undefined : Number(value));
                  clearErrors("fullDayStartMinutes");
                }}
              >
                <SelectTrigger
                  id={eventFieldIds.fullDayStartMinutes}
                  aria-invalid={fieldErrors.fullDayStartMinutes ? true : undefined}
                  aria-describedby={
                    fieldErrors.fullDayStartMinutes ? "full-day-start-error" : undefined
                  }
                  className={cn(
                    fieldErrors.fullDayStartMinutes &&
                      "border-destructive focus:ring-destructive/20",
                  )}
                >
                  <SelectValue placeholder={messages.createEvent.fullDayStartTimePlaceholder} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none">
                    {messages.createEvent.fullDayStartTimePlaceholder}
                  </SelectItem>
                  {timeOptions
                    .filter((option) => option.value < 24 * 60)
                    .map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {fieldErrors.fullDayStartMinutes ? (
                <p id="full-day-start-error" className="text-sm text-destructive">
                  {fieldErrors.fullDayStartMinutes}
                </p>
              ) : null}
            </div>
          </FormSection>
        )}

        <div className="space-y-3 border-t pt-6">
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            )}
            {messages.createEvent.createButton}
          </Button>
        </div>
      </form>

      <aside className="space-y-6">
        <Card className="sticky top-24">
          <CardHeader className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {messages.createEvent.previewTitle}
            </p>
            <CardTitle className="text-xl">
              {title || messages.createEvent.untitledEvent}
            </CardTitle>
            <CardDescription>
              {selectedTimezoneOption?.label ?? timezone}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/60 text-sm">
              <PreviewRow
                label={messages.createEvent.previewFields.dateRange}
                value={selectedRangeLabel}
              />
              <PreviewRow
                label={messages.createEvent.previewFields.eventType}
                value={selectedEventTypeLabel}
              />
              <PreviewRow
                label={messages.createEvent.previewFields.daysShown}
                value={String(selectedFilteredRangeDays)}
              />
              {eventType === "time_grid" ? (
                <>
                  <PreviewRow
                    label={messages.createEvent.previewFields.dailyWindow}
                    value={`${getTimeLabel(dayStartMinutes)} - ${getTimeLabel(dayEndMinutes)}`}
                  />
                  <PreviewRow
                    label={messages.createEvent.previewFields.granularity}
                    value={formatMessage(messages.createEvent.minutesShort, {
                      count: slotMinutes,
                    })}
                  />
                  <PreviewRow
                    label={messages.createEvent.previewFields.rankedWindow}
                    value={formatMessage(messages.createEvent.minutesShort, {
                      count: meetingDurationMinutes,
                    })}
                  />
                </>
              ) : fullDayStartMinutes !== undefined ? (
                <PreviewRow
                  label={messages.createEvent.previewFields.startTime}
                  value={getTimeLabel(fullDayStartMinutes)}
                />
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

type FormSectionProps = {
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
};

function FormSection({ index, title, description, children }: FormSectionProps) {
  return (
    <section className="grid gap-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-10">
      <div className="space-y-1.5 sm:pt-1">
        <p className="flex items-baseline gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="tabular-nums text-primary/70">{index}</span>
          <span className="text-foreground">{title}</span>
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type PreviewRowProps = {
  label: string;
  value: string;
};

function PreviewRow({ label, value }: PreviewRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}
