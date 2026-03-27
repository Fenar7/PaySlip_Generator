import type { Page } from "playwright-core";
import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import { buildVoucherPdf } from "@/features/voucher/server/build-voucher-pdf";
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
  if (format === "pdf") {
    return buildVoucherPdf(voucherDocument);
  }

  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1200,
        height: 1600,
      },
      deviceScaleFactor: 2,
    });

    await page.goto("about:blank");
    await page.evaluate((payload) => {
      window.name = JSON.stringify(payload);
    }, { document: voucherDocument });

    await page.goto(`${origin}/voucher/print?mode=export`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="voucher-render-ready"]');
    await waitForPageAssets(page);

    const voucherRender = page.getByTestId("voucher-render-ready");
    return voucherRender.screenshot({
      type: "png",
    });
  } finally {
    await browser.close();
  }
}

async function waitForPageAssets(page: Page) {
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
}
