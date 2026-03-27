"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type AppChromeProps = {
  appName: string;
  logoSrc?: string;
  setupComplete: boolean;
  legalPagesEnabled: boolean;
  children: React.ReactNode;
};

export function AppChrome({
  appName,
  logoSrc,
  setupComplete,
  legalPagesEnabled,
  children,
}: AppChromeProps) {
  const pathname = usePathname();
  const hideChrome = !setupComplete && pathname === "/setup";
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoSrc]);

  const showLogo = Boolean(logoSrc) && !logoFailed;

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
              <img
                src={logoSrc}
                alt={appName}
                className="h-7 w-auto shrink-0"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              appName
            )}
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/new"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              New event
            </Link>
            <Link
              href="/#recent-events"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Recent events
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-auto border-t">
        <div className="app-shell flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{appName} is a self-hostable, realtime scheduling board for modern teams.</p>
          {legalPagesEnabled ? (
            <div className="flex items-center gap-4">
              <Link href="/imprint" className="hover:text-foreground">
                Imprint
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </div>
          ) : null}
        </div>
      </footer>
    </>
  );
}
