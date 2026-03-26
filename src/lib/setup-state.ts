export function isAppSetupComplete() {
  return process.env.APP_SETUP_COMPLETE === "true";
}
