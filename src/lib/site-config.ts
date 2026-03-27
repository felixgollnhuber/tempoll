import { appConfig } from "@/lib/config";
import {
  createSetupWizardValues,
  normalizeProcessorList,
  type SetupWizardValues,
} from "@/lib/setup";
import { isAppSetupComplete } from "@/lib/setup-state";

export type SiteConfig = {
  appName: string;
  appUrl: string;
  legalPagesEnabled: boolean;
  operator: {
    legalName?: string;
    displayName?: string;
    streetAddress?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    website?: string;
    businessPurpose?: string;
  };
  media: {
    owner?: string;
    editorialLine?: string;
  };
  privacy: {
    contactEmail?: string;
    hostingDescription?: string;
    processors: string[];
  };
};

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function getBooleanEnv(name: string, fallback = false) {
  const value = getEnv(name)?.toLowerCase();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function parseProcessors(value: string | undefined) {
  if (!value) {
    return [];
  }

  return normalizeProcessorList(value)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getSetupDraftValues(): SetupWizardValues {
  return createSetupWizardValues({
    appName: getEnv("APP_NAME") ?? appConfig.appName,
    appUrl: getEnv("APP_URL") ?? appConfig.appUrl,
    legalPagesEnabled: getBooleanEnv("LEGAL_PAGES_ENABLED", false) ? "true" : "false",
    operatorLegalName: getEnv("OPERATOR_LEGAL_NAME") ?? "",
    operatorDisplayName: getEnv("OPERATOR_DISPLAY_NAME") ?? "",
    operatorStreetAddress: getEnv("OPERATOR_STREET_ADDRESS") ?? "",
    operatorPostalCode: getEnv("OPERATOR_POSTAL_CODE") ?? "",
    operatorCity: getEnv("OPERATOR_CITY") ?? "",
    operatorCountry: getEnv("OPERATOR_COUNTRY") ?? "Austria",
    operatorEmail: getEnv("OPERATOR_EMAIL") ?? "",
    operatorPhone: getEnv("OPERATOR_PHONE") ?? "",
    operatorWebsite: getEnv("OPERATOR_WEBSITE") ?? "",
    operatorBusinessPurpose: getEnv("OPERATOR_BUSINESS_PURPOSE") ?? "",
    mediaOwner: getEnv("MEDIA_OWNER") ?? "",
    editorialLine: getEnv("EDITORIAL_LINE") ?? "",
    privacyContactEmail: getEnv("PRIVACY_CONTACT_EMAIL") ?? getEnv("OPERATOR_EMAIL") ?? "",
    hostingDescription:
      getEnv("HOSTING_DESCRIPTION") ??
      "Self-hosted deployment operated by the controller using its own infrastructure and/or hosting providers.",
    privacyProcessors: parseProcessors(getEnv("PRIVACY_PROCESSORS")).join("\n"),
  });
}

export function areLegalPagesEnabled() {
  return getBooleanEnv("LEGAL_PAGES_ENABLED", false);
}

export function getSiteConfig(): SiteConfig {
  if (!isAppSetupComplete()) {
    throw new Error("Site configuration is not available until APP_SETUP_COMPLETE=true.");
  }

  return {
    appName: appConfig.appName,
    appUrl: appConfig.appUrl,
    legalPagesEnabled: areLegalPagesEnabled(),
    operator: {
      legalName: getEnv("OPERATOR_LEGAL_NAME"),
      displayName: getEnv("OPERATOR_DISPLAY_NAME"),
      streetAddress: getEnv("OPERATOR_STREET_ADDRESS"),
      postalCode: getEnv("OPERATOR_POSTAL_CODE"),
      city: getEnv("OPERATOR_CITY"),
      country: getEnv("OPERATOR_COUNTRY"),
      email: getEnv("OPERATOR_EMAIL"),
      phone: getEnv("OPERATOR_PHONE"),
      website: getEnv("OPERATOR_WEBSITE"),
      businessPurpose: getEnv("OPERATOR_BUSINESS_PURPOSE"),
    },
    media: {
      owner: getEnv("MEDIA_OWNER"),
      editorialLine: getEnv("EDITORIAL_LINE"),
    },
    privacy: {
      contactEmail: getEnv("PRIVACY_CONTACT_EMAIL") ?? getEnv("OPERATOR_EMAIL"),
      hostingDescription: getEnv("HOSTING_DESCRIPTION"),
      processors: parseProcessors(getEnv("PRIVACY_PROCESSORS")),
    },
  };
}
