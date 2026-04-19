import { createHash, timingSafeEqual } from "crypto";

/**
 * Deterministic canonical JSON: sorts keys at all levels
 * to ensure the same logical object always produces the same hash.
 */
export function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "string") return JSON.stringify(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalize).join(",") + "]";
  if (typeof obj === "object") {
    const sorted = Object.keys(obj as Record<string, unknown>)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalize((obj as Record<string, unknown>)[k]));
    return "{" + sorted.join(",") + "}";
  }
  return String(obj);
}

export interface AuditEntryData {
  sequenceNum: bigint | number;
  orgId: string;
  actorId: string;
  representedId?: string | null;
  proxyGrantId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: Date | string;
  prevHash: string;
}

/**
 * Compute the SHA-256 hash of an audit entry's canonical form.
 * This is deterministic — same inputs always produce the same hash.
 */
export function computeEntryHash(data: AuditEntryData): string {
  const canonical = canonicalize({
    sequenceNum: Number(data.sequenceNum),
    orgId: data.orgId,
    actorId: data.actorId,
    representedId: data.representedId ?? null,
    proxyGrantId: data.proxyGrantId ?? null,
    action: data.action,
    entityType: data.entityType ?? null,
    entityId: data.entityId ?? null,
    metadata: data.metadata ?? null,
    createdAt:
      data.createdAt instanceof Date
        ? data.createdAt.toISOString()
        : data.createdAt,
    prevHash: data.prevHash,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/** Genesis hash: the prevHash for the first entry in an org's chain. */
export const GENESIS_HASH = "GENESIS";

/**
 * Timing-safe comparison of two hash strings.
 * For 64-char hex SHA-256 hashes, uses constant-time buffer comparison.
 * For non-hex strings (e.g. GENESIS), falls back to length + byte comparison.
 */
export function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  // SHA-256 hex hashes are exactly 64 chars; use timing-safe compare for real hashes
  const isHex = /^[0-9a-f]{64}$/i;
  if (isHex.test(a) && isHex.test(b)) {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  }
  // For non-hex strings (e.g. GENESIS), use timing-safe byte compare on UTF-8
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
