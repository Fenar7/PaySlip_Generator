import { PDFDocument } from "pdf-lib";
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
      waitUntil: "domcontentloaded",
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

    const voucherRender = page.getByTestId("voucher-render-ready");
    const screenshotBuffer =
      format === "png"
        ? await voucherRender.screenshot({
            type: "png",
          })
        : await voucherRender.screenshot({
            type: "jpeg",
            quality: 88,
          });

    if (format === "png") {
      return screenshotBuffer;
    }

    const pdfDocument = await PDFDocument.create();
    const pdfPage = pdfDocument.addPage([595.28, 841.89]);
    const embeddedImage = await pdfDocument.embedJpg(screenshotBuffer);

    pdfPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: pdfPage.getWidth(),
      height: pdfPage.getHeight(),
    });

    return pdfDocument.save();
  } finally {
    await browser.close();
  }
}
