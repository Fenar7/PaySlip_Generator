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
