import type { Page } from "playwright-core";
import type { VoucherDocument, VoucherExportFormat } from "@/features/voucher/types";
import { renderVoucherPdfHtml } from "@/features/voucher/server/render-voucher-pdf";
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
    if (format === "pdf") {
      const page = await browser.newPage({
        viewport: {
          width: 1280,
          height: 1810,
        },
      });

      await page.setContent(renderVoucherPdfHtml(voucherDocument), {
        waitUntil: "load",
      });
      await page.waitForSelector('[data-testid="voucher-pdf-ready"]');
      await page.emulateMedia({ media: "print" });
      await waitForPageAssets(page);

      return page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
      });
    }

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
