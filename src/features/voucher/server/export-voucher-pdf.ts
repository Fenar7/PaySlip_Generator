import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { VoucherDocument } from "@/features/voucher/types";
import { resolveExportPdfCliExecutablePath } from "@/lib/export/browser";

const execFile = promisify(execFileCallback);

type ExportVoucherPdfOptions = {
  voucherDocument: VoucherDocument;
  origin: string;
};

export async function exportVoucherPdf({
  voucherDocument,
  origin,
}: ExportVoucherPdfOptions) {
  const executablePath = await resolveExportPdfCliExecutablePath();
  const tempDirectory = await mkdtemp(join(tmpdir(), "voucher-pdf-"));
  const bootstrapPath = join(tempDirectory, "bootstrap.html");
  const outputPath = join(tempDirectory, "voucher.pdf");

  try {
    await writeFile(
      bootstrapPath,
      buildVoucherPdfBootstrapHtml({
        voucherDocument,
        origin,
      }),
      "utf8",
    );

    const argumentsList = buildVoucherPdfCliArgs({
      bootstrapPath,
      outputPath,
    });

    await execFile(executablePath, argumentsList, {
      timeout: 45_000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    });

    return readFile(outputPath);
  } catch (error) {
    throw new Error("Voucher PDF export failed.", {
      cause: error,
    });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export function buildVoucherPdfBootstrapHtml({
  voucherDocument,
  origin,
}: ExportVoucherPdfOptions) {
  const payload = JSON.stringify({
    document: voucherDocument,
  })
    .replaceAll("</script", "<\\/script")
    .replaceAll("<!--", "<\\!--");
  const targetUrl = `${origin}/voucher/print?mode=export&source=pdf`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Voucher PDF bootstrap</title>
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        display: grid;
        place-items: center;
        color: #3d362e;
      }
    </style>
  </head>
  <body>
    <p>Preparing voucher PDF...</p>
    <script>
      window.name = ${JSON.stringify(payload)};
      window.location.replace(${JSON.stringify(targetUrl)});
    </script>
  </body>
</html>`;
}

export function buildVoucherPdfCliArgs({
  bootstrapPath,
  outputPath,
}: {
  bootstrapPath: string;
  outputPath: string;
}) {
  const bootstrapUrl = pathToFileURL(bootstrapPath).href;
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=DialMediaRouteProvider,GlobalMediaControls",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=15000",
    "--window-size=1280,1810",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${outputPath}`,
    bootstrapUrl,
  ];

  if (process.platform === "linux") {
    args.unshift("--no-sandbox");
  }

  return args;
}
