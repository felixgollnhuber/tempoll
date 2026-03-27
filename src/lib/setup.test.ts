import { describe, expect, it } from "vitest";

import {
  buildEnvFileContent,
  createSetupWizardValues,
  normalizeProcessorList,
  validateSetupValues,
} from "./setup";

describe("setup wizard helpers", () => {
  it("normalizes processor lists into env-ready values", () => {
    expect(normalizeProcessorList("Coolify\n\nHetzner\n Cloudflare  ")).toBe(
      "Coolify; Hetzner; Cloudflare",
    );
  });

  it("validates required fields and key formats", () => {
    const errors = validateSetupValues(
      createSetupWizardValues({
        appName: "",
        appUrl: "not-a-url",
        operatorWebsite: "invalid-site",
      }),
      ["appName", "appUrl", "operatorWebsite"],
    );

    expect(errors.appName).toBeTruthy();
    expect(errors.appUrl).toContain("Use a full URL");
    expect(errors.operatorWebsite).toContain("Use a full URL");
  });

  it("does not require legal disclosure fields", () => {
    const errors = validateSetupValues(
      createSetupWizardValues({
        operatorLegalName: "",
        operatorEmail: "",
        mediaOwner: "",
        hostingDescription: "",
      }),
      ["operatorLegalName", "operatorEmail", "mediaOwner", "hostingDescription"],
    );

    expect(errors).toEqual({});
  });

  it("builds a finished env file with the setup completion flag", () => {
    const envFile = buildEnvFileContent(
      createSetupWizardValues({
        appName: "tempoll",
        appUrl: "https://meet.example.com",
        legalPagesEnabled: "false",
        operatorLegalName: "Jane Doe",
        operatorDisplayName: "Jane Doe",
        operatorStreetAddress: "Example Street 1",
        operatorPostalCode: "1010",
        operatorCity: "Vienna",
        operatorCountry: "Austria",
        operatorEmail: "hello@example.com",
        operatorBusinessPurpose: "Scheduling service",
        mediaOwner: "Jane Doe",
        editorialLine: "Project information",
        hostingDescription: "Self-hosted",
        privacyProcessors: "Coolify\nHetzner",
      }),
    );

    expect(envFile).toContain("APP_SETUP_COMPLETE=true");
    expect(envFile).toContain("LEGAL_PAGES_ENABLED=false");
    expect(envFile).toContain('APP_NAME="tempoll"');
    expect(envFile).toContain('PRIVACY_PROCESSORS="Coolify; Hetzner"');
    expect(envFile).toContain('PRIVACY_CONTACT_EMAIL="hello@example.com"');
    expect(envFile).not.toContain("DATABASE_URL");
    expect(envFile).not.toContain("SERVICE_PASSWORD");
  });
});
