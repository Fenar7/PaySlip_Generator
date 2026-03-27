import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

const LOCAL_PLAYWRIGHT_EXECUTABLE_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  playwrightChromium.executablePath(),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

const LOCAL_CLI_EXECUTABLE_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  playwrightChromium.executablePath(),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

export async function resolveExportBrowserExecutablePath() {
  if (process.platform === "linux") {
    return chromium.executablePath();
  }

  const localPath = LOCAL_PLAYWRIGHT_EXECUTABLE_CANDIDATES.find((candidate) =>
    existsSync(candidate),
  );

  if (!localPath) {
    throw new Error("No Chromium executable found for export rendering.");
  }

  return localPath;
}

export async function launchExportBrowser() {
  const executablePath = await resolveExportBrowserExecutablePath();
  const isLinux = process.platform === "linux";

  return playwrightChromium.launch({
    executablePath,
    headless: true,
    args: isLinux
      ? chromium.args
      : [
          "--disable-dev-shm-usage",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-features=DialMediaRouteProvider,GlobalMediaControls",
        ],
  });
}

export async function resolveExportPdfCliExecutablePath() {
  if (process.platform === "linux") {
    return chromium.executablePath();
  }

  const localPath = LOCAL_CLI_EXECUTABLE_CANDIDATES.find((candidate) =>
    existsSync(candidate),
  );

  if (!localPath) {
    throw new Error("No Chrome or Chromium executable found for PDF export.");
  }

  return localPath;
}
