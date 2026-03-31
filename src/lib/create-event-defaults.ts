export type CreateEventDefaults = {
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
};

export const defaultCreateEventDefaults: CreateEventDefaults = {
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 18 * 60,
  slotMinutes: 60,
};
