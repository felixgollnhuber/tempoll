export type EventCreateInput = {
  title: string;
  timezone: string;
  dates: string[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  meetingDurationMinutes: number;
};

export type ParticipantSession = {
  participantId: string;
  displayName: string;
  color: string;
};

export type AvailabilityBatchMutation = {
  selectedSlotStarts: string[];
};

export type SnapshotDate = {
  dateKey: string;
  label: string;
};

export type SnapshotTimeRow = {
  minutes: number;
  label: string;
};

export type SnapshotSlot = {
  slotStart: string;
  dateKey: string;
  minutes: number;
  availabilityCount: number;
  participantIds: string[];
  selectedByCurrentUser: boolean;
};

export type SnapshotParticipant = {
  id: string;
  displayName: string;
  color: string;
  selectedSlotCount: number;
  isCurrentUser: boolean;
};

export type BestTimeSuggestion = {
  slotStart: string;
  slotEnd: string;
  dateKey: string;
  label: string;
  localLabel: string | null;
  availableCount: number;
  participantIds: string[];
};

export type PublicEventSnapshot = {
  id: string;
  slug: string;
  title: string;
  timezone: string;
  status: "OPEN" | "CLOSED";
  slotMinutes: number;
  meetingDurationMinutes: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
  dates: SnapshotDate[];
  timeRows: SnapshotTimeRow[];
  slots: SnapshotSlot[];
  participants: SnapshotParticipant[];
  suggestions: BestTimeSuggestion[];
  currentParticipant: SnapshotParticipant | null;
};

export type RealtimeEventPayload = {
  eventId: string;
  kind:
    | "availability-saved"
    | "participant-joined"
    | "participant-removed"
    | "participant-renamed"
    | "event-updated";
  participantId?: string;
};

export type CreateEventResult = {
  slug: string;
  manageKey: string;
};

export type ManageEventView = {
  manageKey: string;
  shareUrl: string;
  manageUrl: string;
  snapshot: PublicEventSnapshot;
};
