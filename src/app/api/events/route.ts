import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createEvent } from "@/lib/event-service";
import { eventCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = eventCreateSchema.parse({
      ...json,
      dayStartMinutes: Number(json.dayStartMinutes),
      dayEndMinutes: Number(json.dayEndMinutes),
    });

    const result = await createEvent({
      ...input,
      dates: [...new Set(input.dates)].sort(),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Please check your event settings.")
        : error instanceof Error
          ? error.message
          : "Unable to create event.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
