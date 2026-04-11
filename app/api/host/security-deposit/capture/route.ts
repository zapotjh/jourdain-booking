import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function authorize(req: Request): boolean {
  const secret = req.headers.get("x-cron-secret");
  return !!(secret && secret === process.env.CRON_SECRET);
}

/**
 * Capture part or all of an authorized manual-capture hold — damage path.
 * POST JSON: { booking_id: string, amount_cents?: number }
 * If amount_cents omitted, captures full amount_capturable.
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { booking_id?: string; amount_cents?: number };
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
    return NextResponse.json(
      { error: "Hold was released; cannot capture" },
      { status: 400 },
    );
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    const capturable = pi.amount_capturable ?? 0;

    if (pi.status !== "requires_capture" || capturable <= 0) {
      if (pi.status === "succeeded") {
        return NextResponse.json({
          ok: true,
          idempotent: true,
          pi_id: piId,
          status: pi.status,
        });
      }
      return NextResponse.json(
        {
          error: `Nothing to capture (status=${pi.status}, amount_capturable=${capturable})`,
        },
        { status: 400 },
      );
    }

    let amountToCapture = capturable;
    if (body.amount_cents !== undefined && body.amount_cents !== null) {
      const requested = Number(body.amount_cents);
      if (!Number.isFinite(requested) || requested <= 0 || requested > capturable) {
        return NextResponse.json(
          {
            error: `amount_cents must be 1..${capturable}`,
          },
          { status: 400 },
        );
      }
      amountToCapture = Math.floor(requested);
    }

    const captured = await stripe.paymentIntents.capture(piId, {
      amount_to_capture: amountToCapture,
    });

    const nowIso = new Date().toISOString();
    const finalStatus = captured.status;
    const remaining = captured.amount_capturable ?? 0;
    const fullyDone =
      finalStatus === "succeeded" || remaining <= 0;

    await supabaseAdmin
      .from("bookings")
      .update({
        security_deposit_hold_captured_at: nowIso,
        security_deposit_hold_status: fullyDone ? "captured" : "held",
      })
      .eq("id", bookingId)
      .eq("stripe_security_deposit_payment_intent_id", piId);

    return NextResponse.json({
      ok: true,
      pi_id: piId,
      amount_captured_cents: amountToCapture,
      payment_intent_status: finalStatus,
      amount_capturable_remaining: remaining,
    });
  } catch (err: any) {
    console.error("[security-deposit capture] error", err);
    return NextResponse.json(
      { error: err?.message || "Stripe error" },
      { status: 500 },
    );
  }
}
