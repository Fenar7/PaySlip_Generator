import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Page } from "puppeteer";

const LOCAL_EXECUTABLE_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  puppeteer.executablePath(),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

export async function resolveExportBrowserExecutablePath() {
  if (process.platform === "linux" && process.env.VERCEL) {
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
  const isServerlessLinux = process.platform === "linux" && process.env.VERCEL;

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: isServerlessLinux
      ? chromium.args
      : getLocalExportBrowserArgs(),
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
) {
  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1400,
      height: 1800,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType("screen");
    await page.goto(url, {
      waitUntil: "networkidle0",
    });
    await waitForExportPageAssets(page, readySelector);

    return page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

export async function renderExportPngViaBrowser(
  url: string,
  readySelector: string,
) {
  const browser = await launchExportBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 1600,
      height: 2200,
      deviceScaleFactor: 2,
    });
    await page.emulateMediaType("screen");
    await page.goto(url, {
      waitUntil: "networkidle0",
    });
    await waitForExportPageAssets(page, readySelector);
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    const clip = await page.evaluate((selector) => {
      const element = document.querySelector(selector);

      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();

      return {
        x: Math.max(rect.x, 0),
        y: Math.max(rect.y, 0),
        width: Math.max(rect.width, 1),
        height: Math.max(rect.height, 1),
      };
    }, readySelector);

    if (!clip) {
      throw new Error(`Export render surface ${readySelector} did not become available.`);
    }

    return page.screenshot({
      type: "png",
      clip,
    });
  } finally {
    await browser.close();
  }
}
