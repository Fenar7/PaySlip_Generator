import { processScheduledActions } from "@/lib/flow/scheduler";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await processScheduledActions();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[FlowScheduler] cron failed: ", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
