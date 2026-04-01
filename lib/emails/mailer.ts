import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM =
  process.env.RESEND_FROM_EMAIL ??
  "L'appartement Jourdain <booking@lappartementjourdain.com>";

// All guest replies should go to operations inbox.
export const REPLY_TO = "apt.jourdain.paris@gmail.com";

/** Canonical admin recipient. In test mode admin emails go here. */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export const EMAIL_MODE = (process.env.EMAIL_MODE ?? "production") as "production" | "test";

/** In EMAIL_MODE=test, all guest-facing emails are redirected here. */
export const TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE ?? process.env.TEST_GUEST_EMAIL ?? "";

/**
 * Sentinel address for safe failure injection (local/dev verification only).
 * When used as recipient, sendEmail throws before calling Resend so email_log records status=failed.
 * Do not use in production flows.
 */
export const EMAIL_FAILURE_INJECT_ADDRESS = "inject-failure@verification.local";

export type ResolveRecipientResult = {
  intendedTo: string;
  actualTo: string;
  redirected: boolean;
  mode: "test" | "production";
};

/**
 * Resolve the actual recipient for the current environment.
 * - admin: always send to ADMIN_EMAIL; redirected if originalTo !== ADMIN_EMAIL.
 * - guest + test: send to TEST_EMAIL_OVERRIDE or ADMIN_EMAIL; redirected unless originalTo already equals that.
 * - guest + production: send to originalTo; redirected = false.
 */
export function resolveRecipientForEnvironment(
  originalTo: string,
  recipientType: "guest" | "admin",
): ResolveRecipientResult {
  const mode = process.env.EMAIL_MODE === "test" ? "test" : "production";
  const intendedTo = originalTo ?? "";

  if (recipientType === "admin") {
    const actualTo = ADMIN_EMAIL;
    return {
      intendedTo: intendedTo || actualTo,
      actualTo,
      redirected: intendedTo ? intendedTo !== actualTo : false,
      mode,
    };
  }

  if (mode === "production") {
    return { intendedTo, actualTo: intendedTo, redirected: false, mode: "production" };
  }

  const actualTo = TEST_EMAIL_OVERRIDE || ADMIN_EMAIL || intendedTo;
  return {
    intendedTo,
    actualTo,
    redirected: actualTo !== intendedTo,
    mode: "test",
  };
}

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  recipientType?: "guest" | "admin";
};

export async function sendEmail({ to, subject, html, recipientType = "guest" }: SendEmailParams) {
  const first = Array.isArray(to) ? to[0] : to;
  const originalTo = first ?? "";
  const res = resolveRecipientForEnvironment(originalTo, recipientType);
  const toSend = res.actualTo;
  let subjectSend = subject;
  if (res.redirected && recipientType === "guest") {
    subjectSend = `[TEST REDIRECT] ${subject}`;
  } else if (recipientType === "admin" && res.mode === "test") {
    subjectSend = `[TEST MODE] ${subject}`;
  }

  // Safe failure injection for verification: no Resend call, throws so send-with-log records status=failed
  if (originalTo === EMAIL_FAILURE_INJECT_ADDRESS || toSend === EMAIL_FAILURE_INJECT_ADDRESS) {
    throw new Error("Injected failure for email_log verification (EMAIL_FAILURE_INJECT_ADDRESS)");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: toSend,
      subject: subjectSend,
      html,
      replyTo: REPLY_TO,
    });

    if (error) {
      console.error("[resend] sendEmail error:", error);
      throw new Error(`[resend] ${error.message}`);
    }

    return data;
  } catch (err) {
    console.error("[mailer] sendEmail failed:", err);
    throw err;
  }
}

export async function sendAdminEmail({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  if (!ADMIN_EMAIL) {
    console.warn("[mailer] ADMIN_EMAIL not set — admin email skipped");
    return;
  }

  return sendEmail({
    to: ADMIN_EMAIL,
    subject,
    html,
    recipientType: "admin",
  });
}
