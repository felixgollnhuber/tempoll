import { z } from "zod";

import { meetingDurationOptions, slotMinuteOptions } from "@/lib/constants";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const slotMinuteSet = new Set<number>(slotMinuteOptions);
const meetingDurationSet = new Set<number>(meetingDurationOptions);

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    timezone: z.string().trim().min(1),
    dates: z.array(z.string().regex(dateKeyRegex)).min(1).max(31),
    dayStartMinutes: z.number().int().min(0).max(23 * 60 + 30),
    dayEndMinutes: z.number().int().min(30).max(24 * 60),
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
  participantId: z.string().min(1),
  editToken: z.string().min(1),
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
