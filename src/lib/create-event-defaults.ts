import { z } from "zod";

import { slotMinuteOptions } from "@/lib/constants";

export type CreateEventDefaults = {
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
};

export const defaultCreateEventDefaults: CreateEventDefaults = {
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 18 * 60,
  slotMinutes: 30,
};

const STORAGE_KEY = "tempoll_create_event_defaults";
const slotMinuteSet = new Set<number>(slotMinuteOptions);

const createEventDefaultsSchema = z
  .object({
    dayStartMinutes: z.number().int().min(0).max(23 * 60 + 30),
    dayEndMinutes: z.number().int().min(30).max(24 * 60),
    slotMinutes: z.number().int().refine((value) => slotMinuteSet.has(value)),
  })
  .superRefine((value, ctx) => {
    if (value.dayEndMinutes <= value.dayStartMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayEndMinutes"],
        message: "End time must be later than start time.",
      });
    }
  });

let cachedRawCreateEventDefaults: string | null | undefined;
let cachedCreateEventDefaults = defaultCreateEventDefaults;

function resetCreateEventDefaultsCache() {
  cachedRawCreateEventDefaults = null;
  cachedCreateEventDefaults = defaultCreateEventDefaults;
  return cachedCreateEventDefaults;
}

function updateCreateEventDefaultsCache(defaults: CreateEventDefaults) {
  cachedCreateEventDefaults = defaults;
  cachedRawCreateEventDefaults = JSON.stringify(defaults);
  return cachedCreateEventDefaults;
}

export function readCreateEventDefaults() {
  if (typeof window === "undefined") {
    return defaultCreateEventDefaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawCreateEventDefaults) {
      return cachedCreateEventDefaults;
    }

    if (!raw) {
      return resetCreateEventDefaultsCache();
    }

    const parsed = createEventDefaultsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return resetCreateEventDefaultsCache();
    }

    cachedRawCreateEventDefaults = raw;
    cachedCreateEventDefaults = parsed.data;
    return cachedCreateEventDefaults;
  } catch {
    return resetCreateEventDefaultsCache();
  }
}

export function saveCreateEventDefaults(defaults: CreateEventDefaults) {
  if (typeof window === "undefined") {
    return defaults;
  }

  const parsed = createEventDefaultsSchema.safeParse(defaults);
  const nextDefaults = parsed.success ? parsed.data : defaultCreateEventDefaults;
  updateCreateEventDefaultsCache(nextDefaults);
  window.localStorage.setItem(STORAGE_KEY, cachedRawCreateEventDefaults ?? JSON.stringify(nextDefaults));
  return nextDefaults;
}
