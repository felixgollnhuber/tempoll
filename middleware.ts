import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAppSetupComplete } from "@/lib/setup-state";

export function middleware(request: NextRequest) {
  if (isAppSetupComplete()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/setup" || pathname === "/api/health") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "App setup is not complete yet. Open /setup to generate the environment configuration.",
      },
      { status: 503 },
    );
  }

  const setupUrl = new URL("/setup", request.url);
  return NextResponse.redirect(setupUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
