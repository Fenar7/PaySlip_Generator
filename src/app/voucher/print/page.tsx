import { VoucherPrintSurface } from "@/features/voucher/components/voucher-print-surface";
import { getVoucherExportSession } from "@/features/voucher/server/export-session-store";

export const dynamic = "force-dynamic";

type VoucherPrintPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VoucherPrintPage({
  searchParams,
}: VoucherPrintPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const rawMode = typeof params.mode === "string" ? params.mode : "print";
  const autoPrint = params.autoprint === "1";
  const mode =
    rawMode === "pdf" || rawMode === "png" || rawMode === "print"
      ? rawMode
      : "print";

  return (
    <VoucherPrintSurface
      documentData={token ? getVoucherExportSession(token) : null}
      mode={mode}
      autoPrint={autoPrint}
    />
  );
}
