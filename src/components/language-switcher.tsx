"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/context";
import { LOCALE_COOKIE_NAME, supportedLocales, type AppLocale } from "@/lib/i18n/locale";

const oneYearInSeconds = 60 * 60 * 24 * 365;

type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locale, messages } = useI18n();

  function handleValueChange(nextLocale: string) {
    if (nextLocale === locale) {
      return;
    }

    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=${oneYearInSeconds}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={handleValueChange}>
      <SelectTrigger
        aria-label={messages.languageSwitcher.label}
        className={className}
        disabled={isPending}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedLocales.map((supportedLocale) => (
          <SelectItem key={supportedLocale} value={supportedLocale}>
            {getLocaleLabel(messages.languageSwitcher, supportedLocale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getLocaleLabel(
  labels: {
    de: string;
    en: string;
  },
  locale: AppLocale,
) {
  return locale === "de" ? labels.de : labels.en;
}
