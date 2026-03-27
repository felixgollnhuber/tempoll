import type { NextConfig } from "next";

import { MANAGE_RESPONSE_HEADERS, getBaseSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    const baseSecurityHeaders = Object.entries(getBaseSecurityHeaders()).map(([key, value]) => ({
      key,
      value,
    }));
    const manageHeaders = Object.entries(MANAGE_RESPONSE_HEADERS).map(([key, value]) => ({
      key,
      value,
    }));

    return [
      {
        source: "/:path*",
        headers: baseSecurityHeaders,
      },
      {
        source: "/manage/:path*",
        headers: manageHeaders,
      },
      {
        source: "/api/manage/:path*",
        headers: manageHeaders,
      },
    ];
  },
};

export default nextConfig;
