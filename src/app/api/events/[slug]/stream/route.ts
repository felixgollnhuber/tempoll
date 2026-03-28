import { prisma } from "@/lib/prisma";
import { createI18n, getLocaleFromRequest } from "@/lib/i18n/server";
import { getClientIp } from "@/lib/request";
import { acquireConcurrencySlot, enforceRateLimit } from "@/lib/rate-limit";
import { createEventStream } from "@/lib/realtime";
import { handleRouteError } from "@/lib/security";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: Context) {
  const i18n = createI18n(getLocaleFromRequest(request));

  try {
    const { slug } = await params;
    const ip = getClientIp(request);

    enforceRateLimit(`event-stream:${ip}`, {
      limit: 20,
      windowMs: 60 * 1000,
      code: "event_stream_rate_limited",
    });

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return new Response(i18n.messages.errors.routeFallbacks.eventStreamNotFound, { status: 404 });
    }

    const releaseConcurrencySlot = acquireConcurrencySlot(`event-stream:${ip}`, {
      limit: 3,
      code: "event_stream_concurrency_rate_limited",
    });

    request.signal.addEventListener("abort", releaseConcurrencySlot, { once: true });

    let stream: ReadableStream<Uint8Array>;

    try {
      stream = await createEventStream(event.id, request.signal);
    } catch (error) {
      releaseConcurrencySlot();
      throw error;
    }

    return new Response(stream, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: i18n.messages.errors.routeFallbacks.eventStream,
      messages: i18n.messages,
      route: "api/events/[slug]/stream",
    });
  }
}
