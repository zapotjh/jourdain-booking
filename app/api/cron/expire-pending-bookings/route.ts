import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendGuestDepositPaymentFailedEmail,
  sendAdminDepositPaymentFailedEmail,
} from "@/lib/emails/send-with-log";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  // 1) Find expired, unpaid payment_pending bookings (with fields needed for emails)
  const { data: expired, error: findErr } = await supabaseAdmin
    .from("bookings")
    .select("id,email,guest_name,check_in,check_out")
    .eq("status", "payment_pending")
    .or("payment_status.is.null,payment_status.neq.paid")
    .not("payment_pending_expires_at", "is", null)
    .lt("payment_pending_expires_at", nowIso);

  if (findErr) {
    console.error("[expire-pending-bookings] find error", findErr);
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  const rows = (expired ?? []) as Array<{
    id: string;
    email: string | null;
    guest_name: string | null;
    check_in: string;
    check_out: string;
  }>;
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, expired_ids: [] }, { status: 200 });
  }

  // 2) Cancel only rows still payment_pending (race-safe: webhook may have confirmed some)
  const { data: updatedRows, error: upErr } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "canceled",
      canceled_at: nowIso,
    })
    .in("id", ids)
    .eq("status", "payment_pending")
    .select("id");

  if (upErr) {
    console.error("[expire-pending-bookings] update error", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const actuallyCanceledIds = (updatedRows ?? []).map((r: { id: string }) => r.id);
  const emailSent: string[] = [];
  const emailFailed: string[] = [];

  // 3) Send deposit_payment_failed only for bookings we actually canceled
  for (const row of rows) {
    if (!actuallyCanceledIds.includes(row.id)) continue;
    if (row.email) {
      const guestResult = await sendGuestDepositPaymentFailedEmail(row.id, {
        to: row.email,
        guestName: row.guest_name ?? "Guest",
        checkIn: row.check_in,
        checkOut: row.check_out,
      });
      if (guestResult.status === "sent") emailSent.push(row.id);
      else if (guestResult.status === "failed") {
        emailFailed.push(row.id);
        console.error("[expire-pending-bookings] guest deposit_payment_failed email failed", { id: row.id, error: guestResult.error });
      }
    }
    const adminResult = await sendAdminDepositPaymentFailedEmail(row.id, {
      guestName: row.guest_name ?? "Guest",
      guestEmail: row.email ?? "",
      checkIn: row.check_in,
      checkOut: row.check_out,
    });
    if (adminResult.status === "sent") emailSent.push(row.id);
    else if (adminResult.status === "failed") {
      emailFailed.push(row.id);
      console.error("[expire-pending-bookings] admin deposit_payment_failed email failed", { id: row.id, error: adminResult.error });
    }
  }

  console.log("[expire-pending-bookings] canceled", { count: actuallyCanceledIds.length, ids: actuallyCanceledIds, emailSent, emailFailed });
  return NextResponse.json({ ok: true, expired_ids: actuallyCanceledIds, email_sent: emailSent, email_failed: emailFailed }, { status: 200 });
}

