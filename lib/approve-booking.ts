/**
 * Shared approval logic: validate pending_approval, create Stripe Checkout session,
 * update booking to payment_pending, send email B (payment link).
 * Used by POST /api/host/approve and GET /api/host/approve (email link). Any future approval route (e.g. POST /api/bookings/approve) must call this function only — no duplicate approval logic.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import Stripe from "stripe";
import { sendGuestApprovedPaymentLinkEmail } from "@/lib/emails/send-with-log";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export type ApproveBookingResult =
  | { ok: true; checkoutUrl: string; bookingId: string }
  | { ok: false; error: string; status: number };

export async function approveBooking(
  approvalToken: string
): Promise<ApproveBookingResult> {
  const token = String(approvalToken || "").trim();

  if (!token) {
    return { ok: false, error: "Missing approval_token", status: 400 };
  }

  const { data: booking, error: findErr } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,status,check_in,check_out,nights,email,guest_name,long_stay,total_price_cents,deposit_amount_cents,balance_amount_cents,stripe_session_id,payment_pending_expires_at"
    )
    .eq("approval_token", token)
    .single();

  if (findErr || !booking) {
    console.error("[approve-booking] lookup failed", {
      approval_token: token,
      error: findErr,
    });
    return { ok: false, error: "Booking not found", status: 404 };
  }

  const depositCents = Number(booking.deposit_amount_cents ?? 0);
  if (!Number.isFinite(depositCents) || depositCents <= 0) {
    return {
      ok: false,
      error: "Missing or invalid deposit_amount_cents on booking",
      status: 400,
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://lappartementjourdain.com";

  // Idempotency: reuse existing session when status is still payment_pending
  if (booking.stripe_session_id && booking.status === "payment_pending") {
    let resolvedExpiresAt = booking.payment_pending_expires_at;

    if (!booking.payment_pending_expires_at) {
      const expiresIso = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      const { error: expErr } = await supabaseAdmin
        .from("bookings")
        .update({ payment_pending_expires_at: expiresIso })
        .eq("id", booking.id)
        .eq("status", "payment_pending")
        .is("payment_pending_expires_at", null);

      if (expErr) {
        console.error(
          "[approve-booking] backfill payment_pending_expires_at failed",
          {
            booking_id: booking.id,
            error: expErr,
          }
        );
        return {
          ok: false,
          error: "Failed to backfill payment_pending_expires_at",
          status: 500,
        };
      }

      resolvedExpiresAt = expiresIso;
    }

    const session = await stripe.checkout.sessions.retrieve(
      booking.stripe_session_id
    );

    if (!session.url) {
      console.error("[approve-booking] existing session has no URL", {
        booking_id: booking.id,
        session_id: session.id,
      });
      return {
        ok: false,
        error: "Existing Stripe session has no URL",
        status: 500,
      };
    }

    const emailResult = await sendGuestApprovedPaymentLinkEmail(booking.id, {
      to: booking.email ?? "",
      guestName: booking.guest_name ?? "Guest",
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      nights: booking.nights,
      longStay: Boolean(booking.long_stay),
      totalPriceEur: ((booking.total_price_cents ?? 0) / 100).toFixed(2),
      depositAmountEur: ((booking.deposit_amount_cents ?? 0) / 100).toFixed(2),
      balanceAmountEur: ((booking.balance_amount_cents ?? 0) / 100).toFixed(2),
      checkoutUrl: session.url,
      expiresAt:
        resolvedExpiresAt ??
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (emailResult.status === "failed") {
      console.error("[approve-booking] Email B failed (reuse)", {
        booking_id: booking.id,
        error: emailResult.error,
      });
    }

    return { ok: true, checkoutUrl: session.url, bookingId: booking.id };
  }

  if (booking.status !== "pending_approval") {
    console.log("[approve-booking] not pending_approval", {
      id: booking.id,
      status: booking.status,
    });
    return {
      ok: false,
      error: "Booking is not in pending_approval status",
      status: 409,
    };
  }

  const { data: overlapping, error: overlapErr } = await supabaseAdmin
    .from("bookings")
    .select("id,status,check_in,check_out")
    .lt("check_in", booking.check_out)
    .gt("check_out", booking.check_in)
    .in("status", ["payment_pending", "confirmed"])
    .neq("id", booking.id)
    .limit(1);

  if (overlapErr) {
    console.error("[approve-booking] overlap check failed", {
      booking_id: booking.id,
      error: overlapErr,
    });
    return { ok: false, error: overlapErr.message, status: 500 };
  }

  if (overlapping && overlapping.length > 0) {
    console.warn("[approve-booking] date overlap conflict", {
      booking_id: booking.id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      conflicting_id: overlapping[0].id,
    });
    return {
      ok: false,
      error:
        "Another booking already exists for these dates (overlap). Cannot approve.",
      status: 409,
    };
  }

  const successUrl =
    `${siteUrl}/success` +
    `?booking_id=${encodeURIComponent(booking.id)}` +
    `&guest_name=${encodeURIComponent(booking.guest_name ?? "")}` +
    `&check_in=${encodeURIComponent(booking.check_in ?? "")}` +
    `&check_out=${encodeURIComponent(booking.check_out ?? "")}` +
    `&nights=${encodeURIComponent(String(booking.nights ?? ""))}` +
    `&session_id={CHECKOUT_SESSION_ID}`;

  const cancelUrl =
    `${siteUrl}/cancel` +
    `?booking_id=${encodeURIComponent(booking.id)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: booking.email || undefined,
    customer_creation: "always",
    payment_intent_data: {
      setup_future_usage: "off_session",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: depositCents,
          product_data: {
            name: "Jourdain Apartment - Booking Deposit (40%)",
            description: `Check-in ${booking.check_in} / Check-out ${booking.check_out} (${booking.nights} nights)`,
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      booking_id: booking.id,
      guest_name: booking.guest_name ?? "",
      check_in: booking.check_in ?? "",
      check_out: booking.check_out ?? "",
      nights: String(booking.nights ?? ""),
      kind: "deposit_40",
    },
  });

  if (!session.url) {
    console.error("[approve-booking] created session has no URL", {
      booking_id: booking.id,
      session_id: session.id,
    });
    return { ok: false, error: "Stripe session URL is null", status: 500 };
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: updatedRow, error: upErr } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "payment_pending",
      stripe_session_id: session.id,
      amount_total: session.amount_total ?? depositCents,
      currency: session.currency ?? "eur",
      payment_status: session.payment_status ?? "unpaid",
      payment_pending_expires_at: expiresAt,
    })
    .eq("id", booking.id)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (upErr) {
    console.error("[approve-booking] update error", {
      booking_id: booking.id,
      session_id: session.id,
      error: upErr,
    });

    try {
      await stripe.checkout.sessions.expire(session.id);
      console.log("[approve-booking] orphan session expired after DB error", {
        session_id: session.id,
      });
    } catch (expErr) {
      console.error("[approve-booking] failed to expire orphan session", {
        session_id: session.id,
        error: expErr,
      });
    }

    return { ok: false, error: upErr.message, status: 500 };
  }

  if (!updatedRow) {
    console.warn(
      "[approve-booking] no longer pending_approval — expiring orphan session",
      {
        booking_id: booking.id,
        session_id: session.id,
        branch: "orphan_session",
      }
    );

    try {
      await stripe.checkout.sessions.expire(session.id);
      console.log("[approve-booking] orphan session expired", {
        session_id: session.id,
      });
    } catch (expErr) {
      console.error("[approve-booking] failed to expire orphan session", {
        session_id: session.id,
        error: expErr,
      });
    }

    return {
      ok: false,
      error: "Booking is not in pending_approval status (may have been canceled)",
      status: 409,
    };
  }

  const emailResult = await sendGuestApprovedPaymentLinkEmail(booking.id, {
    to: booking.email ?? "",
    guestName: booking.guest_name ?? "Guest",
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    nights: booking.nights,
    longStay: Boolean(booking.long_stay),
    totalPriceEur: ((booking.total_price_cents ?? 0) / 100).toFixed(2),
    depositAmountEur: ((booking.deposit_amount_cents ?? 0) / 100).toFixed(2),
    balanceAmountEur: ((booking.balance_amount_cents ?? 0) / 100).toFixed(2),
    checkoutUrl: session.url,
    expiresAt,
  });

  if (emailResult.status === "failed") {
    console.error("[approve-booking] Email B failed (new session)", {
      booking_id: booking.id,
      error: emailResult.error,
    });
  }

  return { ok: true, checkoutUrl: session.url, bookingId: booking.id };
}
