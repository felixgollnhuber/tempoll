import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAppError } from "@/lib/errors";
export {
  buildContentSecurityPolicy,
  getBaseSecurityHeaders,
  MANAGE_RESPONSE_HEADERS,
  PRIVATE_NO_STORE_HEADERS,
  PUBLIC_NO_STORE_HEADERS,
} from "@/lib/security-headers";

export function mergeHeaders(...headerSets: Array<HeadersInit | undefined>) {
  const headers = new Headers();

  for (const headerSet of headerSets) {
    if (!headerSet) {
      continue;
    }

    const nextHeaders = new Headers(headerSet);
    nextHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

export function handleRouteError(
  error: unknown,
  options: {
    fallbackMessage: string;
    route: string;
    headers?: HeadersInit;
  },
) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? options.fallbackMessage,
      },
      {
        status: 400,
        headers: mergeHeaders(options.headers),
      },
    );
  }

  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: error.status,
        headers: mergeHeaders(options.headers, error.headers),
      },
    );
  }

  console.error(`[${options.route}] Unexpected error`, error);

  return NextResponse.json(
    {
      error: options.fallbackMessage,
    },
    {
      status: 500,
      headers: mergeHeaders(options.headers),
    },
  );
}
