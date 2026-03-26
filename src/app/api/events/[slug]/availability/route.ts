import { NextResponse } from "next/server";

import { saveAvailability } from "@/lib/event-service";
import { availabilityMutationSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export async function PUT(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const mutation = availabilityMutationSchema.parse(json);

    const result = await saveAvailability(slug, mutation);

    return NextResponse.json({ ok: true, snapshot: result.snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save availability.",
      },
      { status: 400 },
    );
  }
}
