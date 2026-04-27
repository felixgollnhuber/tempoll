export type EventType = "time_grid" | "full_day";

export type EventCreateInput = {
  eventType: EventType;
  title: string;
  timezone: string;
  dates: string[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  meetingDurationMinutes: number;
  notificationEmail?: string;
};

export type ParticipantSession = {
  participantId: string;
  displayName: string;
  color: string;
};

export type AvailabilityBatchMutation = {
  selectedSlotStarts: string[];
};

export type TimezoneOption = {
  value: string;
  label: string;
  offsetMinutes: number;
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

export type FinalizedEventSlot = {
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
  eventType: EventType;
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
  finalizedSlot: FinalizedEventSlot | null;
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

export type ManageEventNotificationState = {
  isConfigured: boolean;
  recipientEmail: string | null;
  quietPeriodMinutes: number;
  lastSentAt: string | null;
  pendingDigest:
    | {
        participantCount: number;
        flushAfterAt: string;
      }
    | null;
};

export type ManageEventView = {
  manageKey: string;
  shareUrl: string;
  manageUrl: string;
  snapshot: PublicEventSnapshot;
  notification: ManageEventNotificationState;
};
