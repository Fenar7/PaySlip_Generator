import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
import puppeteer, { type Page } from "puppeteer";

type ExportRequestHeaders = Record<string, string>;

export function isServerlessExportRuntime() {
  return process.platform === "linux" && Boolean(process.env.VERCEL);
}

const LOCAL_EXECUTABLE_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  puppeteer.executablePath(),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

export async function resolveExportBrowserExecutablePath() {
  if (isServerlessExportRuntime()) {
    return chromium.executablePath();
  }

  const localPath = LOCAL_EXECUTABLE_CANDIDATES.find((candidate) =>
    existsSync(candidate),
  );

  if (!localPath) {
    throw new Error("No Chromium executable found for export rendering.");
  }

  return localPath;
}

export function getLocalExportBrowserArgs() {
  return [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-features=DialMediaRouteProvider,GlobalMediaControls",
  ];
}

export async function launchExportBrowser() {
  const executablePath = await resolveExportBrowserExecutablePath();
  const isServerlessLinux = isServerlessExportRuntime();

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: isServerlessLinux
      ? chromium.args
      : getLocalExportBrowserArgs(),
  });
}

async function launchServerlessExportBrowser() {
  chromium.setGraphicsMode = false;

  return playwrightChromium.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: chromium.args,
  });
}

export async function waitForExportPageAssets(page: Page, readySelector: string) {
  await page.waitForSelector(readySelector);
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

export async function renderExportPdfViaBrowser(
  url: string,
  readySelector: string,
  headers?: ExportRequestHeaders,
) {
  if (isServerlessExportRuntime()) {
    const browser = await launchServerlessExportBrowser();

    try {
      const page = await browser.newPage({
        viewport: {
          width: 1120,
          height: 1580,
        },
        extraHTTPHeaders: headers,
      });
      page.setDefaultNavigationTimeout(60_000);
      page.setDefaultTimeout(60_000);
      await page.emulateMedia({ media: "screen" });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
      });
      await waitForExportPageAssets(page as unknown as Page, readySelector);
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      });

      return Buffer.from(
        await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: false,
        }),
      );
    } finally {
      await browser.close();
    }
  }

  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(60_000);
    if (headers) {
      await page.setExtraHTTPHeaders(headers);
    }
    await page.setViewport({
      width: 1400,
      height: 1800,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType("screen");
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    await waitForExportPageAssets(page, readySelector);
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    return Buffer.from(await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    }));
  } finally {
    await browser.close();
  }
}

export async function renderExportPngViaBrowser(
  url: string,
  readySelector: string,
  headers?: ExportRequestHeaders,
) {
  if (isServerlessExportRuntime()) {
    const browser = await launchServerlessExportBrowser();

    try {
      const page = await browser.newPage({
        viewport: {
          width: 1120,
          height: 1580,
        },
        deviceScaleFactor: 2,
        extraHTTPHeaders: headers,
      });
      page.setDefaultNavigationTimeout(60_000);
      page.setDefaultTimeout(60_000);
      await page.emulateMedia({ media: "screen" });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
      });
      await waitForExportPageAssets(page as unknown as Page, readySelector);
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      });

      const element = page.locator(readySelector).first();
      await element.scrollIntoViewIfNeeded();

      return Buffer.from(
        await element.screenshot({
          type: "png",
        }),
      );
    } finally {
      await browser.close();
    }
  }

  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(60_000);
    if (headers) {
      await page.setExtraHTTPHeaders(headers);
    }
    await page.setViewport({
      width: 1600,
      height: 2200,
      deviceScaleFactor: 2,
    });
    await page.emulateMediaType("screen");
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    await waitForExportPageAssets(page, readySelector);
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    const element = await page.$(readySelector);

    if (!element) {
      throw new Error(`Export render surface ${readySelector} did not become available.`);
    }

    await element.evaluate((node) => {
      node.scrollIntoView({
        block: "start",
        inline: "nearest",
      });
    });
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    return Buffer.from(await element.screenshot({
      type: "png",
    }));
  } finally {
    await browser.close();
  }
}
