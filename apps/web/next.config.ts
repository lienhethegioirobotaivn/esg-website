import type { NextConfig } from "next";

const apiUrl = (process.env.API_INTERNAL_URL || "http://localhost:3001").replace(
  /\/+$/,
  "",
);

const nextConfig: NextConfig = {
  transpilePackages: ["@esg/shared"],
  experimental: {
    proxyTimeout: 180_000,
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
