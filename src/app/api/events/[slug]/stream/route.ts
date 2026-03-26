import { prisma } from "@/lib/prisma";
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

  const stream = await createEventStream(event.id, _request.signal);

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
