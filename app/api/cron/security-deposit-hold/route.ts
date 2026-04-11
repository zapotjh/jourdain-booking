import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import {
  getParisDateString,
  startOfParisPlusDaysFromToday,
} from "@/lib/paris-time";
import { getCustomerAndPaymentMethodFromDepositIntent } from "@/lib/stripe-deposit-customer-pm";
import {
  sendAdminSecurityDepositHoldFailedEmail,
  sendAdminSecurityDepositHoldSucceededEmail,
  sendGuestSecurityDepositHoldFailedEmail,
  sendGuestSecurityDepositHoldSucceededEmail,
} from "@/lib/emails/send-with-log";

export const runtime = "nodejs";

function centsToEur(cents: number): string {
  return (Number(cents) / 100).toFixed(2);
}

type HoldSnapshot = {
  email?: string | null;
  guest_name?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  security_deposit_hold_cents?: number | null;
};

async function sendHoldFailedEmails(
  bookingId: string,
  parisDate: string,
  reason: string,
  snapshot: HoldSnapshot,
) {
  const holdEur = centsToEur(Number(snapshot.security_deposit_hold_cents ?? 0));
  const to = String(snapshot.email ?? "").trim();
  if (to) {
    const guestRes = await sendGuestSecurityDepositHoldFailedEmail(bookingId, {
      to,
      guestName: snapshot.guest_name ?? "Guest",
      checkIn: String(snapshot.check_in ?? ""),
      checkOut: String(snapshot.check_out ?? ""),
      holdAmountEur: holdEur,
      failureReason: reason,
      parisDate,
    });
    if (guestRes.status === "failed") {
      console.error("[security-deposit-hold] guest hold failed email", {
        bookingId,
        error: guestRes.error,
      });
    }
  }
  const adminRes = await sendAdminSecurityDepositHoldFailedEmail(bookingId, {
    guestName: snapshot.guest_name ?? "Guest",
    guestEmail: to || "(no email)",
    checkIn: String(snapshot.check_in ?? ""),
    checkOut: String(snapshot.check_out ?? ""),
    holdAmountEur: holdEur,
    failureReason: reason,
    parisDate,
  });
  if (adminRes.status === "failed") {
    console.error("[security-deposit-hold] admin hold failed email", {
      bookingId,
      error: adminRes.error,
    });
  }
}

async function sendHoldSucceededEmails(
  bookingId: string,
  snapshot: HoldSnapshot,
  stripePiId: string,
) {
  const holdEur = centsToEur(Number(snapshot.security_deposit_hold_cents ?? 0));
  const to = String(snapshot.email ?? "").trim();
  if (to) {
    const g = await sendGuestSecurityDepositHoldSucceededEmail(bookingId, {
      to,
      guestName: snapshot.guest_name ?? "Guest",
      checkIn: String(snapshot.check_in ?? ""),
      checkOut: String(snapshot.check_out ?? ""),
      holdAmountEur: holdEur,
      stripePaymentIntentId: stripePiId,
    });
    if (g.status === "failed") {
      console.error("[security-deposit-hold] guest hold succeeded email", {
        bookingId,
        error: g.error,
      });
    }
  }
  const a = await sendAdminSecurityDepositHoldSucceededEmail(bookingId, {
    guestName: snapshot.guest_name ?? "Guest",
    guestEmail: to || "(no email)",
    checkIn: String(snapshot.check_in ?? ""),
    checkOut: String(snapshot.check_out ?? ""),
    holdAmountEur: holdEur,
    stripePaymentIntentId: stripePiId,
  });
  if (a.status === "failed") {
    console.error("[security-deposit-hold] admin hold succeeded email", {
      bookingId,
      error: a.error,
    });
  }
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /** Eligible when Paris check_in is exactly 3 days after today (Paris calendar). */
  const checkInHoldTargetParis = startOfParisPlusDaysFromToday(3);
  const parisToday = getParisDateString();

  const { data: bookings, error: findErr } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,status,payment_status,currency,check_in,check_out,email,guest_name,security_deposit_hold_cents,security_deposit_amount_cents,stripe_payment_intent_id,stripe_security_deposit_payment_intent_id,security_deposit_hold_status,last_security_deposit_hold_attempt_at",
    )
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("check_in", checkInHoldTargetParis)
    .gt("security_deposit_hold_cents", 0)
    // REV 2: new bookings (security_deposit_amount_cents > 0) must never use the legacy hold system.
    .eq("security_deposit_amount_cents", 0)
    .not("stripe_payment_intent_id", "is", null)
    .is("stripe_security_deposit_payment_intent_id", null)
    .or("security_deposit_hold_status.is.null,security_deposit_hold_status.eq.failed")
    .limit(50);

  if (findErr) {
    console.error("[security-deposit-hold] find error", findErr);
    return NextResponse.json({ error: findErr.message }, { status: 500 });
  }

  const target = (bookings ?? []).filter((b: { currency?: string | null }) => {
    if (b.currency && b.currency.toLowerCase() !== "eur") {
      console.warn("[security-deposit-hold] skipping non-eur", {
        id: (b as { id: string }).id,
        currency: b.currency,
      });
      return false;
    }
    return true;
  });

  const placed: string[] = [];
  const failures: { id: string; reason: string }[] = [];

  for (const booking of target) {
    const bookingId = booking.id as string;

    const { data: claimedRows, error: claimErr } = await supabaseAdmin.rpc(
      "claim_security_deposit_hold_attempt",
      { p_booking_id: bookingId },
    );
    if (claimErr) {
      console.error("[security-deposit-hold] claim RPC error", {
        booking_id: bookingId,
        error: claimErr,
      });
      continue;
    }
    if (!claimedRows?.length) {
      console.log("[security-deposit-hold] claim skipped", { booking_id: bookingId });
      continue;
    }

    const claimed = claimedRows[0] as typeof booking & HoldSnapshot;
    const holdCents = Number(claimed.security_deposit_hold_cents ?? 0);

    if (!Number.isFinite(holdCents) || holdCents <= 0) {
      const reason = "invalid security_deposit_hold_cents";
      const { data: failRow } = await supabaseAdmin
        .from("bookings")
        .update({
          security_deposit_hold_status: "failed",
          security_deposit_hold_failure_reason: reason,
        })
        .eq("id", bookingId)
        .eq("status", "confirmed")
        .select("id")
        .maybeSingle();
      if (failRow) {
        failures.push({ id: bookingId, reason });
        await sendHoldFailedEmails(bookingId, parisToday, reason, claimed);
      }
      continue;
    }

    try {
      const { customerId, paymentMethodId } =
        await getCustomerAndPaymentMethodFromDepositIntent(
          stripe,
          claimed.stripe_payment_intent_id,
        );

      if (!customerId) {
        const reason = "missing customer on deposit PaymentIntent";
        const { data: failRow } = await supabaseAdmin
          .from("bookings")
          .update({
            security_deposit_hold_status: "failed",
            security_deposit_hold_failure_reason: reason,
          })
          .eq("id", bookingId)
          .eq("status", "confirmed")
          .select("id")
          .maybeSingle();
        if (failRow) {
          failures.push({ id: bookingId, reason });
          await sendHoldFailedEmails(bookingId, parisToday, reason, claimed);
        }
        continue;
      }

      if (!paymentMethodId) {
        const reason = "no reusable payment_method for customer";
        const { data: failRow } = await supabaseAdmin
          .from("bookings")
          .update({
            security_deposit_hold_status: "failed",
            security_deposit_hold_failure_reason: reason,
          })
          .eq("id", bookingId)
          .eq("status", "confirmed")
          .select("id")
          .maybeSingle();
        if (failRow) {
          failures.push({ id: bookingId, reason });
          await sendHoldFailedEmails(bookingId, parisToday, reason, claimed);
        }
        continue;
      }

      // Stripe replays the first response for the same idempotency key (often 24h+).
      // If the key is booking-only or repeats (e.g. missing claim timestamp), the API can
      // rethrow the same CardError with no new issuer attempt — Dashboard shows nothing new.
      let attemptStamp = String(
        claimed.last_security_deposit_hold_attempt_at ?? "",
      ).replace(/[^a-zA-Z0-9_-]/g, "-");
      if (!attemptStamp) {
        attemptStamp = `u-${randomUUID()}`;
        console.warn(
          "[security-deposit-hold] claim row missing last_security_deposit_hold_attempt_at; random idempotency suffix",
          { bookingId },
        );
      }
      const idempotencyKey =
        `security_deposit_hold:${bookingId}:${parisToday}:${attemptStamp}`.slice(
          0,
          255,
        );
      console.log("[security-deposit-hold] stripe PI idempotencyKey", {
        bookingId,
        idempotencyKey,
      });
      let pi = await stripe.paymentIntents.create(
        {
          amount: holdCents,
          currency: "eur",
          customer: customerId,
          payment_method: paymentMethodId,
          capture_method: "manual",
          confirm: true,
          off_session: true,
          metadata: {
            booking_id: bookingId,
            kind: "security_deposit_hold",
            check_in: String(claimed.check_in ?? ""),
            check_out: String(claimed.check_out ?? ""),
          },
        },
        { idempotencyKey },
      );

      let poll = 0;
      while (pi.status === "processing" && poll < 8) {
        await new Promise((r) => setTimeout(r, 1500));
        pi = await stripe.paymentIntents.retrieve(pi.id);
        poll += 1;
      }

      const okHeld = pi.status === "requires_capture";

      if (!okHeld) {
        const reason = `payment_intent_status=${pi.status}${
          pi.last_payment_error?.message
            ? `, ${pi.last_payment_error.message}`
            : ""
        }`;
        const { data: failRow } = await supabaseAdmin
          .from("bookings")
          .update({
            security_deposit_hold_status: "failed",
            security_deposit_hold_failure_reason: reason,
          })
          .eq("id", bookingId)
          .eq("status", "confirmed")
          .select("id")
          .maybeSingle();
        if (failRow) {
          failures.push({ id: bookingId, reason });
          await sendHoldFailedEmails(bookingId, parisToday, reason, claimed);
        }
        continue;
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error: upErr } = await supabaseAdmin
        .from("bookings")
        .update({
          stripe_security_deposit_payment_intent_id: pi.id,
          security_deposit_hold_status: "held",
          security_deposit_hold_created_at: nowIso,
          security_deposit_hold_failure_reason: null,
        })
        .eq("id", bookingId)
        .eq("status", "confirmed")
        .is("stripe_security_deposit_payment_intent_id", null)
        .select("id")
        .maybeSingle();

      if (upErr) {
        console.error("[security-deposit-hold] db update after PI error", upErr);
        const reason = `db update error: ${upErr.message}`;
        failures.push({
          id: bookingId,
          reason,
        });
        await sendHoldFailedEmails(bookingId, parisToday, reason, claimed);
        continue;
      }

      if (!updated) {
        console.warn("[security-deposit-hold] concurrent update lost race", {
          booking_id: bookingId,
          pi_id: pi.id,
        });
        try {
          await stripe.paymentIntents.cancel(pi.id);
        } catch (e) {
          console.error("[security-deposit-hold] cancel orphan PI error", e);
        }
        continue;
      }

      placed.push(bookingId);
      await sendHoldSucceededEmails(bookingId, claimed, pi.id);
    } catch (err: any) {
      const reason =
        err?.message || "unexpected error in security-deposit-hold cron";
      console.error("[security-deposit-hold] unexpected error", {
        booking_id: bookingId,
        error: err,
      });
      const { data: failRow } = await supabaseAdmin
        .from("bookings")
        .update({
          security_deposit_hold_status: "failed",
          security_deposit_hold_failure_reason: reason,
        })
        .eq("id", bookingId)
        .eq("status", "confirmed")
        .select("id")
        .maybeSingle();
      if (failRow) {
        failures.push({ id: bookingId, reason });
        await sendHoldFailedEmails(bookingId, parisToday, reason, claimed);
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      check_in_three_days_ahead_paris: checkInHoldTargetParis,
      placed,
      failures,
    },
    { status: 200 },
  );
}
