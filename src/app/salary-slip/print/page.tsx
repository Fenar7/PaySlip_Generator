import { SalarySlipPrintSurface } from "@/features/salary-slip/components/salary-slip-print-surface";
import { getSalarySlipExportSession } from "@/features/salary-slip/server/export-session-store";

export const dynamic = "force-dynamic";

type SalarySlipPrintPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SalarySlipPrintPage({
  searchParams,
}: SalarySlipPrintPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const rawMode = typeof params.mode === "string" ? params.mode : "print";
  const autoPrint = params.autoprint === "1";
  const mode =
    rawMode === "pdf" || rawMode === "png" || rawMode === "print"
      ? rawMode
      : "print";

  return (
    <SalarySlipPrintSurface
      documentData={token ? getSalarySlipExportSession(token) : null}
      mode={mode}
      autoPrint={autoPrint}
    />
  );
}
