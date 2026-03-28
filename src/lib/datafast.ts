const DATAFAST_SCRIPT_SRC = "https://datafa.st/js/script.cookieless.js";
const DATAFAST_API_PROXY_PATH = "/api/datafast/events";

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

const websiteId = getEnv("DATAFAST_WEBSITE_ID");
const domain = getEnv("DATAFAST_DOMAIN");

export const datafastConfig = {
  websiteId,
  domain,
  scriptSrc: DATAFAST_SCRIPT_SRC,
  apiProxyPath: DATAFAST_API_PROXY_PATH,
  enabled: Boolean(websiteId && domain),
} as const;
