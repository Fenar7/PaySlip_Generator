import { Suspense } from "react";
import ExecutiveDashboard from "./executive-dashboard";

export const metadata = {
  title: "Executive Dashboard – SW Intel Pro",
};

export default function ExecutiveDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading dashboard…</div>
      }
    >
      <ExecutiveDashboard />
    </Suspense>
  );
}
