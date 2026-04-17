import { getAgingBucketsAction, getAtRiskCustomersAction, getRecoveryMetricsAction, getGatewayMetricsAction } from "./actions";
import { CollectionsIntelligenceClient } from "./collections-client";

export const metadata = {
  title: "Collections Intelligence | Slipwise Pay",
};

export default async function CollectionsIntelligencePage() {
  const [agingResult, atRiskResult, recoveryResult, gatewayResult] = await Promise.all([
    getAgingBucketsAction(),
    getAtRiskCustomersAction(),
    getRecoveryMetricsAction(6),
    getGatewayMetricsAction(30),
  ]);

  return (
    <CollectionsIntelligenceClient
      aging={agingResult.success ? agingResult.data : null}
      atRisk={atRiskResult.success ? atRiskResult.data : []}
      recovery={recoveryResult.success ? recoveryResult.data : null}
      gateway={gatewayResult.success ? gatewayResult.data : null}
    />
  );
}
