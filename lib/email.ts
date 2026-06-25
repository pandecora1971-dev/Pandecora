import "server-only";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(
  toEmail: string,
  toName: string,
  rawToken: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${rawToken}`;

  const gmailUser = process.env.EMAIL_GMAIL_USER;
  const gmailPass = process.env.EMAIL_GMAIL_PASS;

  if (gmailUser && gmailPass) {
    await sendViaGmail(toEmail, toName, verifyUrl, gmailUser, gmailPass);
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromAddr  = process.env.EMAIL_FROM ?? "Pandecora <onboarding@resend.dev>";

  if (resendKey) {
    await sendViaResend(toEmail, toName, verifyUrl, resendKey, fromAddr);
    return;
  }

  // Dev fallback — print link to console
  console.log(
    `\n[email] No email provider configured — verification link:\n` +
    `  To:   ${toEmail}\n` +
    `  Link: ${verifyUrl}\n`
  );
}

export async function sendResendVerificationEmail(
  toEmail: string,
  toName: string,
  rawToken: string
): Promise<void> {
  return sendVerificationEmail(toEmail, toName, rawToken);
}

// ─── Gmail SMTP ───────────────────────────────────────────────────────────────

async function sendViaGmail(
  to: string,
  name: string,
  verifyUrl: string,
  user: string,
  pass: string
): Promise<void> {
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from:    `"Pandecora" <${user}>`,
      to,
      subject: "Verify your email — Pandecora",
      html:    buildHtml(name, verifyUrl),
      text:    buildText(name, verifyUrl),
    });
    console.log(`[email] Sent via Gmail to ${to} — messageId: ${info.messageId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] Gmail SMTP error: ${msg}\n  Link: ${verifyUrl}`);
    throw new Error(`Gmail send failed: ${msg}`);
  }
}

// ─── Resend ───────────────────────────────────────────────────────────────────

async function sendViaResend(
  to: string,
  name: string,
  verifyUrl: string,
  apiKey: string,
  from: string
): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to:      [to],
    subject: "Verify your email — Pandecora",
    html:    buildHtml(name, verifyUrl),
    text:    buildText(name, verifyUrl),
  });

  if (error) {
    console.error(
      `[email] Resend error — ${error.name}: ${error.message}\n  Link: ${verifyUrl}`
    );
    throw new Error(`Resend failed: ${error.message}`);
  }
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
        <tr>
          <td style="background:#25282b;padding:28px 40px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#e60000;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;">
                <span style="color:#ffffff;font-weight:900;font-size:15px;line-height:32px;">P</span>
              </td>
              <td style="padding-left:10px;">
                <span style="color:#ffffff;font-weight:800;font-size:13px;">Pandecora</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="height:4px;background:#e60000;"></td></tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 10px;font-size:22px;font-weight:900;color:#25282b;">Verify your email address</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#7e7e7e;line-height:1.6;">
              Hi ${escapeHtml(name)}, thanks for registering. Click the button below to verify your email and activate your account.
            </p>
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="border-radius:10px;background:#e60000;">
                <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                  Verify email address
                </a>
              </td>
            </tr></table>
            <p style="margin:28px 0 8px;font-size:13px;color:#7e7e7e;">If the button doesn't work, paste this link in your browser:</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">${verifyUrl}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This link expires in <strong>24 hours</strong>. If you didn't create this account, ignore this email.
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
