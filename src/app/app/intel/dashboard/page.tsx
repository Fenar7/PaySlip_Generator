import type { Metadata } from "next";
import { DashboardClient } from "@/features/intel/components/dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — SW Intel",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
