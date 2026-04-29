import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { isDatabaseReachable } from "../../__tests__/db-check";
import {
  previewSequenceNumber,
  consumeSequenceNumber,
  SequenceNotFoundError,
  SequenceEngineError,
} from "../sequence-engine";

const dbReachable = await isDatabaseReachable();

async function createTestOrg() {
  return db.organization.create({
    data: {
      name: "Test Org",
      slug: `test-org-${Date.now()}`,
    },
  });
}

async function createTestSequence(orgId: string) {
  const sequence = await db.sequence.create({
    data: {
      organizationId: orgId,
      name: "Invoice Sequence",
      documentType: "INVOICE",
      periodicity: "YEARLY",
      isActive: true,
    },
  });

  await db.sequenceFormat.create({
    data: {
      sequenceId: sequence.id,
      formatString: "INV/{YYYY}/{NNNNN}",
      startCounter: 1,
      counterPadding: 5,
      isDefault: true,
    },
  });

  return sequence;
}

describe.skipIf(!dbReachable)("sequence-engine integration", () => {
  // Note: test data accumulates in the test DB. Each test uses a unique org slug.

  it("preview returns next number without consuming counter", async () => {
    const org = await createTestOrg();
    const sequence = await createTestSequence(org.id);

    const result = await previewSequenceNumber({
      sequenceId: sequence.id,
      documentDate: new Date("2026-04-28"),
      orgId: org.id,
    });

    expect(result.preview).toBe("INV/2026/00001");
    expect(result.nextCounter).toBe(1);
    expect(result.periodId).toBeNull();
  });

  it("consume returns formatted number and creates period", async () => {
    const org = await createTestOrg();
    const sequence = await createTestSequence(org.id);

    const result = await consumeSequenceNumber({
      sequenceId: sequence.id,
      documentDate: new Date("2026-04-28"),
      orgId: org.id,
    });

    expect(result.formattedNumber).toBe("INV/2026/00001");
    expect(result.sequenceNumber).toBe(1);
    expect(result.periodId).toBeTruthy();

    // Verify period was created
    const period = await db.sequencePeriod.findUnique({
      where: { id: result.periodId },
    });
    expect(period).not.toBeNull();
    expect(period?.currentCounter).toBe(1);
  });

  it("consume increments counter atomically on second call", async () => {
    const org = await createTestOrg();
    const sequence = await createTestSequence(org.id);

    const first = await consumeSequenceNumber({
      sequenceId: sequence.id,
      documentDate: new Date("2026-04-28"),
      orgId: org.id,
    });

    const second = await consumeSequenceNumber({
      sequenceId: sequence.id,
      documentDate: new Date("2026-04-28"),
      orgId: org.id,
    });

    expect(first.sequenceNumber).toBe(1);
    expect(second.sequenceNumber).toBe(2);
    expect(second.formattedNumber).toBe("INV/2026/00002");
  });

  it("throws for non-existent sequence", async () => {
    await expect(
      previewSequenceNumber({
        sequenceId: "non-existent",
        documentDate: new Date("2026-04-28"),
        orgId: "non-existent",
      })
    ).rejects.toThrow(SequenceNotFoundError);
  });

  it("throws for sequence without default format", async () => {
    const org = await createTestOrg();
    const sequence = await db.sequence.create({
      data: {
        organizationId: org.id,
        name: "No Format",
        documentType: "INVOICE",
        periodicity: "NONE",
      },
    });

    await expect(
      consumeSequenceNumber({
        sequenceId: sequence.id,
        documentDate: new Date("2026-04-28"),
        orgId: org.id,
      })
    ).rejects.toThrow(SequenceEngineError);
  });
});
