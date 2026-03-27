export const PUBLIC_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export const MANAGE_RESPONSE_HEADERS = {
  ...PRIVATE_NO_STORE_HEADERS,
  "Referrer-Policy": "no-referrer",
} as const;

export function buildContentSecurityPolicy(options?: {
  isDevelopment?: boolean;
}) {
  const isDevelopment = options?.isDevelopment ?? false;

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function getBaseSecurityHeaders() {
  return {
    "Content-Security-Policy": buildContentSecurityPolicy({
      isDevelopment: process.env.NODE_ENV !== "production",
    }),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy":
      "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  } as const;
}
