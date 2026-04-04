import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  async redirects() {
    return [
      { source: "/invoice", destination: "/app/docs/invoices/new", permanent: true },
      { source: "/voucher", destination: "/app/docs/vouchers/new", permanent: true },
      { source: "/salary-slip", destination: "/app/docs/salary-slips/new", permanent: true },
      { source: "/pdf-studio", destination: "/app/docs/pdf-studio", permanent: true },
      { source: "/app", destination: "/app/home", permanent: false },
    ];
  },
};

export default nextConfig;
