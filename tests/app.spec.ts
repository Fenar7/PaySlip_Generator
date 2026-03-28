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
  payPeriodLabel: "March 2026",
  payDate: "31 Mar 2026",
  workingDays: "31",
  paidDays: "30",
  leaveDays: "1",
  lossOfPayDays: "0",
  paymentMethod: "Bank transfer",
  bankName: "Federal Bank",
  bankAccountNumber: "XXXX2841",
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
    showBankDetails: true,
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
  businessTaxId: "GSTIN 32ABCDE1234F1Z6",
  clientName: "Axis PeopleX Pvt. Ltd.",
  clientAddress: "4th Floor, Grand Square, Kochi",
  clientEmail: "finance@axispeoplex.example",
  clientPhone: "+91 98470 12000",
  invoiceNumber: "INV-2026-031",
  invoiceDate: "26 Mar 2026",
  dueDate: "02 Apr 2026",
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
  subtotal: 47000,
  totalDiscount: 2000,
  totalTax: 8100,
  grandTotal: 53100,
  amountPaid: 15000,
  balanceDue: 38100,
  subtotalFormatted: "₹47,000.00",
  totalDiscountFormatted: "₹2,000.00",
  totalTaxFormatted: "₹8,100.00",
  grandTotalFormatted: "₹53,100.00",
  amountPaidFormatted: "₹15,000.00",
  balanceDueFormatted: "₹38,100.00",
  amountInWords: "Fifty-three thousand one hundred only",
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
    showBusinessTaxId: true,
    showClientAddress: true,
    showClientEmail: true,
    showClientPhone: true,
    showDueDate: true,
    showNotes: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true,
  },
} as const;

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
  await expect(
    page.getByRole("button", { name: /print salary slip/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /export pdf/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /template and branding/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /employee details/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /pay period and attendance/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /earnings and deductions/i })).toBeVisible();
  await expect(page.getByText(/salary slip · corporate clean/i)).toBeVisible();
});

test("invoice route renders the interactive workspace", async ({ page }) => {
  await page.goto("/invoice");

  await expect(
    page.getByRole("heading", { name: "Invoice Generator", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /print invoice/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /export pdf/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /template and branding/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /client details/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /invoice metadata/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /line items and totals/i })).toBeVisible();
  await expect(page.getByText(/tax invoice · professional/i)).toBeVisible();
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

test("invoice route updates totals and template state as line items change", async ({
  page,
}) => {
  await page.goto("/invoice");

  await page.getByRole("button", { name: /bold brand/i }).click();
  await expect(page.getByText(/balance due/i).first()).toBeVisible();

  await page.locator('#lineItems-0-discountAmount').fill("1000");
  await page.locator('#amountPaid').fill("20000");

  await expect(page.getByText(/₹34,280.00/i).first()).toBeVisible();

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
  const totalBox = await page.getByText("₹53,100.00").first().boundingBox();

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

  expect(pdfText).toContain("Northfield Trading Co.");
  expect(pdfText).toContain("PV-2026-014");
  expect(pdfText).toContain("Rahul Menon");
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

  expect(pdfText).toContain("Arun Dev");
  expect(pdfText).toContain("Northfield Trading Co.");
  expect(pdfText).toContain("March 2026");
  expect(pdfText).toContain("Federal Bank");
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

  expect(pdfText).toContain("Northfield Trading Co.");
  expect(pdfText).toContain("INV-2026-031");
  expect(pdfText).toContain("Axis PeopleX Pvt. Ltd.");
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
});
