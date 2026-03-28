export const supportedLocales = ["de", "en"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const LOCALE_COOKIE_NAME = "tempoll_locale";

export function isSupportedLocale(value: string): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

export function normalizeLocale(value?: string | null): AppLocale | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("de")) {
    return "de";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return null;
}

export function parseAcceptLanguageHeader(value?: string | null): AppLocale | null {
  if (!value) {
    return null;
  }

  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [tag, ...params] = entry.split(";");
      const qualityParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1;

      return {
        locale: normalizeLocale(tag),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry): entry is { locale: AppLocale; quality: number } => Boolean(entry.locale))
    .sort((left, right) => right.quality - left.quality);

  return entries[0]?.locale ?? null;
}

export function parseCookieHeader(header?: string | null) {
  const parsed = new Map<string, string>();

  if (!header) {
    return parsed;
  }

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) {
      continue;
    }

    parsed.set(name, decodeURIComponent(valueParts.join("=")));
  }

  return parsed;
}
