"use client";

import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import {
  formatMessage,
  formatPlural,
  formatRichMessage,
  getDateFnsLocale,
  getIntlLocale,
  type MessageValues,
  type PluralMessage,
  type RichMessageValues,
} from "@/lib/i18n/format";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/locale";

type I18nContextValue = {
  locale: AppLocale;
  messages: Messages;
};

function createI18nContextValue(locale: AppLocale): I18nContextValue {
  return {
    locale,
    messages: getMessages(locale),
  };
}

const defaultContextValue = createI18nContextValue("de");

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export function I18nProvider({
  locale,
  messages,
  children,
}: PropsWithChildren<I18nContextValue>) {
  const value = useMemo(
    () => ({
      locale,
      messages,
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const { locale, messages } = useContext(I18nContext);

  return useMemo(
    () => ({
      locale,
      messages,
      format: (template: string, values?: MessageValues) => formatMessage(template, values),
      formatRich: (template: string, values?: RichMessageValues) =>
        formatRichMessage(template, values),
      plural: (message: PluralMessage, count: number, values?: MessageValues) =>
        formatPlural(message, count, values),
      intlLocale: getIntlLocale(locale),
      dateFnsLocale: getDateFnsLocale(locale),
    }),
    [locale, messages],
  );
}
