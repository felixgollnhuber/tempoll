import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAppError } from "@/lib/errors";
import { formatMessage } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
export {
  buildContentSecurityPolicy,
  getBaseSecurityHeaders,
  MANAGE_RESPONSE_HEADERS,
  PRIVATE_NO_STORE_HEADERS,
  PUBLIC_NO_STORE_HEADERS,
} from "@/lib/security-headers";

export function mergeHeaders(...headerSets: Array<HeadersInit | undefined>) {
  const headers = new Headers();

  for (const headerSet of headerSets) {
    if (!headerSet) {
      continue;
    }

    const nextHeaders = new Headers(headerSet);
    nextHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

export function handleRouteError(
  error: unknown,
  options: {
    fallbackMessage: string;
    messages: Messages;
    route: string;
    headers?: HeadersInit;
  },
) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? options.fallbackMessage,
      },
      {
        status: 400,
        headers: mergeHeaders(options.headers),
      },
    );
  }

  if (isAppError(error)) {
    return NextResponse.json(
      {
        error:
          getLocalizedAppErrorMessage(error.code, options.messages, error.params) ??
          options.fallbackMessage,
      },
      {
        status: error.status,
        headers: mergeHeaders(options.headers, error.headers),
      },
    );
  }

  console.error(`[${options.route}] Unexpected error`, error);

  return NextResponse.json(
    {
      error: options.fallbackMessage,
    },
    {
      status: 500,
      headers: mergeHeaders(options.headers),
    },
  );
}

function getLocalizedAppErrorMessage(
  code: string,
  messages: Messages,
  params?: Record<string, string | number>,
) {
  const templates: Record<string, string> = {
    event_not_found: messages.errors.app.eventNotFound,
    event_closed: messages.errors.app.eventClosed,
    participant_name_taken: messages.errors.app.participantNameTaken,
    participant_session_missing: messages.errors.app.participantSessionMissing,
    participant_not_found: messages.errors.app.participantNotFound,
    invalid_slots: messages.errors.app.invalidSlots,
    manage_key_invalid: messages.errors.app.manageKeyInvalid,
    final_slot_required: messages.errors.app.finalSlotRequired,
    final_slot_invalid: messages.errors.app.finalSlotInvalid,
    notification_delivery_unavailable: messages.errors.app.notificationDeliveryUnavailable,
    event_create_rate_limited: messages.errors.rateLimit.eventCreate,
    event_join_rate_limited: messages.errors.rateLimit.joinEvent,
    availability_ip_rate_limited: messages.errors.rateLimit.availabilityIp,
    availability_session_rate_limited: messages.errors.rateLimit.availabilitySession,
    organizer_action_rate_limited: messages.errors.rateLimit.organizerActions,
    event_stream_rate_limited: messages.errors.rateLimit.eventStream,
    event_stream_concurrency_rate_limited: messages.errors.rateLimit.eventStreamConcurrency,
  };

  const template = templates[code];
  return template ? formatMessage(template, params) : null;
}
