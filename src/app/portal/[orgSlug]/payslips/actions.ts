"use server";

import { db } from "@/lib/db";
import {
  createOtpForEmployee,
  verifyOtpAndIssueSession,
  clearEmployeeSession,
  requireEmployeeSession,
} from "@/lib/employee-portal-auth";
import { redirect } from "next/navigation";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function requestEmployeeOtp(
  orgSlug: string,
  email: string
): Promise<ActionResult<{ sent: true }>> {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) return { success: false, error: "Organization not found" };

  await createOtpForEmployee(org.id, email.toLowerCase().trim());
  // Always return success to avoid email enumeration
  return { success: true, data: { sent: true } };
}

export async function verifyEmployeeOtp(
  orgSlug: string,
  email: string,
  otp: string
): Promise<ActionResult<{ verified: true }>> {
  const result = await verifyOtpAndIssueSession(
    orgSlug,
    email.toLowerCase().trim(),
    otp.trim()
  );
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: { verified: true } };
}

export async function logoutEmployee(orgSlug: string): Promise<void> {
  await clearEmployeeSession();
  redirect(`/portal/${orgSlug}/payslips/login`);
}

export async function getMyPayslips(
  orgSlug: string
): Promise<
  ActionResult<
    Array<{
      id: string;
      slipNumber: string;
      month: number;
      year: number;
      grossPay: number;
      netPay: number;
      status: string;
      createdAt: Date;
    }>
  >
> {
  // Derive employeeId from the authenticated session — never trust client input.
  const session = await requireEmployeeSession(orgSlug);

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) return { success: false, error: "Not found" };

  const slips = await db.salarySlip.findMany({
    where: { organizationId: org.id, employeeId: session.employeeId, status: "final" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: {
      id: true,
      slipNumber: true,
      month: true,
      year: true,
      grossPay: true,
      netPay: true,
      status: true,
      createdAt: true,
    },
  });

  return { success: true, data: slips };
}
