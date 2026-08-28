import { z } from "zod";

import {
  fullDayDateLimit,
  meetingDurationOptions,
  slotMinuteOptions,
  timeGridDateLimit,
} from "@/lib/constants";
import {
  doesZonedCivilDateExist,
  hasFinalizableMeetingWindowOnEveryDate,
  isExistingZonedWallTime,
} from "@/lib/availability";
import type { Messages } from "@/lib/i18n/messages";

const slotMinuteSet = new Set<number>(slotMinuteOptions);
const meetingDurationSet = new Set<number>(meetingDurationOptions);
const availabilitySelectionLimit = 4000;
const supportedCalendarYearMin = 1900;
const supportedCalendarYearMax = 9998;
const isoDateKeySchema = z.iso.date();

function isSupportedCalendarDate(value: string) {
  if (!isoDateKeySchema.safeParse(value).success) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  return year >= supportedCalendarYearMin && year <= supportedCalendarYearMax;
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function createDateKeySchema(messages: Messages) {
  return z.string().refine(isSupportedCalendarDate, {
    message: messages.validation.eventCreate.validCalendarDates,
  });
}

const optionalFullDayStartMinutesSchema = z.preprocess(
  (value) => (value === null || value === undefined || value === "" ? undefined : value),
  z.coerce
    .number()
    .int()
    .min(0)
    .max(23 * 60 + 30)
    .optional(),
);

function createOptionalEmailSchema(messages: Messages) {
  return z
    .string()
    .trim()
    .max(320, messages.validation.setup.validEmail)
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: messages.validation.setup.validEmail,
    })
    .transform((value) => value || undefined);
}

function createOptionalTextSchema(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => value || undefined);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createEventCreateSchema(messages: Messages) {
  return z
    .object({
      eventType: z.enum(["time_grid", "full_day"]).default("time_grid"),
      title: z
        .string()
        .trim()
        .min(3, messages.validation.eventCreate.titleMin)
        .max(80, messages.validation.eventCreate.titleMax),
      location: createOptionalTextSchema(
        160,
        messages.validation.eventCreate.locationMax,
      ).optional(),
      isOnlineMeeting: z.boolean().default(false),
      meetingLink: createOptionalTextSchema(
        2048,
        messages.validation.eventCreate.meetingLinkMax,
      )
        .refine((value) => value === undefined || isHttpUrl(value), {
          message: messages.validation.eventCreate.meetingLinkUrl,
        })
        .optional(),
      timezone: z
        .string()
        .trim()
        .min(1, messages.validation.eventCreate.timezoneRequired)
        .refine(isValidTimezone, messages.validation.eventCreate.timezoneRequired),
      dates: z
        .array(createDateKeySchema(messages))
        .min(1, messages.validation.eventCreate.chooseStartAndEndDate)
        .max(fullDayDateLimit, messages.validation.eventCreate.fullDayDateRangeMax),
      fullDayStartMinutes: optionalFullDayStartMinutesSchema,
      dayStartMinutes: z
        .number()
        .int()
        .min(0, messages.validation.eventCreate.validDailyStart)
        .max(23 * 60 + 30, messages.validation.eventCreate.validDailyStart),
      dayEndMinutes: z
        .number()
        .int()
        .min(30, messages.validation.eventCreate.validDailyEnd)
        .max(24 * 60, messages.validation.eventCreate.validDailyEnd),
      slotMinutes: z.coerce.number().refine((value) => slotMinuteSet.has(value), {
        message: messages.validation.eventCreate.supportedSlotSize,
      }),
      meetingDurationMinutes: z.coerce
        .number()
        .refine((value) => meetingDurationSet.has(value), {
          message: messages.validation.eventCreate.supportedMeetingDuration,
        }),
      notificationEmail: createOptionalEmailSchema(messages).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.eventType === "time_grid" && data.dates.length > timeGridDateLimit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dates"],
          message: messages.validation.eventCreate.dateRangeMax,
        });
      }

      if (data.eventType === "full_day" && data.dates.length > fullDayDateLimit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dates"],
          message: messages.validation.eventCreate.fullDayDateRangeMax,
        });
      }

      if (data.dayEndMinutes <= data.dayStartMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dayEndMinutes"],
          message: messages.validation.eventCreate.endAfterStart,
        });
      }

      const datesAreSafeToEnumerate =
        data.dates.length > 0 &&
        data.dates.length <= fullDayDateLimit &&
        data.dates.every(isSupportedCalendarDate);
      const dayWindowIsValid =
        Number.isInteger(data.dayStartMinutes) &&
        Number.isInteger(data.dayEndMinutes) &&
        data.dayStartMinutes >= 0 &&
        data.dayStartMinutes <= 23 * 60 + 30 &&
        data.dayEndMinutes >= 30 &&
        data.dayEndMinutes <= 24 * 60 &&
        data.dayEndMinutes > data.dayStartMinutes;
      const slotConfigurationIsValid =
        slotMinuteSet.has(data.slotMinutes) &&
        meetingDurationSet.has(data.meetingDurationMinutes) &&
        data.meetingDurationMinutes % data.slotMinutes === 0;
      const timezoneIsValid = isValidTimezone(data.timezone);

      if (
        data.eventType === "time_grid" &&
        data.dates.length <= timeGridDateLimit &&
        datesAreSafeToEnumerate &&
        dayWindowIsValid &&
        slotConfigurationIsValid &&
        timezoneIsValid &&
        !hasFinalizableMeetingWindowOnEveryDate({
          dates: data.dates,
          timezone: data.timezone,
          dayStartMinutes: data.dayStartMinutes,
          dayEndMinutes: data.dayEndMinutes,
          slotMinutes: data.slotMinutes,
          meetingDurationMinutes: data.meetingDurationMinutes,
        })
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dayEndMinutes"],
          message: messages.validation.eventCreate.meetingWindowRequired,
        });
      }

      if (
        data.eventType === "full_day" &&
        datesAreSafeToEnumerate &&
        timezoneIsValid &&
        data.dates.some(
          (dateKey) => !doesZonedCivilDateExist({ dateKey, timezone: data.timezone }),
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dates"],
          message: messages.validation.eventCreate.fullDayDateUnavailable,
        });
      }

      if (
        data.eventType === "full_day" &&
        datesAreSafeToEnumerate &&
        timezoneIsValid &&
        data.fullDayStartMinutes != null &&
        Number.isInteger(data.fullDayStartMinutes) &&
        data.fullDayStartMinutes >= 0 &&
        data.fullDayStartMinutes <= 23 * 60 + 30 &&
        data.dates.some(
          (dateKey) =>
            !isExistingZonedWallTime({
              dateKey,
              minutes: data.fullDayStartMinutes ?? 0,
              timezone: data.timezone,
            }),
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fullDayStartMinutes"],
          message: messages.validation.eventCreate.fullDayStartUnavailable,
        });
      }

      if (data.meetingDurationMinutes % data.slotMinutes !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["meetingDurationMinutes"],
          message: messages.validation.eventCreate.durationMatchesSlot,
        });
      }
    })
    .transform((data) => {
      const { location, meetingLink, ...baseData } = data;

      return {
        ...baseData,
        ...(!data.isOnlineMeeting && location ? { location } : {}),
        ...(data.isOnlineMeeting && meetingLink ? { meetingLink } : {}),
      };
    });
}

export function createParticipantCreateSchema(messages: Messages) {
  return z.object({
    displayName: z
      .string()
      .trim()
      .min(2, messages.validation.participantCreate.nameMin)
      .max(32, messages.validation.participantCreate.nameMax),
  });
}

export function createAvailabilityMutationSchema() {
  return z.object({
    selectedSlotStarts: z.array(z.string().datetime()).max(availabilitySelectionLimit),
  });
}

export function createManageUpdateSchema(messages: Messages) {
  return z.discriminatedUnion("action", [
    z.object({
      action: z.literal("updateTitle"),
      title: z
        .string()
        .trim()
        .min(3, messages.validation.eventCreate.titleMin)
        .max(80, messages.validation.eventCreate.titleMax),
    }),
    z.object({
      action: z.literal("closeEvent"),
      finalSlotStart: z.string().datetime(),
    }),
    z.object({
      action: z.literal("updateFixedDate"),
      finalSlotStart: z.string().datetime(),
    }),
    z.object({
      action: z.literal("reopenEvent"),
    }),
    z.object({
      action: z.literal("renameParticipant"),
      participantId: z.string().min(1),
      displayName: z
        .string()
        .trim()
        .min(2, messages.validation.participantCreate.nameMin)
        .max(32, messages.validation.participantCreate.nameMax),
    }),
    z.object({
      action: z.literal("updateNotificationEmail"),
      notificationEmail: createOptionalEmailSchema(messages).optional(),
    }),
    z.object({
      action: z.literal("updateSchedule"),
      dates: z
        .array(createDateKeySchema(messages))
        .min(1, messages.validation.eventCreate.chooseStartAndEndDate)
        .max(fullDayDateLimit, messages.validation.eventCreate.fullDayDateRangeMax),
      dayStartMinutes: z
        .number()
        .int()
        .min(0, messages.validation.eventCreate.validDailyStart)
        .max(23 * 60 + 30, messages.validation.eventCreate.validDailyStart)
        .optional(),
      dayEndMinutes: z
        .number()
        .int()
        .min(30, messages.validation.eventCreate.validDailyEnd)
        .max(24 * 60, messages.validation.eventCreate.validDailyEnd)
        .optional(),
      expectedScheduleSignature: z.string().min(1).max(10_000),
      expectedDeletedVotes: z.number().int().min(0),
      expectedAffectedParticipants: z.number().int().min(0),
    }),
  ]).superRefine((data, ctx) => {
    if (
      data.action === "updateSchedule" &&
      data.dayStartMinutes != null &&
      data.dayEndMinutes != null &&
      data.dayEndMinutes <= data.dayStartMinutes
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayEndMinutes"],
        message: messages.validation.eventCreate.endAfterStart,
      });
    }
  });
}

export type ManageUpdateInput = z.infer<ReturnType<typeof createManageUpdateSchema>>;
