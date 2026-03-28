import type { Metadata } from "next";

import { appConfig } from "@/lib/config";
import type { Messages } from "@/lib/i18n/messages";

const browserTitleBrand = "tempoll.app";
const socialSiteName = "tempoll";
const socialImageSize = {
  width: 1200,
  height: 630,
} as const;
const openGraphImagePath = "/opengraph-image";
const twitterImagePath = "/twitter-image";

function createOpenGraphImage(messages: Messages) {
  return {
    url: openGraphImagePath,
    width: socialImageSize.width,
    height: socialImageSize.height,
    alt: messages.metadata.shareImageAlt,
  };
}

function createTwitterImage(messages: Messages) {
  return {
    url: twitterImagePath,
    width: socialImageSize.width,
    height: socialImageSize.height,
    alt: messages.metadata.shareImageAlt,
  };
}

export function buildSocialTitle(title: string) {
  return `${title} · ${socialSiteName}`;
}

export function buildDefaultMetadata(messages: Messages): Metadata {
  return {
    metadataBase: new URL(appConfig.appUrl),
    title: {
      default: browserTitleBrand,
      template: `%s · ${browserTitleBrand}`,
    },
    description: messages.metadata.description,
    openGraph: {
      type: "website",
      siteName: socialSiteName,
      title: messages.metadata.shareTitle,
      description: messages.metadata.description,
      images: [createOpenGraphImage(messages)],
    },
    twitter: {
      card: "summary_large_image",
      title: messages.metadata.shareTitle,
      description: messages.metadata.description,
      images: [createTwitterImage(messages)],
    },
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
}

export function buildSocialImages(messages: Messages) {
  return {
    openGraph: [createOpenGraphImage(messages)],
    twitter: [createTwitterImage(messages)],
  };
}
