import type { ReactNode } from "react";
import { de as dateFnsDe, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

import type { AppLocale } from "@/lib/i18n/locale";

export type MessageValue = string | number;
export type MessageValues = Record<string, MessageValue>;
export type RichMessageValue = ReactNode;
export type RichMessageValues = Record<string, RichMessageValue>;

export type PluralMessage = {
  one: string;
  other: string;
};

export function formatMessage(template: string, values: MessageValues = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value === undefined ? "" : String(value);
  });
}

export function formatRichMessage(template: string, values: RichMessageValues = {}) {
  const parts = template.split(/(\{\w+\})/g).filter(Boolean);

  return parts.map((part) => {
    const match = part.match(/^\{(\w+)\}$/);
    if (!match) {
      return part;
    }

    const value = values[match[1]];
    return value === undefined ? null : value;
  });
}

export function formatPlural(message: PluralMessage, count: number, values: MessageValues = {}) {
  return formatMessage(count === 1 ? message.one : message.other, {
    count,
    ...values,
  });
}

const calendarLocales: Record<AppLocale, Locale> = {
  de: {
    ...dateFnsDe,
    options: {
      ...dateFnsDe.options,
      weekStartsOn: 1,
    },
  },
  en: {
    ...enUS,
    options: {
      ...enUS.options,
      weekStartsOn: 1,
    },
  },
};

const intlLocales: Record<AppLocale, string> = {
  de: "de-AT",
  en: "en-US",
};

export function getDateFnsLocale(locale: AppLocale) {
  return calendarLocales[locale];
}

export function getIntlLocale(locale: AppLocale) {
  return intlLocales[locale];
}
