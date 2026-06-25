import "server-only";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
const FROM    = process.env.EMAIL_FROM ?? "Pandecora <noreply@example.com>";

/**
 * Sends a verification email containing a one-time link.
 *
 * If RESEND_API_KEY is not set, the link is printed to the console instead —
 * this lets you test the full verification flow before adding the API key.
 */
export async function sendVerificationEmail(
  toEmail: string,
  toName:  string,
  rawToken: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${rawToken}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `\n[email] RESEND_API_KEY not set — printing verification link instead:\n` +
      `  To:   ${toEmail}\n` +
      `  Link: ${verifyUrl}\n`
    );
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      [toEmail],
    subject: "Verify your email — Pandecora",
    html:    buildHtml(toName, verifyUrl),
    text:    buildText(toName, verifyUrl),
  });

  if (error) {
    // Always print the link so you can verify locally even if Resend rejects
    console.error(
      `\n[email] Resend error — ${error.name}: ${error.message}\n` +
      `  To:   ${toEmail}\n` +
      `  Link: ${verifyUrl}\n`
    );
    throw new Error(`Email send failed: ${error.message}`);
  }
}

/**
 * Sends a password-reset style re-verification email.
 * Used by the "resend verification" flow on the pending page.
 */
export async function sendResendVerificationEmail(
  toEmail: string,
  toName:  string,
  rawToken: string
): Promise<void> {
  return sendVerificationEmail(toEmail, toName, rawToken);
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildHtml(name: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#25282b;padding:28px 40px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#e60000;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="color:#ffffff;font-weight:900;font-size:15px;line-height:32px;">S</span>
                </td>
                <td style="padding-left:10px;">
                  <span style="color:#ffffff;font-weight:800;font-size:13px;letter-spacing:-0.2px;">Pandecora</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Red accent line -->
        <tr><td style="height:4px;background:#e60000;"></td></tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 10px;font-size:22px;font-weight:900;color:#25282b;letter-spacing:-0.5px;">
              Verify your email address
            </h1>
            <p style="margin:0 0 28px;font-size:14px;color:#7e7e7e;line-height:1.6;">
              Hi ${escapeHtml(name)}, thanks for registering. Click the button below to verify
              your email and activate your account.
            </p>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background:#e60000;">
                  <a href="${verifyUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                    Verify email address
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 8px;font-size:13px;color:#7e7e7e;">
              If the button doesn't work, paste this link in your browser:
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">
              ${verifyUrl}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This link expires in <strong>24 hours</strong>.
              If you didn't create this account, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(name: string, verifyUrl: string): string {
  return (
    `Hi ${name},\n\n` +
    `Thanks for registering with Pandecora.\n\n` +
    `Verify your email address by visiting:\n${verifyUrl}\n\n` +
    `This link expires in 24 hours.\n\n` +
    `If you didn't create this account, ignore this email.`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
