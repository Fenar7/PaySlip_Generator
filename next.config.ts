import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "ioredis"],
  async redirects() {
    return [
      { source: "/app", destination: "/app/home", permanent: false },
    ];
  },
};

export default nextConfig;
