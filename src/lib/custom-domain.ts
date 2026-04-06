import "server-only";

import dns from "dns/promises";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { requirePlan } from "@/lib/plans/enforcement";

export async function setupCustomDomain(orgId: string, domain: string) {
  await requirePlan(orgId, "enterprise");

  const normalized = domain.toLowerCase().trim();
  const verifyToken = `slipwise-verify=${nanoid(24)}`;

  return db.orgDomain.upsert({
    where: { orgId },
    create: {
      orgId,
      domain: normalized,
      verified: false,
      verifyToken,
    },
    update: {
      domain: normalized,
      verified: false,
      verifyToken,
      verifiedAt: null,
    },
  });
}

export async function verifyDomain(orgId: string) {
  const record = await db.orgDomain.findUnique({ where: { orgId } });
  if (!record) throw new Error("No domain configured for this organization");

  try {
    const txtRecords = await dns.resolveTxt(record.domain);
    const flat = txtRecords.flat();
    const found = flat.some((txt) => txt === record.verifyToken);

    if (found) {
      await db.orgDomain.update({
        where: { orgId },
        data: { verified: true, verifiedAt: new Date() },
      });
      return { verified: true };
    }

    return { verified: false, expected: record.verifyToken };
  } catch {
    return { verified: false, error: "DNS lookup failed" };
  }
}

export async function removeDomain(orgId: string) {
  return db.orgDomain.delete({ where: { orgId } });
}

export async function getDomain(orgId: string) {
  return db.orgDomain.findUnique({ where: { orgId } });
}
