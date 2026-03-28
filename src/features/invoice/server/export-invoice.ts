import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  InvoiceDocument,
  InvoiceExportFormat,
} from "@/features/invoice/types";
import { createInvoiceExportSession } from "@/features/invoice/server/export-session-store";
import {
  getLocalExportBrowserArgs,
  renderExportPdfViaBrowser,
  renderExportPngViaBrowser,
  resolveExportBrowserExecutablePath,
} from "@/lib/export/browser";

type ExportInvoiceOptions = {
  invoiceDocument: InvoiceDocument;
  format: InvoiceExportFormat;
  origin: string;
};

export async function exportInvoiceDocument({
  invoiceDocument,
  format,
  origin,
}: ExportInvoiceOptions) {
  const token = createInvoiceExportSession(invoiceDocument);
  const routeMode = format === "pdf" ? "pdf" : "png";
  const executablePath = await resolveExportBrowserExecutablePath();

  if (format === "pdf") {
    const outputDirectory = await mkdtemp(join(tmpdir(), "invoice-pdf-"));
    const outputFile = join(outputDirectory, "invoice.pdf");
    const pdfUrl = `${origin}/invoice/print?token=${encodeURIComponent(token)}&mode=${routeMode}`;
    const cliArgs =
      process.platform === "linux" && process.env.VERCEL
        ? [
            "--headless=new",
            "--disable-gpu",
            "--print-to-pdf-no-header",
            "--virtual-time-budget=5000",
            `--print-to-pdf=${outputFile}`,
            pdfUrl,
          ]
        : [
            "--headless=new",
            "--disable-gpu",
            "--print-to-pdf-no-header",
            "--virtual-time-budget=5000",
            ...getLocalExportBrowserArgs(),
            `--print-to-pdf=${outputFile}`,
            pdfUrl,
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
        return await renderExportPdfViaBrowser(
          pdfUrl,
          '[data-testid="invoice-render-ready"]',
        );
      }
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }

  const outputDirectory = await mkdtemp(join(tmpdir(), "invoice-png-"));
  const outputFile = join(outputDirectory, "invoice.png");
  const pngUrl = `${origin}/invoice/print?token=${encodeURIComponent(token)}&mode=${routeMode}`;
  const cliArgs =
    process.platform === "linux" && process.env.VERCEL
      ? [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--run-all-compositor-stages-before-draw",
          "--force-device-scale-factor=2",
          "--window-size=820,1140",
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
          "--window-size=820,1140",
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
        '[data-testid="invoice-render-ready"]',
      );
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}
