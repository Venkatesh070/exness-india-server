export function otpEmailHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0F1A15,#1a2e24);padding:32px;text-align:center;">
          <h1 style="margin:0;color:#FFD10C;font-size:22px;font-weight:700;">Exness India</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;text-align:center;">
          <h2 style="margin:0 0 8px;color:#111;font-size:20px;">Verify your Email</h2>
          <p style="margin:0 0 28px;color:#666;font-size:14px;line-height:1.6;">Your verification code is</p>
          <div style="display:inline-block;background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:16px 40px;margin-bottom:28px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0F1A15;font-family:monospace;">${otp}</span>
          </div>
          <p style="margin:0;color:#888;font-size:13px;">Expires in <strong>5 minutes</strong></p>
          <p style="margin:24px 0 0;color:#aaa;font-size:12px;">If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
