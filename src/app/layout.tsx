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

export const metadata: Metadata = {
  title: {
    default: appConfig.appName,
    template: `%s · ${appConfig.appName}`,
  },
  description: "A modern, self-hosted When2Meet alternative built with Next.js.",
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
