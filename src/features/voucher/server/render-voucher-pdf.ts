import type { VoucherDocument, VoucherTemplateId } from "@/features/voucher/types";

type VoucherPdfTemplateRenderer = (document: VoucherDocument) => string;

const EXPORT_STYLES = `
  @page {
    size: A4;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #f3ede2;
    color: #221a11;
    font-family: Inter, "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    min-height: 100vh;
  }

  img {
    display: block;
    max-width: 100%;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    padding: 16mm 15mm 15mm;
  }

  .root {
    color: #221a11;
  }

  .template {
    width: 100%;
  }

  .eyebrow {
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(34, 26, 17, 0.52);
  }

  .serif-heading {
    margin: 0;
    font-family: Georgia, "Times New Roman", Times, serif;
    font-weight: 700;
    color: #18110d;
  }

  .body-copy {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.75;
    color: rgba(34, 26, 17, 0.82);
  }

  .card {
    border: 1px solid rgba(34, 26, 17, 0.1);
    border-radius: 18px;
    background: #fffefb;
  }

  .dashed-card {
    border-style: dashed;
  }

  .header-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    border-bottom: 1px solid rgba(34, 26, 17, 0.1);
    padding-bottom: 18px;
  }

  .header-grid > * {
    display: table-cell;
    vertical-align: top;
  }

  .logo-cell {
    width: 92px;
    padding-left: 18px;
  }

  .logo-badge {
    width: 74px;
    height: 74px;
    border: 1px solid rgba(34, 26, 17, 0.14);
    border-radius: 20px;
    background: #fbf7f0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-badge span {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .detail-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-top: 16px;
  }

  .detail-grid > * {
    display: table-cell;
    vertical-align: top;
  }

  .detail-main {
    width: 63%;
    padding-right: 14px;
  }

  .detail-aside {
    width: 37%;
  }

  .detail-panel {
    padding: 18px 18px 8px;
  }

  .detail-panel-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .detail-panel-row {
    display: table-row;
  }

  .detail-panel-row > * {
    display: table-cell;
    vertical-align: top;
    padding-bottom: 16px;
    width: 50%;
  }

  .detail-panel-row > *:first-child {
    padding-right: 12px;
  }

  .detail-label {
    margin: 0;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: rgba(34, 26, 17, 0.48);
  }

  .detail-value {
    margin: 8px 0 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;
    color: #1f1711;
    word-break: break-word;
  }

  .accent-card {
    height: 100%;
    min-height: 188px;
    border-radius: 18px;
    padding: 18px 18px 20px;
    color: white;
    background: var(--accent-color);
  }

  .accent-card .detail-label {
    color: rgba(255, 255, 255, 0.72);
  }

  .accent-amount {
    margin: 12px 0 0;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
  }

  .accent-copy {
    margin: 16px 0 0;
    font-size: 11.5px;
    line-height: 1.75;
    color: rgba(255, 255, 255, 0.9);
  }

  .section {
    margin-top: 16px;
    padding: 18px;
  }

  .signature-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-top: 16px;
  }

  .signature-grid > * {
    display: table-cell;
    width: 50%;
    vertical-align: top;
  }

  .signature-grid > *:first-child {
    padding-right: 8px;
  }

  .signature-grid > *:last-child {
    padding-left: 8px;
  }

  .signature-card {
    padding: 18px;
  }

  .signature-line {
    height: 48px;
    border-bottom: 1px dashed rgba(34, 26, 17, 0.2);
  }

  .signature-copy {
    margin: 12px 0 0;
    font-size: 11.5px;
    font-weight: 600;
    color: rgba(34, 26, 17, 0.84);
  }

  .ledger-shell {
    border: 2px solid rgba(34, 26, 17, 0.16);
    border-radius: 18px;
    overflow: hidden;
    background: #fffefb;
  }

  .ledger-banner {
    padding: 18px 20px;
    color: white;
    background: var(--accent-color);
  }

  .ledger-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .ledger-grid > * {
    display: table-cell;
    vertical-align: top;
  }

  .ledger-company {
    text-align: right;
    padding-left: 18px;
  }

  .ledger-rows {
    padding: 6px 20px 4px;
  }

  .ledger-row {
    display: table;
    width: 100%;
    table-layout: fixed;
    border-bottom: 1px solid rgba(34, 26, 17, 0.08);
    padding: 10px 0;
  }

  .ledger-row:last-child {
    border-bottom: none;
  }

  .ledger-row > * {
    display: table-cell;
    vertical-align: top;
  }

  .ledger-row-label {
    width: 148px;
    padding-right: 12px;
  }

  .ledger-value {
    font-size: 11.5px;
    line-height: 1.7;
    color: rgba(34, 26, 17, 0.84);
    word-break: break-word;
  }

  .support-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    margin-top: 16px;
  }

  .support-grid > * {
    display: table-cell;
    vertical-align: top;
  }

  .support-grid > *:first-child {
    width: 56%;
    padding-right: 8px;
  }

  .support-grid > *:last-child {
    width: 44%;
    padding-left: 8px;
  }

  .support-card {
    padding: 18px;
  }

  .stack {
    margin-top: 12px;
  }

  .stack > * + * {
    margin-top: 8px;
  }

  .placeholder-copy {
    margin: 14px 0 0;
    font-size: 11px;
    line-height: 1.65;
    color: rgba(34, 26, 17, 0.62);
  }
`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInitials(companyName: string) {
  const source = companyName.trim() || "BD";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function renderBrandMark(document: VoucherDocument) {
  if (document.branding.logoDataUrl) {
    return `
      <div class="logo-badge">
        <img
          src="${escapeHtml(document.branding.logoDataUrl)}"
          alt="${escapeHtml(`${document.branding.companyName || "Company"} logo`)}"
          style="width:100%;height:100%;object-fit:cover"
        />
      </div>
    `;
  }

  return `
    <div class="logo-badge">
      <span style="color:var(--accent-color)">${escapeHtml(
        formatInitials(document.branding.companyName),
      )}</span>
    </div>
  `;
}

function renderDetailCell(label: string, value: string) {
  return `
    <div>
      <p class="detail-label">${escapeHtml(label)}</p>
      <p class="detail-value">${escapeHtml(value)}</p>
    </div>
  `;
}

function renderSection(title: string, body: string, dashed = false) {
  return `
    <section class="card section${dashed ? " dashed-card" : ""}">
      <p class="detail-label">${escapeHtml(title)}</p>
      <div class="stack">
        ${body}
      </div>
    </section>
  `;
}

function renderOptionalLines(document: VoucherDocument) {
  return [
    document.visibility.showAddress && document.branding.address
      ? `<p class="body-copy">${escapeHtml(document.branding.address)}</p>`
      : "",
    document.visibility.showEmail && document.branding.email
      ? `<p class="body-copy">${escapeHtml(document.branding.email)}</p>`
      : "",
    document.visibility.showPhone && document.branding.phone
      ? `<p class="body-copy">${escapeHtml(document.branding.phone)}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

function renderMinimalOfficeTemplate(document: VoucherDocument) {
  return `
    <div class="template">
      <header class="header-grid">
        <div>
          <p class="eyebrow">${escapeHtml(document.title)}</p>
          <h1 class="serif-heading" style="font-size:31px;line-height:1.1;margin-top:10px">
            ${escapeHtml(document.branding.companyName || "Business Document Generator")}
          </h1>
          <div class="stack" style="margin-top:14px">
            ${renderOptionalLines(document)}
          </div>
        </div>
        <div class="logo-cell">
          ${renderBrandMark(document)}
        </div>
      </header>

      <div class="detail-grid">
        <div class="detail-main">
          <section class="card detail-panel">
            <div class="detail-panel-grid">
              <div class="detail-panel-row">
                ${renderDetailCell("Voucher no.", document.voucherNumber)}
                ${renderDetailCell("Date", document.date)}
              </div>
              <div class="detail-panel-row">
                ${renderDetailCell(document.counterpartyLabel, document.counterpartyName)}
                ${
                  document.paymentMode
                    ? renderDetailCell("Payment mode", document.paymentMode)
                    : "<div></div>"
                }
              </div>
              ${
                document.referenceNumber
                  ? `<div class="detail-panel-row">
                      ${renderDetailCell("Reference", document.referenceNumber)}
                      <div style="display:none"></div>
                    </div>`
                  : ""
              }
            </div>
          </section>
        </div>
        <div class="detail-aside">
          <aside class="accent-card">
            <p class="detail-label">Amount</p>
            <p class="accent-amount">${escapeHtml(document.amountFormatted)}</p>
            <p class="accent-copy">${escapeHtml(document.amountInWords)}</p>
          </aside>
        </div>
      </div>

      ${renderSection(
        "Purpose / Narration",
        `<p class="body-copy">${escapeHtml(document.purpose)}</p>`,
      )}

      ${
        document.notes
          ? renderSection(
              "Notes",
              `<p class="body-copy">${escapeHtml(document.notes)}</p>`,
              true,
            )
          : ""
      }

      ${
        document.visibility.showSignatureArea
          ? `
            <section class="signature-grid">
              <div>
                <div class="card signature-card">
                  <div class="signature-line"></div>
                  <p class="signature-copy">${escapeHtml(
                    document.approvedBy
                      ? `Approved by: ${document.approvedBy}`
                      : "Approved by",
                  )}</p>
                </div>
              </div>
              <div>
                <div class="card signature-card">
                  <div class="signature-line"></div>
                  <p class="signature-copy">${escapeHtml(
                    document.receivedBy
                      ? `Received by: ${document.receivedBy}`
                      : "Received by",
                  )}</p>
                </div>
              </div>
            </section>
          `
          : ""
      }
    </div>
  `;
}

function renderLedgerRow(label: string, value: string) {
  return `
    <div class="ledger-row">
      <div class="ledger-row-label">
        <p class="detail-label">${escapeHtml(label)}</p>
      </div>
      <div>
        <p class="ledger-value">${escapeHtml(value)}</p>
      </div>
    </div>
  `;
}

function renderTraditionalLedgerTemplate(document: VoucherDocument) {
  const authorizationContent = [
    document.approvedBy
      ? `
          <div>
            <div class="signature-line" style="height:40px"></div>
            <p class="signature-copy">Approved by: ${escapeHtml(document.approvedBy)}</p>
          </div>
        `
      : "",
    document.receivedBy
      ? `
          <div>
            <div class="signature-line" style="height:40px"></div>
            <p class="signature-copy">Received by: ${escapeHtml(document.receivedBy)}</p>
          </div>
        `
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <div class="template">
      <section class="ledger-shell">
        <div class="ledger-banner">
          <div class="ledger-grid">
            <div>
              <p class="eyebrow" style="color:rgba(255,255,255,0.74)">Formal voucher record</p>
              <h1 class="serif-heading" style="font-size:30px;line-height:1.1;margin-top:10px;color:white">
                ${escapeHtml(document.title)}
              </h1>
            </div>
            <div class="ledger-company">
              <p class="body-copy" style="color:rgba(255,255,255,0.88)">
                ${escapeHtml(document.branding.companyName || "Business Document Generator")}
              </p>
            </div>
          </div>
        </div>

        <div class="ledger-rows">
          ${renderLedgerRow("Voucher number", document.voucherNumber)}
          ${renderLedgerRow("Date", document.date)}
          ${renderLedgerRow(document.counterpartyLabel, document.counterpartyName)}
          ${renderLedgerRow("Amount", `${document.amountFormatted} (${document.amountInWords})`)}
          ${document.paymentMode ? renderLedgerRow("Payment mode", document.paymentMode) : ""}
          ${document.referenceNumber ? renderLedgerRow("Reference", document.referenceNumber) : ""}
          ${renderLedgerRow("Purpose", document.purpose)}
          ${document.notes ? renderLedgerRow("Notes", document.notes) : ""}
        </div>
      </section>

      <section class="support-grid">
        <div>
          <div class="card support-card">
            <p class="detail-label">Business details</p>
            <div class="stack" style="margin-top:12px">
              ${renderOptionalLines(document)}
            </div>
          </div>
        </div>
        ${
          document.visibility.showSignatureArea
            ? `
              <div>
                <div class="card support-card">
                  <p class="detail-label">Authorization</p>
                  <div class="stack" style="margin-top:12px">
                    ${
                      authorizationContent ||
                      '<p class="placeholder-copy">Signature lines will appear here once names are provided.</p>'
                    }
                  </div>
                </div>
              </div>
            `
            : ""
        }
      </section>
    </div>
  `;
}

const voucherPdfTemplateRegistry: Record<VoucherTemplateId, VoucherPdfTemplateRenderer> = {
  "minimal-office": renderMinimalOfficeTemplate,
  "traditional-ledger": renderTraditionalLedgerTemplate,
};

export function renderVoucherPdfHtml(document: VoucherDocument) {
  const renderTemplate = voucherPdfTemplateRegistry[document.templateId];

  if (!renderTemplate) {
    throw new Error(`Unsupported voucher PDF template: ${document.templateId}`);
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(`${document.title} ${document.voucherNumber}`)}</title>
    <style>${EXPORT_STYLES}</style>
  </head>
  <body>
    <main
      class="page root"
      data-testid="voucher-pdf-ready"
      data-template-id="${escapeHtml(document.templateId)}"
      style="--accent-color:${escapeHtml(document.branding.accentColor)}"
    >
      ${renderTemplate(document)}
    </main>
  </body>
</html>`;
}
