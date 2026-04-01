import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startOfTodayParis, startOfParisPlusDaysFromToday } from "@/lib/paris-time";
import { sendAdminSecurityDepositRefundReminderEmail } from "@/lib/emails/send-with-log";

export const runtime = "nodejs";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://lappartementjourdain.com").replace(/\/+$/, "");
}

function makeRefundLink(bookingId: string, token: string): string {
  const url = new URL(`${siteUrl()}/admin/refund-deposit`);
  url.searchParams.set("booking_id", bookingId);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayParis = startOfTodayParis();
  const yesterdayParis = startOfParisPlusDaysFromToday(-1);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,guest_name,check_in,check_out,status,payment_status,balance_paid,security_deposit_amount_cents,security_deposit_refunded,stripe_deposit_refund_id,security_deposit_refund_token,security_deposit_refund_link_sent_at,security_deposit_refund_reminder_sent_at",
    )
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", true)
    .gt("security_deposit_amount_cents", 0)
    .lte("check_out", yesterdayParis)
    .eq("security_deposit_refunded", false)
    .is("stripe_deposit_refund_id", null)
    .not("security_deposit_refund_link_sent_at", "is", null)
    .is("security_deposit_refund_reminder_sent_at", null);

  if (error) {
    console.error("[remind-security-deposit-refund-link] query error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data ?? []) as Array<{
    id: string;
    guest_name: string | null;
    check_in: string;
    check_out: string;
    security_deposit_amount_cents: number | null;
    security_deposit_refund_token: string | null;
  }>;

  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const b of bookings) {
    const bookingId = b.id;
    const token = String(b.security_deposit_refund_token ?? "");
    if (!token) {
      skipped.push(bookingId);
      continue;
    }

    const { error: updErr } = await supabaseAdmin
      .from("bookings")
      .update({
        security_deposit_refund_reminder_sent_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("security_deposit_refunded", false)
      .is("stripe_deposit_refund_id", null)
      .is("security_deposit_refund_reminder_sent_at", null);

    if (updErr) {
      console.error("[remind-security-deposit-refund-link] reminder_sent_at update failed", {
        bookingId,
        error: updErr,
      });
      failed.push(bookingId);
      continue;
    }

    const refundLinkUrl = makeRefundLink(bookingId, token);
    const guestName = b.guest_name || "Guest";
    const depositCents = Number(b.security_deposit_amount_cents ?? 0);

    const result = await sendAdminSecurityDepositRefundReminderEmail(bookingId, {
      guestName,
      checkIn: b.check_in,
      checkOut: b.check_out,
      securityDepositAmountCents: depositCents,
      refundLinkUrl,
    });

    if (result.status === "sent") sent.push(bookingId);
    else if (result.status === "deduped") skipped.push(bookingId);
    else {
      failed.push(bookingId);
      console.error("[remind-security-deposit-refund-link] email failed", { bookingId, error: result.error });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      todayParis,
      yesterdayParis,
      sent,
      skipped,
      failed,
    },
    { status: 200 },
  );
}

