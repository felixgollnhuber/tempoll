export type SetupWizardValues = {
  appName: string;
  appUrl: string;
  databaseUrl: string;
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
  databaseUrl: "postgresql://postgres:postgres@localhost:55432/tempoll?schema=public",
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

function isValidDatabaseUrl(value: string) {
  return value.startsWith("postgres://") || value.startsWith("postgresql://");
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
      return ["appName", "appUrl"];
    case 1:
      return ["databaseUrl"];
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
): SetupWizardErrors {
  const errors: SetupWizardErrors = {};

  for (const field of fields) {
    const value = cleanValue(values[field]);

    if (
      [
        "appName",
        "appUrl",
        "databaseUrl",
      ].includes(field) &&
      !value
    ) {
      errors[field] = "This field is required.";
      continue;
    }

    if (field === "appUrl" && value && !isValidUrl(value)) {
      errors[field] = "Use a full URL including http:// or https://.";
    }

    if (field === "databaseUrl" && value && !isValidDatabaseUrl(value)) {
      errors[field] = "Use a PostgreSQL connection string.";
    }

    if (
      (field === "operatorEmail" || field === "privacyContactEmail") &&
      value &&
      !isValidEmail(value)
    ) {
      errors[field] = "Use a valid email address.";
    }

    if (field === "operatorWebsite" && value && !isValidUrl(value)) {
      errors[field] = "Use a full URL including http:// or https://.";
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
    `DATABASE_URL=${quoteEnvValue(cleanValue(values.databaseUrl))}`,
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
