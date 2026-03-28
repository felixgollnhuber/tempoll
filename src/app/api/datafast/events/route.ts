import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/request";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/security";

const DATAFAST_EVENTS_URL = "https://datafa.st/api/events";
const MANAGE_PATH_PREFIX = "/manage/";
const ENCODED_MANAGE_PATH = "%2fmanage%2f";

function getRefererPath(request: Request) {
  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer, request.url).pathname;
  } catch {
    return null;
  }
}

function shouldIgnoreEvent(request: Request, requestBody: string) {
  const refererPath = getRefererPath(request);
  if (refererPath?.startsWith(MANAGE_PATH_PREFIX)) {
    return true;
  }

  // Manage pages already send Referrer-Policy: no-referrer, so we also inspect payloads.
  const normalizedBody = requestBody.toLowerCase();
  return (
    normalizedBody.includes(MANAGE_PATH_PREFIX) ||
    normalizedBody.includes(ENCODED_MANAGE_PATH)
  );
}

export async function POST(request: Request) {
  const body = await request.text();

  if (shouldIgnoreEvent(request, body)) {
    return NextResponse.json(
      {
        status: "success",
        ignored: true,
      },
      {
        headers: PRIVATE_NO_STORE_HEADERS,
      },
    );
  }

  const ip = getClientIp(request);
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const contentType = request.headers.get("content-type") ?? "application/json";
  const userAgent = request.headers.get("user-agent");

  try {
    const response = await fetch(DATAFAST_EVENTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Origin: origin,
        ...(userAgent ? { "User-Agent": userAgent } : {}),
        "x-datafast-real-ip": ip,
      },
      body,
    });

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[api/datafast/events] Failed to proxy analytics event", error);

    return NextResponse.json(
      {
        error: "Failed to forward analytics event.",
      },
      {
        status: 502,
        headers: PRIVATE_NO_STORE_HEADERS,
      },
    );
  }
}
