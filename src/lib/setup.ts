import { isSupportedLocale, type AppLocale } from "@/lib/i18n/locale";

export type SetupWizardValues = {
  appName: string;
  appUrl: string;
  appDefaultLocale: AppLocale;
  legalPagesEnabled: string;
  operatorLegalName: string;
  operatorDisplayName: string;
  operatorStreetAddress: string;
  operatorPostalCode: string;
  operatorCity: string;
  operatorCountry: string;
  operatorEmail: string;
  operatorPhone: string;
  operatorWebsite: string;
  operatorBusinessPurpose: string;
  mediaOwner: string;
  editorialLine: string;
  privacyContactEmail: string;
  hostingDescription: string;
  privacyProcessors: string;
};

export type SetupWizardErrors = Partial<Record<keyof SetupWizardValues, string>>;

export const defaultSetupWizardValues: SetupWizardValues = {
  appName: "tempoll",
  appUrl: "http://localhost:3000",
  appDefaultLocale: "de",
  legalPagesEnabled: "false",
  operatorLegalName: "",
  operatorDisplayName: "",
  operatorStreetAddress: "",
  operatorPostalCode: "",
  operatorCity: "",
  operatorCountry: "Austria",
  operatorEmail: "",
  operatorPhone: "",
  operatorWebsite: "",
  operatorBusinessPurpose: "",
  mediaOwner: "",
  editorialLine: "",
  privacyContactEmail: "",
  hostingDescription: "",
  privacyProcessors: "",
};

function cleanValue(value: string) {
  return value.trim();
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createSetupWizardValues(
  partial: Partial<SetupWizardValues> = {},
): SetupWizardValues {
  return {
    ...defaultSetupWizardValues,
    ...partial,
  };
}

export function getStepFieldNames(step: number): Array<keyof SetupWizardValues> {
  switch (step) {
    case 0:
      return ["appName", "appUrl", "appDefaultLocale"];
    case 1:
      return [];
    case 2:
      return [];
    case 3:
      return [];
    default:
      return [];
  }
}

export function validateSetupValues(
  values: SetupWizardValues,
  fields: Array<keyof SetupWizardValues>,
  messages?: {
    required: string;
    fullUrl: string;
    validEmail: string;
    validLocale: string;
  },
): SetupWizardErrors {
  const errors: SetupWizardErrors = {};
  const validationMessages = messages ?? {
    required: "This field is required.",
    fullUrl: "Use a full URL including http:// or https://.",
    validEmail: "Use a valid email address.",
    validLocale: "Choose a supported default language.",
  };

  for (const field of fields) {
    const value = cleanValue(values[field]);

    if (
      [
        "appName",
        "appUrl",
      ].includes(field) &&
      !value
    ) {
      errors[field] = validationMessages.required;
      continue;
    }

    if (field === "appUrl" && value && !isValidUrl(value)) {
      errors[field] = validationMessages.fullUrl;
    }

    if (field === "appDefaultLocale" && !isSupportedLocale(value)) {
      errors[field] = validationMessages.validLocale;
    }

    if (
      (field === "operatorEmail" || field === "privacyContactEmail") &&
      value &&
      !isValidEmail(value)
    ) {
      errors[field] = validationMessages.validEmail;
    }

    if (field === "operatorWebsite" && value && !isValidUrl(value)) {
      errors[field] = validationMessages.fullUrl;
    }
  }

  return errors;
}

export function normalizeProcessorList(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("; ");
}

function quoteEnvValue(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function buildEnvFileContent(values: SetupWizardValues) {
  const processors = normalizeProcessorList(values.privacyProcessors);
  const privacyContactEmail =
    cleanValue(values.privacyContactEmail) || cleanValue(values.operatorEmail);

  return [
    "APP_SETUP_COMPLETE=true",
    `APP_NAME=${quoteEnvValue(cleanValue(values.appName))}`,
    `APP_URL=${quoteEnvValue(cleanValue(values.appUrl))}`,
    `APP_DEFAULT_LOCALE=${quoteEnvValue(values.appDefaultLocale)}`,
    `LEGAL_PAGES_ENABLED=${cleanValue(values.legalPagesEnabled) === "true" ? "true" : "false"}`,
    "",
    `OPERATOR_LEGAL_NAME=${quoteEnvValue(cleanValue(values.operatorLegalName))}`,
    `OPERATOR_DISPLAY_NAME=${quoteEnvValue(cleanValue(values.operatorDisplayName))}`,
    `OPERATOR_STREET_ADDRESS=${quoteEnvValue(cleanValue(values.operatorStreetAddress))}`,
    `OPERATOR_POSTAL_CODE=${quoteEnvValue(cleanValue(values.operatorPostalCode))}`,
    `OPERATOR_CITY=${quoteEnvValue(cleanValue(values.operatorCity))}`,
    `OPERATOR_COUNTRY=${quoteEnvValue(cleanValue(values.operatorCountry))}`,
    `OPERATOR_EMAIL=${quoteEnvValue(cleanValue(values.operatorEmail))}`,
    `OPERATOR_PHONE=${quoteEnvValue(cleanValue(values.operatorPhone))}`,
    `OPERATOR_WEBSITE=${quoteEnvValue(cleanValue(values.operatorWebsite))}`,
    `OPERATOR_BUSINESS_PURPOSE=${quoteEnvValue(cleanValue(values.operatorBusinessPurpose))}`,
    `MEDIA_OWNER=${quoteEnvValue(cleanValue(values.mediaOwner))}`,
    `EDITORIAL_LINE=${quoteEnvValue(cleanValue(values.editorialLine))}`,
    "",
    `PRIVACY_CONTACT_EMAIL=${quoteEnvValue(privacyContactEmail)}`,
    `HOSTING_DESCRIPTION=${quoteEnvValue(cleanValue(values.hostingDescription))}`,
    `PRIVACY_PROCESSORS=${quoteEnvValue(processors)}`,
  ].join("\n");
}
