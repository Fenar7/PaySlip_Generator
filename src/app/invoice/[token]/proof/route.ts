import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isUploadedFile } from "@/lib/server/form-data";
import { deleteFileServer } from "@/lib/storage/upload-server";
import { notifyOrgAdmins } from "@/lib/notifications";
import {
  validatePaymentProofFile,
} from "@/features/pay/lib/payment-proof";
import { uploadPaymentProofFile } from "@/features/pay/server/payment-proof-storage";
import { resolvePublicInvoicePaymentProofEligibility } from "../payment-proof-eligibility";

const PAYMENT_METHODS = new Set(["bank_transfer", "upi", "cash", "cheque", "other"]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!isUploadedFile(file)) {
      return errorResponse("A payment proof file is required.", 400);
    }

    const fileError = validatePaymentProofFile(file);
    if (fileError) {
      return errorResponse(fileError, 400);
    }

    const amount = Number(formData.get("amount"));
    const paymentDate = String(formData.get("paymentDate") ?? "").trim();
    const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const fileName = String(formData.get("fileName") ?? "").trim();
    const plannedNextPaymentDate = String(formData.get("plannedNextPaymentDate") ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return errorResponse("Enter a valid payment amount.", 400);
    }

    if (!paymentDate) {
      return errorResponse("Select a payment date.", 400);
    }

    const paidAt = new Date(paymentDate);
    if (Number.isNaN(paidAt.getTime())) {
      return errorResponse("Enter a valid payment date.", 400);
    }

    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return errorResponse("Select a valid payment method.", 400);
    }

    const tokenRecord = await db.publicInvoiceToken.findUnique({
      where: { token },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            amountPaid: true,
            remainingAmount: true,
            status: true,
            organizationId: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      return errorResponse("Invalid or expired invoice link.", 404);
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      return errorResponse("This invoice link has expired.", 410);
    }

    const invoice = tokenRecord.invoice;
    const paymentProof = await resolvePublicInvoicePaymentProofEligibility({
      id: invoice.id,
      status: invoice.status,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      remainingAmount: invoice.remainingAmount,
    });
    if (!paymentProof.canUpload) {
      return errorResponse(
        paymentProof.blockedReason ?? "This invoice no longer accepts payment proofs.",
        409
      );
    }

    if (amount > paymentProof.remainingAmount + 0.01) {
      return errorResponse(
        `Amount exceeds the remaining balance of ${paymentProof.remainingAmount.toFixed(2)}.`,
        400,
      );
    }

    const isPartial = amount < paymentProof.remainingAmount - 0.01;
    if (isPartial) {
      if (!plannedNextPaymentDate) {
        return errorResponse("A planned next payment date is required for partial payments.", 400);
      }

      const promiseDate = new Date(plannedNextPaymentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(promiseDate.getTime()) || promiseDate < today) {
        return errorResponse("Planned next payment date must be today or a future date.", 400);
      }
    }

    let uploaded;
    try {
      uploaded = await uploadPaymentProofFile({
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        file,
        fileName,
      });
    } catch (error) {
      console.error("public proof upload storage error:", error);
      return errorResponse("Failed to store the payment proof. Please try again.", 502);
    }

    let proof;
    try {
      proof = await db.$transaction(async (tx) => {
        const payment = await tx.invoicePayment.create({
          data: {
            invoiceId: invoice.id,
            orgId: invoice.organizationId,
            amount,
            method: paymentMethod,
            note: note || null,
            paidAt,
            isPartial,
            source: "public_proof",
            status: "PENDING_REVIEW",
            plannedNextPaymentDate: isPartial ? plannedNextPaymentDate : null,
          },
        });

        return tx.invoiceProof.create({
          data: {
            invoiceId: invoice.id,
            fileUrl: uploaded.storageKey,
            fileName: fileName || file.name,
            amount,
            paymentDate,
            paymentMethod,
            uploadedByToken: tokenRecord.id,
            reviewStatus: "PENDING",
            invoicePaymentId: payment.id,
            plannedNextPaymentDate: isPartial ? plannedNextPaymentDate : null,
          },
        });
      });
    } catch (error) {
      try {
        await deleteFileServer("proofs", uploaded.storageKey);
      } catch (cleanupError) {
        console.error("public proof upload cleanup error:", cleanupError);
      }

      console.error("public proof upload transaction error:", error);
      return errorResponse("Failed to save the payment proof. Please try again.", 500);
    }

    revalidatePath(`/invoice/${token}`);
    revalidatePath("/app/pay/proofs");

    await notifyOrgAdmins({
      orgId: invoice.organizationId,
      type: "proof_uploaded",
      title: "New payment proof submitted",
      body: `A payment proof was submitted for invoice ${invoice.invoiceNumber}.`,
      link: `/app/pay/proofs/${proof.id}`,
    }).catch((error) => {
      console.error("public proof upload notification error:", error);
    });

    return NextResponse.json({
      success: true,
      data: { proofId: proof.id },
    });
  } catch (error) {
    console.error("public proof upload route error:", error);
    return errorResponse("Failed to upload payment proof.", 500);
  }
}
