"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button-variants";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type AppChromeProps = {
  appName: string;
  logoSrc?: string;
  setupComplete: boolean;
  legalPagesEnabled: boolean;
  children: React.ReactNode;
};

const featureRequestMailto =
  "mailto:tempoll-featurerequest@felixgollnhuber.dev?subject=Feature%20request%20or%20suggestion%20for%20tempoll";

export function AppChrome({
  appName,
  logoSrc,
  setupComplete,
  legalPagesEnabled,
  children,
}: AppChromeProps) {
  const { messages, format } = useI18n();
  const pathname = usePathname();
  const hideChrome = !setupComplete && pathname === "/setup";
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);

  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc;

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="app-shell flex min-h-16 flex-wrap items-center justify-between gap-x-2 gap-y-3 py-3 sm:flex-nowrap sm:gap-4">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center text-base font-semibold tracking-tight sm:text-lg"
          >
            {showLogo && logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={appName}
                className="block h-7 w-auto shrink-0"
                onError={() => setFailedLogoSrc(logoSrc)}
              />
            ) : (
              appName
            )}
          </Link>
          <nav className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:flex-nowrap sm:gap-2">
            <LanguageSwitcher
              className="h-9 min-w-16 px-2.5 text-xs sm:min-w-28 sm:px-3 sm:text-sm"
              compactLabel
            />
            <Link
              href="/new"
              aria-label={messages.appChrome.newEvent}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 px-3 text-xs sm:px-4 sm:text-sm",
              )}
            >
              <span aria-hidden="true" className="sm:hidden">
                {messages.appChrome.newEventCompact}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                {messages.appChrome.newEvent}
              </span>
            </Link>
            <Link
              href="/#recent-events"
              aria-label={messages.appChrome.recentEvents}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-9 px-3 text-xs sm:px-4 sm:text-sm",
              )}
            >
              <span aria-hidden="true" className="sm:hidden">
                {messages.appChrome.recentEventsCompact}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                {messages.appChrome.recentEvents}
              </span>
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t">
        <div className="app-shell flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{format(messages.appChrome.footerDescription, { appName })}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href={featureRequestMailto} className="hover:text-foreground">
              {messages.appChrome.featureRequest}
            </a>
            {legalPagesEnabled ? (
              <Link href="/imprint" className="hover:text-foreground">
                {messages.appChrome.imprint}
              </Link>
            ) : null}
            {legalPagesEnabled ? (
              <Link href="/privacy" className="hover:text-foreground">
                {messages.appChrome.privacy}
              </Link>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
