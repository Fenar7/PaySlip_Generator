import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import {
  getLocalExportBrowserArgs,
  isServerlessExportRuntime,
  renderExportPdfViaBrowser,
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
  const payload = serializeExportPayload(voucherDocument);
  const routeMode = format === "pdf" ? "pdf" : "png";
  const isServerless = isServerlessExportRuntime();
  const renderUrl = isServerless
    ? `${origin}/voucher/print?mode=${routeMode}`
    : `${origin}/voucher/print?payload=${encodeURIComponent(payload)}&mode=${routeMode}`;

  if (isServerless) {
    const headers = {
      "x-slipwise-export-payload": payload,
    };

    if (format === "pdf") {
      return renderExportPdfViaBrowser(
        renderUrl,
        '[data-testid="voucher-render-ready"]',
        headers,
      );
    }

    return renderExportPngViaBrowser(
      renderUrl,
      '[data-testid="voucher-render-ready"]',
      headers,
    );
  }

  const executablePath = await resolveExportBrowserExecutablePath();
  const outputDirectory = await mkdtemp(join(tmpdir(), `voucher-${format}-`));
  const outputFile = join(outputDirectory, `voucher.${format}`);

  const cliArgs =
    format === "pdf"
      ? [
          "--headless=new",
          "--disable-gpu",
          "--print-to-pdf-no-header",
          "--no-pdf-header-footer",
          "--virtual-time-budget=5000",
          ...getLocalExportBrowserArgs(),
          `--print-to-pdf=${outputFile}`,
          renderUrl,
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
          renderUrl,
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
      if (format === "pdf") {
        return renderExportPdfViaBrowser(
          renderUrl,
          '[data-testid="voucher-render-ready"]',
        );
      }

      return renderExportPngViaBrowser(
        renderUrl,
        '[data-testid="voucher-render-ready"]',
      );
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}
