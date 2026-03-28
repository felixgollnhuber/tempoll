export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) {
      return firstIp.trim();
    }
  }

  const fallbackHeaders = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-client-ip",
    "x-forwarded",
    "forwarded",
  ];

  for (const header of fallbackHeaders) {
    const value = request.headers.get(header)?.trim();
    if (value) {
      return value;
    }
  }

  return "unknown";
}
