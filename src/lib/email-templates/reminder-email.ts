/**
 * Reminder email HTML template
 */

interface ReminderEmailProps {
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  dueDate: string;
  daysUntilDue: number;
  viewUrl: string;
}

export function reminderEmailHtml({
  invoiceNumber,
  customerName,
  totalAmount,
  dueDate,
  daysUntilDue,
  viewUrl,
}: ReminderEmailProps): string {
  let headline: string;
  let message: string;
  let urgencyColor: string;

  if (daysUntilDue < 0) {
    headline = "Invoice Overdue";
    message = `Invoice <strong>${invoiceNumber}</strong> was due on <strong>${dueDate}</strong> and is now overdue. Please arrange payment at your earliest convenience.`;
    urgencyColor = "#dc2626";
  } else if (daysUntilDue <= 1) {
    headline = "Invoice Due Tomorrow";
    message = `Invoice <strong>${invoiceNumber}</strong> is due <strong>tomorrow (${dueDate})</strong>. Please ensure payment is arranged.`;
    urgencyColor = "#f59e0b";
  } else {
    headline = `Invoice Due in ${daysUntilDue} Days`;
    message = `Invoice <strong>${invoiceNumber}</strong> is due on <strong>${dueDate}</strong>. This is a friendly reminder to arrange payment.`;
    urgencyColor = "#3b82f6";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr>
          <td style="background:${urgencyColor};padding:24px 32px">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">${headline}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">
              Hi ${customerName || "there"},
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
              ${message}
            </p>
            <!-- Summary -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px">
              <tr>
                <td style="padding:16px">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding-bottom:8px">Invoice</td>
                      <td align="right" style="color:#111827;font-size:13px;font-weight:600;padding-bottom:8px">${invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding-bottom:8px">Amount Due</td>
                      <td align="right" style="color:#111827;font-size:13px;font-weight:600;padding-bottom:8px">${totalAmount}</td>
                    </tr>
                    <tr>
                      <td style="color:#6b7280;font-size:13px">Due Date</td>
                      <td align="right" style="color:#111827;font-size:13px;font-weight:600">${dueDate}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${viewUrl}" style="display:inline-block;background:${urgencyColor};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
                    View Invoice
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
              Sent by Slipwise &mdash; Invoice &amp; Payment Management
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
