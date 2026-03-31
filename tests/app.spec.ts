import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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

function normalizePdfText(text: string) {
  return text
    .replace(/\s*@\s*/g, "@")
    .replace(/\s+/g, " ")
    .trim();
}

function readPngDimensions(pngBytes: Uint8Array) {
  if (
    pngBytes.length < 24 ||
    pngBytes[0] !== 0x89 ||
    pngBytes[1] !== 0x50 ||
    pngBytes[2] !== 0x4e ||
    pngBytes[3] !== 0x47
  ) {
    throw new Error("Invalid PNG payload.");
  }

  const width =
    (pngBytes[16] << 24) |
    (pngBytes[17] << 16) |
    (pngBytes[18] << 8) |
    pngBytes[19];
  const height =
    (pngBytes[20] << 24) |
    (pngBytes[21] << 16) |
    (pngBytes[22] << 8) |
    pngBytes[23];

  return { width, height };
}

const mockPdfBytes = `%PDF-1.4
1 0 obj
<< /Type /Catalog >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

async function mockWorkspaceExport(
  page: Page,
  endpoint: string,
  options?: { failFirst?: boolean; filename?: string },
) {
  let attempt = 0;

  await page.route(endpoint, async (route) => {
    attempt += 1;

    await new Promise((resolve) => setTimeout(resolve, 150));

    if (options?.failFirst && attempt === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Slipwise could not generate the file." }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${options?.filename ?? "export.pdf"}"`,
      },
      body: mockPdfBytes,
    });
  });
}

const salarySlipDocumentPayload = {
  templateId: "corporate-clean",
  title: "Salary Slip",
  branding: {
    companyName: "Northfield Trading Co.",
    address: "18 Market Road, Kozhikode",
    email: "accounts@northfield.example",
    phone: "+91 98765 43210",
    accentColor: "#c69854",
  },
  employeeName: "Arun Dev",
  employeeId: "EMP-041",
  department: "Operations",
  designation: "Site Coordinator",
  pan: "FJTPD2148Q",
  uan: "100458732145",
  payPeriodLabel: "March 2026",
  payDate: "31 Mar 2026",
  workingDays: "31",
  paidDays: "30",
  leaveDays: "1",
  lossOfPayDays: "0",
  paymentMethod: "Bank transfer",
  bankName: "Federal Bank",
  bankAccountNumber: "XXXX2841",
  bankIfsc: "FDRL0001220",
  joiningDate: "16 Aug 2022",
  workLocation: "Kozhikode HQ",
  earnings: [
    { label: "Basic salary", amount: 32000, amountFormatted: "₹32,000.00" },
    {
      label: "House rent allowance",
      amount: 12000,
      amountFormatted: "₹12,000.00",
    },
    { label: "Travel allowance", amount: 3500, amountFormatted: "₹3,500.00" },
  ],
  deductions: [
    { label: "Provident fund", amount: 1800, amountFormatted: "₹1,800.00" },
    { label: "Professional tax", amount: 200, amountFormatted: "₹200.00" },
  ],
  totalEarnings: 47500,
  totalDeductions: 2000,
  netSalary: 45500,
  totalEarningsFormatted: "₹47,500.00",
  totalDeductionsFormatted: "₹2,000.00",
  netSalaryFormatted: "₹45,500.00",
  netSalaryInWords: "Forty five thousand five hundred only",
  notes: "Salary credited after attendance review and travel settlement reconciliation.",
  preparedBy: "Anita Thomas",
  visibility: {
    showAddress: true,
    showEmail: true,
    showPhone: true,
    showEmployeeId: true,
    showDepartment: true,
    showDesignation: true,
    showPan: true,
    showUan: true,
    showBankDetails: true,
    showJoiningDate: true,
    showWorkLocation: true,
    showAttendance: true,
    showNotes: true,
    showSignature: true,
  },
} as const;

const invoiceDocumentPayload = {
  templateId: "professional",
  title: "Tax Invoice",
  branding: {
    companyName: "Northfield Trading Co.",
    address: "18 Market Road, Kozhikode",
    email: "accounts@northfield.example",
    phone: "+91 98765 43210",
    accentColor: "#c69854",
  },
  website: "www.northfield.example",
  businessTaxId: "GSTIN 32ABCDE1234F1Z6",
  clientName: "Axis PeopleX Pvt. Ltd.",
  clientAddress: "4th Floor, Grand Square, Kochi",
  shippingAddress: "Warehouse Bay 3, Marine Drive, Kochi",
  clientEmail: "finance@axispeoplex.example",
  clientPhone: "+91 98470 12000",
  clientTaxId: "GSTIN 32AAACA1122R1ZV",
  invoiceNumber: "INV-2026-031",
  invoiceDate: "26 Mar 2026",
  dueDate: "02 Apr 2026",
  placeOfSupply: "Kerala",
  currencyCode: "INR",
  lineItems: [
    {
      description: "HR outsourcing retainer for March 2026",
      quantity: 1,
      unitPrice: 32000,
      taxRate: 18,
      discountAmount: 2000,
      baseAmount: 32000,
      taxableAmount: 30000,
      taxAmount: 5400,
      lineTotal: 35400,
      unitPriceFormatted: "₹32,000.00",
      discountAmountFormatted: "₹2,000.00",
      baseAmountFormatted: "₹32,000.00",
      taxAmountFormatted: "₹5,400.00",
      lineTotalFormatted: "₹35,400.00",
    },
    {
      description: "Recruitment coordination support",
      quantity: 2,
      unitPrice: 7500,
      taxRate: 18,
      discountAmount: 0,
      baseAmount: 15000,
      taxableAmount: 15000,
      taxAmount: 2700,
      lineTotal: 17700,
      unitPriceFormatted: "₹7,500.00",
      discountAmountFormatted: "₹0.00",
      baseAmountFormatted: "₹15,000.00",
      taxAmountFormatted: "₹2,700.00",
      lineTotalFormatted: "₹17,700.00",
    },
  ],
  subtotal: 45000,
  totalDiscount: 2000,
  totalTax: 8100,
  extraCharges: 1500,
  invoiceLevelDiscount: 500,
  grandTotal: 54100,
  amountPaid: 15000,
  balanceDue: 39100,
  subtotalFormatted: "₹45,000.00",
  totalDiscountFormatted: "₹2,000.00",
  totalTaxFormatted: "₹8,100.00",
  extraChargesFormatted: "₹1,500.00",
  invoiceLevelDiscountFormatted: "₹500.00",
  grandTotalFormatted: "₹54,100.00",
  amountPaidFormatted: "₹15,000.00",
  balanceDueFormatted: "₹39,100.00",
  amountInWords: "Fifty-four thousand one hundred only",
  notes:
    "Thank you for the continued engagement. Please reference the invoice number with your remittance.",
  terms:
    "Payment due within 7 days. Late payments may be subject to a finance charge after prior notice.",
  bankName: "Federal Bank",
  bankAccountNumber: "122001004281",
  bankIfsc: "FDRL0001220",
  authorizedBy: "Anita Thomas",
  visibility: {
    showAddress: true,
    showEmail: true,
    showPhone: true,
    showWebsite: true,
    showBusinessTaxId: true,
    showClientAddress: true,
    showClientEmail: true,
    showClientPhone: true,
    showClientTaxId: true,
    showShippingAddress: true,
    showDueDate: true,
    showPlaceOfSupply: true,
    showNotes: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true,
    showPaymentSummary: true,
  },
} as const;

test("home page exposes the module entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /prepare salary slips, invoices, and vouchers in one calmer document workflow/i,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /open a workspace/i }).first(),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /view workspaces/i }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /start free/i }).first().click();
  await expect(
    page.getByRole("heading", { name: /start in the flow your team actually needs/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /salary slip generator/i })).toBeVisible();
  await page.getByRole("button", { name: /close workspace picker/i }).click();
  await expect(
    page.getByRole("heading", { name: /start in the flow your team actually needs/i }),
  ).toHaveCount(0);
});

test("not-found route keeps the branded recovery state", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page.getByRole("heading", { name: /this workspace does not exist yet/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /return home/i })).toBeVisible();
});

test("salary slip route renders the interactive workspace", async ({ page }) => {
  await page.goto("/salary-slip");

  await expect(
    page.getByRole("heading", { name: "Salary Slip Generator", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /print salary slip/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /export pdf/i }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /template and branding/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /employee details/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /pay period and attendance/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /earnings and deductions/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /live a4 document/i })).toBeVisible();
});

test("invoice route renders the interactive workspace", async ({ page }) => {
  await page.goto("/invoice");

  await expect(
    page.getByRole("heading", { name: "Invoice Generator", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /print invoice/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /export pdf/i }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /template and branding/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /client details/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /invoice metadata/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /line items and totals/i })).toBeVisible();
  await expect(
    page.getByTestId("document-preview-viewport").evaluate((element) => {
      return element.scrollHeight <= element.clientHeight + 1;
    }),
  ).resolves.toBe(true);
});

test("voucher route supports template changes and live visibility updates", async ({
  page,
}) => {
  await page.goto("/voucher");

  await expect(
    page.getByRole("heading", { name: "Voucher Generator", level: 1 }),
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

test("voucher export dialog reaches success and closes cleanly", async ({ page }) => {
  await mockWorkspaceExport(page, "**/api/export/pdf", {
    filename: "voucher-export.pdf",
  });

  await page.goto("/voucher");
  await page.getByRole("button", { name: /^export pdf$/i }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: /your download should start shortly/i })).toBeVisible();

  await page.getByRole("button", { name: /^close$/i }).click();
  await expect(page.getByRole("dialog", { name: /your download should start shortly/i })).toHaveCount(0);
});

test("salary slip export dialog supports retry after an export failure", async ({ page }) => {
  await mockWorkspaceExport(page, "**/api/export/salary-slip/pdf", {
    failFirst: true,
    filename: "salary-slip.pdf",
  });

  await page.goto("/salary-slip");
  await page.getByRole("button", { name: /^export pdf$/i }).click();

  await expect(page.getByRole("heading", { name: /export failed/i })).toBeVisible();
  await expect(page.getByText(/slipwise could not generate the file/i).first()).toBeVisible();

  await page.getByRole("button", { name: /try export again/i }).click();
  await expect(page.getByRole("heading", { name: /your download should start shortly/i })).toBeVisible();

  await page.getByRole("button", { name: /^close$/i }).click();
  await expect(page.getByRole("heading", { name: /your download should start shortly/i })).toHaveCount(0);
});

test("invoice export dialog reaches success and closes cleanly", async ({ page }) => {
  await mockWorkspaceExport(page, "**/api/export/invoice/pdf", {
    filename: "invoice-export.pdf",
  });

  await page.goto("/invoice");
  await page.getByRole("button", { name: /^export pdf$/i }).click();

  await expect(page.getByRole("heading", { name: /your download should start shortly/i })).toBeVisible();
  await page.getByRole("button", { name: /^close$/i }).click();
  await expect(page.getByRole("heading", { name: /your download should start shortly/i })).toHaveCount(0);
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

test("invoice route updates totals and template state as line items change", async ({
  page,
}) => {
  await page.goto("/invoice");

  await page.getByRole("button", { name: /bold brand/i }).click();
  await expect(page.getByText(/balance due/i).first()).toBeVisible();

  await page.locator('#lineItems-0-discountAmount').fill("1000");
  await page.locator('#amountPaid').fill("20000");

  await expect(page.getByText(/₹35,280.00/i).first()).toBeVisible();

  await page.getByRole("switch", { name: /notes/i }).click();
  await expect(page.getByText(/thank you for the continued engagement/i)).toHaveCount(0);
});

test("salary slip print surface renders the normalized document", async ({
  page,
  request,
}) => {
  const sessionResponse = await request.post("/api/export/salary-slip/session", {
    data: {
      document: salarySlipDocumentPayload,
    },
  });

  expect(sessionResponse.ok()).toBeTruthy();

  const sessionPayload = (await sessionResponse.json()) as { printUrl: string };
  const printUrl = sessionPayload.printUrl.replace("&autoprint=1", "");

  await page.goto(printUrl);
  await expect(page.getByTestId("salary-slip-render-ready")).toBeVisible();

  const employeeBox = await page.getByText("Arun Dev").first().boundingBox();
  const netSalaryBox = await page.getByText("₹45,500.00").boundingBox();

  expect(employeeBox).not.toBeNull();
  expect(netSalaryBox).not.toBeNull();
  expect(netSalaryBox!.x).toBeGreaterThan(employeeBox!.x + 280);
});

test("invoice print surface renders the normalized document", async ({
  page,
  request,
}) => {
  const sessionResponse = await request.post("/api/export/invoice/session", {
    data: {
      document: invoiceDocumentPayload,
    },
  });

  expect(sessionResponse.ok()).toBeTruthy();

  const sessionPayload = (await sessionResponse.json()) as { printUrl: string };
  const printUrl = sessionPayload.printUrl.replace("&autoprint=1", "");

  await page.goto(printUrl);
  await expect(page.getByTestId("invoice-render-ready")).toBeVisible();

  const clientBox = await page.getByText("Axis PeopleX Pvt. Ltd.").first().boundingBox();
  const totalBox = await page.getByText("₹54,100.00").first().boundingBox();

  expect(clientBox).not.toBeNull();
  expect(totalBox).not.toBeNull();
  expect(totalBox!.x).toBeGreaterThan(clientBox!.x + 280);
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
  test.setTimeout(180_000);

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
  const normalizedPdfText = normalizePdfText(pdfText);

  expect(normalizedPdfText).toContain("Northfield Trading Co.");
  expect(normalizedPdfText).toContain("PV-2026-014");
  expect(normalizedPdfText).toContain("Rahul Menon");
});

test("voucher PNG export returns an image response", async ({ request }) => {
  test.setTimeout(180_000);

  const response = await request.post("/api/export/png", {
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
  expect(response.headers()["content-type"]).toContain("image/png");
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});

test("salary slip PDF export keeps text selectable", async ({ request }) => {
  test.setTimeout(180_000);

  const response = await request.post("/api/export/salary-slip/pdf", {
    data: {
      document: salarySlipDocumentPayload,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");

  const pdfText = await extractPdfText(new Uint8Array(await response.body()));
  const normalizedPdfText = normalizePdfText(pdfText);

  expect(normalizedPdfText).toContain("Arun Dev");
  expect(normalizedPdfText).toContain("Northfield Trading Co.");
  expect(normalizedPdfText).toContain("March 2026");
  expect(normalizedPdfText).toContain("Federal Bank");
});

test("salary slip PNG export returns an image response", async ({ request }) => {
  test.setTimeout(180_000);

  const response = await request.post("/api/export/salary-slip/png", {
    data: {
      document: salarySlipDocumentPayload,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/png");
});

test("invoice PDF export keeps text selectable", async ({ request }) => {
  test.setTimeout(180_000);

  const response = await request.post("/api/export/invoice/pdf", {
    data: {
      document: invoiceDocumentPayload,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");

  const pdfText = await extractPdfText(new Uint8Array(await response.body()));
  const normalizedPdfText = normalizePdfText(pdfText);

  expect(normalizedPdfText).toContain("Northfield Trading Co.");
  expect(normalizedPdfText).toContain("INV-2026-031");
  expect(normalizedPdfText).toContain("Axis PeopleX Pvt. Ltd.");
});

test("invoice PNG export returns an image response", async ({ request }) => {
  test.setTimeout(180_000);

  const response = await request.post("/api/export/invoice/png", {
    data: {
      document: invoiceDocumentPayload,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/png");

  const imageBytes = new Uint8Array(await response.body());
  const { width, height } = readPngDimensions(imageBytes);

  expect(width).toBeLessThan(1700);
  expect(height).toBeLessThan(2300);
  expect(height).toBeGreaterThan(1500);
});
