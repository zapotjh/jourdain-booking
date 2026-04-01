import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startOfTodayParis } from "@/lib/paris-time";
import { sendAdminSecurityDepositRefundRequestEmail } from "@/lib/emails/send-with-log";

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

function newToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayParis = startOfTodayParis();

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,guest_name,check_in,check_out,status,payment_status,balance_paid,security_deposit_amount_cents,security_deposit_refunded,stripe_deposit_refund_id,security_deposit_refund_token,security_deposit_refund_link_sent_at,stripe_balance_payment_intent_id,stripe_security_deposit_payment_intent_id",
    )
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", true)
    .gt("security_deposit_amount_cents", 0)
    .lte("check_out", todayParis)
    .eq("security_deposit_refunded", false)
    .is("stripe_deposit_refund_id", null)
    .is("security_deposit_refund_link_sent_at", null);

  if (error) {
    console.error("[send-security-deposit-refund-link] query error", error);
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
    const token = (b.security_deposit_refund_token ?? "").length > 0 ? (b.security_deposit_refund_token as string) : newToken();

    const { error: updErr } = await supabaseAdmin
      .from("bookings")
      .update({
        security_deposit_refund_token: token,
        security_deposit_refund_link_sent_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("security_deposit_refunded", false)
      .is("stripe_deposit_refund_id", null)
      .is("security_deposit_refund_link_sent_at", null);

    if (updErr) {
      console.error("[send-security-deposit-refund-link] token/link_sent_at update failed", {
        bookingId,
        error: updErr,
      });
      failed.push(bookingId);
      continue;
    }

    const refundLinkUrl = makeRefundLink(bookingId, token);
    const guestName = b.guest_name || "Guest";
    const depositCents = Number(b.security_deposit_amount_cents ?? 0);

    const result = await sendAdminSecurityDepositRefundRequestEmail(bookingId, {
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
      console.error("[send-security-deposit-refund-link] email failed", { bookingId, error: result.error });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      todayParis,
      sent,
      skipped,
      failed,
    },
    { status: 200 },
  );
}

