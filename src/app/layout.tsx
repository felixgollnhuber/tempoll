import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";

import { AppChrome } from "@/components/app-chrome";
import { Toaster } from "@/components/ui/sonner";
import { appConfig } from "@/lib/config";
import { datafastConfig } from "@/lib/datafast";
import { I18nProvider } from "@/lib/i18n/context";
import { getServerI18n } from "@/lib/i18n/server";
import { buildDefaultMetadata } from "@/lib/site-metadata";
import { areLegalPagesEnabled } from "@/lib/site-config";
import { isAppSetupComplete } from "@/lib/setup-state";

import "./globals.css";

const bodyFont = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const headingFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const defaultLogoSrc = "/tempoll-logo.png";
const hasDefaultLogo = existsSync(
  path.join(process.cwd(), "public", "tempoll-logo.png"),
);

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getServerI18n();

  return buildDefaultMetadata(messages);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getServerI18n();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {datafastConfig.enabled ? (
          <Script
            id="datafast-tracking"
            src={datafastConfig.scriptSrc}
            data-website-id={datafastConfig.websiteId}
            data-domain={datafastConfig.domain}
            data-api-url={datafastConfig.apiProxyPath}
            strategy="afterInteractive"
          />
        ) : null}
        <I18nProvider locale={locale} messages={messages}>
          <AppChrome
            appName={appConfig.appName}
            logoSrc={hasDefaultLogo ? defaultLogoSrc : undefined}
            setupComplete={isAppSetupComplete()}
            legalPagesEnabled={areLegalPagesEnabled()}
          >
            {children}
          </AppChrome>
          <Toaster richColors position="top-right" />
        </I18nProvider>
      </body>
    </html>
  );
}
