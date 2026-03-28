import { Prisma } from "@prisma/client";

import { appConfig } from "@/lib/config";
import type { AppLocale } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import {
  buildSnapshot,
  getAllowedFinalSlotStarts,
  getAllowedSlotStarts,
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
import { conflict, notFound, unauthorized } from "@/lib/errors";
import type {
  AvailabilityBatchMutation,
  CreateEventResult,
  EventCreateInput,
  ManageEventView,
  ParticipantSession,
  PublicEventSnapshot,
} from "@/lib/types";
import { publishEventUpdate } from "@/lib/realtime";

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
  };
}>;

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
    },
  });
}

async function getEventWithRelationsById(id: string) {
  return prisma.event.findUnique({
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
    },
  });
}

function toSnapshot(
  event: EventWithRelations,
  locale: AppLocale,
  currentParticipantId?: string | null,
): PublicEventSnapshot {
  return buildSnapshot({
    id: event.id,
    slug: event.slug,
    title: event.title,
    locale,
    timezone: event.timezone,
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
      timezone: input.timezone,
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

async function verifyParticipantMutation(slug: string, cookieValue?: string) {
  const participant = await getParticipantForSession(slug, cookieValue);

  if (!participant) {
    throw unauthorized("participant_session_missing");
  }

  const participantWithDates = await prisma.participant.findUnique({
    where: { id: participant.id },
    include: {
      event: {
        include: {
          dates: {
            orderBy: {
              dateKey: "asc",
            },
          },
        },
      },
    },
  });

  if (!participantWithDates || participantWithDates.event.slug !== slug) {
    throw notFound("participant_not_found");
  }

  if (participantWithDates.event.status === "CLOSED") {
    throw conflict("event_closed");
  }

  return participantWithDates;
}

export async function saveAvailability(
  slug: string,
  locale: AppLocale,
  mutation: AvailabilityBatchMutation,
  cookieValue?: string,
) {
  const participant = await verifyParticipantMutation(slug, cookieValue);
  const allowedSlots = getAllowedSlotStarts({
    dates: participant.event.dates.map((date) => date.dateKey),
    timezone: participant.event.timezone,
    dayStartMinutes: participant.event.dayStartMinutes,
    dayEndMinutes: participant.event.dayEndMinutes,
    slotMinutes: participant.event.slotMinutes,
  });

  const uniqueSlotStarts = Array.from(new Set(mutation.selectedSlotStarts));
  const invalidSlot = uniqueSlotStarts.find((slotStart) => !allowedSlots.has(slotStart));
  if (invalidSlot) {
    throw conflict("invalid_slots");
  }

  await prisma.$transaction([
    prisma.availabilitySlot.deleteMany({
      where: {
        participantId: participant.id,
      },
    }),
    ...(uniqueSlotStarts.length
      ? [
          prisma.availabilitySlot.createMany({
            data: uniqueSlotStarts.map((slotStart) => ({
              eventId: participant.eventId,
              participantId: participant.id,
              slotStartAt: new Date(slotStart),
            })),
          }),
        ]
      : []),
    prisma.participant.update({
      where: {
        id: participant.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    }),
  ]);

  const event = await getEventWithRelationsById(participant.eventId);
  if (!event) {
    throw notFound("event_not_found");
  }

  await publishEventUpdate({
    eventId: participant.eventId,
    kind: "availability-saved",
    participantId: participant.id,
  });

  return {
    snapshot: toSnapshot(event, locale, participant.id),
  };
}

async function verifyManageKey(manageKey: string) {
  const parsed = parseManageKey(manageKey);
  if (!parsed) {
    throw notFound("manage_key_invalid");
  }

  const event = await getEventWithRelationsById(parsed.eventId);
  if (!event) {
    throw notFound("manage_key_invalid");
  }

  if (event.manageTokenHash !== hashSecret(parsed.token)) {
    throw notFound("manage_key_invalid");
  }

  return event;
}

export async function getManageEventView(
  manageKey: string,
  locale: AppLocale,
): Promise<ManageEventView | null> {
  try {
    const event = await verifyManageKey(manageKey);
    const snapshot = toSnapshot(event, locale);

    return {
      manageKey,
      shareUrl: buildPublicEventUrl(event.slug),
      manageUrl: buildManageUrl(manageKey),
      snapshot,
    };
  } catch {
    return null;
  }
}

export async function updateManagedEvent(
  manageKey: string,
  input:
    | {
        action: "updateTitle";
        title: string;
      }
    | {
        action: "closeEvent";
        finalSlotStart: string;
      }
    | {
        action: "updateFixedDate";
        finalSlotStart: string;
      }
    | {
        action: "reopenEvent";
      }
    | {
        action: "renameParticipant";
        participantId: string;
        displayName: string;
      },
) {
  const event = await verifyManageKey(manageKey);

  function parseFinalSlotStart(finalSlotStart: string) {
    const allowedFinalSlotStarts = getAllowedFinalSlotStarts({
      dates: event.dates.map((date) => date.dateKey),
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

  if (input.action === "closeEvent" || input.action === "updateFixedDate") {
    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        status: "CLOSED",
        finalSlotStartAt: parseFinalSlotStart(input.finalSlotStart),
      },
    });
  }

  if (input.action === "reopenEvent") {
    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        status: "OPEN",
        finalSlotStartAt: null,
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

  await publishEventUpdate({
    eventId: event.id,
    kind: input.action === "renameParticipant" ? "participant-renamed" : "event-updated",
    participantId: input.action === "renameParticipant" ? input.participantId : undefined,
  });
}

export async function deleteParticipant(manageKey: string, participantId: string) {
  const event = await verifyManageKey(manageKey);

  const deleted = await prisma.participant.deleteMany({
    where: {
      id: participantId,
      eventId: event.id,
    },
  });

  if (deleted.count === 0) {
    throw notFound("participant_not_found");
  }

  await publishEventUpdate({
    eventId: event.id,
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
