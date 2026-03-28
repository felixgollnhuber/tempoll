import { render, type RenderOptions } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";

import { I18nProvider } from "@/lib/i18n/context";
import type { AppLocale } from "@/lib/i18n/locale";
import { getMessages } from "@/lib/i18n/messages";

type RenderWithI18nOptions = Omit<RenderOptions, "wrapper"> & {
  locale?: AppLocale;
};

export function renderWithI18n(
  ui: ReactElement,
  { locale = "en", ...options }: RenderWithI18nOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <I18nProvider locale={locale} messages={getMessages(locale)}>
        {children}
      </I18nProvider>
    );
  }

  return render(ui, {
    wrapper: Wrapper,
    ...options,
  });
}
