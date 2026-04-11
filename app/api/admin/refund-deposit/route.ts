import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestSecurityDepositRefundedEmail } from "@/lib/emails/send-with-log";

export const runtime = "nodejs";

function siteUrl(): string {
  const d = (process.env.NEXT_PUBLIC_SITE_URL || "https://lappartementjourdain.com").replace(/\/+$/, "");
  return d;
}

function centsToEur(cents: number): string {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n) / 100).toFixed(2);
}

function redirectToAdminPage(bookingId: string, token: string, status: "ok" | "error", message: string) {
  const url = new URL(`${siteUrl()}/admin/refund-deposit`);
  url.searchParams.set("booking_id", bookingId);
  url.searchParams.set("token", token);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
  let bookingId = "";
  let token = "";
  try {
    const form = await req.formData();
    bookingId = String(form.get("booking_id") ?? "").trim();
    token = String(form.get("token") ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!bookingId || !token) {
    return NextResponse.json({ error: "Missing booking_id or token" }, { status: 400 });
  }

  const { data: row, error } = await supabaseAdmin
    .from("bookings")
    .select(
      "id,guest_name,email,check_in,check_out,security_deposit_amount_cents,security_deposit_refund_token,security_deposit_refunded,security_deposit_refunded_at,stripe_deposit_refund_id,stripe_balance_payment_intent_id,stripe_security_deposit_payment_intent_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !row) {
    return redirectToAdminPage(bookingId, token, "error", "예약 정보를 찾을 수 없습니다.");
  }

  const storedToken = String((row as any).security_deposit_refund_token ?? "");
  if (storedToken !== token) {
    return redirectToAdminPage(bookingId, token, "error", "유효하지 않은 토큰입니다.");
  }

  const alreadyRefunded =
    Boolean((row as any).security_deposit_refunded) || !!(row as any).stripe_deposit_refund_id;
  if (alreadyRefunded) {
    return redirectToAdminPage(bookingId, token, "ok", "이미 환불 처리되어 있습니다.");
  }

  const depositCents = Number((row as any).security_deposit_amount_cents ?? 0);
  if (!Number.isFinite(depositCents) || depositCents <= 0) {
    return redirectToAdminPage(bookingId, token, "error", "환불 대상 보증금 금액이 0입니다.");
  }

  const piId =
    (row as any).stripe_balance_payment_intent_id ?? (row as any).stripe_security_deposit_payment_intent_id ?? null;
  if (!piId) {
    return redirectToAdminPage(bookingId, token, "error", "Stripe PaymentIntent를 찾을 수 없습니다.");
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(String(piId), { expand: ["latest_charge"] });
    const latestCharge = (pi as any).latest_charge;
    const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
    if (!chargeId) {
      return redirectToAdminPage(bookingId, token, "error", "Stripe Charge를 찾을 수 없습니다.");
    }

    const refund = await stripe.refunds.create(
      {
        charge: chargeId,
        amount: depositCents,
        metadata: {
          booking_id: bookingId,
          kind: "security_deposit_refund_only",
          security_deposit_amount_cents: String(depositCents),
        },
      },
      { idempotencyKey: `security_deposit_refund_only:${bookingId}` },
    );

    const { error: updErr, data: upd } = await supabaseAdmin
      .from("bookings")
      .update({
        security_deposit_refunded: true,
        security_deposit_refunded_at: new Date().toISOString(),
        stripe_deposit_refund_id: refund.id,
      })
      .eq("id", bookingId)
      .eq("security_deposit_refund_token", token)
      .eq("security_deposit_refunded", false)
      .is("stripe_deposit_refund_id", null)
      .select("id")
      .maybeSingle();

    if (updErr) {
      console.error("[refund-deposit] DB update failed after refund created", {
        bookingId,
        refundId: refund.id,
        error: updErr,
      });
      return redirectToAdminPage(
        bookingId,
        token,
        "ok",
        "Stripe 환불은 생성되었으나 DB 업데이트에 실패했습니다. 관리자 콘솔에서 확인하세요.",
      );
    }

    if (!upd) {
      return redirectToAdminPage(bookingId, token, "ok", "이미 처리된 요청입니다.");
    }

    // Send guest notification email (best-effort; does not affect refund outcome)
    try {
      const guestEmail = String((row as any).email ?? "").trim();
      if (guestEmail) {
        const guestName = String((row as any).guest_name ?? "Guest");
        const checkIn = String((row as any).check_in ?? "");
        const checkOut = String((row as any).check_out ?? "");
        const securityDepositAmountEur = centsToEur(depositCents);
        const res = await sendGuestSecurityDepositRefundedEmail(bookingId, {
          to: guestEmail,
          guestName,
          checkIn,
          checkOut,
          securityDepositAmountEur,
        });
        if (res.status === "failed") {
          console.error("[refund-deposit] guest security_deposit_refunded email failed", {
            bookingId,
            error: res.error,
          });
        }
      }
    } catch (e) {
      console.error("[refund-deposit] guest security_deposit_refunded email error", { bookingId, error: e });
    }

    return redirectToAdminPage(bookingId, token, "ok", "보증금 부분 환불이 생성되었습니다.");
  } catch (e) {
    const msg = (e as Error)?.message ?? "Refund failed";
    console.error("[refund-deposit] failed", { bookingId, error: e });
    return redirectToAdminPage(bookingId, token, "error", `환불 실패: ${msg}`);
  }
}

