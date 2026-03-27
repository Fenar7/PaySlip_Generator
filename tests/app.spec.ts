import { expect, test } from "@playwright/test";

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

test("invoice route renders the interactive workspace", async ({ page }) => {
  await page.goto("/invoice");

  await expect(
    page.getByRole("heading", { name: "Invoice Generator", level: 1 }),
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

test("voucher print surface renders the normalized document", async ({ page }) => {
  await page.goto("/voucher");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: /print voucher/i }).click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/\/voucher\/print\?autoprint=1/);
  await expect(popup.getByTestId("voucher-render-ready")).toBeVisible();
});
