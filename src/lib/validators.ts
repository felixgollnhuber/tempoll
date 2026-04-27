import { z } from "zod";

import { meetingDurationOptions, slotMinuteOptions } from "@/lib/constants";
import type { Messages } from "@/lib/i18n/messages";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const slotMinuteSet = new Set<number>(slotMinuteOptions);
const meetingDurationSet = new Set<number>(meetingDurationOptions);
const fullDayDateLimit = 366;
const availabilitySelectionLimit = 3000;

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
      timezone: z.string().trim().min(1, messages.validation.eventCreate.timezoneRequired),
      dates: z
        .array(z.string().regex(dateKeyRegex, messages.validation.eventCreate.validCalendarDates))
        .min(1, messages.validation.eventCreate.chooseStartAndEndDate),
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
      if (data.eventType === "time_grid" && data.dates.length > 31) {
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
  ]);
}
