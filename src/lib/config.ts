import { isAppSetupComplete } from "@/lib/setup-state";

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function getRequiredConfiguredEnv(name: string, fallback?: string) {
  const value = getEnv(name) ?? fallback;

  if (isAppSetupComplete() && !getEnv(name) && !fallback) {
    throw new Error(`${name} is required when APP_SETUP_COMPLETE=true.`);
  }

  return value ?? "";
}

export const appConfig = {
  appName: getRequiredConfiguredEnv("APP_NAME", "tempoll"),
  appUrl: getRequiredConfiguredEnv("APP_URL", "http://localhost:3000"),
  defaultSlotMinutes: 30,
  defaultMeetingDurationMinutes: 60,
  defaultDayStartMinutes: 9 * 60,
  defaultDayEndMinutes: 18 * 60,
  sessionMaxAgeSeconds: 60 * 60 * 24 * 30,
};

export function getDatabaseUrl() {
  const databaseUrl = getEnv("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}
