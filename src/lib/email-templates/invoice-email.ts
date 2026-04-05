export function invoiceEmailHtml({
  invoiceNumber,
  customerName,
  totalAmount,
  dueDate,
  viewUrl,
}: {
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  dueDate: string;
  viewUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#dc2626;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Slipwise</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Hi ${customerName},</p>
              <h2 style="margin:0 0 24px;color:#0f172a;font-size:20px;font-weight:600;">You have a new invoice</h2>

              <!-- Invoice Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;padding:24px;margin-bottom:32px;">
                <tr>
                  <td style="padding:8px 24px;">
                    <table width="100%">
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:6px 0;">Invoice Number</td>
                        <td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:6px 0;">Amount Due</td>
                        <td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${totalAmount}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:6px 0;">Due Date</td>
                        <td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${dueDate || "On Receipt"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${viewUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      View &amp; Pay Invoice
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;text-align:center;">
                If the button doesn&apos;t work, copy this link:<br/>
                <a href="${viewUrl}" style="color:#dc2626;word-break:break-all;">${viewUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                Sent via <a href="https://slipwise.app" style="color:#64748b;text-decoration:none;font-weight:500;">Slipwise</a> — Smart invoicing for modern businesses
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
