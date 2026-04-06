import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { getPaymentHistory } from "@/lib/late-payment-predictor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = request.nextUrl.searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json(
        { error: "Missing required 'customerId' parameter." },
        { status: 400 },
      );
    }

    const result = await getPaymentHistory(ctx.orgId, customerId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Payment risk assessment failed:", error);
    return NextResponse.json(
      { error: "Failed to assess payment risk." },
      { status: 500 },
    );
  }
}
