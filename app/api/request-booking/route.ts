import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendGuestBookingPendingEmail,
  sendAdminBookingApprovalRequestEmail,
} from "@/lib/emails/send-with-log";
import { computeSecurityDepositHoldCentsFromStayLengthDays } from "@/lib/security-deposit-hold-cents";

// Money: single source of truth is integer cents. Do not use EUR columns in logic.
const DEPOSIT_RATIO = 0.4;
const LONG_STAY_NIGHTS_THRESHOLD = 28;
const BALANCE_DUE_DAYS_SHORT = 14;
const BALANCE_DUE_DAYS_LONG = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      guest_name,
      email,
      phone,
      check_in,
      check_out,
      total_price_eur,
      long_stay_threshold_nights = LONG_STAY_NIGHTS_THRESHOLD,
    } = body;

    console.log("[request-booking] incoming", {
      guest_name,
      email,
      check_in,
      check_out,
      total_price_eur,
    });

    if (!guest_name || !email || !check_in || !check_out || !total_price_eur) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const inDate = new Date(check_in + "T00:00:00Z");
    const outDate = new Date(check_out + "T00:00:00Z");
    const nights = Math.ceil(
      (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (!Number.isFinite(nights) || nights <= 0) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const totalPriceEur = Math.round(Number(total_price_eur));
    if (!Number.isFinite(totalPriceEur) || totalPriceEur <= 0) {
      return NextResponse.json(
        { error: "Invalid total_price_eur (must be > 0)" },
        { status: 400 },
      );
    }

    const total_price_cents = Math.round(totalPriceEur * 100);
    const deposit_amount_cents = Math.round(total_price_cents * DEPOSIT_RATIO);
    const balance_amount_cents = total_price_cents - deposit_amount_cents;
    const security_deposit_hold_cents =
      computeSecurityDepositHoldCentsFromStayLengthDays(nights);

    const long_stay = nights >= Number(long_stay_threshold_nights);
    const dueDays = long_stay ? BALANCE_DUE_DAYS_LONG : BALANCE_DUE_DAYS_SHORT;
    const balanceDueAt = new Date(inDate);
    balanceDueAt.setUTCDate(balanceDueAt.getUTCDate() - dueDays);
    const balance_due_at = balanceDueAt.toISOString().slice(0, 10);

    const approvalToken = crypto.randomBytes(24).toString("hex");

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        email,
        guest_name,
        guest_phone: phone ?? null,
        status: "pending_approval",
        check_in,
        check_out,
        nights,
        currency: "eur",
        total_price_cents,
        deposit_amount_cents,
        balance_amount_cents,
        security_deposit_hold_cents,
        long_stay,
        balance_due_at,
        approval_token: approvalToken,
      })
      .select(
        "id,status,check_in,check_out,nights,approval_token,total_price_cents,deposit_amount_cents,balance_amount_cents,security_deposit_hold_cents,currency,long_stay,balance_due_at",
      )
      .single();

    if (error) {
      console.error("[request-booking] insert error", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A pending booking request for these dates already exists." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.log("[request-booking] created booking", {
      id: data.id,
      status: data.status,
      total_price_cents: data.total_price_cents,
      deposit_amount_cents: data.deposit_amount_cents,
      long_stay: data.long_stay,
      balance_due_at: data.balance_due_at,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lappartementjourdain.com";
    const totalPriceEurStr = (data.total_price_cents / 100).toFixed(2);
    const depositAmountEurStr = (data.deposit_amount_cents / 100).toFixed(2);

    const guestEmailTo = process.env.TEST_GUEST_EMAIL || email;
    const guestEmailResult = await sendGuestBookingPendingEmail(data.id, {
      to: guestEmailTo,
      guestName: guest_name,
      checkIn: data.check_in,
      checkOut: data.check_out,
      nights: data.nights,
      totalPriceEur: totalPriceEurStr,
    });
    if (guestEmailResult.status === "failed") {
      console.error("[request-booking] guest booking_pending email failed", { bookingId: data.id, error: guestEmailResult.error });
    }
    const adminEmailResult = await sendAdminBookingApprovalRequestEmail(data.id, {
      guestName: guest_name,
      guestEmail: email,
      guestPhone: phone ?? null,
      checkIn: data.check_in,
      checkOut: data.check_out,
      nights: data.nights,
      totalPriceEur: totalPriceEurStr,
      depositAmountEur: depositAmountEurStr,
      approvalToken: data.approval_token,
      siteUrl,
    });
    if (adminEmailResult.status === "failed") {
      console.error("[request-booking] admin booking_approval_request email failed", { bookingId: data.id, error: adminEmailResult.error });
    }

    return NextResponse.json({ ok: true, booking: data });
  } catch (e: any) {
    console.error("[request-booking] unexpected error", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
