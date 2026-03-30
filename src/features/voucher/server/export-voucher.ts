import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import {
  getLocalExportBrowserArgs,
  renderExportPngViaBrowser,
  resolveExportBrowserExecutablePath,
} from "@/lib/export/browser";
import { serializeExportPayload } from "@/lib/server/export-payload";

type ExportVoucherOptions = {
  voucherDocument: VoucherDocument;
  format: VoucherExportFormat;
  origin: string;
};

export async function exportVoucherDocument({
  voucherDocument,
  format,
  origin,
}: ExportVoucherOptions) {
  const routeMode = format === "pdf" ? "pdf" : "png";
  const payload = serializeExportPayload(voucherDocument);

  if (format === "pdf") {
    const executablePath = await resolveExportBrowserExecutablePath();
    const outputDirectory = await mkdtemp(join(tmpdir(), "voucher-pdf-"));
    const outputFile = join(outputDirectory, "voucher.pdf");
    const pdfUrl = `${origin}/voucher/print?payload=${encodeURIComponent(payload)}&mode=${routeMode}`;
    const cliArgs = process.platform === "linux" && process.env.VERCEL
      ? [
          "--headless=new",
          "--disable-gpu",
          "--print-to-pdf-no-header",
          "--no-pdf-header-footer",
          "--virtual-time-budget=5000",
          `--print-to-pdf=${outputFile}`,
          pdfUrl,
        ]
      : [
          "--headless=new",
          "--disable-gpu",
          "--print-to-pdf-no-header",
          "--no-pdf-header-footer",
          "--virtual-time-budget=5000",
          ...getLocalExportBrowserArgs(),
          `--print-to-pdf=${outputFile}`,
          pdfUrl,
        ];

    try {
      await new Promise<void>((resolve, reject) => {
        execFile(executablePath, cliArgs, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      return await readFile(outputFile);
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }

  const executablePath = await resolveExportBrowserExecutablePath();
  const outputDirectory = await mkdtemp(join(tmpdir(), "voucher-png-"));
  const outputFile = join(outputDirectory, "voucher.png");
  const pngUrl = `${origin}/voucher/print?payload=${encodeURIComponent(payload)}&mode=${routeMode}`;
  const cliArgs =
    process.platform === "linux" && process.env.VERCEL
      ? [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--run-all-compositor-stages-before-draw",
          "--force-device-scale-factor=2",
          "--window-size=1600,2200",
          "--virtual-time-budget=5000",
          `--screenshot=${outputFile}`,
          pngUrl,
        ]
      : [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--run-all-compositor-stages-before-draw",
          "--force-device-scale-factor=2",
          "--window-size=1600,2200",
          "--virtual-time-budget=5000",
          ...getLocalExportBrowserArgs(),
          `--screenshot=${outputFile}`,
          pngUrl,
        ];

  try {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(executablePath, cliArgs, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      return await readFile(outputFile);
    } catch {
      return await renderExportPngViaBrowser(
        pngUrl,
        '[data-testid="voucher-render-ready"]',
      );
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}
