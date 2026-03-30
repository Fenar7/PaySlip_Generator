import { headers } from "next/headers";
import { SalarySlipPrintSurface } from "@/features/salary-slip/components/salary-slip-print-surface";
import { getSalarySlipExportSession } from "@/features/salary-slip/server/export-session-store";
import type { SalarySlipDocument } from "@/features/salary-slip/types";
import { deserializeExportPayload } from "@/lib/server/export-payload";

export const dynamic = "force-dynamic";

type SalarySlipPrintPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SalarySlipPrintPage({
  searchParams,
}: SalarySlipPrintPageProps) {
  const requestHeaders = await headers();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const payload = typeof params.payload === "string" ? params.payload : "";
  const rawMode = typeof params.mode === "string" ? params.mode : "print";
  const autoPrint = params.autoprint === "1";
  const mode =
    rawMode === "pdf" || rawMode === "png" || rawMode === "print"
      ? rawMode
      : "print";
  const documentData =
    (requestHeaders.get("x-slipwise-export-payload")
      ? deserializeExportPayload<SalarySlipDocument>(
          requestHeaders.get("x-slipwise-export-payload") as string,
        )
      : null) ??
    (payload
      ? deserializeExportPayload<SalarySlipDocument>(payload)
      : null) ?? (token ? getSalarySlipExportSession(token) : null);

  return (
    <SalarySlipPrintSurface
      documentData={documentData}
      mode={mode}
      autoPrint={autoPrint}
    />
  );
}
