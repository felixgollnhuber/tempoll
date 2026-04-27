"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HistoryIcon, PlusIcon } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button-variants";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type AppChromeProps = {
  appName: string;
  logoSrc?: string;
  setupComplete: boolean;
  legalPagesEnabled: boolean;
  devModeEnabled?: boolean;
  children: React.ReactNode;
};

const githubRepositoryUrl = "https://github.com/felixgollnhuber/tempoll";
const githubIssuesUrl = "https://github.com/felixgollnhuber/tempoll/issues";

function GitHubMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      focusable="false"
    >
      <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.3.8-.6V21c-3.4.7-4.1-1.4-4.1-1.4-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.6-1.4-5.6-6.2 0-1.4.5-2.5 1.2-3.4-.1-.3-.6-1.6.1-3.3 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.2 0c2.4-1.5 3.4-1.2 3.4-1.2.7 1.7.3 3 .1 3.3.8.9 1.2 2 1.2 3.4 0 4.8-2.9 5.9-5.7 6.2.5.4.8 1.1.8 2.3v3.5c0 .4.2.8.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

export function AppChrome({
  appName,
  logoSrc,
  setupComplete,
  legalPagesEnabled,
  devModeEnabled = false,
  children,
}: AppChromeProps) {
  const { messages } = useI18n();
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
        <div className="app-shell flex h-16 items-center justify-between gap-3 sm:gap-4">
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
          <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher
              className="h-9 w-12 px-2 sm:w-[8.75rem] sm:px-3 sm:text-sm"
              mobileIcon
            />
            <Link
              href="/new"
              aria-label={messages.appChrome.newEvent}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "size-9 p-0 sm:h-9 sm:w-auto sm:border-transparent sm:bg-transparent sm:px-4 sm:shadow-none sm:hover:bg-accent sm:hover:text-accent-foreground",
              )}
            >
              <span aria-hidden="true" className="sm:hidden">
                <PlusIcon className="size-4" />
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
                "size-9 p-0 sm:h-9 sm:w-auto sm:px-4 sm:text-sm",
              )}
            >
              <span aria-hidden="true" className="sm:hidden">
                <HistoryIcon className="size-4" />
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
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={githubRepositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <GitHubMarkIcon className="size-3.5" />
              {messages.appChrome.openSource}
            </a>
            <a
              href={githubIssuesUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
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
            {devModeEnabled ? (
              <Link href="/dev/database" className="hover:text-foreground">
                {messages.appChrome.databaseStatus}
              </Link>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
