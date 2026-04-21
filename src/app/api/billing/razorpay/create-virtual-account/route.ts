import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createCustomerVirtualAccount } from "@/lib/smart-collect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { customerId } = body as { customerId?: string };

  if (!customerId) {
    return NextResponse.json(
      { error: "Missing customerId" },
      { status: 400 },
    );
  }

  const member = await db.member.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const result = await createCustomerVirtualAccount(
    member.organizationId,
    customerId,
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
