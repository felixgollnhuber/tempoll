import crypto from "node:crypto";

import { appConfig } from "@/lib/config";
import { participantColors } from "@/lib/constants";

export function createOpaqueToken(size = 24) {
  return crypto.randomBytes(size).toString("base64url");
}

export function hashSecret(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizeNameKey(name: string) {
  return normalizeName(name).toLowerCase();
}

export function makeSlug(title: string) {
  const base = slugifyTitle(title) || "meeting";
  const suffix = createOpaqueToken(4).toLowerCase();
  return `${base}-${suffix}`;
}

export function buildManageKey(eventId: string, token: string) {
  return `${eventId}.${token}`;
}

export function parseManageKey(value: string) {
  const [eventId, token] = value.split(".");
  if (!eventId || !token) {
    return null;
  }

  return { eventId, token };
}

export function buildParticipantCookieValue(participantId: string, token: string) {
  return `${participantId}.${token}`;
}

export function parseParticipantCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [participantId, token] = value.split(".");
  if (!participantId || !token) {
    return null;
  }

  return { participantId, token };
}

export function getParticipantCookieName(slug: string) {
  return `tempoll_session_${slug}`;
}

export function pickParticipantColor(index: number) {
  return participantColors[index % participantColors.length];
}

export function buildPublicEventUrl(slug: string) {
  return `${appConfig.appUrl}/e/${slug}`;
}

export function buildManageUrl(manageKey: string) {
  return `${appConfig.appUrl}/manage/${manageKey}`;
}

export function buildParticipantEditUrl(slug: string, participantId: string, token: string) {
  const url = new URL(`/e/${slug}`, appConfig.appUrl);
  url.searchParams.set("participantId", participantId);
  url.searchParams.set("token", token);
  return url.toString();
}
