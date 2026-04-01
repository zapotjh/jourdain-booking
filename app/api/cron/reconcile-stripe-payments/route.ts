/**
 * Last-resort safety net: find successful Stripe payments not reflected in bookings.
 * Runs as cron. Recovers paid-but-not-confirmed bookings using same canonical logic as webhook.
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendAdminWebhookReconciliationAlert,
  sendGuestDepositPaymentSucceededEmail,
  sendAdminDepositPaymentSucceededEmail,
} from "@/lib/emails/send-with-log";
import { computeSecurityDepositHoldCentsFromStayLengthDays } from "@/lib/security-deposit-hold-cents";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const CONFIRMATION_WINDOW_MS = 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const cutoff = new Date(Date.now() - CONFIRMATION_WINDOW_MS).toISOString();

  const recovered: string[] = [];
  const skipped: string[] = [];
  const skippedMissingSession: string[] = [];
  const skippedUnpaid: string[] = [];
  const errors: { id: string; reason: string }[] = [];

  type Row = {
    id: string;
    status: string;
    stripe_session_id: string | null;
    stripe_payment_intent_id?: string | null;
    payment_status?: string | null;
    security_deposit_amount_cents?: number | null;
    email?: string | null;
    guest_name?: string | null;
    check_in?: string;
    check_out?: string;
    nights?: number;
    long_stay?: boolean;
    total_price_cents?: number;
    deposit_amount_cents?: number;
    balance_amount_cents?: number;
    confirmed_at?: string | null;
  };
  const ids = new Set<string>();
  const rowMap = new Map<string, Row>();

  const { data: pending, error: e1 } = await supabaseAdmin
    .from("bookings")
    .select("id,status,stripe_session_id,stripe_payment_intent_id,payment_status,security_deposit_amount_cents,email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at")
    .eq("status", "payment_pending")
    .not("stripe_session_id", "is", null)
    .lt("payment_pending_expires_at", cutoff)
    .limit(20);
  if (!e1 && pending) (pending as Row[]).forEach((r) => { ids.add(r.id); rowMap.set(r.id, r); });

  const { data: canceled, error: e2 } = await supabaseAdmin
    .from("bookings")
    .select("id,status,stripe_session_id,stripe_payment_intent_id,payment_status,security_deposit_amount_cents,email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at")
    .eq("status", "canceled")
    .not("stripe_session_id", "is", null)
    .limit(20);
  if (!e2 && canceled) (canceled as Row[]).forEach((r) => { ids.add(r.id); rowMap.set(r.id, r); });

  if (e1 || e2) {
    console.error("[reconcile-stripe-payments] find error", e1 ?? e2);
    return NextResponse.json({ error: (e1 ?? e2)?.message }, { status: 500 });
  }

  const candidates = Array.from(ids).map((id) => rowMap.get(id)).filter((r): r is Row => !!r);

  for (const row of candidates) {
    const bookingId = row.id;
    const sessionId = row.stripe_session_id;
    if (!sessionId) {
      skipped.push(bookingId);
      continue;
    }

    try {
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (retrieveErr: unknown) {
        const stripeErr = retrieveErr as { code?: string; statusCode?: number };
        if (stripeErr?.code === "resource_missing" || stripeErr?.statusCode === 404) {
          skippedMissingSession.push(bookingId);
          console.log("[reconcile-stripe-payments] skip_missing_session", {
            bookingId,
            sessionId,
            action: "skip_missing_session",
            reason: "stripe_resource_missing",
          });
          continue;
        }
        throw retrieveErr;
      }
      if (session.payment_status !== "paid") {
        skippedUnpaid.push(bookingId);
        skipped.push(bookingId);
        continue;
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as { id?: string } | null)?.id ?? null;

      if (row.status === "canceled") {
        const hasNewModelSecurityDeposit =
          Number(row.security_deposit_amount_cents ?? 0) > 0;
        const securityDepositHoldCents = hasNewModelSecurityDeposit
          ? 0
          : computeSecurityDepositHoldCentsFromStayLengthDays(row.nights ?? 0);
        const { data: updated, error: upErr } = await supabaseAdmin
          .from("bookings")
          .update({
            status: "confirmed",
            stripe_payment_intent_id: paymentIntentId,
            payment_status: "paid",
            confirmed_at: nowIso,
            security_deposit_hold_cents: securityDepositHoldCents,
          })
          .eq("id", bookingId)
          .eq("status", "canceled")
          .select("id")
          .maybeSingle();

        if (upErr || !updated) {
          errors.push({ id: bookingId, reason: upErr?.message ?? "0 rows" });
          continue;
        }

        await sendAdminWebhookReconciliationAlert(bookingId, { sessionId, paymentIntentId: paymentIntentId ?? null });
        const { data: b } = await supabaseAdmin.from("bookings").select("email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at").eq("id", bookingId).single();
        if (b) {
          const totalPriceEur = ((b.total_price_cents ?? 0) / 100).toFixed(2);
          const depositAmountEur = ((b.deposit_amount_cents ?? 0) / 100).toFixed(2);
          const balanceAmountEur = ((b.balance_amount_cents ?? 0) / 100).toFixed(2);
          const confirmedAt = b.confirmed_at ?? nowIso;
          await sendGuestDepositPaymentSucceededEmail(bookingId, {
            to: b.email ?? "",
            guestName: b.guest_name ?? "Guest",
            checkIn: b.check_in ?? "",
            checkOut: b.check_out ?? "",
            nights: b.nights ?? 0,
            longStay: Boolean(b.long_stay),
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
            stripeSessionId: sessionId,
          });
          await sendAdminDepositPaymentSucceededEmail(bookingId, {
            guestName: b.guest_name ?? "Guest",
            guestEmail: b.email ?? "",
            checkIn: b.check_in ?? "",
            checkOut: b.check_out ?? "",
            nights: b.nights ?? 0,
            longStay: Boolean(b.long_stay),
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
            stripeSessionId: sessionId,
            stripePaymentIntentId: paymentIntentId ?? null,
            confirmedAt,
          });
        }
        recovered.push(bookingId);
        console.log("[reconcile-stripe-payments] recovered", { bookingId, sessionId });
      } else if (row.status === "payment_pending") {
        const hasNewModelSecurityDepositPending =
          Number(row.security_deposit_amount_cents ?? 0) > 0;
        const securityDepositHoldCentsPending = hasNewModelSecurityDepositPending
          ? 0
          : computeSecurityDepositHoldCentsFromStayLengthDays(row.nights ?? 0);
        const { data: updated, error: upErr } = await supabaseAdmin
          .from("bookings")
          .update({
            status: "confirmed",
            stripe_payment_intent_id: paymentIntentId,
            payment_status: "paid",
            confirmed_at: nowIso,
            security_deposit_hold_cents: securityDepositHoldCentsPending,
          })
          .eq("id", bookingId)
          .eq("status", "payment_pending")
          .select("id")
          .maybeSingle();

        if (upErr || !updated) {
          errors.push({ id: bookingId, reason: upErr?.message ?? "0 rows" });
          continue;
        }

        await sendAdminWebhookReconciliationAlert(bookingId, { sessionId, paymentIntentId: paymentIntentId ?? null });
        const { data: b } = await supabaseAdmin.from("bookings").select("email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at").eq("id", bookingId).single();
        if (b) {
          const totalPriceEur = ((b.total_price_cents ?? 0) / 100).toFixed(2);
          const depositAmountEur = ((b.deposit_amount_cents ?? 0) / 100).toFixed(2);
          const balanceAmountEur = ((b.balance_amount_cents ?? 0) / 100).toFixed(2);
          const confirmedAt = b.confirmed_at ?? nowIso;
          await sendGuestDepositPaymentSucceededEmail(bookingId, {
            to: b.email ?? "",
            guestName: b.guest_name ?? "Guest",
            checkIn: b.check_in ?? "",
            checkOut: b.check_out ?? "",
            nights: b.nights ?? 0,
            longStay: Boolean(b.long_stay),
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
            stripeSessionId: sessionId,
          });
          await sendAdminDepositPaymentSucceededEmail(bookingId, {
            guestName: b.guest_name ?? "Guest",
            guestEmail: b.email ?? "",
            checkIn: b.check_in ?? "",
            checkOut: b.check_out ?? "",
            nights: b.nights ?? 0,
            longStay: Boolean(b.long_stay),
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
            stripeSessionId: sessionId,
            stripePaymentIntentId: paymentIntentId ?? null,
            confirmedAt,
          });
        }
        recovered.push(bookingId);
        console.log("[reconcile-stripe-payments] recovered payment_pending", { bookingId, sessionId });
      } else {
        skipped.push(bookingId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "exception";
      console.error("[reconcile-stripe-payments] error for booking", { bookingId, reason: msg });
      errors.push({ id: bookingId, reason: msg });
    }
  }

  const summary = {
    recovered_count: recovered.length,
    skipped_missing_session_count: skippedMissingSession.length,
    skipped_unpaid_count: skippedUnpaid.length,
    skipped_other_count: skipped.length - skippedUnpaid.length,
    error_count: errors.length,
  };

  return NextResponse.json(
    {
      ok: true,
      recovered,
      skipped,
      errors,
      summary,
    },
    { status: 200 },
  );
}
