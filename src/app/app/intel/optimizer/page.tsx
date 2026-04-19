import { Metadata } from "next";
import { OptimizerWorkbench } from "./optimizer-workbench";

export const metadata: Metadata = {
  title: "Cash-Flow Optimizer | Slipwise One",
};

export default function OptimizerPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Cash-Flow Optimizer
        </h1>
        <p className="text-muted-foreground">
          AI-driven payment optimization, customer behavior scoring, and
          cash-flow alerts.
        </p>
      </div>
      <OptimizerWorkbench />
    </div>
  );
}
