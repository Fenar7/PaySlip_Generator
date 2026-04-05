export function proxyGrantedEmailHtml({
  actorName,
  representedName,
  scope,
  expiresAt,
  reason,
  orgName,
}: {
  actorName: string;
  representedName: string;
  scope: string[];
  expiresAt: string;
  reason: string;
  orgName: string;
}): string {
  const scopeList = scope.map((s) => `<li style="padding:4px 0;color:#0f172a;font-size:14px;">${s}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proxy Access Granted</title>
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
              <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Hi ${actorName},</p>
              <h2 style="margin:0 0 24px;color:#0f172a;font-size:20px;font-weight:600;">You&apos;ve been granted proxy access</h2>

              <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">
                You can now act on behalf of <strong>${representedName}</strong> in the <strong>${orgName}</strong> organization.
                All actions you take as a proxy will be logged in the audit trail.
              </p>

              <!-- Grant Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%">
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:6px 0;">Acting on behalf of</td>
                        <td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${representedName}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;padding:6px 0;">Expires</td>
                        <td style="color:#0f172a;font-size:14px;font-weight:600;text-align:right;padding:6px 0;">${expiresAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Scope -->
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Scope</p>
              <ul style="margin:0 0 24px;padding-left:20px;">${scopeList}</ul>

              <!-- Reason -->
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reason</p>
              <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.6;background-color:#f8fafc;border-radius:8px;padding:16px;">${reason}</p>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                      ⚠ All actions performed under this proxy are attributed to you and logged in the organization&apos;s audit trail.
                    </p>
                  </td>
                </tr>
              </table>
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
