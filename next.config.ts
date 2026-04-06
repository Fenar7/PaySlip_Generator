import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  async redirects() {
    return [
      { source: "/app", destination: "/app/home", permanent: false },
    ];
  },
};

export default nextConfig;
