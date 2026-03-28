import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request";
import { acquireConcurrencySlot, enforceRateLimit } from "@/lib/rate-limit";
import { createEventStream } from "@/lib/realtime";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const ip = getClientIp(_request);

  enforceRateLimit(`event-stream:${ip}`, {
    limit: 20,
    windowMs: 60 * 1000,
    message: "Too many event stream connections. Please wait a moment and try again.",
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
    return new Response("Not found", { status: 404 });
  }

  const releaseConcurrencySlot = acquireConcurrencySlot(`event-stream:${ip}`, {
    limit: 3,
    message: "Too many live event streams from this network. Close another tab and try again.",
  });

  _request.signal.addEventListener("abort", releaseConcurrencySlot, { once: true });

  let stream: ReadableStream<Uint8Array>;

  try {
    stream = await createEventStream(event.id, _request.signal);
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
}
