import { NextResponse } from "next/server";

import { deleteParticipant } from "@/lib/event-service";

type Context = {
  params: Promise<{
    token: string;
    participantId: string;
  }>;
};

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { token, participantId } = await params;
    await deleteParticipant(token, participantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to remove participant.",
      },
      { status: 400 },
    );
  }
}
