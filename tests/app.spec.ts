import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function extractPdfText(pdfSource: string | Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfBytes =
    typeof pdfSource === "string"
      ? new Uint8Array(await readFile(pdfSource))
      : pdfSource;
  const pdfDocument = await pdfjs.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
  }).promise;
  let combinedText = "";

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    combinedText += textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    combinedText += "\n";
  }

  return combinedText;
}

test("home page exposes the module entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /generate vouchers, salary slips, and invoices/i,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /open workspace/i }).first(),
  ).toBeVisible();
});

test("salary slip route renders the interactive workspace", async ({ page }) => {
  await page.goto("/salary-slip");

  await expect(
    page.getByRole("heading", { name: "Salary Slip Generator", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /template and branding/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /employee details/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /pay period and attendance/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /earnings and deductions/i })).toBeVisible();
  await expect(page.getByText(/salary slip · corporate clean/i)).toBeVisible();
});

test("voucher route supports template changes and live visibility updates", async ({
  page,
}) => {
  await page.goto("/voucher");

  await expect(
    page.getByRole("heading", { name: "Voucher Generator", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText(/payment voucher · minimal office/i),
  ).toBeVisible();
  await expect(
    page.getByTestId("document-preview-viewport").evaluate((element) => {
      return element.scrollWidth <= element.clientWidth + 1;
    }),
  ).resolves.toBe(true);

  await page.getByRole("button", { name: /traditional ledger/i }).click();
  await expect(page.getByText(/formal voucher record/i)).toBeVisible();
  await expect(
    page.getByTestId("document-preview-viewport").evaluate((element) => {
      return element.scrollWidth <= element.clientWidth + 1;
    }),
  ).resolves.toBe(true);

  await page.getByRole("switch", { name: /notes/i }).click();
  await expect(
    page.getByText("Settled after manager approval."),
  ).toHaveCount(0);
});

test("salary slip route updates the preview as payroll rows change", async ({ page }) => {
  await page.goto("/salary-slip");

  await page.getByRole("button", { name: /add earning/i }).click();
  await page.locator('#earnings-3-label').fill("Project allowance");
  await page.locator('#earnings-3-amount').fill("2500");

  await expect(page.getByText("Project allowance")).toBeVisible();
  await expect(page.getByText(/₹50,000.00/i)).toBeVisible();

  await page.getByRole("switch", { name: /bank details/i }).click();
  await expect(page.getByText(/federal bank/i)).toHaveCount(0);
});

test("voucher print surface renders the normalized document", async ({ page }) => {
  await page.goto("/voucher");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: /print voucher/i }).click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/\/voucher\/print\?.*autoprint=1/);
  await expect(popup.getByTestId("voucher-render-ready")).toBeVisible();

  const voucherNumberBox = await popup.getByText("PV-2026-014").boundingBox();
  const amountBox = await popup.getByText("₹1,850.00").boundingBox();

  expect(voucherNumberBox).not.toBeNull();
  expect(amountBox).not.toBeNull();
  expect(amountBox!.x).toBeGreaterThan(voucherNumberBox!.x + 240);
  expect(Math.abs(amountBox!.y - voucherNumberBox!.y)).toBeLessThan(140);
});

test("voucher PDF export keeps text selectable", async ({ request }) => {
  const response = await request.post("/api/export/pdf", {
    data: {
      document: {
        templateId: "minimal-office",
        voucherType: "payment",
        title: "Payment Voucher",
        counterpartyLabel: "Paid to",
        branding: {
          companyName: "Northfield Trading Co.",
          address: "18 Market Road, Kozhikode",
          email: "accounts@northfield.example",
          phone: "+91 98765 43210",
          accentColor: "#c69854",
        },
        voucherNumber: "PV-2026-014",
        date: "25 Mar 2026",
        counterpartyName: "Rahul Menon",
        amount: 1850,
        amountFormatted: "₹1,850.00",
        amountInWords: "One thousand eight hundred fifty only",
        paymentMode: "Cash",
        referenceNumber: "REF-8831",
        purpose: "Travel reimbursement for site visit.",
        notes: "Settled after manager approval.",
        approvedBy: "Anita Thomas",
        receivedBy: "Rahul Menon",
        visibility: {
          showAddress: true,
          showEmail: true,
          showPhone: true,
          showPaymentMode: true,
          showReferenceNumber: true,
          showNotes: true,
          showApprovedBy: true,
          showReceivedBy: true,
          showSignatureArea: true,
        },
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");

  const pdfText = await extractPdfText(new Uint8Array(await response.body()));

  expect(pdfText).toContain("Northfield Trading Co.");
  expect(pdfText).toContain("PV-2026-014");
  expect(pdfText).toContain("Rahul Menon");
});
