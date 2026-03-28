import { z } from "zod";

import { meetingDurationOptions, slotMinuteOptions } from "@/lib/constants";
import type { Messages } from "@/lib/i18n/messages";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const slotMinuteSet = new Set<number>(slotMinuteOptions);
const meetingDurationSet = new Set<number>(meetingDurationOptions);

export function createEventCreateSchema(messages: Messages) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(3, messages.validation.eventCreate.titleMin)
        .max(80, messages.validation.eventCreate.titleMax),
      timezone: z.string().trim().min(1, messages.validation.eventCreate.timezoneRequired),
      dates: z
        .array(z.string().regex(dateKeyRegex, messages.validation.eventCreate.validCalendarDates))
        .min(1, messages.validation.eventCreate.chooseStartAndEndDate)
        .max(31, messages.validation.eventCreate.dateRangeMax),
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
    })
    .superRefine((data, ctx) => {
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
    selectedSlotStarts: z.array(z.string().datetime()).max(1000),
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
  ]);
}
