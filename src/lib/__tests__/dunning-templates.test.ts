import { describe, it, expect } from "vitest";
import {
  renderDunningTemplate,
  formatIndianCurrency,
  formatDateIndian,
  buildUnsubscribeFooter,
  type DunningTemplateVars,
} from "../dunning-templates";

function makeVars(overrides: Partial<DunningTemplateVars> = {}): DunningTemplateVars {
  return {
    customer_name: "Acme Corp",
    invoice_number: "INV-001",
    invoice_amount: "₹1,18,000",
    amount_due: "₹50,000",
    amount_paid: "₹68,000",
    due_date: "31 Mar 2026",
    days_overdue: 7,
    pay_now_link: "https://pay.example.com/abc",
    org_name: "Slipwise Inc",
    org_email: "billing@slipwise.com",
    org_phone: "+91 98765 43210",
    invoice_date: "01 Mar 2026",
    unsubscribe_url: "https://app.slipwise.com/unsubscribe?token=abc",
    ...overrides,
  };
}

describe("renderDunningTemplate", () => {
  it("replaces all known variables", () => {
    const vars = makeVars();
    const template = "Hi {{customer_name}}, invoice {{invoice_number}} for {{invoice_amount}} is {{days_overdue}} days overdue.";
    const result = renderDunningTemplate(template, vars);
    expect(result).toBe("Hi Acme Corp, invoice INV-001 for ₹1,18,000 is 7 days overdue.");
  });

  it("leaves unknown variables unchanged", () => {
    const vars = makeVars();
    const template = "Hello {{customer_name}}, your {{unknown}} is ready.";
    const result = renderDunningTemplate(template, vars);
    expect(result).toContain("{{unknown}}");
    expect(result).toContain("Acme Corp");
  });

  it("escapes HTML in values to prevent XSS", () => {
    const vars = makeVars({ customer_name: '<script>alert("xss")</script>' });
    const template = "Hi {{customer_name}}";
    const result = renderDunningTemplate(template, vars);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("handles null/undefined values gracefully by leaving placeholder", () => {
    const vars = makeVars();
    // Force an undefined value by casting
    (vars as Record<string, unknown>).customer_name = undefined;
    const template = "Hi {{customer_name}}, your invoice is due.";
    const result = renderDunningTemplate(template, vars);
    expect(result).toBe("Hi {{customer_name}}, your invoice is due.");
  });
});

describe("formatIndianCurrency", () => {
  it("formats ₹1,18,000 correctly", () => {
    const result = formatIndianCurrency(118000);
    // Indian grouping: 1,18,000
    expect(result).toContain("1,18,000");
    expect(result).toContain("₹");
  });

  it("formats zero amount", () => {
    const result = formatIndianCurrency(0);
    expect(result).toContain("₹");
    expect(result).toContain("0");
  });

  it("formats small amounts (₹99)", () => {
    const result = formatIndianCurrency(99);
    expect(result).toContain("₹");
    expect(result).toContain("99");
  });

  it("formats decimal amounts", () => {
    const result = formatIndianCurrency(1234.56);
    expect(result).toContain("₹");
    expect(result).toContain("1,234.56");
  });
});

describe("formatDateIndian", () => {
  it("formats Date object in Indian format", () => {
    const date = new Date("2026-03-31T00:00:00Z");
    const result = formatDateIndian(date);
    // Should contain day, month abbreviation, and year
    expect(result).toMatch(/31/);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/2026/);
  });

  it("handles string date input", () => {
    const result = formatDateIndian("2026-03-31");
    expect(result).toMatch(/31/);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/2026/);
  });
});

describe("buildUnsubscribeFooter", () => {
  it("includes the unsubscribe link", () => {
    const vars = makeVars();
    const footer = buildUnsubscribeFooter(vars);
    expect(footer).toContain("https://app.slipwise.com/unsubscribe?token=abc");
    expect(footer).toContain("Unsubscribe from payment reminders");
  });

  it("includes customer and org name", () => {
    const vars = makeVars();
    const footer = buildUnsubscribeFooter(vars);
    expect(footer).toContain("Acme Corp");
    expect(footer).toContain("Slipwise Inc");
  });
});
