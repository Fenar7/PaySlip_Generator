import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import { launchExportBrowser } from "@/lib/export/browser";

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
  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1200,
        height: 1600,
      },
      deviceScaleFactor: format === "png" ? 2 : 1,
    });

    await page.goto("about:blank");
    await page.evaluate((payload) => {
      window.name = JSON.stringify(payload);
    }, { document: voucherDocument });

    await page.goto(`${origin}/voucher/print?mode=export`, {
      waitUntil: "networkidle",
    });
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
    });

    if (format === "pdf") {
      await page.emulateMedia({ media: "screen" });

      return page.pdf({
        width: "210mm",
        height: "297mm",
        printBackground: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });
    }

    const voucherRender = page.getByTestId("voucher-render-ready");
    return voucherRender.screenshot({
      type: "png",
    });
  } finally {
    await browser.close();
  }
}
