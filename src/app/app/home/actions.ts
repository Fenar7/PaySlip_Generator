"use server";

import { getDocsSummary } from "@/lib/docs-vault";
import {
  getDashboardKPIs,
  getRevenueTrendData,
  getRecentActivity,
  type DashboardKPIs,
  type RevenueTrendPoint,
  type ActivityEntry,
} from "@/app/app/intel/dashboard/actions";
import { listInvoices } from "@/app/app/docs/invoices/actions";
import { listVouchers } from "@/app/app/docs/vouchers/actions";
import { listSalarySlips } from "@/app/app/docs/salary-slips/actions";

export interface DashboardData {
  counts: {
    invoice: number;
    voucher: number;
    salarySlip: number;
    quote: number;
    total: number;
  };
  kpis: DashboardKPIs;
  revenueTrend: RevenueTrendPoint[];
  recentActivity: ActivityEntry[];
  recentInvoices: Awaited<ReturnType<typeof listInvoices>>["invoices"];
  recentVouchers: Awaited<ReturnType<typeof listVouchers>>["vouchers"];
  recentSlips: Awaited<ReturnType<typeof listSalarySlips>>["salarySlips"];
}

export async function getDashboardData(): Promise<
  { success: true; data: DashboardData } | { success: false; error: string }
> {
  try {
    const [
      docsSummary,
      kpisResult,
      revenueResult,
      activityResult,
      invoiceData,
      voucherData,
      slipData,
    ] = await Promise.allSettled([
      getDocsSummary(),
      getDashboardKPIs("this-month"),
      getRevenueTrendData(),
      getRecentActivity(),
      listInvoices({ limit: 3 }),
      listVouchers({ limit: 3 }),
      listSalarySlips({ limit: 3 }),
    ]);

    const summary =
      docsSummary.status === "fulfilled" ? docsSummary.value : null;

    const kpis =
      kpisResult.status === "fulfilled" && kpisResult.value.success
        ? kpisResult.value.data
        : {
            pay: {
              invoicesIssued: 0,
              totalDue: 0,
              overdue: 0,
              paidThisMonth: 0,
            },
            voucher: { voucherSpend: 0, voucherCount: 0, receiptTotal: 0 },
            salary: { pendingTotal: 0, released: 0, headcount: 0 },
          };

    const revenueTrend =
      revenueResult.status === "fulfilled" && revenueResult.value.success
        ? revenueResult.value.data
        : [];

    const recentActivity =
      activityResult.status === "fulfilled" && activityResult.value.success
        ? activityResult.value.data
        : [];

    const invoices =
      invoiceData.status === "fulfilled" ? invoiceData.value : { invoices: [], total: 0 };
    const vouchers =
      voucherData.status === "fulfilled" ? voucherData.value : { vouchers: [], total: 0 };
    const slips =
      slipData.status === "fulfilled" ? slipData.value : { salarySlips: [], total: 0 };

    return {
      success: true,
      data: {
        counts: {
          invoice: summary?.counts.invoice ?? invoices.total,
          voucher: summary?.counts.voucher ?? vouchers.total,
          salarySlip: summary?.counts.salary_slip ?? slips.total,
          quote: summary?.counts.quote ?? 0,
          total: summary?.totalActive ?? invoices.total + vouchers.total + slips.total,
        },
        kpis,
        revenueTrend,
        recentActivity,
        recentInvoices: invoices.invoices,
        recentVouchers: vouchers.vouchers,
        recentSlips: slips.salarySlips,
      },
    };
  } catch (error) {
    console.error("[getDashboardData]", error);
    return { success: false, error: "Failed to load dashboard data" };
  }
}
