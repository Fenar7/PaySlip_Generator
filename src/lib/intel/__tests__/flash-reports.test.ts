import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@/lib/db"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    db: {
      organization: { findUniqueOrThrow: vi.fn() },
      flashReportSchedule: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      flashReportDelivery: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      pushSubscription: {
        count: vi.fn(),
      },
    },
  };
});

vi.mock(import("@/lib/intel/kpi-service"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    computeExecutiveKpis: vi.fn(),
  };
});

vi.mock(import("@/lib/email"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendEmail: vi.fn(),
  };
});

vi.mock(import("@/lib/push-notifications"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendNotification: vi.fn(),
  };
});

import { db } from "@/lib/db";
import { computeExecutiveKpis } from "@/lib/intel/kpi-service";
import { sendEmail } from "@/lib/email";
import { deliverFlashReport } from "../flash-reports";

describe("flash-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.organization.findUniqueOrThrow).mockResolvedValue({
      name: "Acme Corp",
    } as never);
    vi.mocked(computeExecutiveKpis).mockResolvedValue({
      arr: 240000,
      generatedAt: new Date("2026-02-01T09:00:00.000Z"),
      period: "MTD",
      kpis: [
        {
          id: "mrr-arr",
          label: "MRR / ARR",
          currentValue: 20000,
          previousValue: 18000,
          changePct: 11.11,
          trend: "UP",
          trendIsPositive: true,
          unit: "currency",
          sparkline: [15000, 16000, 17000, 18000, 19000, 20000],
        },
      ],
    } as never);
    vi.mocked(db.flashReportDelivery.upsert).mockResolvedValue({
      id: "delivery_1",
    } as never);
    vi.mocked(db.flashReportDelivery.update).mockResolvedValue({} as never);
    vi.mocked(db.flashReportSchedule.update).mockResolvedValue({} as never);
  });

  it("sends email flash reports through the email service", async () => {
    vi.mocked(db.flashReportSchedule.findFirst)
      .mockResolvedValueOnce({
        id: "schedule_1",
        orgId: "org_1",
        channel: "EMAIL",
      } as never)
      .mockResolvedValueOnce({
        id: "schedule_1",
        orgId: "org_1",
        channel: "EMAIL",
        user: { email: "ops@example.com" },
      } as never);
    vi.mocked(db.flashReportDelivery.findUnique).mockResolvedValue(null);

    const result = await deliverFlashReport("schedule_1", "org_1", "EMAIL", "MTD");

    expect(result).toEqual({ delivered: true, deliveryId: "delivery_1" });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
        subject: expect.stringContaining("Executive Flash Report"),
      })
    );
    expect(db.flashReportSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastDeliveryStatus: "DELIVERED" }),
      })
    );
  });

  it("reuses an existing delivered report within the same delivery window", async () => {
    vi.mocked(db.flashReportSchedule.findFirst).mockResolvedValueOnce({
      id: "schedule_1",
      orgId: "org_1",
      channel: "EMAIL",
    } as never);
    vi.mocked(db.flashReportDelivery.findUnique).mockResolvedValue({
      id: "delivery_existing",
      status: "DELIVERED",
    } as never);

    const result = await deliverFlashReport("schedule_1", "org_1", "EMAIL", "MTD");

    expect(result).toEqual({ delivered: true, deliveryId: "delivery_existing" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.flashReportDelivery.upsert).not.toHaveBeenCalled();
  });

  it("fails WhatsApp flash reports instead of marking them delivered", async () => {
    vi.mocked(db.flashReportSchedule.findFirst).mockResolvedValueOnce({
      id: "schedule_1",
      orgId: "org_1",
      channel: "WHATSAPP",
    } as never);
    vi.mocked(db.flashReportDelivery.findUnique).mockResolvedValue(null);

    const result = await deliverFlashReport("schedule_1", "org_1", "WHATSAPP", "MTD");

    expect(result).toEqual({ delivered: false, deliveryId: "delivery_1" });
    expect(db.flashReportDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "WhatsApp flash reports are not configured",
        }),
      })
    );
    expect(db.flashReportSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { lastDeliveryStatus: "FAILED" },
      })
    );
  });
});
