import { NextResponse } from "next/server";

import { isAppSetupComplete } from "@/lib/setup-state";

export function GET() {
  return NextResponse.json({
    ok: true,
    setupComplete: isAppSetupComplete(),
    timestamp: new Date().toISOString(),
  });
}
