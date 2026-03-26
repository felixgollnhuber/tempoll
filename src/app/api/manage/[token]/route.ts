import { NextResponse } from "next/server";

import { updateManagedEvent } from "@/lib/event-service";
import { manageUpdateSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    token: string;
  }>;
};

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { token } = await params;
    const json = await request.json();
    const input = manageUpdateSchema.parse(json);

    await updateManagedEvent(token, input);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update event.",
      },
      { status: 400 },
    );
  }
}
