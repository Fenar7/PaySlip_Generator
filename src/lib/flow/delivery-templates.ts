/**
 * Shared email templates for notification delivery.
 * Pure utility — no DB, no revalidatePath.
 */

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.app";

export function buildNotificationEmailHtml(opts: {
  title: string;
  body: string;
  link: string | null;
}): string {
  const linkHtml = opts.link
    ? `<p style="margin-top:16px">
        <a href="${APP_URL}${opts.link}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
          View in Slipwise →
        </a>
      </p>`
    : "";

  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#fff">
      <div style="margin-bottom:24px">
        <img src="${APP_URL}/logo.png" alt="Slipwise" height="28" style="height:28px" />
      </div>
      <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px">${opts.title}</h2>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px">${opts.body}</p>
      ${linkHtml}
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0" />
      <p style="font-size:11px;color:#9ca3af">
        This notification was sent by Slipwise One.
        <a href="${APP_URL}/app/flow/notifications" style="color:#9ca3af">Manage notifications</a>
      </p>
    </div>
  `;
}
