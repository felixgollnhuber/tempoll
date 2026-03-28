import { cookies, headers } from "next/headers";

import { appConfig } from "@/lib/config";
import {
  getDateFnsLocale,
  getIntlLocale,
  formatMessage,
  formatPlural,
  formatRichMessage,
  type MessageValues,
  type PluralMessage,
  type RichMessageValues,
} from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";
import {
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  parseAcceptLanguageHeader,
  parseCookieHeader,
  type AppLocale,
} from "@/lib/i18n/locale";

export function resolveLocale(options?: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  defaultLocale?: AppLocale;
}): AppLocale {
  const cookieLocale = normalizeLocale(options?.cookieLocale);
  if (cookieLocale) {
    return cookieLocale;
  }

  const acceptedLocale = parseAcceptLanguageHeader(options?.acceptLanguage);
  if (acceptedLocale) {
    return acceptedLocale;
  }

  return options?.defaultLocale ?? appConfig.defaultLocale;
}

export async function getRequestLocale() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);

  return resolveLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}

export function getLocaleFromRequest(request: Request) {
  const cookieLocale = parseCookieHeader(request.headers.get("cookie")).get(LOCALE_COOKIE_NAME);

  return resolveLocale({
    cookieLocale,
    acceptLanguage: request.headers.get("accept-language"),
  });
}

export function createI18n(locale: AppLocale) {
  const messages = getMessages(locale);

  return {
    locale,
    messages,
    format: (template: string, values?: MessageValues) => formatMessage(template, values),
    formatRich: (template: string, values?: RichMessageValues) =>
      formatRichMessage(template, values),
    plural: (message: PluralMessage, count: number, values?: MessageValues) =>
      formatPlural(message, count, values),
    intlLocale: getIntlLocale(locale),
    dateFnsLocale: getDateFnsLocale(locale),
  };
}

export async function getServerI18n() {
  return createI18n(await getRequestLocale());
}
