import { Prisma } from "@prisma/client";
import { Resend } from "resend";

import { buildSnapshot } from "@/lib/availability";
import { appConfig, isNotificationDeliveryConfigured, notificationConfig } from "@/lib/config";
import { serviceUnavailable } from "@/lib/errors";
import { getIntlLocale } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { buildManageKey, buildManageUrl, buildPublicEventUrl, createOpaqueToken, hashSecret } from "@/lib/tokens";
import type { AppLocale } from "@/lib/i18n/locale";
import type { ManageEventNotificationState } from "@/lib/types";

const DIGEST_QUIET_PERIOD_MINUTES = notificationConfig.quietPeriodMinutes;
const DIGEST_QUIET_PERIOD_MS = DIGEST_QUIET_PERIOD_MINUTES * 60 * 1000;

type NotificationRow = {
  recipientEmail: string | null;
  pendingFlushAfterAt: Date | null;
  pendingParticipantIds: string[];
  lastSentAt: Date | null;
};

type NotificationEvent = Prisma.EventGetPayload<{
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

const globalForAvailabilityNotifications = globalThis as unknown as {
  availabilityDigestTimers?: Map<string, ReturnType<typeof setTimeout>>;
  availabilityDigestRecoveryPromise?: Promise<void>;
  availabilityDigestRecovered?: boolean;
  availabilityDigestResend?: Resend;
};

function getDigestTimers() {
  if (!globalForAvailabilityNotifications.availabilityDigestTimers) {
    globalForAvailabilityNotifications.availabilityDigestTimers = new Map();
  }

  return globalForAvailabilityNotifications.availabilityDigestTimers;
}

function normalizeNotificationEmail(email?: string | null) {
  const trimmed = email?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getNotificationLocale(): AppLocale {
  return appConfig.defaultLocale;
}

function getResendClient() {
  if (!isNotificationDeliveryConfigured()) {
    throw serviceUnavailable("notification_delivery_unavailable");
  }

  if (!globalForAvailabilityNotifications.availabilityDigestResend) {
    globalForAvailabilityNotifications.availabilityDigestResend = new Resend(
      notificationConfig.resendApiKey!,
    );
  }

  return globalForAvailabilityNotifications.availabilityDigestResend;
}

function clearDigestTimer(eventId: string) {
  const timer = getDigestTimers().get(eventId);
  if (timer) {
    clearTimeout(timer);
    getDigestTimers().delete(eventId);
  }
}

function scheduleDigestTimer(eventId: string, flushAfterAt: Date) {
  if (!isNotificationDeliveryConfigured()) {
    return;
  }

  clearDigestTimer(eventId);

  const delayMs = Math.max(0, flushAfterAt.getTime() - Date.now());
  const handle = setTimeout(() => {
    getDigestTimers().delete(eventId);
    void flushAvailabilityDigest(eventId);
  }, delayMs);

  (handle as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();

  getDigestTimers().set(eventId, handle);
}

function getNotificationQuery() {
  return {
    dates: {
      orderBy: {
        dateKey: "asc" as const,
      },
    },
    participants: {
      orderBy: {
        createdAt: "asc" as const,
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
  };
}

async function getEventForDigest(eventId: string) {
  return prisma.event.findUnique({
    where: {
      id: eventId,
    },
    include: getNotificationQuery(),
  });
}

function buildNotificationSnapshot(event: NotificationEvent) {
  const locale = getNotificationLocale();

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
  });
}

function formatNotificationDate(value: Date | string, timezone: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatChangedParticipants(participants: string[]) {
  if (participants.length === 0) {
    return "A participant";
  }

  if (participants.length === 1) {
    return participants[0];
  }

  if (participants.length === 2) {
    return `${participants[0]} and ${participants[1]}`;
  }

  return `${participants[0]}, ${participants[1]}, and ${participants.length - 2} more`;
}

function buildDigestSubject(eventTitle: string, participantNames: string[]) {
  if (participantNames.length === 0) {
    return `${appConfig.appName}: Availability changed on ${eventTitle}`;
  }

  if (participantNames.length === 1) {
    return `${appConfig.appName}: ${participantNames[0]} updated ${eventTitle}`;
  }

  return `${appConfig.appName}: ${participantNames.length} people updated ${eventTitle}`;
}

function AvailabilityDigestEmail({
  changedParticipants,
  currentBestWindows,
  eventTitle,
  eventTimezone,
  finalizedSlotLabel,
  manageUrl,
  publicUrl,
}: {
  changedParticipants: string[];
  currentBestWindows: string[];
  eventTitle: string;
  eventTimezone: string;
  finalizedSlotLabel: string | null;
  manageUrl: string;
  publicUrl: string;
}) {
  const changedSummary = formatChangedParticipants(changedParticipants);
  const pageBackground = "#f4faf9";
  const cardBackground = "#ffffff";
  const accent = "#0e8690";
  const muted = "#5f7281";
  const strong = "#163848";

  return (
    <html>
      <body
        style={{
          margin: 0,
          backgroundColor: pageBackground,
          color: strong,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ padding: "32px 16px" }}>
          <div
            style={{
              maxWidth: "640px",
              margin: "0 auto",
              backgroundColor: cardBackground,
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 18px 60px rgba(22, 56, 72, 0.12)",
              border: "1px solid rgba(14, 134, 144, 0.12)",
            }}
          >
            <div
              style={{
                padding: "28px 32px",
                background:
                  "linear-gradient(135deg, rgba(14, 134, 144, 0.96), rgba(16, 112, 126, 0.92))",
                color: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {appConfig.appName}
              </div>
              <h1
                style={{
                  margin: "18px 0 8px",
                  fontSize: "30px",
                  lineHeight: 1.15,
                }}
              >
                Availability changed on {eventTitle}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  lineHeight: 1.6,
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                {changedSummary} finished updating availability. This digest waited until the board was
                quiet before sending.
              </p>
            </div>

            <div style={{ padding: "28px 32px 32px" }}>
              <div
                style={{
                  borderRadius: "14px",
                  border: "1px solid rgba(22, 56, 72, 0.08)",
                  backgroundColor: "#f7fbfb",
                  padding: "18px 20px",
                  marginBottom: "22px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: muted,
                  }}
                >
                  Event timezone
                </p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{eventTimezone}</p>
              </div>

              <div style={{ marginBottom: "22px" }}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: muted,
                  }}
                >
                  {finalizedSlotLabel ? "Fixed date" : "Best windows right now"}
                </p>

                {finalizedSlotLabel ? (
                  <div
                    style={{
                      borderRadius: "14px",
                      backgroundColor: "#163848",
                      color: "#ffffff",
                      padding: "18px 20px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{finalizedSlotLabel}</p>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: "14px",
                        lineHeight: 1.6,
                        color: "rgba(255, 255, 255, 0.82)",
                      }}
                    >
                      The board is closed and this is the published meeting slot.
                    </p>
                  </div>
                ) : (
                  currentBestWindows.map((label, index) => (
                    <div
                      key={label}
                      style={{
                        padding: "16px 18px",
                        borderRadius: "14px",
                        border: "1px solid rgba(22, 56, 72, 0.08)",
                        backgroundColor: index === 0 ? "rgba(14, 134, 144, 0.08)" : "#ffffff",
                        marginBottom: index === currentBestWindows.length - 1 ? 0 : 10,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontSize: "12px",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: muted,
                        }}
                      >
                        Option {index + 1}
                      </p>
                      <p style={{ margin: 0, fontSize: "17px", fontWeight: 650 }}>{label}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginBottom: "22px" }}>
                <a
                  href={manageUrl}
                  style={{
                    display: "block",
                    padding: "14px 20px",
                    borderRadius: "12px",
                    backgroundColor: accent,
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: 700,
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Open private organizer link
                </a>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: muted,
                  }}
                >
                  Sensitive link. Keep it private.
                </p>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(22, 56, 72, 0.08)",
                  paddingTop: "20px",
                }}
              >
                <a
                  href={publicUrl}
                  style={{
                    color: accent,
                    fontSize: "14px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  View the public board
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

export async function buildAvailabilityDigestEmail(event: NotificationEvent) {
  const snapshot = buildNotificationSnapshot(event);
  const locale = getNotificationLocale();
  const notification = event.availabilityNotification;
  const pendingParticipantIds = Array.from(new Set(notification?.pendingParticipantIds ?? []));
  const changedParticipants = pendingParticipantIds
    .map((participantId) =>
      event.participants.find((participant) => participant.id === participantId)?.displayName,
    )
    .filter((participantName): participantName is string => Boolean(participantName));
  const rawEmailManageToken = createOpaqueToken();
  const manageUrl = buildManageUrl(buildManageKey(event.id, rawEmailManageToken));
  const publicUrl = buildPublicEventUrl(event.slug);
  const bestWindows = snapshot.suggestions.map((suggestion) => suggestion.label);
  const finalizedSlotLabel = snapshot.finalizedSlot?.label ?? null;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <AvailabilityDigestEmail
      changedParticipants={changedParticipants}
      currentBestWindows={bestWindows}
      eventTitle={event.title}
      eventTimezone={event.timezone}
      finalizedSlotLabel={finalizedSlotLabel}
      manageUrl={manageUrl}
      publicUrl={publicUrl}
    />,
  )}`;

  const digestAt = notification?.pendingFlushAfterAt
    ? formatNotificationDate(notification.pendingFlushAfterAt, event.timezone, locale)
    : null;
  const overviewLines = finalizedSlotLabel
    ? [`Fixed date: ${finalizedSlotLabel}`]
    : bestWindows.slice(0, 3).map((label, index) => `Option ${index + 1}: ${label}`);
  const text = [
    `${appConfig.appName}`,
    "",
    `${formatChangedParticipants(changedParticipants)} updated availability on ${event.title}.`,
    digestAt ? `Digest sent after quiet period ending at ${digestAt}.` : null,
    `Event timezone: ${event.timezone}`,
    "",
    ...overviewLines,
    "",
    `Private organizer link (keep private): ${manageUrl}`,
    `Public board: ${publicUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    rawEmailManageToken,
    subject: buildDigestSubject(event.title, changedParticipants),
    html,
    text,
  };
}

export function buildManageEventNotificationState(
  notification: NotificationRow | null | undefined,
): ManageEventNotificationState {
  return {
    isConfigured: isNotificationDeliveryConfigured(),
    recipientEmail: notification?.recipientEmail ?? null,
    quietPeriodMinutes: DIGEST_QUIET_PERIOD_MINUTES,
    lastSentAt: notification?.lastSentAt?.toISOString() ?? null,
    pendingDigest:
      notification?.recipientEmail && notification.pendingFlushAfterAt
        ? {
            participantCount: new Set(notification.pendingParticipantIds).size,
            flushAfterAt: notification.pendingFlushAfterAt.toISOString(),
          }
        : null,
  };
}

async function reschedulePendingDigest(eventId: string) {
  const notification = await prisma.eventAvailabilityNotification.findUnique({
    where: {
      eventId,
    },
    select: {
      pendingFlushAfterAt: true,
    },
  });

  if (notification?.pendingFlushAfterAt) {
    scheduleDigestTimer(eventId, notification.pendingFlushAfterAt);
  } else {
    clearDigestTimer(eventId);
  }
}

async function flushAvailabilityDigest(eventId: string) {
  if (!isNotificationDeliveryConfigured()) {
    return;
  }

  const event = await getEventForDigest(eventId);
  if (!event?.availabilityNotification?.recipientEmail || !event.availabilityNotification.pendingFlushAfterAt) {
    clearDigestTimer(eventId);
    return;
  }

  if (event.availabilityNotification.pendingFlushAfterAt.getTime() > Date.now()) {
    scheduleDigestTimer(eventId, event.availabilityNotification.pendingFlushAfterAt);
    return;
  }

  const { rawEmailManageToken, subject, html, text } = await buildAvailabilityDigestEmail(event);
  const previousEmailManageTokenHash = event.availabilityNotification.emailManageTokenHash;
  const emailManageTokenHash = hashSecret(rawEmailManageToken);

  await prisma.eventAvailabilityNotification.update({
    where: {
      eventId,
    },
    data: {
      emailManageTokenHash,
    },
  });

  try {
    const resend = getResendClient();
    const sendResult = await resend.emails.send({
      from: `${notificationConfig.resendFromName ?? appConfig.appName} <${notificationConfig.resendFromEmail!}>`,
      to: [event.availabilityNotification.recipientEmail],
      subject,
      html,
      text,
    });

    if ("error" in sendResult && sendResult.error) {
      throw new Error(
        typeof sendResult.error === "object" && sendResult.error && "message" in sendResult.error
          ? String(sendResult.error.message)
          : "Unable to send digest email.",
      );
    }

    await prisma.eventAvailabilityNotification.update({
      where: {
        eventId,
      },
      data: {
        lastSentAt: new Date(),
        pendingSinceAt: null,
        pendingFlushAfterAt: null,
        pendingParticipantIds: {
          set: [],
        },
        pendingChangeCount: 0,
      },
    });
  } catch (error) {
    const nextFlushAfterAt = new Date(Date.now() + DIGEST_QUIET_PERIOD_MS);

    await prisma.eventAvailabilityNotification.update({
      where: {
        eventId,
      },
      data: {
        emailManageTokenHash: previousEmailManageTokenHash,
        pendingFlushAfterAt: nextFlushAfterAt,
      },
    });

    scheduleDigestTimer(eventId, nextFlushAfterAt);
    console.error("[availability-notifications] Failed to send digest", error);
    return;
  }

  clearDigestTimer(eventId);
}

export async function ensureAvailabilityDigestSchedulerStarted() {
  if (!isNotificationDeliveryConfigured()) {
    return;
  }

  if (globalForAvailabilityNotifications.availabilityDigestRecovered) {
    return;
  }

  if (!globalForAvailabilityNotifications.availabilityDigestRecoveryPromise) {
    globalForAvailabilityNotifications.availabilityDigestRecoveryPromise = (async () => {
      const pendingNotifications = await prisma.eventAvailabilityNotification.findMany({
        where: {
          recipientEmail: {
            not: null,
          },
          pendingFlushAfterAt: {
            not: null,
          },
        },
        select: {
          eventId: true,
          pendingFlushAfterAt: true,
        },
      });

      for (const notification of pendingNotifications) {
        if (!notification.pendingFlushAfterAt) {
          continue;
        }

        scheduleDigestTimer(notification.eventId, notification.pendingFlushAfterAt);
      }

      globalForAvailabilityNotifications.availabilityDigestRecovered = true;
    })().finally(() => {
      globalForAvailabilityNotifications.availabilityDigestRecoveryPromise = undefined;
    });
  }

  await globalForAvailabilityNotifications.availabilityDigestRecoveryPromise;
}

export async function queueAvailabilityDigest(options: {
  eventId: string;
  participantId: string;
  recipientEmail: string;
}) {
  const recipientEmail = normalizeNotificationEmail(options.recipientEmail);
  if (!recipientEmail || !isNotificationDeliveryConfigured()) {
    return;
  }

  const now = new Date();
  const flushAfterAt = new Date(now.getTime() + DIGEST_QUIET_PERIOD_MS);
  const existing = await prisma.eventAvailabilityNotification.findUnique({
    where: {
      eventId: options.eventId,
    },
    select: {
      pendingSinceAt: true,
      pendingParticipantIds: true,
      pendingChangeCount: true,
    },
  });

  const data = {
    recipientEmail,
    pendingSinceAt: existing?.pendingSinceAt ?? now,
    pendingFlushAfterAt: flushAfterAt,
    pendingParticipantIds: {
      set: Array.from(new Set([...(existing?.pendingParticipantIds ?? []), options.participantId])),
    },
    pendingChangeCount: (existing?.pendingChangeCount ?? 0) + 1,
  };

  if (existing) {
    await prisma.eventAvailabilityNotification.update({
      where: {
        eventId: options.eventId,
      },
      data,
    });
  } else {
    try {
      await prisma.eventAvailabilityNotification.create({
        data: {
          eventId: options.eventId,
          recipientEmail,
          pendingSinceAt: now,
          pendingFlushAfterAt: flushAfterAt,
          pendingParticipantIds: [options.participantId],
          pendingChangeCount: 1,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }

      const current = await prisma.eventAvailabilityNotification.findUnique({
        where: {
          eventId: options.eventId,
        },
        select: {
          pendingSinceAt: true,
          pendingParticipantIds: true,
          pendingChangeCount: true,
        },
      });

      await prisma.eventAvailabilityNotification.update({
        where: {
          eventId: options.eventId,
        },
        data: {
          recipientEmail,
          pendingSinceAt: current?.pendingSinceAt ?? now,
          pendingFlushAfterAt: flushAfterAt,
          pendingParticipantIds: {
            set: Array.from(
              new Set([...(current?.pendingParticipantIds ?? []), options.participantId]),
            ),
          },
          pendingChangeCount: (current?.pendingChangeCount ?? 0) + 1,
        },
      });
    }
  }

  scheduleDigestTimer(options.eventId, flushAfterAt);
}

export async function updateNotificationRecipient(eventId: string, notificationEmail?: string) {
  const recipientEmail = normalizeNotificationEmail(notificationEmail);

  if (recipientEmail && !isNotificationDeliveryConfigured()) {
    throw serviceUnavailable("notification_delivery_unavailable");
  }

  if (!recipientEmail) {
    clearDigestTimer(eventId);

    const existing = await prisma.eventAvailabilityNotification.findUnique({
      where: {
        eventId,
      },
      select: {
        eventId: true,
      },
    });

    if (existing) {
      await prisma.eventAvailabilityNotification.update({
        where: {
          eventId,
        },
        data: {
          recipientEmail: null,
          emailManageTokenHash: null,
          pendingSinceAt: null,
          pendingFlushAfterAt: null,
          pendingParticipantIds: {
            set: [],
          },
          pendingChangeCount: 0,
        },
      });
    }

    const notification = await prisma.eventAvailabilityNotification.findUnique({
      where: {
        eventId,
      },
      select: {
        recipientEmail: true,
        pendingFlushAfterAt: true,
        pendingParticipantIds: true,
        lastSentAt: true,
      },
    });

    return buildManageEventNotificationState(notification);
  }

  const existing = await prisma.eventAvailabilityNotification.findUnique({
    where: {
      eventId,
    },
    select: {
      eventId: true,
    },
  });

  if (existing) {
    await prisma.eventAvailabilityNotification.update({
      where: {
        eventId,
      },
      data: {
        recipientEmail,
      },
    });
  } else {
    await prisma.eventAvailabilityNotification.create({
      data: {
        eventId,
        recipientEmail,
      },
    });
  }

  await reschedulePendingDigest(eventId);

  const notification = await prisma.eventAvailabilityNotification.findUnique({
    where: {
      eventId,
    },
    select: {
      recipientEmail: true,
      pendingFlushAfterAt: true,
      pendingParticipantIds: true,
      lastSentAt: true,
    },
  });

  return buildManageEventNotificationState(notification);
}

export function resetAvailabilityNotificationsForTests() {
  for (const timer of getDigestTimers().values()) {
    clearTimeout(timer);
  }

  getDigestTimers().clear();
  globalForAvailabilityNotifications.availabilityDigestRecoveryPromise = undefined;
  globalForAvailabilityNotifications.availabilityDigestRecovered = false;
  globalForAvailabilityNotifications.availabilityDigestResend = undefined;
}

export function getAvailabilityDigestQuietPeriodMinutes() {
  return DIGEST_QUIET_PERIOD_MINUTES;
}
