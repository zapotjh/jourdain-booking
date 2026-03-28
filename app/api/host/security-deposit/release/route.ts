import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

function authorize(req: Request): boolean {
  const secret = req.headers.get("x-cron-secret");
  return !!(secret && secret === process.env.CRON_SECRET);
}

/**
 * Release (cancel) an authorized manual-capture hold — normal checkout path.
 * POST JSON: { booking_id: string }
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { booking_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = String(body.booking_id || "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  const { data: row, error: findErr } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,status,payment_status,stripe_security_deposit_payment_intent_id,security_deposit_hold_status",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (findErr || !row) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (row.status !== "confirmed" || row.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Booking must be confirmed and paid" },
      { status: 400 },
    );
  }

  const piId = row.stripe_security_deposit_payment_intent_id;
  if (!piId) {
    return NextResponse.json(
      { error: "No security deposit hold on this booking" },
      { status: 400 },
    );
  }

  if (row.security_deposit_hold_status === "released") {
    return NextResponse.json({ ok: true, idempotent: true, pi_id: piId });
  }

  if (row.security_deposit_hold_status === "captured") {
    return NextResponse.json(
      { error: "Hold already captured; cannot release" },
      { status: 400 },
    );
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (pi.status === "canceled") {
      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from("bookings")
        .update({
          security_deposit_hold_status: "released",
          security_deposit_hold_released_at: nowIso,
        })
        .eq("id", bookingId)
        .eq("stripe_security_deposit_payment_intent_id", piId);
      return NextResponse.json({ ok: true, idempotent: true, pi_id: piId });
    }

    if (pi.status === "succeeded") {
      return NextResponse.json(
        { error: "PaymentIntent already captured; use capture flow or refund in Stripe" },
        { status: 400 },
      );
    }

    if (pi.status === "requires_capture") {
      await stripe.paymentIntents.cancel(piId);
    } else {
      return NextResponse.json(
        { error: `Unexpected PI status: ${pi.status}` },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({
        security_deposit_hold_status: "released",
        security_deposit_hold_released_at: nowIso,
      })
      .eq("id", bookingId)
      .eq("stripe_security_deposit_payment_intent_id", piId);

    if (upErr) {
      console.error("[security-deposit release] db error", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pi_id: piId });
  } catch (err: any) {
    console.error("[security-deposit release] stripe error", err);
    return NextResponse.json(
      { error: err?.message || "Stripe error" },
      { status: 500 },
    );
  }
}
