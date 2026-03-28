import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";

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
