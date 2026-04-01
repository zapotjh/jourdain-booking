import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendGuestBalancePaymentSucceededEmail,
  sendAdminBalancePaymentSucceededEmail,
  sendGuestBalancePaymentFailedEmail,
  sendAdminBalancePaymentFailedEmail,
} from "@/lib/emails/send-with-log";
import { getParisDateString } from "@/lib/paris-time";
import { createBalanceCheckoutUrl } from "@/lib/create-balance-checkout";

export const runtime = "nodejs";

function centsToEur(cents: number): string {
  return (Number(cents) / 100).toFixed(2);
}

async function sendBalanceFailedEmails(
  booking: {
    id: string;
    email?: string | null;
    guest_name?: string | null;
    check_in?: string;
    check_out?: string;
    nights?: number;
    total_price_cents?: number;
    deposit_amount_cents?: number;
    balance_amount_cents?: number;
    balance_payment_attempts?: number;
    security_deposit_amount_cents?: number;
  },
  failureReason: string,
  stripeBalancePaymentIntentId?: string | null,
  balancePaymentLinkUrl?: string | null,
) {
  const attemptCount = (booking.balance_payment_attempts ?? 0) + 1;
  const balanceAmountEur = centsToEur(booking.balance_amount_cents ?? 0);
  const securityDepositAmountEur = centsToEur(booking.security_deposit_amount_cents ?? 0);
  const totalDueEur = centsToEur(
    Number(booking.balance_amount_cents ?? 0) + Number(booking.security_deposit_amount_cents ?? 0),
  );
  const guestFailResult = await sendGuestBalancePaymentFailedEmail(booking.id, {
    to: booking.email ?? "",
    guestName: booking.guest_name ?? "Guest",
    checkIn: booking.check_in ?? "",
    checkOut: booking.check_out ?? "",
    // Display as the total due at balance charge time (balance + refundable deposit).
    balanceAmountEur: booking.security_deposit_amount_cents ? totalDueEur : balanceAmountEur,
    attemptNumber: attemptCount,
    failureReason,
  });
  if (guestFailResult.status === "failed") {
    console.error("[charge-balance] guest balance_payment_failed email failed", { bookingId: booking.id, error: guestFailResult.error });
  }
  const adminFailResult = await sendAdminBalancePaymentFailedEmail(booking.id, {
    guestName: booking.guest_name ?? "Guest",
    guestEmail: booking.email ?? "",
    checkIn: booking.check_in ?? "",
    checkOut: booking.check_out ?? "",
    nights: booking.nights ?? 0,
    totalPriceEur: centsToEur(booking.total_price_cents ?? 0),
    depositAmountEur: centsToEur(booking.deposit_amount_cents ?? 0),
    balanceAmountEur: booking.security_deposit_amount_cents ? totalDueEur : balanceAmountEur,
    attemptCount,
    failureReason,
    stripeBalancePaymentIntentId: stripeBalancePaymentIntentId ?? null,
    balancePaymentLinkUrl: balancePaymentLinkUrl ?? null,
  });
  if (adminFailResult.status === "failed") {
    console.error("[charge-balance] admin balance_payment_failed email failed", { bookingId: booking.id, error: adminFailResult.error });
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayParis = getParisDateString();


  // 1) Find confirmed bookings whose balance is due and not yet paid (retry only if < 3 attempts).
  //    Rate limit: only retry if last_balance_attempt_at is null or before start of today (Paris) — at most 1 attempt per day.
  const { data: bookings, error: findErr } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,status,balance_due_at,balance_amount_cents,security_deposit_amount_cents,balance_paid,payment_status,stripe_payment_intent_id,currency,balance_payment_attempts,last_balance_attempt_at,email,guest_name,check_in,check_out,nights,total_price_cents,deposit_amount_cents,balance_amount_cents",
    )
    .eq("status", "confirmed")
    .eq("balance_paid", false)
    .gt("balance_amount_cents", 0)
    .eq("payment_status", "paid")
    .not("stripe_payment_intent_id", "is", null)
    .lte("balance_due_at", todayParis)
    .or("balance_payment_attempts.is.null,balance_payment_attempts.lt.3")
    .limit(50);

  if (findErr) {
    console.error("[charge-balance] find error", findErr);
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  const target = (bookings ?? []).filter((b: any) => {
    if (b.currency && b.currency !== "eur") {
      console.warn("[charge-balance] skipping booking with non-eur currency", { id: b.id, currency: b.currency });
      return false;
    }
    return true;
  });

  if (target.length === 0) {
    return NextResponse.json(
      { ok: true, charged: [], failures: [] },
      { status: 200 },
    );
  }

  const charged: string[] = [];
  const failures: { id: string; reason: string }[] = [];

  for (const booking of target) {
    const bookingId: string = booking.id;

    // DB-backed claim: at most one attempt per Paris day; concurrent crons cannot double-claim.
    const { data: claimedRows, error: claimErr } = await supabaseAdmin.rpc("claim_balance_attempt", {
      p_booking_id: bookingId,
    });
    if (claimErr) {
      console.error("[charge-balance] claim_balance_attempt RPC error", { booking_id: bookingId, error: claimErr });
      continue;
    }
    if (!claimedRows?.length) {
      console.log("[charge-balance] structured", {
        claim_succeeded: false,
        booking_id: bookingId,
        attempt_number: null,
        idempotency_key: null,
        payment_intent_id: null,
        final_db_update_state: "skipped",
      });
      continue;
    }
    const claimed = claimedRows[0] as typeof booking;

    try {
      console.log("[charge-balance] processing booking (claimed)", {
        id: bookingId,
        balance_amount_cents: claimed.balance_amount_cents,
        security_deposit_amount_cents: (claimed as any).security_deposit_amount_cents,
        balance_paid: claimed.balance_paid,
        payment_status: claimed.payment_status,
        stripe_payment_intent_id: claimed.stripe_payment_intent_id,
        branch: "claimed",
      });

      // Safety: skip if balance is non-positive
      const balanceCents = Number(claimed.balance_amount_cents ?? 0);
      if (!Number.isFinite(balanceCents) || balanceCents <= 0) {
        console.warn("[charge-balance] skip: invalid balance_amount_cents", {
          id: bookingId,
          balance_amount_cents: claimed.balance_amount_cents,
        });
        continue;
      }

      const securityDepositCentsRaw = Number((claimed as any).security_deposit_amount_cents ?? 0);
      const hasNewModelSecurityDeposit =
        Number.isFinite(securityDepositCentsRaw) && securityDepositCentsRaw > 0;
      const securityDepositCents = hasNewModelSecurityDeposit ? securityDepositCentsRaw : 0;
      const totalChargeCents = balanceCents + securityDepositCents;

      // 1) Load the original deposit PaymentIntent
      const depositPI = await stripe.paymentIntents.retrieve(
        claimed.stripe_payment_intent_id,
      );

      // Extract customer id
      let customerId: string | null = null;
      if (typeof depositPI.customer === "string") {
        customerId = depositPI.customer;
      } else if (depositPI.customer && typeof depositPI.customer === "object") {
        customerId = (depositPI.customer as { id?: string }).id ?? null;
      }

      // Extract payment method id from the original PaymentIntent if present
      let paymentMethodId: string | null = null;
      const pm = depositPI.payment_method as any;
      if (typeof pm === "string") {
        paymentMethodId = pm;
      } else if (pm && typeof pm === "object") {
        paymentMethodId = pm.id ?? null;
      }

      // If we don't have a customer at all, we cannot safely charge again
      if (!customerId) {
        console.warn(
          "[charge-balance] missing customer on deposit PaymentIntent",
          {
            id: bookingId,
            stripe_payment_intent_id: claimed.stripe_payment_intent_id,
          },
        );

        // Only update and email if another process hasn't already set balance_paid=true
        const nowIso = new Date().toISOString();
        const { data: updatedFailRow, error: upErr } = await supabaseAdmin
          .from("bookings")
          .update({
            balance_payment_attempts:
              (claimed.balance_payment_attempts ?? 0) + 1,
            balance_payment_failed_at: nowIso,
            balance_payment_failure_reason:
              "missing customer on deposit PaymentIntent",
            last_balance_attempt_at: nowIso,
          })
          .eq("id", bookingId)
          .eq("status", "confirmed")
          .eq("balance_paid", false)
          .select("id")
          .maybeSingle();

        if (upErr) {
          console.error("[charge-balance] update failure metadata error", upErr);
        }

        if (updatedFailRow) {
          const attemptCountMissing = (claimed.balance_payment_attempts ?? 0) + 1;
          let balanceLinkMissing: string | null = null;
          if (attemptCountMissing === 3 && claimed.email && balanceCents > 0) {
            balanceLinkMissing = await createBalanceCheckoutUrl({
              bookingId,
              balanceAmountCents: totalChargeCents,
              customerEmail: claimed.email,
            });
          }
          await sendBalanceFailedEmails(
            { ...claimed, security_deposit_amount_cents: securityDepositCents },
            "missing customer on deposit PaymentIntent",
            null,
            balanceLinkMissing,
          );
        } else {
          console.log("[charge-balance] skipping failure email: balance_paid already true or row gone", { bookingId });
        }

        failures.push({
          id: bookingId,
          reason: "missing customer on deposit PaymentIntent",
        });
        continue;
      }

      // If payment_method is not present on the deposit PI, try to find one
      // attached to the Customer (e.g. the card saved during Checkout).
      if (!paymentMethodId) {
        try {
          const pmList = await stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
            limit: 1,
          });

          if (pmList.data.length > 0) {
            paymentMethodId = pmList.data[0].id;
          }
        } catch (pmErr) {
          console.error(
            "[charge-balance] error listing payment methods for customer",
            {
              id: bookingId,
              customerId,
              error: pmErr,
            },
          );
        }
      }

      if (!paymentMethodId) {
        console.warn(
          "[charge-balance] no reusable payment_method for customer",
          {
            id: bookingId,
            customerId,
          },
        );

        const nowIso2 = new Date().toISOString();
        const { data: updatedFailRow, error: upErr } = await supabaseAdmin
          .from("bookings")
          .update({
            balance_payment_attempts:
              (claimed.balance_payment_attempts ?? 0) + 1,
            balance_payment_failed_at: nowIso2,
            balance_payment_failure_reason:
              "no reusable payment_method for customer",
            last_balance_attempt_at: nowIso2,
          })
          .eq("id", bookingId)
          .eq("status", "confirmed")
          .eq("balance_paid", false)
          .select("id")
          .maybeSingle();

        if (upErr) {
          console.error("[charge-balance] update failure metadata error", upErr);
        }

        if (updatedFailRow) {
          const attemptCountNoPm = (claimed.balance_payment_attempts ?? 0) + 1;
          let balanceLinkNoPm: string | null = null;
          if (attemptCountNoPm === 3 && claimed.email && balanceCents > 0) {
            balanceLinkNoPm = await createBalanceCheckoutUrl({
              bookingId,
              balanceAmountCents: totalChargeCents,
              customerEmail: claimed.email,
            });
          }
          await sendBalanceFailedEmails(
            { ...claimed, security_deposit_amount_cents: securityDepositCents },
            "no reusable payment_method for customer",
            null,
            balanceLinkNoPm,
          );
        } else {
          console.log("[charge-balance] skipping failure email: balance_paid already true or row gone", { bookingId });
        }

        failures.push({
          id: bookingId,
          reason: "no reusable payment_method for customer",
        });
        continue;
      }

      // 2) Create off-session PaymentIntent for the remaining balance.
      //    Idempotency key prevents double charge on cron retry / duplicate request.
      //    Format: balance:{booking_id}:attempt:{attempt_number}
      const attemptNum = (claimed.balance_payment_attempts ?? 0) + 1;
      const idempotencyKey = `balance:${bookingId}:attempt:${attemptNum}`;
      console.log("[charge-balance] structured", {
        claim_succeeded: true,
        booking_id: bookingId,
        attempt_number: attemptNum,
        idempotency_key: idempotencyKey,
        payment_intent_id: null,
        final_db_update_state: "pending",
      });

      const balancePI = await stripe.paymentIntents.create(
        {
          amount: totalChargeCents,
          currency: "eur",
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          metadata: {
            booking_id: bookingId,
            ...(hasNewModelSecurityDeposit
              ? {
                  kind: "balance_with_security_deposit",
                  accommodation_balance_cents: String(balanceCents),
                  security_deposit_amount_cents: String(securityDepositCents),
                }
              : { kind: "balance_60" }),
          },
        },
        { idempotencyKey },
      );

      console.log("[charge-balance] structured", {
        claim_succeeded: true,
        booking_id: bookingId,
        attempt_number: attemptNum,
        idempotency_key: idempotencyKey,
        payment_intent_id: balancePI.id,
        final_db_update_state: balancePI.status === "succeeded" ? "pending_success_update" : "pending_failure_update",
      });

      if (balancePI.status === "succeeded") {
        const successNow = new Date().toISOString();
        const { data: updatedRow, error: upOkErr } = await supabaseAdmin
          .from("bookings")
          .update({
            balance_paid: true,
            balance_paid_at: successNow,
            stripe_balance_payment_intent_id: balancePI.id,
            balance_payment_attempts: 0,
            balance_payment_failed_at: null,
            balance_payment_failure_reason: null,
            last_balance_attempt_at: successNow,
          })
          .eq("id", bookingId)
          .eq("status", "confirmed")
          .eq("balance_paid", false)
          .select("id")
          .maybeSingle();

        if (upOkErr) {
          console.error(
            "[charge-balance] update booking as balance_paid error",
            upOkErr,
          );
          failures.push({
            id: bookingId,
            reason: `db update error after success: ${upOkErr.message}`,
          });
          continue;
        }

        // Only send success emails when we actually flipped balance_paid false → true
        if (updatedRow && claimed.email) {
          const totalPriceEur = centsToEur(claimed.total_price_cents ?? 0);
          const depositAmountEur = centsToEur(claimed.deposit_amount_cents ?? 0);
          const balanceAmountEur = centsToEur(
            hasNewModelSecurityDeposit ? totalChargeCents : (claimed.balance_amount_cents ?? 0),
          );
          const guestSuccessResult = await sendGuestBalancePaymentSucceededEmail(bookingId, {
            to: claimed.email,
            guestName: claimed.guest_name ?? "Guest",
            checkIn: claimed.check_in ?? "",
            checkOut: claimed.check_out ?? "",
            nights: claimed.nights ?? 0,
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
          });
          if (guestSuccessResult.status === "failed") {
            console.error("[charge-balance] guest balance_payment_succeeded email failed", { bookingId, error: guestSuccessResult.error });
          }
          const adminSuccessResult = await sendAdminBalancePaymentSucceededEmail(bookingId, {
            guestName: claimed.guest_name ?? "Guest",
            guestEmail: claimed.email,
            checkIn: claimed.check_in ?? "",
            checkOut: claimed.check_out ?? "",
            nights: claimed.nights ?? 0,
            totalPriceEur,
            depositAmountEur,
            balanceAmountEur,
          });
          if (adminSuccessResult.status === "failed") {
            console.error("[charge-balance] admin balance_payment_succeeded email failed", { bookingId, error: adminSuccessResult.error });
          }
        }

        console.log("[charge-balance] structured", {
          claim_succeeded: true,
          booking_id: bookingId,
          attempt_number: attemptNum,
          idempotency_key: idempotencyKey,
          payment_intent_id: balancePI.id,
          final_db_update_state: "balance_paid",
        });
        charged.push(bookingId);
        continue;
      }

      // Non-succeeded status: treat as failure / requires action
      const status = balancePI.status;
      const lastError = balancePI.last_payment_error;

      let reason = `payment_intent_status=${status}`;
      if (lastError?.message) {
        reason += `, error=${lastError.message}`;
      }

      const failNow = new Date().toISOString();
      const { data: updatedFailRow, error: upFailErr } = await supabaseAdmin
        .from("bookings")
        .update({
          balance_payment_attempts: (claimed.balance_payment_attempts ?? 0) + 1,
          balance_payment_failed_at: failNow,
          balance_payment_failure_reason: reason,
          last_balance_attempt_at: failNow,
        })
        .eq("id", bookingId)
        .eq("status", "confirmed")
        .eq("balance_paid", false)
        .select("id")
        .maybeSingle();

      if (upFailErr) {
        console.error(
          "[charge-balance] update failure metadata error (non-succeeded)",
          upFailErr,
        );
      }

      if (updatedFailRow) {
        const attemptCountPi = (claimed.balance_payment_attempts ?? 0) + 1;
        let balanceLinkPi: string | null = null;
        if (attemptCountPi === 3 && claimed.email && balanceCents > 0) {
          balanceLinkPi = await createBalanceCheckoutUrl({
            bookingId,
            balanceAmountCents: totalChargeCents,
            customerEmail: claimed.email,
          });
        }
        await sendBalanceFailedEmails(
          { ...claimed, security_deposit_amount_cents: securityDepositCents },
          reason,
          balancePI.id,
          balanceLinkPi,
        );
      } else {
        console.log("[charge-balance] skipping failure email: balance_paid already true or row gone", { bookingId });
      }

      failures.push({ id: bookingId, reason });
    } catch (err: any) {
      console.error("[charge-balance] unexpected error for booking", {
        id: bookingId,
        error: err,
      });

      const securityDepositCentsRawEx = Number((claimed as any).security_deposit_amount_cents ?? 0);
      const hasNewModelSecurityDepositEx =
        Number.isFinite(securityDepositCentsRawEx) && securityDepositCentsRawEx > 0;
      const securityDepositCentsEx = hasNewModelSecurityDepositEx ? securityDepositCentsRawEx : 0;

      const exceptNow = new Date().toISOString();
      const { data: updatedFailRow, error: upErr } = await supabaseAdmin
        .from("bookings")
        .update({
          balance_payment_attempts: (claimed.balance_payment_attempts ?? 0) + 1,
          balance_payment_failed_at: exceptNow,
          balance_payment_failure_reason:
            err?.message || "unexpected error in charge-balance cron",
          last_balance_attempt_at: exceptNow,
        })
        .eq("id", bookingId)
        .eq("status", "confirmed")
        .eq("balance_paid", false)
        .select("id")
        .maybeSingle();

      if (upErr) {
        console.error(
          "[charge-balance] update failure metadata error (exception)",
          upErr,
        );
      }

      if (updatedFailRow) {
        const attemptCountEx = (claimed.balance_payment_attempts ?? 0) + 1;
        const balanceCentsEx = Number(claimed.balance_amount_cents ?? 0);
        const totalChargeCentsEx = balanceCentsEx + securityDepositCentsEx;
        let balanceLinkEx: string | null = null;
        if (attemptCountEx === 3 && claimed.email && balanceCentsEx > 0) {
          balanceLinkEx = await createBalanceCheckoutUrl({
            bookingId,
            balanceAmountCents: totalChargeCentsEx,
            customerEmail: claimed.email,
          });
        }
        await sendBalanceFailedEmails(
          { ...claimed, security_deposit_amount_cents: securityDepositCentsEx },
          err?.message || "unexpected error in charge-balance cron",
          null,
          balanceLinkEx,
        );
      } else {
        console.log("[charge-balance] skipping failure email: balance_paid already true or row gone", { bookingId });
      }

      failures.push({
        id: bookingId,
        reason: err?.message || "unexpected error in charge-balance cron",
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      charged,
      failures,
    },
    { status: 200 },
  );
}

