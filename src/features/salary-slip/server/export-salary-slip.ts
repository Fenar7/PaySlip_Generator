import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  SalarySlipDocument,
  SalarySlipExportFormat,
} from "@/features/salary-slip/types";
import { createSalarySlipExportSession } from "@/features/salary-slip/server/export-session-store";
import {
  getLocalExportBrowserArgs,
  resolveExportBrowserExecutablePath,
} from "@/lib/export/browser";

type ExportSalarySlipOptions = {
  salarySlipDocument: SalarySlipDocument;
  format: SalarySlipExportFormat;
  origin: string;
};

export async function exportSalarySlipDocument({
  salarySlipDocument,
  format,
  origin,
}: ExportSalarySlipOptions) {
  const token = createSalarySlipExportSession(salarySlipDocument);
  const routeMode = format === "pdf" ? "pdf" : "png";
  const executablePath = await resolveExportBrowserExecutablePath();

  if (format === "pdf") {
    const outputDirectory = await mkdtemp(join(tmpdir(), "salary-slip-pdf-"));
    const outputFile = join(outputDirectory, "salary-slip.pdf");
    const pdfUrl = `${origin}/salary-slip/print?token=${encodeURIComponent(token)}&mode=${routeMode}`;
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

  const outputDirectory = await mkdtemp(join(tmpdir(), "salary-slip-png-"));
  const outputFile = join(outputDirectory, "salary-slip.png");
  const pngUrl = `${origin}/salary-slip/print?token=${encodeURIComponent(token)}&mode=${routeMode}`;
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
