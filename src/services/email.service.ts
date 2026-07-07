import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { otpEmailHtml } from "../emails/otp.template.js";
import { AppError } from "../utils/errors.js";

let transporter: nodemailer.Transporter | null = null;

export type EmailSendResult = {
  sent: boolean;
  provider?: "brevo-api" | "brevo-smtp" | "dev-console";
};

function getTransporter(): nodemailer.Transporter | null {
  if (!env.BREVO_SMTP_USER || !env.BREVO_SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: env.BREVO_SMTP_PORT === 465,
      requireTLS: env.BREVO_SMTP_PORT === 587,
      auth: { user: env.BREVO_SMTP_USER, pass: env.BREVO_SMTP_PASS },
    });
  }
  return transporter;
}

export function getEmailConfigStatus(): { configured: boolean; missing: string[]; provider?: string } {
  const missing: string[] = [];
  if (!env.BREVO_FROM_EMAIL) missing.push("BREVO_FROM_EMAIL");

  if (env.BREVO_API_KEY && env.BREVO_FROM_EMAIL) {
    return { configured: true, missing: [], provider: "brevo-api" };
  }

  if (!env.BREVO_SMTP_USER) missing.push("BREVO_SMTP_USER");
  if (!env.BREVO_SMTP_PASS) missing.push("BREVO_SMTP_PASS");

  if (env.BREVO_SMTP_USER && env.BREVO_SMTP_PASS && env.BREVO_FROM_EMAIL) {
    return { configured: true, missing: [], provider: "brevo-smtp" };
  }

  return { configured: false, missing };
}

async function sendViaBrevoApi(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: env.BREVO_FROM_NAME, email: env.BREVO_FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}

function validateSmtpCredentials(): void {
  const user = env.BREVO_SMTP_USER;
  if (!user) return;

  const looksLikePersonalEmail = /@(gmail|googlemail|yahoo|hotmail|outlook|icloud)\./i.test(user);
  if (looksLikePersonalEmail) {
    throw new AppError(
      502,
      "BREVO_SMTP_USER must be the SMTP login from Brevo (Settings → SMTP & API → SMTP tab), not your Gmail. It usually looks like 91xxxxxx@smtp-brevo.com. Or set BREVO_API_KEY instead.",
    );
  }
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string): Promise<void> {
  validateSmtpCredentials();
  const transport = getTransporter();
  if (!transport) throw new Error("SMTP transporter not configured");

  const info = await transport.sendMail({
    from: `"${env.BREVO_FROM_NAME}" <${env.BREVO_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
  console.log(`OTP email sent via SMTP to ${to} (${info.messageId})`);
}

function emailFailureMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("535") || msg.includes("Authentication failed") || msg.includes("401")) {
    return "Brevo authentication failed. Use BREVO_API_KEY (recommended) or the SMTP login from Brevo → Settings → SMTP & API → SMTP tab (not your Gmail).";
  }
  if (msg.includes("sender") || msg.includes("not verified")) {
    return "Sender email is not verified in Brevo. Go to Senders & Domains and verify your from-address.";
  }
  return "Failed to send verification email via Brevo.";
}

export async function sendOtpEmail(to: string, otp: string): Promise<EmailSendResult> {
  if (!env.BREVO_FROM_EMAIL) {
    if (env.NODE_ENV === "development") {
      console.log(`[DEV OTP] ${to}: ${otp}`);
      return { sent: false, provider: "dev-console" };
    }
    throw new AppError(503, "BREVO_FROM_EMAIL is not configured");
  }

  const subject = "Verify your Email";
  const html = otpEmailHtml(otp);
  const text = `Your verification code is ${otp}. Expires in 5 minutes.`;

  if (env.BREVO_API_KEY) {
    try {
      await sendViaBrevoApi(to, subject, html, text);
      console.log(`OTP email sent via Brevo API to ${to}`);
      return { sent: true, provider: "brevo-api" };
    } catch (err) {
      console.error("Brevo API send failed:", err);
      throw new AppError(502, emailFailureMessage(err));
    }
  }

  if (env.BREVO_SMTP_USER && env.BREVO_SMTP_PASS) {
    try {
      await sendViaSmtp(to, subject, html, text);
      return { sent: true, provider: "brevo-smtp" };
    } catch (err) {
      console.error("Brevo SMTP send failed:", err);
      throw new AppError(502, emailFailureMessage(err));
    }
  }

  if (env.NODE_ENV === "development") {
    console.log(`[DEV OTP] ${to}: ${otp}`);
    console.warn("No Brevo credentials set — OTP logged above, not emailed.");
    return { sent: false, provider: "dev-console" };
  }

  throw new AppError(
    503,
    "Email service not configured. Set BREVO_API_KEY or BREVO_SMTP_USER + BREVO_SMTP_PASS.",
  );
}
