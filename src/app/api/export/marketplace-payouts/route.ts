import { NextResponse } from "next/server";
import {
  requireMarketplacePublisherAdmin,
} from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { exportPublisherPayoutStatementCsv } from "@/lib/payouts/runs";

export async function GET() {
  try {
    const { orgId } = await requireMarketplacePublisherAdmin();
    const allowed = await checkFeature(orgId, "templatePublish");

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Publisher payout operations require marketplace publishing on a Pro plan or higher.",
        },
        { status: 403 },
      );
    }

    const csv = await exportPublisherPayoutStatementCsv(orgId);
    const fileName = `publisher-payout-statement-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export publisher payout statement.",
      },
      { status: 500 },
    );
  }
}
