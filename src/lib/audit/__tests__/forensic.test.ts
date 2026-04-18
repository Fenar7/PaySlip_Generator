import { describe, it, expect } from "vitest";
import {
  canonicalize,
  computeEntryHash,
  GENESIS_HASH,
  hashesMatch,
} from "../forensic";
import type { AuditEntryData } from "../forensic";

describe("canonicalize", () => {
  it("sorts object keys deterministically", () => {
    const a = canonicalize({ z: 1, a: 2, m: 3 });
    const b = canonicalize({ a: 2, m: 3, z: 1 });
    expect(a).toBe(b);
  });

  it("handles nested objects with sorted keys", () => {
    const result = canonicalize({ b: { d: 1, c: 2 }, a: 3 });
    expect(result).toBe('{"a":3,"b":{"c":2,"d":1}}');
  });

  it("handles arrays preserving order", () => {
    const result = canonicalize([3, 1, 2]);
    expect(result).toBe("[3,1,2]");
  });

  it("handles null and undefined", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(undefined)).toBe("null");
  });

  it("handles strings with escaping", () => {
    expect(canonicalize("hello")).toBe('"hello"');
  });
});

describe("computeEntryHash", () => {
  const baseEntry: AuditEntryData = {
    sequenceNum: 1,
    orgId: "org-001",
    actorId: "user-001",
    representedId: null,
    proxyGrantId: null,
    action: "invoice.issued",
    entityType: "Invoice",
    entityId: "inv-001",
    metadata: { amount: 1000 },
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    prevHash: GENESIS_HASH,
  };

  it("produces a 64-char hex SHA-256 hash", () => {
    const hash = computeEntryHash(baseEntry);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("is deterministic — same input always produces same hash", () => {
    const h1 = computeEntryHash(baseEntry);
    const h2 = computeEntryHash(baseEntry);
    expect(h1).toBe(h2);
  });

  it("changes when any field changes", () => {
    const original = computeEntryHash(baseEntry);

    // Change action
    const withDiffAction = computeEntryHash({ ...baseEntry, action: "invoice.cancelled" });
    expect(withDiffAction).not.toBe(original);

    // Change metadata
    const withDiffMeta = computeEntryHash({ ...baseEntry, metadata: { amount: 2000 } });
    expect(withDiffMeta).not.toBe(original);

    // Change prevHash
    const withDiffPrev = computeEntryHash({ ...baseEntry, prevHash: "abc123" });
    expect(withDiffPrev).not.toBe(original);

    // Change sequenceNum
    const withDiffSeq = computeEntryHash({ ...baseEntry, sequenceNum: 2 });
    expect(withDiffSeq).not.toBe(original);
  });

  it("handles BigInt sequenceNum", () => {
    const entry = { ...baseEntry, sequenceNum: BigInt(1) };
    const hash = computeEntryHash(entry);
    // Should produce the same hash as number 1
    const withNum = computeEntryHash({ ...baseEntry, sequenceNum: 1 });
    expect(hash).toBe(withNum);
  });

  it("handles Date and string createdAt identically", () => {
    const withDate = computeEntryHash({
      ...baseEntry,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
    });
    const withString = computeEntryHash({
      ...baseEntry,
      createdAt: "2026-01-15T10:00:00.000Z",
    });
    expect(withDate).toBe(withString);
  });
});

describe("chain integrity simulation", () => {
  it("builds a valid chain and detects tampering", () => {
    // Build a 5-entry chain
    const entries: Array<AuditEntryData & { entryHash: string }> = [];

    for (let i = 1; i <= 5; i++) {
      const prevHash = i === 1 ? GENESIS_HASH : entries[i - 2].entryHash;
      const data: AuditEntryData = {
        sequenceNum: i,
        orgId: "org-test",
        actorId: "user-test",
        action: `action-${i}`,
        entityType: "Test",
        entityId: `test-${i}`,
        metadata: { step: i },
        createdAt: new Date(`2026-01-${String(i).padStart(2, "0")}T10:00:00.000Z`),
        prevHash,
      };
      entries.push({ ...data, entryHash: computeEntryHash(data) });
    }

    // Verify chain is intact
    for (let i = 0; i < entries.length; i++) {
      const expectedPrev = i === 0 ? GENESIS_HASH : entries[i - 1].entryHash;
      expect(entries[i].prevHash).toBe(expectedPrev);
      const recomputed = computeEntryHash(entries[i]);
      expect(recomputed).toBe(entries[i].entryHash);
    }

    // Tamper with entry 3's action
    const tampered = { ...entries[2], action: "TAMPERED" };
    const recomputed = computeEntryHash(tampered);
    expect(recomputed).not.toBe(entries[2].entryHash);
  });

  it("detects deleted entries via sequence gaps", () => {
    const seqs = [1, 2, 4, 5]; // gap at 3
    const gaps: number[] = [];
    let expected = 1;
    for (const seq of seqs) {
      while (expected < seq) {
        gaps.push(expected);
        expected++;
      }
      expected = seq + 1;
    }
    expect(gaps).toEqual([3]);
  });
});

describe("hashesMatch", () => {
  it("returns true for identical hashes", () => {
    const hash = computeEntryHash({
      sequenceNum: 1,
      orgId: "org",
      actorId: "actor",
      action: "test",
      createdAt: "2026-01-01T00:00:00.000Z",
      prevHash: GENESIS_HASH,
    });
    expect(hashesMatch(hash, hash)).toBe(true);
  });

  it("returns false for different hashes", () => {
    const h1 = "a".repeat(64);
    const h2 = "b".repeat(64);
    expect(hashesMatch(h1, h2)).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(hashesMatch("abc", "abcd")).toBe(false);
  });
});
