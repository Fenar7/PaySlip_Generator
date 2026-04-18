import { MatchStatus } from "@/generated/prisma/client";

export interface PoLine {
  id: string;
  inventoryItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface GrnLine {
  poLineId: string;
  acceptedQty: number;
}

export interface BillLine {
  poLineId: string | null;
  inventoryItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface MatchDiscrepancy {
  poLineId: string;
  field: "quantity" | "unitPrice" | "lineTotal";
  expected: number;
  actual: number;
  variancePct: number;
}

export interface ThreeWayMatchInput {
  purchaseOrderId: string;
  poLines: PoLine[];
  grnLines: GrnLine[];
  billLines: BillLine[];
  qtyTolerancePct: number;
  amountTolerancePct: number;
}

export interface ThreeWayMatchOutput {
  matchStatus: MatchStatus;
  qtyMatchScore: number;
  amountMatchScore: number;
  overallScore: number;
  discrepancies: MatchDiscrepancy[];
}

const MATCH_THRESHOLD = 0.95;
const PARTIAL_MATCH_THRESHOLD = 0.80;

/**
 * Run 3-Way Match: PO lines vs GRN accepted quantities vs Vendor Bill lines.
 *
 * Scoring:
 *  - qtyMatchScore  = matched line qty comparisons / total PO lines
 *  - amountMatchScore = matched line amount comparisons / total PO lines
 *  - overallScore = (qtyMatchScore + amountMatchScore) / 2
 *
 * Status:
 *  - MATCHED       >= 0.95
 *  - PARTIAL_MATCH >= 0.80
 *  - MISMATCH       < 0.80
 */
export function runThreeWayMatch(input: ThreeWayMatchInput): ThreeWayMatchOutput {
  const { poLines, grnLines, billLines, qtyTolerancePct, amountTolerancePct } = input;

  const grnByPoLine = new Map<string, number>();
  for (const g of grnLines) {
    grnByPoLine.set(g.poLineId, (grnByPoLine.get(g.poLineId) ?? 0) + g.acceptedQty);
  }

  const billByPoLine = new Map<string, BillLine>();
  for (const b of billLines) {
    if (b.poLineId) {
      billByPoLine.set(b.poLineId, b);
    }
  }

  const discrepancies: MatchDiscrepancy[] = [];
  let qtyMatchCount = 0;
  let amountMatchCount = 0;
  const total = poLines.length;

  if (total === 0) {
    return {
      matchStatus: MatchStatus.PENDING,
      qtyMatchScore: 0,
      amountMatchScore: 0,
      overallScore: 0,
      discrepancies: [],
    };
  }

  for (const poLine of poLines) {
    const grnQty = grnByPoLine.get(poLine.id) ?? 0;
    const billLine = billByPoLine.get(poLine.id);

    // Quantity check: bill qty vs GRN accepted qty
    const billedQty = billLine?.quantity ?? 0;
    const qtyVariance = grnQty > 0 ? Math.abs(billedQty - grnQty) / grnQty : 1;
    const qtyToleranceFraction = qtyTolerancePct / 100;

    if (qtyVariance <= qtyToleranceFraction) {
      qtyMatchCount++;
    } else {
      discrepancies.push({
        poLineId: poLine.id,
        field: "quantity",
        expected: grnQty,
        actual: billedQty,
        variancePct: parseFloat((qtyVariance * 100).toFixed(2)),
      });
    }

    // Amount check: bill unit price vs PO unit price
    const billedUnitPrice = billLine?.unitPrice ?? 0;
    const priceVariance =
      poLine.unitPrice > 0 ? Math.abs(billedUnitPrice - poLine.unitPrice) / poLine.unitPrice : 1;
    const amountToleranceFraction = amountTolerancePct / 100;

    if (priceVariance <= amountToleranceFraction) {
      amountMatchCount++;
    } else {
      discrepancies.push({
        poLineId: poLine.id,
        field: "unitPrice",
        expected: poLine.unitPrice,
        actual: billedUnitPrice,
        variancePct: parseFloat((priceVariance * 100).toFixed(2)),
      });
    }
  }

  const qtyMatchScore = total > 0 ? qtyMatchCount / total : 0;
  const amountMatchScore = total > 0 ? amountMatchCount / total : 0;
  const overallScore = (qtyMatchScore + amountMatchScore) / 2;

  let matchStatus: MatchStatus;
  if (overallScore >= MATCH_THRESHOLD) {
    matchStatus = MatchStatus.MATCHED;
  } else if (overallScore >= PARTIAL_MATCH_THRESHOLD) {
    matchStatus = MatchStatus.PARTIAL_MATCH;
  } else {
    matchStatus = MatchStatus.MISMATCH;
  }

  return {
    matchStatus,
    qtyMatchScore: parseFloat(qtyMatchScore.toFixed(4)),
    amountMatchScore: parseFloat(amountMatchScore.toFixed(4)),
    overallScore: parseFloat(overallScore.toFixed(4)),
    discrepancies,
  };
}
