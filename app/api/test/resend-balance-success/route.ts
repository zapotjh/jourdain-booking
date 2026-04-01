/**
 * Test-only resend endpoint for balance success email.
 * Purpose: allow re-sending a specific booking's balance success email without changing booking/payment logic.
 * Requires x-cron-secret. Sends to explicit `to` query param (defaults to ADMIN_EMAIL).
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmailBalanceSuccess } from "@/lib/emails/email-balance-success";
import { ADMIN_EMAIL } from "@/lib/emails/mailer";

export const runtime = "nodejs";

function centsToEur(cents: number): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n) / 100).toFixed(2);
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const bookingId = String(url.searchParams.get("booking_id") ?? "").trim();
  const to = String(url.searchParams.get("to") ?? "").trim() || ADMIN_EMAIL;

  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }
  if (!to) {
    return NextResponse.json({ error: "Missing to (and ADMIN_EMAIL not set)" }, { status: 400 });
  }

  const { data: b, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,guest_name,email,check_in,check_out,nights,total_price_cents,deposit_amount_cents,balance_amount_cents,security_deposit_amount_cents",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !b) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const securityDepositCents = Number((b as any).security_deposit_amount_cents ?? 0);
  const hasDeposit = Number.isFinite(securityDepositCents) && securityDepositCents > 0;
  const totalChargedCents =
    Number((b as any).balance_amount_cents ?? 0) + (hasDeposit ? securityDepositCents : 0);

  const result = await sendEmailBalanceSuccess({
    to,
    guestName: (b as any).guest_name ?? "Guest",
    checkIn: (b as any).check_in ?? "",
    checkOut: (b as any).check_out ?? "",
    nights: (b as any).nights ?? 0,
    totalPriceEur: centsToEur((b as any).total_price_cents ?? 0),
    depositAmountEur: centsToEur((b as any).deposit_amount_cents ?? 0),
    accommodationBalanceAmountEur: centsToEur((b as any).balance_amount_cents ?? 0),
    securityDepositAmountEur: hasDeposit ? centsToEur(securityDepositCents) : undefined,
    totalChargedAmountEur: hasDeposit ? centsToEur(totalChargedCents) : undefined,
  });

  return NextResponse.json({
    ok: true,
    booking_id: bookingId,
    to,
    sent: true,
    provider: result ?? null,
  });
}

