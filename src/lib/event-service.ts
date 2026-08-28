import { Prisma } from "@prisma/client";

import {
  buildManageEventNotificationState,
  ensureAvailabilityDigestSchedulerStarted,
  queueAvailabilityDigest,
  updateNotificationRecipient,
} from "@/lib/availability-notifications";
import { appConfig, isNotificationDeliveryConfigured } from "@/lib/config";
import { fullDayDateLimit, timeGridDateLimit } from "@/lib/constants";
import type { AppLocale } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import {
  buildScheduleSignature,
  buildSnapshot,
  doesZonedCivilDateExist,
  getAllowedFullDaySlotStarts,
  getAllowedFinalSlotStarts,
  getAllowedSlotStarts,
  hasFinalizableMeetingWindowOnEveryDate,
  isExistingZonedWallTime,
  sortDateKeys,
} from "@/lib/availability";
import {
  buildManageKey,
  buildManageUrl,
  buildParticipantCookieValue,
  buildPublicEventUrl,
  createOpaqueToken,
  getParticipantCookieName,
  hashSecret,
  makeSlug,
  normalizeName,
  normalizeNameKey,
  parseManageKey,
  parseParticipantCookieValue,
  pickParticipantColor,
} from "@/lib/tokens";
import { badRequest, conflict, notFound, serviceUnavailable, unauthorized } from "@/lib/errors";
import type {
  AvailabilityBatchMutation,
  CreateEventResult,
  EventCreateInput,
  ManageEventView,
  ParticipantSession,
  PublicEventSnapshot,
} from "@/lib/types";
import { publishEventUpdate } from "@/lib/realtime";
import type { ManageUpdateInput } from "@/lib/validators";

type EventWithRelations = Prisma.EventGetPayload<{
  include: {
    dates: {
      orderBy: {
        dateKey: "asc";
      };
    };
    participants: {
      orderBy: {
        createdAt: "asc";
      };
      include: {
        availabilitySlots: {
          select: {
            slotStartAt: true;
          };
        };
      };
    };
    availabilityNotification: true;
  };
}>;

type EventReader = Pick<Prisma.TransactionClient, "event">;
type EventLockMode = "share" | "update";

const lockedEventTransactionAttempts = 3;

async function getEventWithRelationsBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      dates: {
        orderBy: {
          dateKey: "asc",
        },
      },
      participants: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          availabilitySlots: {
            select: {
              slotStartAt: true,
            },
          },
        },
      },
      availabilityNotification: true,
    },
  });
}

async function getEventWithRelationsById(id: string, client: EventReader = prisma) {
  return client.event.findUnique({
    where: { id },
    include: {
      dates: {
        orderBy: {
          dateKey: "asc",
        },
      },
      participants: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          availabilitySlots: {
            select: {
              slotStartAt: true,
            },
          },
        },
      },
      availabilityNotification: true,
    },
  });
}

async function lockEventRow(
  transaction: Prisma.TransactionClient,
  eventId: string,
  mode: EventLockMode,
) {
  const rows =
    mode === "share"
      ? await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR SHARE
        `
      : await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE
        `;

  return rows.length > 0;
}

async function lockParticipantRow(
  transaction: Prisma.TransactionClient,
  participantId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Participant" WHERE "id" = ${participantId} FOR UPDATE
  `;

  return rows.length > 0;
}

async function runLockedEventTransaction<T>({
  eventId,
  mode,
  missingCode,
  operation,
}: {
  eventId: string;
  mode: EventLockMode;
  missingCode: "event_not_found" | "manage_key_invalid";
  operation: (transaction: Prisma.TransactionClient) => Promise<T>;
}) {
  for (let attempt = 1; attempt <= lockedEventTransactionAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          if (!(await lockEventRow(transaction, eventId, mode))) {
            throw notFound(missingCode);
          }

          return operation(transaction);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 5_000,
          timeout: 10_000,
        },
      );
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (!shouldRetry || attempt === lockedEventTransactionAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Locked event transaction exhausted unexpectedly.");
}

function toSnapshot(
  event: EventWithRelations,
  locale: AppLocale,
  currentParticipantId?: string | null,
): PublicEventSnapshot {
  const eventType = event.type === "FULL_DAY" ? "full_day" : "time_grid";

  return buildSnapshot({
    id: event.id,
    slug: event.slug,
    title: event.title,
    location: event.location,
    isOnlineMeeting: event.isOnlineMeeting,
    meetingLink: event.meetingLink,
    eventType,
    locale,
    timezone: event.timezone,
    fullDayStartMinutes: event.fullDayStartMinutes,
    status: event.status,
    slotMinutes: event.slotMinutes,
    meetingDurationMinutes: event.meetingDurationMinutes,
    dayStartMinutes: event.dayStartMinutes,
    dayEndMinutes: event.dayEndMinutes,
    dates: event.dates.map((date) => date.dateKey),
    participants: event.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      color: participant.color,
      availabilitySlotStarts: participant.availabilitySlots.map((slot) => slot.slotStartAt.toISOString()),
    })),
    finalSlotStart: event.finalSlotStartAt?.toISOString() ?? null,
    currentParticipantId,
  });
}

async function getParticipantForSession(slug: string, cookieValue?: string) {
  const parsed = parseParticipantCookieValue(cookieValue);
  if (!parsed) {
    return null;
  }

  const participant = await prisma.participant.findUnique({
    where: {
      id: parsed.participantId,
    },
    include: {
      event: true,
    },
  });

  if (!participant || participant.event.slug !== slug) {
    return null;
  }

  if (participant.editTokenHash !== hashSecret(parsed.token)) {
    return null;
  }

  return participant;
}

async function getParticipantByEditLink(slug: string, participantId: string, token: string) {
  const participant = await prisma.participant.findUnique({
    where: {
      id: participantId,
    },
    include: {
      event: true,
    },
  });

  if (!participant || participant.event.slug !== slug) {
    return null;
  }

  if (participant.editTokenHash !== hashSecret(token)) {
    return null;
  }

  return participant;
}

export async function createEvent(input: EventCreateInput): Promise<CreateEventResult> {
  if (input.notificationEmail && !isNotificationDeliveryConfigured()) {
    throw serviceUnavailable("notification_delivery_unavailable");
  }

  let slug = makeSlug(input.title);
  while (await prisma.event.findUnique({ where: { slug }, select: { id: true } })) {
    slug = makeSlug(input.title);
  }

  const rawManageToken = createOpaqueToken();
  const manageTokenHash = hashSecret(rawManageToken);

  const event = await prisma.event.create({
    data: {
      slug,
      title: input.title,
      type: input.eventType === "full_day" ? "FULL_DAY" : "TIME_GRID",
      location: input.isOnlineMeeting ? undefined : input.location,
      isOnlineMeeting: input.isOnlineMeeting,
      meetingLink: input.isOnlineMeeting ? input.meetingLink : undefined,
      timezone: input.timezone,
      fullDayStartMinutes:
        input.eventType === "full_day" ? input.fullDayStartMinutes ?? null : null,
      slotMinutes: input.slotMinutes,
      meetingDurationMinutes: input.meetingDurationMinutes,
      dayStartMinutes: input.dayStartMinutes,
      dayEndMinutes: input.dayEndMinutes,
      manageTokenHash,
      dates: {
        createMany: {
          data: input.dates.map((dateKey) => ({ dateKey })),
        },
      },
      availabilityNotification: input.notificationEmail
        ? {
            create: {
              recipientEmail: input.notificationEmail.trim().toLowerCase(),
            },
          }
        : undefined,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  return {
    slug: event.slug,
    manageKey: buildManageKey(event.id, rawManageToken),
  };
}

export async function getPublicEventSnapshot(
  slug: string,
  locale: AppLocale,
  cookieValue?: string,
) {
  await ensureAvailabilityDigestSchedulerStarted();

  const [event, participant] = await Promise.all([
    getEventWithRelationsBySlug(slug),
    getParticipantForSession(slug, cookieValue),
  ]);

  if (!event) {
    return null;
  }

  return {
    snapshot: toSnapshot(event, locale, participant?.id),
    participant: participant
      ? {
          id: participant.id,
          displayName: participant.displayName,
          color: participant.color,
        }
      : null,
  };
}

export async function joinParticipant(slug: string, displayName: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      participants: {
        select: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!event) {
    throw notFound("event_not_found");
  }

  if (event.status === "CLOSED") {
    throw conflict("event_closed");
  }

  const normalizedName = normalizeName(displayName);
  const normalizedNameKey = normalizeNameKey(normalizedName);
  const rawEditToken = createOpaqueToken();

  let participant;

  try {
    participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        displayName: normalizedName,
        displayNameNormalized: normalizedNameKey,
        color: pickParticipantColor(event.participants.length),
        editTokenHash: hashSecret(rawEditToken),
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        displayName: true,
        color: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("participant_name_taken");
    }

    throw error;
  }

  await publishEventUpdate({
    eventId: event.id,
    kind: "participant-joined",
    participantId: participant.id,
  });

  const session: ParticipantSession = {
    participantId: participant.id,
    displayName: participant.displayName,
    color: participant.color,
  };

  return {
    session,
    cookieName: getParticipantCookieName(slug),
    cookieValue: buildParticipantCookieValue(participant.id, rawEditToken),
  };
}

export async function saveAvailability(
  slug: string,
  locale: AppLocale,
  mutation: AvailabilityBatchMutation,
  cookieValue?: string,
) {
  await ensureAvailabilityDigestSchedulerStarted();

  const parsedSession = parseParticipantCookieValue(cookieValue);
  const authenticatedParticipant = await getParticipantForSession(slug, cookieValue);
  if (!parsedSession || !authenticatedParticipant) {
    throw unauthorized("participant_session_missing");
  }

  const uniqueSlotStarts = Array.from(new Set(mutation.selectedSlotStarts));
  const result = await runLockedEventTransaction({
    eventId: authenticatedParticipant.eventId,
    mode: "share",
    missingCode: "event_not_found",
    operation: async (transaction) => {
      if (!(await lockParticipantRow(transaction, parsedSession.participantId))) {
        throw unauthorized("participant_session_missing");
      }

      const participant = await transaction.participant.findUnique({
        where: { id: parsedSession.participantId },
        include: {
          event: {
            include: {
              dates: {
                orderBy: {
                  dateKey: "asc",
                },
              },
              availabilityNotification: {
                select: {
                  recipientEmail: true,
                },
              },
            },
          },
          availabilitySlots: {
            select: {
              slotStartAt: true,
            },
          },
        },
      });

      if (
        !participant ||
        participant.event.slug !== slug ||
        participant.editTokenHash !== hashSecret(parsedSession.token)
      ) {
        throw unauthorized("participant_session_missing");
      }

      if (participant.event.status === "CLOSED") {
        throw conflict("event_closed");
      }

      const eventType = participant.event.type === "FULL_DAY" ? "full_day" : "time_grid";
      const eventDateKeys = participant.event.dates.map((date) => date.dateKey);
      const allowedSlots =
        eventType === "full_day"
          ? getAllowedFullDaySlotStarts({
              dates: eventDateKeys,
              timezone: participant.event.timezone,
            })
          : getAllowedSlotStarts({
              dates: eventDateKeys,
              timezone: participant.event.timezone,
              dayStartMinutes: participant.event.dayStartMinutes,
              dayEndMinutes: participant.event.dayEndMinutes,
              slotMinutes: participant.event.slotMinutes,
            });

      if (uniqueSlotStarts.some((slotStart) => !allowedSlots.has(slotStart))) {
        throw conflict("invalid_slots");
      }

      const currentSelectionSignature = participant.availabilitySlots
        .map((slot) => slot.slotStartAt.toISOString())
        .sort()
        .join("|");
      const nextSelectionSignature = [...uniqueSlotStarts].sort().join("|");
      const didAvailabilityChange = currentSelectionSignature !== nextSelectionSignature;

      if (didAvailabilityChange) {
        await transaction.availabilitySlot.deleteMany({
          where: {
            participantId: participant.id,
          },
        });

        if (uniqueSlotStarts.length > 0) {
          await transaction.availabilitySlot.createMany({
            data: uniqueSlotStarts.map((slotStart) => ({
              eventId: participant.eventId,
              participantId: participant.id,
              slotStartAt: new Date(slotStart),
            })),
          });
        }
      }

      await transaction.participant.update({
        where: {
          id: participant.id,
        },
        data: {
          lastSeenAt: new Date(),
        },
      });

      const event = await getEventWithRelationsById(participant.eventId, transaction);
      if (!event) {
        throw notFound("event_not_found");
      }

      return {
        didAvailabilityChange,
        event,
        eventId: participant.eventId,
        notificationEmail: participant.event.availabilityNotification?.recipientEmail ?? null,
        participantId: participant.id,
      };
    },
  });

  if (result.didAvailabilityChange) {
    await publishEventUpdate({
      eventId: result.eventId,
      kind: "availability-saved",
      participantId: result.participantId,
    });
  }

  if (result.didAvailabilityChange && result.notificationEmail) {
    await queueAvailabilityDigest({
      eventId: result.eventId,
      participantId: result.participantId,
      recipientEmail: result.notificationEmail,
    });
  }

  return {
    snapshot: toSnapshot(result.event, locale, result.participantId),
  };
}

async function verifyManageKey(manageKey: string, client: EventReader = prisma) {
  const parsed = parseManageKey(manageKey);
  if (!parsed) {
    throw notFound("manage_key_invalid");
  }

  const event = await getEventWithRelationsById(parsed.eventId, client);
  if (!event) {
    throw notFound("manage_key_invalid");
  }

  if (event.manageTokenHash !== hashSecret(parsed.token)) {
    if (event.availabilityNotification?.emailManageTokenHash !== hashSecret(parsed.token)) {
      throw notFound("manage_key_invalid");
    }
  }

  return event;
}

function parseFinalSlotStart(event: EventWithRelations, finalSlotStart: string) {
  const eventType = event.type === "FULL_DAY" ? "full_day" : "time_grid";
  const eventDateKeys = event.dates.map((date) => date.dateKey);
  const allowedFinalSlotStarts =
    eventType === "full_day"
      ? getAllowedFullDaySlotStarts({
          dates: eventDateKeys,
          timezone: event.timezone,
        })
      : getAllowedFinalSlotStarts({
          dates: eventDateKeys,
          timezone: event.timezone,
          dayStartMinutes: event.dayStartMinutes,
          dayEndMinutes: event.dayEndMinutes,
          slotMinutes: event.slotMinutes,
          meetingDurationMinutes: event.meetingDurationMinutes,
        });

  if (!allowedFinalSlotStarts.has(finalSlotStart)) {
    throw conflict("final_slot_invalid");
  }

  return new Date(finalSlotStart);
}

async function updateLockedSchedule(
  transaction: Prisma.TransactionClient,
  event: EventWithRelations,
  input: Extract<ManageUpdateInput, { action: "updateSchedule" }>,
) {
  if (event.status === "CLOSED") {
    throw conflict("event_closed");
  }

  const currentScheduleSignature = buildScheduleSignature({
    dates: event.dates.map((date) => date.dateKey),
    dayStartMinutes: event.dayStartMinutes,
    dayEndMinutes: event.dayEndMinutes,
  });
  if (input.expectedScheduleSignature !== currentScheduleSignature) {
    throw conflict("schedule_changed");
  }

  const eventType = event.type === "FULL_DAY" ? "full_day" : "time_grid";
  const nextDateKeys = sortDateKeys(input.dates);
  const maxDates = eventType === "full_day" ? fullDayDateLimit : timeGridDateLimit;
  if (nextDateKeys.length > maxDates) {
    throw badRequest("too_many_dates", {
      params: {
        limit: maxDates,
      },
    });
  }

  const nextDayStartMinutes =
    eventType === "time_grid" && input.dayStartMinutes != null
      ? input.dayStartMinutes
      : event.dayStartMinutes;
  const nextDayEndMinutes =
    eventType === "time_grid" && input.dayEndMinutes != null
      ? input.dayEndMinutes
      : event.dayEndMinutes;

  if (nextDayEndMinutes <= nextDayStartMinutes) {
    throw badRequest("invalid_day_window");
  }

  if (
    eventType === "full_day" &&
    nextDateKeys.some(
      (dateKey) => !doesZonedCivilDateExist({ dateKey, timezone: event.timezone }),
    )
  ) {
    throw badRequest("full_day_date_unavailable");
  }

  if (
    eventType === "full_day" &&
    event.fullDayStartMinutes != null &&
    nextDateKeys.some(
      (dateKey) =>
        !isExistingZonedWallTime({
          dateKey,
          minutes: event.fullDayStartMinutes ?? 0,
          timezone: event.timezone,
        }),
    )
  ) {
    throw badRequest("full_day_start_unavailable");
  }

  if (
    eventType === "time_grid" &&
    !hasFinalizableMeetingWindowOnEveryDate({
      dates: nextDateKeys,
      timezone: event.timezone,
      dayStartMinutes: nextDayStartMinutes,
      dayEndMinutes: nextDayEndMinutes,
      slotMinutes: event.slotMinutes,
      meetingDurationMinutes: event.meetingDurationMinutes,
    })
  ) {
    throw badRequest("schedule_no_valid_meeting_window", {
      params: {
        duration: event.meetingDurationMinutes,
      },
    });
  }

  const currentDateKeys = event.dates.map((date) => date.dateKey);
  const currentAllowedSlotStarts =
    eventType === "full_day"
      ? getAllowedFullDaySlotStarts({
          dates: currentDateKeys,
          timezone: event.timezone,
        })
      : getAllowedSlotStarts({
          dates: currentDateKeys,
          timezone: event.timezone,
          dayStartMinutes: event.dayStartMinutes,
          dayEndMinutes: event.dayEndMinutes,
          slotMinutes: event.slotMinutes,
        });
  const nextAllowedSlotStarts =
    eventType === "full_day"
      ? getAllowedFullDaySlotStarts({
          dates: nextDateKeys,
          timezone: event.timezone,
        })
      : getAllowedSlotStarts({
          dates: nextDateKeys,
          timezone: event.timezone,
          dayStartMinutes: nextDayStartMinutes,
          dayEndMinutes: nextDayEndMinutes,
          slotMinutes: event.slotMinutes,
        });
  const retainedSlotStarts = new Set(
    Array.from(currentAllowedSlotStarts).filter((slotStart) => nextAllowedSlotStarts.has(slotStart)),
  );
  // Slots that were already invalid are legacy orphans. Always remove them instead of
  // silently resurrecting old availability when a date or time is added back later.
  const retainedSlotStartDates = Array.from(retainedSlotStarts).map((iso) => new Date(iso));
  const affectedParticipantIds = new Set<string>();
  let deletedVotes = 0;

  for (const participant of event.participants) {
    for (const slot of participant.availabilitySlots) {
      if (!retainedSlotStarts.has(slot.slotStartAt.toISOString())) {
        deletedVotes += 1;
        affectedParticipantIds.add(participant.id);
      }
    }
  }

  if (
    input.expectedDeletedVotes !== deletedVotes ||
    input.expectedAffectedParticipants !== affectedParticipantIds.size
  ) {
    throw conflict("schedule_preview_stale");
  }

  if (deletedVotes > 0) {
    const deletion = await transaction.availabilitySlot.deleteMany({
      where: {
        eventId: event.id,
        slotStartAt: { notIn: retainedSlotStartDates },
      },
    });

    if (deletion.count !== deletedVotes) {
      throw conflict("schedule_preview_stale");
    }
  }

  if (
    eventType === "time_grid" &&
    (nextDayStartMinutes !== event.dayStartMinutes || nextDayEndMinutes !== event.dayEndMinutes)
  ) {
    await transaction.event.update({
      where: { id: event.id },
      data: {
        dayStartMinutes: nextDayStartMinutes,
        dayEndMinutes: nextDayEndMinutes,
      },
    });
  }

  const currentDateKeySet = new Set(currentDateKeys);
  const nextDateKeySet = new Set(nextDateKeys);
  const removedDateKeys = [...currentDateKeySet].filter((dateKey) => !nextDateKeySet.has(dateKey));
  const addedDateKeys = nextDateKeys.filter((dateKey) => !currentDateKeySet.has(dateKey));

  if (removedDateKeys.length > 0) {
    await transaction.eventDate.deleteMany({
      where: { eventId: event.id, dateKey: { in: removedDateKeys } },
    });
  }

  if (addedDateKeys.length > 0) {
    await transaction.eventDate.createMany({
      data: addedDateKeys.map((dateKey) => ({ eventId: event.id, dateKey })),
      skipDuplicates: true,
    });
  }
}

export async function getManageEventView(
  manageKey: string,
  locale: AppLocale,
): Promise<ManageEventView | null> {
  try {
    await ensureAvailabilityDigestSchedulerStarted();

    const event = await verifyManageKey(manageKey);
    const snapshot = toSnapshot(event, locale);

    return {
      manageKey,
      shareUrl: buildPublicEventUrl(event.slug),
      manageUrl: buildManageUrl(manageKey),
      snapshot,
      notification: buildManageEventNotificationState(event.availabilityNotification),
    };
  } catch {
    return null;
  }
}

export async function updateManagedEvent(
  manageKey: string,
  input: ManageUpdateInput,
) {
  if (
    input.action === "closeEvent" ||
    input.action === "updateFixedDate" ||
    input.action === "reopenEvent" ||
    input.action === "updateSchedule"
  ) {
    const authorizedEvent = await verifyManageKey(manageKey);

    await runLockedEventTransaction({
      eventId: authorizedEvent.id,
      mode: "update",
      missingCode: "manage_key_invalid",
      operation: async (transaction) => {
        const event = await verifyManageKey(manageKey, transaction);

        if (input.action === "closeEvent" || input.action === "updateFixedDate") {
          await transaction.event.update({
            where: {
              id: event.id,
            },
            data: {
              status: "CLOSED",
              finalSlotStartAt: parseFinalSlotStart(event, input.finalSlotStart),
            },
          });
          return;
        }

        if (input.action === "reopenEvent") {
          await transaction.event.update({
            where: {
              id: event.id,
            },
            data: {
              status: "OPEN",
              finalSlotStartAt: null,
            },
          });
          return;
        }

        await updateLockedSchedule(transaction, event, input);
      },
    });

    await publishEventUpdate({
      eventId: authorizedEvent.id,
      kind: "event-updated",
      participantId: undefined,
    });

    return {};
  }

  const event = await verifyManageKey(manageKey);

  if (input.action === "updateTitle") {
    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        title: input.title,
      },
    });
  }

  if (input.action === "renameParticipant") {
    const participant = await prisma.participant.findUnique({
      where: {
        id: input.participantId,
      },
      select: {
        eventId: true,
      },
    });

    if (!participant || participant.eventId !== event.id) {
      throw notFound("participant_not_found");
    }

    try {
      await prisma.participant.update({
        where: {
          id: input.participantId,
        },
        data: {
          displayName: normalizeName(input.displayName),
          displayNameNormalized: normalizeNameKey(input.displayName),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("participant_name_taken");
      }

      throw error;
    }
  }

  if (input.action === "updateNotificationEmail") {
    const notification = await updateNotificationRecipient(event.id, input.notificationEmail);

    await publishEventUpdate({
      eventId: event.id,
      kind: "event-updated",
    });

    return {
      notification,
    };
  }

  await publishEventUpdate({
    eventId: event.id,
    kind: input.action === "renameParticipant" ? "participant-renamed" : "event-updated",
    participantId: input.action === "renameParticipant" ? input.participantId : undefined,
  });

  return {};
}

export async function deleteParticipant(manageKey: string, participantId: string) {
  const authorizedEvent = await verifyManageKey(manageKey);

  await runLockedEventTransaction({
    eventId: authorizedEvent.id,
    mode: "update",
    missingCode: "manage_key_invalid",
    operation: async (transaction) => {
      const event = await verifyManageKey(manageKey, transaction);
      const deleted = await transaction.participant.deleteMany({
        where: {
          id: participantId,
          eventId: event.id,
        },
      });

      if (deleted.count === 0) {
        throw notFound("participant_not_found");
      }
    },
  });

  await publishEventUpdate({
    eventId: authorizedEvent.id,
    kind: "participant-removed",
    participantId,
  });
}

export function getPublicLinks(slug: string, manageKey: string) {
  return {
    shareUrl: buildPublicEventUrl(slug),
    manageUrl: buildManageUrl(manageKey),
    cookieName: getParticipantCookieName(slug),
    cookieMaxAge: appConfig.sessionMaxAgeSeconds,
  };
}

export async function getParticipantSessionCookieFromEditLink(
  slug: string,
  participantId: string,
  token: string,
) {
  const participant = await getParticipantByEditLink(slug, participantId, token);
  if (!participant) {
    return null;
  }

  await prisma.participant.update({
    where: {
      id: participant.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return {
    cookieName: getParticipantCookieName(slug),
    cookieValue: buildParticipantCookieValue(participant.id, token),
  };
}
