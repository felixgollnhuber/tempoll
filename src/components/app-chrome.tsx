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
        <div className="app-shell flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center text-lg font-semibold tracking-tight"
          >
            {showLogo && logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={appName}
                className="h-7 w-auto shrink-0"
                onError={() => setFailedLogoSrc(logoSrc)}
              />
            ) : (
              appName
            )}
          </Link>
          <nav className="flex items-center gap-2">
            <LanguageSwitcher className="h-9 min-w-28" />
            <Link
              href="/new"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              {messages.appChrome.newEvent}
            </Link>
            <Link
              href="/#recent-events"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {messages.appChrome.recentEvents}
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
