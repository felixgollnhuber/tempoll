import { z } from "zod";

import { meetingDurationOptions, slotMinuteOptions } from "@/lib/constants";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const slotMinuteSet = new Set<number>(slotMinuteOptions);
const meetingDurationSet = new Set<number>(meetingDurationOptions);

export const eventCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Event title must be at least 3 characters long.")
      .max(80, "Event title must be 80 characters or fewer."),
    timezone: z.string().trim().min(1, "Choose a timezone."),
    dates: z
      .array(z.string().regex(dateKeyRegex, "Choose valid calendar dates."))
      .min(1, "Choose a start and end date.")
      .max(31, "Choose a date range of up to 31 days."),
    dayStartMinutes: z
      .number()
      .int()
      .min(0, "Choose a valid daily start time.")
      .max(23 * 60 + 30, "Choose a valid daily start time."),
    dayEndMinutes: z
      .number()
      .int()
      .min(30, "Choose a valid daily end time.")
      .max(24 * 60, "Choose a valid daily end time."),
    slotMinutes: z.coerce.number().refine((value) => slotMinuteSet.has(value), {
      message: "Select a supported slot size.",
    }),
    meetingDurationMinutes: z.coerce
      .number()
      .refine((value) => meetingDurationSet.has(value), {
        message: "Select a supported meeting duration.",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.dayEndMinutes <= data.dayStartMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayEndMinutes"],
        message: "End time must be later than start time.",
      });
    }

    if (data.meetingDurationMinutes % data.slotMinutes !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meetingDurationMinutes"],
        message: "Meeting duration must align with slot size.",
      });
    }
  });

export const participantCreateSchema = z.object({
  displayName: z.string().trim().min(2).max(32),
});

export const availabilityMutationSchema = z.object({
  selectedSlotStarts: z.array(z.string().datetime()).max(1000),
});

export const manageUpdateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("updateEvent"),
    title: z.string().trim().min(3).max(80),
    status: z.enum(["OPEN", "CLOSED"]),
  }),
  z.object({
    action: z.literal("renameParticipant"),
    participantId: z.string().min(1),
    displayName: z.string().trim().min(2).max(32),
  }),
]);
