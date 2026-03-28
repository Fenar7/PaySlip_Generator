import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import { createVoucherExportSession } from "@/features/voucher/server/export-session-store";
import {
  getLocalExportBrowserArgs,
  launchExportBrowser,
  resolveExportBrowserExecutablePath,
} from "@/lib/export/browser";

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
  const token = createVoucherExportSession(voucherDocument);
  const routeMode = format === "pdf" ? "pdf" : "png";

  if (format === "pdf") {
    const executablePath = await resolveExportBrowserExecutablePath();
    const outputDirectory = await mkdtemp(join(tmpdir(), "voucher-pdf-"));
    const outputFile = join(outputDirectory, "voucher.pdf");
    const pdfUrl = `${origin}/voucher/print?token=${encodeURIComponent(token)}&mode=${routeMode}`;
    const cliArgs = process.platform === "linux" && process.env.VERCEL
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

  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1400,
      height: 1800,
      deviceScaleFactor: format === "png" ? 2 : 1,
    });
    await page.emulateMediaType("screen");
    await page.goto(
      `${origin}/voucher/print?token=${encodeURIComponent(token)}&mode=${routeMode}`,
      {
        waitUntil: "networkidle0",
      },
    );
    await page.waitForSelector('[data-testid="voucher-render-ready"]');
    await page.evaluate(async () => {
      const fontSet = (document as Document & {
        fonts?: {
          ready: Promise<unknown>;
        };
      }).fonts;

      if (fontSet) {
        await fontSet.ready;
      }

      await Promise.all(
        Array.from(document.images).map(async (image) => {
          if (image.complete) {
            return;
          }

          if (typeof image.decode === "function") {
            try {
              await image.decode();
              return;
            } catch {
              return;
            }
          }

          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        }),
      );
    });

    const voucherRender = await page.$('[data-testid="voucher-render-ready"]');

    if (!voucherRender) {
      throw new Error("Voucher render surface did not become available.");
    }

    return voucherRender.screenshot({
      type: "png",
    });
  } finally {
    await browser.close();
  }
}
