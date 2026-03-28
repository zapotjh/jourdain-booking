import { supabaseAdmin } from "@/lib/supabase-admin";

export type EmailLogStatus = "sent" | "failed";

export type InsertEmailLogParams = {
  booking_id: string | null;
  recipient_type: "admin" | "guest";
  email_type: string;
  to_email: string;
  subject?: string | null;
  status: EmailLogStatus;
  provider_message_id?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Returns true if this exact email event was already sent (idempotency).
 * For balance_payment_failed pass attemptNumber so we allow up to 3 rows per (booking, recipient, type).
 * For security_deposit_hold_failed pass opts.parisDate (YYYY-MM-DD, Europe/Paris) for one email per Paris day.
 */
export async function alreadySentEmail(
  bookingId: string,
  recipientType: "admin" | "guest",
  emailType: string,
  attemptNumber?: number,
  opts?: { parisDate?: string },
): Promise<boolean> {
  let q = supabaseAdmin
    .from("email_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("recipient_type", recipientType)
    .eq("email_type", emailType);

  if (attemptNumber !== undefined && attemptNumber !== null) {
    q = q.eq("metadata->>attempt_number", String(attemptNumber));
  }

  if (
    emailType === "security_deposit_hold_failed" &&
    opts?.parisDate
  ) {
    q = q.eq("metadata->>paris_date", opts.parisDate);
  }

  const { data } = await q.limit(1).maybeSingle();
  return !!data;
}

export async function insertEmailLog(p: InsertEmailLogParams): Promise<void> {
  const { error } = await supabaseAdmin.from("email_log").insert({
    booking_id: p.booking_id ?? null,
    recipient_type: p.recipient_type,
    email_type: p.email_type,
    to_email: p.to_email,
    subject: p.subject ?? null,
    status: p.status,
    provider_message_id: p.provider_message_id ?? null,
    error_message: p.error_message ?? null,
    metadata: p.metadata ?? {},
  });

  if (error) {
    console.error("[email-log] insert failed", { email_type: p.email_type, error });
    throw error;
  }
}
