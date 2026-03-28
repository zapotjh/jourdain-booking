/**
 * Shared reject logic: validate pending_approval, set status=canceled, canceled_at, send guest "booking_rejected" email.
 * Used by GET/POST /api/host/reject. Single source of truth for host rejection.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestBookingRejectedEmail } from "@/lib/emails/send-with-log";

export type RejectBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string; status: number };

export type RejectBookingOptions = { guestMessage?: string | null };

export async function rejectBooking(
  approvalToken: string,
  options?: RejectBookingOptions,
): Promise<RejectBookingResult> {
  const token = String(approvalToken || "").trim();
  if (!token) {
    return { ok: false, error: "Missing approval_token", status: 400 };
  }

  const guestMessage = options?.guestMessage ? String(options.guestMessage).trim() : undefined;

  const { data: booking, error: findErr } = await supabaseAdmin
    .from("bookings")
    .select("id,status,email,guest_name,check_in,check_out,nights")
    .eq("approval_token", token)
    .single();

  if (findErr || !booking) {
    console.error("[reject-booking] lookup failed", { approval_token: token, error: findErr });
    return { ok: false, error: "Booking not found", status: 404 };
  }

  if (booking.status !== "pending_approval") {
    console.log("[reject-booking] not pending_approval", { id: booking.id, status: booking.status });
    return { ok: false, error: "Booking is not in pending_approval status (already approved or canceled)", status: 409 };
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin
    .from("bookings")
    .update({ status: "canceled", canceled_at: nowIso })
    .eq("id", booking.id)
    .eq("status", "pending_approval");

  if (upErr) {
    console.error("[reject-booking] update failed", { booking_id: booking.id, error: upErr });
    return { ok: false, error: upErr.message, status: 500 };
  }

  if (booking.email) {
    const emailResult = await sendGuestBookingRejectedEmail(booking.id, {
      to: booking.email,
      guestName: booking.guest_name ?? "Guest",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      nights: booking.nights,
      hostMessage: guestMessage || undefined,
    });
    if (emailResult.status === "failed") {
      console.error("[reject-booking] guest booking_rejected email failed", { booking_id: booking.id, error: emailResult.error });
    }
  }

  return { ok: true, bookingId: booking.id };
}
