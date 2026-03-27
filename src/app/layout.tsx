import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { AppChrome } from "@/components/app-chrome";
import { Toaster } from "@/components/ui/sonner";
import { appConfig } from "@/lib/config";
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

export const metadata: Metadata = {
  title: {
    default: appConfig.appName,
    template: `%s · ${appConfig.appName}`,
  },
  description: "A modern, self-hosted When2Meet alternative built with Next.js.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppChrome
          appName={appConfig.appName}
          logoSrc={hasDefaultLogo ? defaultLogoSrc : undefined}
          setupComplete={isAppSetupComplete()}
          legalPagesEnabled={areLegalPagesEnabled()}
        >
          {children}
        </AppChrome>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
