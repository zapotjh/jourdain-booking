import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendGuestDepositPaymentSucceededEmail,
  sendAdminDepositPaymentSucceededEmail,
  sendGuestBalancePaymentSucceededEmail,
  sendAdminBalancePaymentSucceededEmail,
  sendAdminWebhookReconciliationAlert,
  sendAdminRefundAlert,
} from "@/lib/emails/send-with-log";
import { recordWebhookEvent, markWebhookEventProcessed } from "@/lib/stripe-webhook-events";
import { computeSecurityDepositHoldCentsFromStayLengthDays } from "@/lib/security-deposit-hold-cents";

// Uses only canonical columns: status, stripe_payment_intent_id, payment_status, confirmed_at. booking_id from session.metadata.
// Return non-2xx ONLY for invalid signature or malformed payload. For verified events always prefer 200.
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

function logStructured(payload: Record<string, unknown>) {
  console.log("[webhook] structured", payload);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[webhook] missing signature or secret", {
      hasSig: !!sig,
      hasSecret: !!webhookSecret,
    });
    return NextResponse.json({ error: "Missing webhook signature/secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[webhook] signature verification failed", err?.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message}` },
      { status: 400 },
    );
  }

  try {
    const recordResult = await recordWebhookEvent(event.id, event.type, event.livemode);
    if (recordResult.duplicate) {
      logStructured({
        stripe_event_id: event.id,
        event_type: event.type,
        branch_taken: "duplicate_event",
        db_update_result: "skipped",
      });
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const bookingId = session.metadata?.booking_id;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as { id?: string } | null)?.id ?? null;

      console.log("[webhook] checkout.session.completed", {
        bookingId,
        sessionId: session.id,
        paymentIntentId,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      });

      if (!bookingId) {
        console.error("[webhook] missing booking_id in session.metadata", {
          sessionId: session.id,
          metadata: session.metadata,
        });
        return NextResponse.json({ error: "Missing booking_id in metadata" }, { status: 400 });
      }

      // Balance-only checkout (manual link sent after 3 auto-charge failures)
      if (session.metadata?.kind === "balance_manual") {
        const { data: bookingRow } = await supabaseAdmin
          .from("bookings")
          .select("id, balance_paid, email, guest_name, check_in, check_out, nights, total_price_cents, deposit_amount_cents, balance_amount_cents")
          .eq("id", bookingId)
          .single();
        if (!bookingRow) {
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "balance_manual", booking_not_found: true });
          } catch (_) {}
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        if (bookingRow.balance_paid) {
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "balance_manual", already_paid: true });
          } catch (_) {}
          return NextResponse.json({ ok: true, balance_already_paid: true }, { status: 200 });
        }
        const { data: balanceUpdated, error: balErr } = await supabaseAdmin
          .from("bookings")
          .update({
            balance_paid: true,
            balance_paid_at: new Date().toISOString(),
            stripe_balance_payment_intent_id: paymentIntentId,
            balance_payment_attempts: 0,
            balance_payment_failed_at: null,
            balance_payment_failure_reason: null,
          })
          .eq("id", bookingId)
          .eq("balance_paid", false)
          .select("id")
          .maybeSingle();
        if (balErr) {
          console.error("[webhook] balance_manual update error", { bookingId, error: balErr });
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "balance_manual", db_error: balErr.message });
          } catch (_) {}
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        if (balanceUpdated && bookingRow.email) {
          const totalPriceEur = ((bookingRow.total_price_cents ?? 0) / 100).toFixed(2);
          const depositAmountEur = ((bookingRow.deposit_amount_cents ?? 0) / 100).toFixed(2);
          const balanceAmountEur = ((bookingRow.balance_amount_cents ?? 0) / 100).toFixed(2);
          const guestRes = await sendGuestBalancePaymentSucceededEmail(bookingId, {
            to: bookingRow.email,
            guestName: bookingRow.guest_name ?? "Guest",
            checkIn: bookingRow.check_in ?? "",
            checkOut: bookingRow.check_out ?? "",
            nights: bookingRow.nights ?? 0,
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
          });
          if (guestRes.status === "failed") {
            console.error("[webhook] guest balance_payment_succeeded failed", { bookingId, error: guestRes.error });
          }
          const adminRes = await sendAdminBalancePaymentSucceededEmail(bookingId, {
            guestName: bookingRow.guest_name ?? "Guest",
            guestEmail: bookingRow.email,
            checkIn: bookingRow.check_in ?? "",
            checkOut: bookingRow.check_out ?? "",
            nights: bookingRow.nights ?? 0,
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
          });
          if (adminRes.status === "failed") {
            console.error("[webhook] admin balance_payment_succeeded failed", { bookingId, error: adminRes.error });
          }
        }
        try {
          await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "balance_manual", balance_paid: true });
        } catch (_) {}
        return NextResponse.json({ ok: true, balance_paid: true }, { status: 200 });
      }

      console.log("[webhook] updating booking to confirmed", { bookingId });

      const { data: pendingForHold } = await supabaseAdmin
        .from("bookings")
        .select("nights")
        .eq("id", bookingId)
        .eq("status", "payment_pending")
        .maybeSingle();
      const securityDepositHoldCents = computeSecurityDepositHoldCentsFromStayLengthDays(
        pendingForHold?.nights ?? 0,
      );

      // Race-safe: only confirm if still payment_pending (avoid overwriting canceled or already confirmed)
      const { data: updated, error: upErr } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "confirmed",
          stripe_payment_intent_id: paymentIntentId,
          payment_status: "paid",
          confirmed_at: new Date().toISOString(),
          security_deposit_hold_cents: securityDepositHoldCents,
        })
        .eq("id", bookingId)
        .eq("status", "payment_pending")
        .select("id,status,stripe_payment_intent_id,confirmed_at")
        .maybeSingle();

      if (upErr) {
        logStructured({
          stripe_event_id: event.id,
          event_type: event.type,
          booking_id: bookingId,
          stripe_session_id: session.id,
          payment_intent_id: paymentIntentId,
          branch_taken: "confirm_update",
          db_update_result: "error",
          reconciliation_attempted: false,
          reconciliation_recovered: false,
          email_status_summary: "none",
        });
        try {
          await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "confirm_update", db_error: upErr.message });
        } catch (_) {}
        return NextResponse.json({ ok: true, db_error: upErr.message }, { status: 200 });
      }

      let row: typeof updated & { email?: string; guest_name?: string; check_in?: string; check_out?: string; nights?: number; long_stay?: boolean; total_price_cents?: number; deposit_amount_cents?: number; balance_amount_cents?: number; confirmed_at?: string } | null = updated;

      if (!updated) {
        // Reconciliation: Stripe payment succeeded but conditional update matched 0 rows.
        // Re-fetch and handle so we never leave a paid booking canceled (invariant).
        const { data: refetched } = await supabaseAdmin
          .from("bookings")
          .select("id,status,stripe_session_id,stripe_payment_intent_id,payment_status,email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at")
          .eq("id", bookingId)
          .single();

        if (!refetched) {
          logStructured({
            stripe_event_id: event.id,
            event_type: event.type,
            booking_id: bookingId,
            stripe_session_id: session.id,
            payment_intent_id: paymentIntentId,
            branch_taken: "reconciliation_booking_not_found",
            db_update_result: "n/a",
            reconciliation_attempted: true,
            reconciliation_recovered: false,
            email_status_summary: "none",
          });
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "reconciliation_booking_not_found" });
          } catch (_) {}
          return NextResponse.json({ ok: true, anomaly: "booking_not_found" }, { status: 200 });
        }

        const currentStatus = refetched.status;

        if (currentStatus === "confirmed") {
          logStructured({
            stripe_event_id: event.id,
            event_type: event.type,
            booking_id: bookingId,
            stripe_session_id: session.id,
            payment_intent_id: paymentIntentId,
            branch_taken: "already_confirmed",
            db_update_result: "none",
            reconciliation_attempted: false,
            reconciliation_recovered: false,
            email_status_summary: "deduped",
          });
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "already_confirmed" });
          } catch (_) {}
          return NextResponse.json({ ok: true, reconciled: "already_confirmed" }, { status: 200 });
        }

        if (currentStatus === "canceled" && session.payment_status === "paid") {
          if (refetched.stripe_session_id && refetched.stripe_session_id !== session.id) {
            logStructured({
              stripe_event_id: event.id,
              event_type: event.type,
              booking_id: bookingId,
              stripe_session_id: session.id,
              payment_intent_id: paymentIntentId,
              branch_taken: "stale_session_rejected",
              db_update_result: "none",
              reconciliation_attempted: true,
              reconciliation_recovered: false,
              email_status_summary: "none",
              booking_stripe_session_id: refetched.stripe_session_id,
            });
            try {
              await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "stale_session_rejected" });
            } catch (_) {}
            return NextResponse.json({ ok: true, anomaly: "stale_session" }, { status: 200 });
          }
          // CASE B: Expire cron won the race. Recover: paid booking must not stay canceled.
          console.error("[webhook] reconciliation: paid but canceled — attempting recover", {
            bookingId,
            sessionId: session.id,
            paymentIntentId,
            payment_status: session.payment_status,
            branch: "recover_from_canceled",
          });

          const securityDepositHoldCentsRecover =
            computeSecurityDepositHoldCentsFromStayLengthDays(refetched.nights ?? 0);

          const { data: recovered, error: recoverErr } = await supabaseAdmin
            .from("bookings")
            .update({
              status: "confirmed",
              stripe_payment_intent_id: paymentIntentId,
              payment_status: "paid",
              confirmed_at: new Date().toISOString(),
              security_deposit_hold_cents: securityDepositHoldCentsRecover,
            })
            .eq("id", bookingId)
            .eq("status", "canceled")
            .select("id,status,email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at")
            .maybeSingle();

          if (recoverErr) {
            logStructured({
              stripe_event_id: event.id,
              booking_id: bookingId,
              stripe_session_id: session.id,
              payment_intent_id: paymentIntentId,
              branch_taken: "recover_from_canceled",
              db_update_result: "error",
              reconciliation_attempted: true,
              reconciliation_recovered: false,
              email_status_summary: "none",
            });
            try {
              await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "recover_from_canceled", recoverResult: "db_error" });
            } catch (_) {}
            return NextResponse.json({ ok: true, reconciled: "recover_failed" }, { status: 200 });
          }

          if (!recovered) {
            logStructured({
              stripe_event_id: event.id,
              booking_id: bookingId,
              stripe_session_id: session.id,
              branch_taken: "recover_from_canceled",
              db_update_result: "0_rows",
              reconciliation_attempted: true,
              reconciliation_recovered: false,
              email_status_summary: "none",
            });
            try {
              await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "recover_from_canceled", recoverResult: "no_row" });
            } catch (_) {}
            return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
          }

          // Recovery succeeded: send canonical admin reconciliation alert (logged to email_log).
          const alertResult = await sendAdminWebhookReconciliationAlert(bookingId, {
            sessionId: session.id,
            paymentIntentId: paymentIntentId ?? null,
          });
          if (alertResult.status === "failed") {
            console.error("[webhook] reconciliation: admin alert send failed", { bookingId, error: alertResult.error });
          }

          // Optionally send deposit success emails if not already sent (canonical layer dedupes).
          const { data: rowForRecovered } = await supabaseAdmin
            .from("bookings")
            .select("id,email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at")
            .eq("id", bookingId)
            .single();
          if (rowForRecovered) {
            const totalPriceEur = ((rowForRecovered.total_price_cents ?? 0) / 100).toFixed(2);
            const depositAmountEur = ((rowForRecovered.deposit_amount_cents ?? 0) / 100).toFixed(2);
            const balanceAmountEur = ((rowForRecovered.balance_amount_cents ?? 0) / 100).toFixed(2);
            const confirmedAt = rowForRecovered.confirmed_at ?? new Date().toISOString();
            const guestRecoverResult = await sendGuestDepositPaymentSucceededEmail(bookingId, {
              to: rowForRecovered.email ?? "",
              guestName: rowForRecovered.guest_name ?? "Guest",
              checkIn: rowForRecovered.check_in,
              checkOut: rowForRecovered.check_out,
              nights: rowForRecovered.nights,
              longStay: Boolean(rowForRecovered.long_stay),
              totalPriceEur,
              depositAmountEur,
              balanceAmountEur,
              stripeSessionId: session.id,
            });
            if (guestRecoverResult.status === "failed") {
              console.error("[webhook] guest deposit_payment_succeeded after recover failed", { bookingId, error: guestRecoverResult.error });
            }
            const adminRecoverResult = await sendAdminDepositPaymentSucceededEmail(bookingId, {
              guestName: rowForRecovered.guest_name ?? "Guest",
              guestEmail: rowForRecovered.email ?? "",
              checkIn: rowForRecovered.check_in,
              checkOut: rowForRecovered.check_out,
              nights: rowForRecovered.nights,
              longStay: Boolean(rowForRecovered.long_stay),
              totalPriceEur,
              depositAmountEur,
              balanceAmountEur,
              stripeSessionId: session.id,
              stripePaymentIntentId: paymentIntentId ?? null,
              confirmedAt,
            });
            if (adminRecoverResult.status === "failed") {
              console.error("[webhook] admin deposit_payment_succeeded after recover failed", { bookingId, error: adminRecoverResult.error });
            }
          }

          logStructured({
            stripe_event_id: event.id,
            booking_id: bookingId,
            stripe_session_id: session.id,
            payment_intent_id: paymentIntentId,
            branch_taken: "recover_from_canceled",
            db_update_result: "updated",
            reconciliation_attempted: true,
            reconciliation_recovered: true,
            email_status_summary: "alert_sent_deposit_emails_deduped",
          });
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "recover_from_canceled", reconciliation_recovered: true });
          } catch (_) {}
          return NextResponse.json({ ok: true, reconciled: "recovered_from_canceled" }, { status: 200 });
        }

        if (currentStatus === "payment_pending") {
          // CASE C: Retry update once.
          const { data: pendingRetry } = await supabaseAdmin
            .from("bookings")
            .select("nights")
            .eq("id", bookingId)
            .eq("status", "payment_pending")
            .maybeSingle();
          const securityDepositHoldCentsRetry =
            computeSecurityDepositHoldCentsFromStayLengthDays(pendingRetry?.nights ?? 0);

          const { data: retried, error: retryErr } = await supabaseAdmin
            .from("bookings")
            .update({
              status: "confirmed",
              stripe_payment_intent_id: paymentIntentId,
              payment_status: "paid",
              confirmed_at: new Date().toISOString(),
              security_deposit_hold_cents: securityDepositHoldCentsRetry,
            })
            .eq("id", bookingId)
            .eq("status", "payment_pending")
            .select("id,status,stripe_payment_intent_id,confirmed_at")
            .maybeSingle();

          if (retryErr || !retried) {
            logStructured({
              stripe_event_id: event.id,
              booking_id: bookingId,
              stripe_session_id: session.id,
              branch_taken: "retry_confirm",
              db_update_result: retryErr ? "error" : "0_rows",
              reconciliation_attempted: true,
              reconciliation_recovered: false,
              email_status_summary: "none",
            });
            try {
              await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "retry_confirm", retry_failed: true });
            } catch (_) {}
            return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
          }
          row = retried;
          console.log("[webhook] reconciliation: confirmed on retry", { bookingId });
        } else {
          logStructured({
            stripe_event_id: event.id,
            booking_id: bookingId,
            stripe_session_id: session.id,
            branch_taken: "unexpected_status",
            db_update_result: "none",
            reconciliation_attempted: true,
            reconciliation_recovered: false,
            email_status_summary: "none",
            current_status: currentStatus,
          });
          try {
            await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "unexpected_status", current_status: currentStatus });
          } catch (_) {}
          return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
        }
      }

      console.log("[webhook] booking confirmed", {
        bookingId,
        status: row?.status,
        stripe_payment_intent_id: row?.stripe_payment_intent_id,
        confirmed_at: row?.confirmed_at,
      });

      const { data: rowForEmail } = await supabaseAdmin
        .from("bookings")
        .select(
          "id,email,guest_name,check_in,check_out,nights,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,confirmed_at",
        )
        .eq("id", bookingId)
        .single();

      if (rowForEmail) {
        const totalPriceEur = ((rowForEmail.total_price_cents ?? 0) / 100).toFixed(2);
        const depositAmountEur = ((rowForEmail.deposit_amount_cents ?? 0) / 100).toFixed(2);
        const balanceAmountEur = ((rowForEmail.balance_amount_cents ?? 0) / 100).toFixed(2);
        const confirmedAt = rowForEmail.confirmed_at ?? new Date().toISOString();
        const guestResult = await sendGuestDepositPaymentSucceededEmail(bookingId, {
          to: rowForEmail.email ?? "",
          guestName: rowForEmail.guest_name ?? "Guest",
          checkIn: rowForEmail.check_in,
          checkOut: rowForEmail.check_out,
          nights: rowForEmail.nights,
          longStay: Boolean(rowForEmail.long_stay),
          totalPriceEur,
          depositAmountEur,
          balanceAmountEur,
          stripeSessionId: session.id,
        });
        if (guestResult.status === "failed") {
          console.error("[webhook] guest deposit_payment_succeeded email failed", { bookingId, error: guestResult.error });
        }
        const adminResult = await sendAdminDepositPaymentSucceededEmail(bookingId, {
          guestName: rowForEmail.guest_name ?? "Guest",
          guestEmail: rowForEmail.email ?? "",
          checkIn: rowForEmail.check_in,
          checkOut: rowForEmail.check_out,
          nights: rowForEmail.nights,
          longStay: Boolean(rowForEmail.long_stay),
          totalPriceEur,
          depositAmountEur,
          balanceAmountEur,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId ?? null,
          confirmedAt,
        });
        if (adminResult.status === "failed") {
          console.error("[webhook] admin deposit_payment_succeeded email failed", { bookingId, error: adminResult.error });
        }
      }

      logStructured({
        stripe_event_id: event.id,
        booking_id: bookingId,
        stripe_session_id: session.id,
        payment_intent_id: paymentIntentId,
        branch_taken: "confirm_normal",
        db_update_result: "updated",
        reconciliation_attempted: false,
        reconciliation_recovered: false,
        email_status_summary: "deposit_emails_sent_or_deduped",
      });
      try {
        await markWebhookEventProcessed(event.id, bookingId, { branch_taken: "confirm_normal" });
      } catch (_) {}
      return NextResponse.json({ ok: true, updated: row ?? undefined }, { status: 200 });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
      if (piId) {
        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("stripe_payment_intent_id", piId)
          .single();
        if (booking) {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "refunded", status: "canceled" })
            .eq("id", booking.id)
            .in("status", ["confirmed", "payment_pending"]);
          await sendAdminRefundAlert(booking.id, { reason: "refunded", chargeId: charge.id, paymentIntentId: piId });
          logStructured({ stripe_event_id: event.id, event_type: event.type, booking_id: booking.id, branch_taken: "refund_applied" });
        }
      }
      try {
        await markWebhookEventProcessed(event.id, null, { event_type: event.type });
      } catch (_) {}
      return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
    }

    if (event.type === "payment_intent.canceled") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingIdFromMeta = pi.metadata?.booking_id as string | undefined;
      const { data: booking } = bookingIdFromMeta
        ? await supabaseAdmin.from("bookings").select("id").eq("id", bookingIdFromMeta).single()
        : await supabaseAdmin.from("bookings").select("id").eq("stripe_payment_intent_id", pi.id).single();
      if (booking) {
        await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "refunded", status: "canceled" })
          .eq("id", booking.id)
          .in("status", ["confirmed", "payment_pending"]);
        await sendAdminRefundAlert(booking.id, { reason: "canceled", paymentIntentId: pi.id });
        logStructured({ stripe_event_id: event.id, event_type: event.type, booking_id: booking.id, branch_taken: "pi_canceled_applied" });
      }
      try {
        await markWebhookEventProcessed(event.id, booking?.id ?? null, { event_type: event.type });
      } catch (_) {}
      return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
    }

    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
      let piId: string | null = null;
      if (chargeId) {
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
        } catch (_) {}
      }
      if (piId) {
        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("stripe_payment_intent_id", piId)
          .single();
        if (booking) {
          await supabaseAdmin
            .from("bookings")
            .update({ payment_status: "refunded", status: "canceled" })
            .eq("id", booking.id)
            .in("status", ["confirmed", "payment_pending"]);
          await sendAdminRefundAlert(booking.id, { reason: "dispute", chargeId: chargeId ?? undefined, paymentIntentId: piId });
          logStructured({ stripe_event_id: event.id, event_type: event.type, booking_id: booking.id, branch_taken: "dispute_applied" });
        }
      }
      try {
        await markWebhookEventProcessed(event.id, null, { event_type: event.type });
      } catch (_) {}
      return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
    }

    try {
      await markWebhookEventProcessed(event.id, null, { event_type: event.type });
    } catch (_) {}
    return NextResponse.json({ ok: true, received: event.type }, { status: 200 });
  } catch (err: any) {
    console.error("[webhook] handler error", err);
    return NextResponse.json({ ok: true, handler_error: err?.message }, { status: 200 });
  }
}