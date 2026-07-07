import { Resend } from "resend";
import { env } from "../config/env.js";
import { otpEmailHtml } from "../emails/otp.template.js";
import { AppError } from "../utils/errors.js";

let resendClient: Resend | undefined;

export type EmailSendResult = {
  sent: boolean;
  provider?: "resend" | "dev-console";
};

function getResend(): Resend {
  if (!resendClient) {
    if (!env.RESEND_API_KEY) {
      throw new AppError(503, "RESEND_API_KEY is not configured.");
    }
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

function getFromAddress(): string {
  return `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`;
}

export function getEmailConfigStatus(): { configured: boolean; missing: string[]; provider?: string } {
  const missing: string[] = [];
  if (!env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!env.RESEND_FROM_EMAIL) missing.push("RESEND_FROM_EMAIL");

  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    return { configured: true, missing: [], provider: "resend" };
  }

  return { configured: false, missing };
}

function emailFailureMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("domain") || msg.includes("not verified")) {
    return "Sender domain is not verified in Resend. Add and verify your domain or use onboarding@resend.dev for testing.";
  }
  if (msg.includes("API key") || msg.includes("Unauthorized") || msg.includes("401")) {
    return "Resend authentication failed. Check RESEND_API_KEY on Render.";
  }
  return "Failed to send verification email via Resend.";
}

export async function sendOtpEmail(to: string, otp: string): Promise<EmailSendResult> {
  const subject = "Your one-time verification code";
  const html = otpEmailHtml(otp);
  const text = `Dear Valued Client,\n\nYour one-time verification code (OTP) is: ${otp}\n\nThis code is valid for a single verification. Never share your verification code with anyone.\n\nKind Regards,\nThe Exness India Team`;

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    if (env.NODE_ENV === "development") {
      console.log(`[DEV OTP] ${to}: ${otp}`);
      return { sent: false, provider: "dev-console" };
    }
    throw new AppError(
      503,
      "Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  try {
    const { error } = await getResend().emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Resend send failed:", error);
      throw new AppError(502, error.message ?? emailFailureMessage(error));
    }

    console.log(`OTP email sent via Resend to ${to}`);
    return { sent: true, provider: "resend" };
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("Resend send failed:", err);
    throw new AppError(502, emailFailureMessage(err));
  }
}
