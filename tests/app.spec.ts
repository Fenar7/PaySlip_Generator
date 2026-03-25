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

test("salary slip route renders the workspace shell", async ({ page }) => {
  await page.goto("/salary-slip");

  await expect(
    page.getByRole("heading", { name: "Salary Slip Generator", level: 1 }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: /form and controls shell/i }),
  ).toBeVisible();
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

  await page.locator('[name="templateId"]').evaluate((element) => {
    const select = element as HTMLSelectElement;
    select.value = "traditional-ledger";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
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
