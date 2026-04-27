function getBooleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();

  return value === "true";
}

export function isDevModeEnabled() {
  return getBooleanEnv("TEMPOLL_DEV_MODE");
}
