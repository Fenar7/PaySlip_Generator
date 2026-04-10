"use server";

import { db } from "@/lib/db";
import { requireRole, requireOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

interface EwayBillInput {
  invoiceId: string;
  transportMode: string;
  vehicleNumber?: string;
  transporterGstin?: string;
  transportDocNo?: string;
  distanceKm: number;
  fromPincode: string;
  toPincode: string;
}

interface EwayBillData {
  eWayBillNumber: string;
  eWayBillDate: string;
  eWayBillExpiry: string;
  transportMode: string;
  vehicleNumber: string | null;
}

// ─── Generate e-Way Bill ──────────────────────────────────────────────────────

export async function generateEwayBill(
  input: EwayBillInput
): Promise<ActionResult<EwayBillData>> {
  try {
    const { orgId } = await requireRole("admin");

    const hasFeature = await checkFeature(orgId, "gstEInvoicing");
    if (!hasFeature) {
      return { success: false, error: "Upgrade to Pro for e-Way Bill generation" };
    }

    const invoice = await db.invoice.findFirst({
      where: { id: input.invoiceId, organizationId: orgId },
      include: { lineItems: true },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status !== "ISSUED") {
      return { success: false, error: "Invoice must be in ISSUED status for e-Way Bill" };
    }

    // Check total GST amount > ₹50,000
    const totalGstAmount =
      invoice.gstTotalCgst +
      invoice.gstTotalSgst +
      invoice.gstTotalIgst +
      invoice.gstTotalCess;
    const totalInvoiceValue = invoice.totalAmount + totalGstAmount;

    if (totalInvoiceValue <= 50000) {
      return {
        success: false,
        error: "e-Way Bill is only required for invoices exceeding ₹50,000",
      };
    }

    // Verify line items have HSN codes (not SAC-only)
    const hasGoodsItems = invoice.lineItems.some(
      (item) => item.hsnCode && !item.hsnCode.startsWith("99")
    );
    const allServiceItems = invoice.lineItems.every(
      (item) => !item.hsnCode || item.hsnCode.startsWith("99") || item.sacCode
    );

    if (allServiceItems || !hasGoodsItems) {
      return {
        success: false,
        error: "e-Way Bill not required for services",
      };
    }

    // Verify all goods items have HSN codes
    const missingHsn = invoice.lineItems.some(
      (item) =>
        !item.hsnCode?.startsWith("99") && !item.hsnCode
    );
    if (missingHsn) {
      return {
        success: false,
        error: "All goods line items must have HSN codes",
      };
    }

    // Mock e-Way Bill generation (EWB API is similar to IRP — store data for now)
    const now = new Date();
    const expiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const ewbNumber = `EWB${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await db.invoice.update({
      where: { id: input.invoiceId },
      data: {
        eWayBillNumber: ewbNumber,
        eWayBillDate: now,
        eWayBillExpiry: expiry,
        ewbTransportMode: input.transportMode,
        ewbVehicleNumber: input.vehicleNumber ?? null,
        ewbTransporterGstin: input.transporterGstin ?? null,
        ewbTransportDocNo: input.transportDocNo ?? null,
        ewbDistanceKm: input.distanceKm,
        ewbFromPincode: input.fromPincode,
        ewbToPincode: input.toPincode,
      },
    });

    revalidatePath(`/app/docs/invoices/${input.invoiceId}`);

    return {
      success: true,
      data: {
        eWayBillNumber: ewbNumber,
        eWayBillDate: now.toISOString(),
        eWayBillExpiry: expiry.toISOString(),
        transportMode: input.transportMode,
        vehicleNumber: input.vehicleNumber ?? null,
      },
    };
  } catch (error) {
    console.error("generateEwayBill error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate e-Way Bill",
    };
  }
}

// ─── Get e-Way Bill Status ────────────────────────────────────────────────────

export async function getEwayBillStatus(
  invoiceId: string
): Promise<
  ActionResult<{
    eWayBillNumber: string | null;
    eWayBillDate: string | null;
    eWayBillExpiry: string | null;
    transportMode: string | null;
    vehicleNumber: string | null;
    transporterGstin: string | null;
    transportDocNo: string | null;
    distanceKm: number | null;
    fromPincode: string | null;
    toPincode: string | null;
    expired: boolean;
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: {
        eWayBillNumber: true,
        eWayBillDate: true,
        eWayBillExpiry: true,
        ewbTransportMode: true,
        ewbVehicleNumber: true,
        ewbTransporterGstin: true,
        ewbTransportDocNo: true,
        ewbDistanceKm: true,
        ewbFromPincode: true,
        ewbToPincode: true,
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const expired = invoice.eWayBillExpiry
      ? invoice.eWayBillExpiry < new Date()
      : false;

    return {
      success: true,
      data: {
        eWayBillNumber: invoice.eWayBillNumber,
        eWayBillDate: invoice.eWayBillDate?.toISOString() ?? null,
        eWayBillExpiry: invoice.eWayBillExpiry?.toISOString() ?? null,
        transportMode: invoice.ewbTransportMode,
        vehicleNumber: invoice.ewbVehicleNumber,
        transporterGstin: invoice.ewbTransporterGstin,
        transportDocNo: invoice.ewbTransportDocNo,
        distanceKm: invoice.ewbDistanceKm,
        fromPincode: invoice.ewbFromPincode,
        toPincode: invoice.ewbToPincode,
        expired,
      },
    };
  } catch (error) {
    console.error("getEwayBillStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get e-Way Bill status",
    };
  }
}
