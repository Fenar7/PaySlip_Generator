import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DelegationsClient } from "./delegations-client";

export const metadata = { title: "Approval Delegations" };

async function DelegationsPage() {
  const { orgId, userId } = await requireRole("member");

  // Load colleagues in the org for the "delegate to" picker
  const members = await db.member.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const colleagues = members
    .filter((m) => m.userId !== userId)
    .map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">Approval Delegations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          While you are out of office, route your approval tasks to a colleague.
        </p>
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <DelegationsClient colleagues={colleagues} />
      </Suspense>
    </div>
  );
}

export default DelegationsPage;
