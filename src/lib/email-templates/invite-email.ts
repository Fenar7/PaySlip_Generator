export function inviteEmailHtml({
  orgName,
  inviterName,
  role,
  acceptUrl,
}: {
  orgName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}): string {
  const roleLabel =
    role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #dc2626; color: #fff; font-weight: 700; font-size: 18px; padding: 10px 20px; border-radius: 8px; letter-spacing: 1px;">
          Slipwise
        </div>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; text-align: center;">
        You've been invited
      </h1>
      <p style="color: #555; margin-bottom: 24px; text-align: center; line-height: 1.6;">
        <strong>${inviterName}</strong> has invited you to join
        <strong>${orgName}</strong> on Slipwise as a
        <strong>${roleLabel}</strong>.
      </p>
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${acceptUrl}" style="display: inline-block; background: #dc2626; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      <div style="border-top: 1px solid #e5e5e5; padding-top: 16px;">
        <p style="color: #999; font-size: 12px; text-align: center; line-height: 1.5;">
          This invitation expires in 72 hours. If you didn't expect this,
          you can safely ignore this email.
        </p>
        <p style="color: #bbb; font-size: 11px; text-align: center; margin-top: 8px;">
          Slipwise One — Document management for modern teams
        </p>
      </div>
    </div>
  `;
}
