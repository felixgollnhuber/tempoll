import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config";
import { joinParticipant } from "@/lib/event-service";
import { participantCreateSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const input = participantCreateSchema.parse(json);
    const result = await joinParticipant(slug, input.displayName);

    const response = NextResponse.json(
      {
        session: result.session,
      },
      { status: 201 },
    );

    response.cookies.set(result.cookieName, result.cookieValue, {
      httpOnly: true,
      maxAge: appConfig.sessionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to join event.",
      },
      { status: 400 },
    );
  }
}
