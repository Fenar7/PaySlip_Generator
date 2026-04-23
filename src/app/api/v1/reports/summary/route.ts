import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { toAccountingNumber } from "@/lib/accounting/utils";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  getClientIp,
} from "../../_helpers";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "read:reports");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalInvoices,
      draftInvoices,
      issuedInvoices,
      paidInvoices,
      overdueInvoices,
      totalVouchers,
      totalSalarySlips,
      totalCustomers,
      totalEmployees,
      totalVendors,
      invoicesThisMonth,
    ] = await Promise.all([
      db.invoice.count({ where: { organizationId: auth.orgId, archivedAt: null } }),
      db.invoice.count({ where: { organizationId: auth.orgId, status: "DRAFT", archivedAt: null } }),
      db.invoice.count({ where: { organizationId: auth.orgId, status: "ISSUED", archivedAt: null } }),
      db.invoice.count({ where: { organizationId: auth.orgId, status: "PAID", archivedAt: null } }),
      db.invoice.count({ where: { organizationId: auth.orgId, status: "OVERDUE", archivedAt: null } }),
      db.voucher.count({ where: { organizationId: auth.orgId, archivedAt: null } }),
      db.salarySlip.count({ where: { organizationId: auth.orgId, archivedAt: null } }),
      db.customer.count({ where: { organizationId: auth.orgId } }),
      db.employee.count({ where: { organizationId: auth.orgId } }),
      db.vendor.count({ where: { organizationId: auth.orgId } }),
      db.invoice.count({ where: { organizationId: auth.orgId, archivedAt: null, createdAt: { gte: startOfMonth } } }),
    ]);

    // Aggregate revenue from paid invoices
    const paidInvoicesData = await db.invoice.findMany({
      where: { organizationId: auth.orgId, status: "PAID", archivedAt: null },
      select: { totalAmount: true },
    });
    const totalRevenue = paidInvoicesData.reduce(
      (sum, inv) => sum + toAccountingNumber(inv.totalAmount),
      0,
    );

    const outstandingInvoices = await db.invoice.findMany({
      where: {
        organizationId: auth.orgId,
        status: { in: ["ISSUED", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
        archivedAt: null,
      },
      select: { totalAmount: true },
    });
    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + toAccountingNumber(inv.totalAmount),
      0,
    );

    const resp = apiResponse({
      invoices: {
        total: totalInvoices,
        draft: draftInvoices,
        issued: issuedInvoices,
        paid: paidInvoices,
        overdue: overdueInvoices,
        thisMonth: invoicesThisMonth,
      },
      vouchers: { total: totalVouchers },
      salarySlips: { total: totalSalarySlips },
      customers: { total: totalCustomers },
      employees: { total: totalEmployees },
      vendors: { total: totalVendors },
      financial: {
        totalRevenue,
        totalOutstanding,
        currency: "INR",
      },
    });
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", "/api/v1/reports/summary", 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
