/**
 * Sends every transactional email once using synthetic booking IDs (email_log will record each).
 * POST with x-cron-secret. Query: to=recipient (default apt.jourdain.paris@gmail.com).
 * Sets TEST_ADMIN_EMAIL_OVERRIDE so guest + admin templates reach the same inbox without changing .env.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import * as Send from "@/lib/emails/send-with-log";

export const runtime = "nodejs";

const DEFAULT_TO = "apt.jourdain.paris@gmail.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const to = String(url.searchParams.get("to") ?? "").trim() || DEFAULT_TO;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lappartementjourdain.com").replace(
    /\/+$/,
    "",
  );

  const prevOverride = process.env.TEST_ADMIN_EMAIL_OVERRIDE;
  process.env.TEST_ADMIN_EMAIL_OVERRIDE = to;

  const results: { name: string; status: string; error?: string }[] = [];

  const run = async (name: string, fn: () => Promise<Send.EmailResult>) => {
    try {
      const r = await fn();
      results.push({
        name,
        status: r.status,
        error: r.status === "failed" ? (r as { error?: string }).error : undefined,
      });
    } catch (e) {
      results.push({
        name,
        status: "error",
        error: (e as Error)?.message ?? String(e),
      });
    }
    await sleep(200);
  };

  try {
    const guestEmail = to;
    const gn = "테스트 일괄 송신 | TEST ALL EMAILS";
    const ci = "2026-06-15";
    const co = "2026-06-17";
    const nights = 2;
    const total = "346.00";
    const dep = "138.40";
    const bal = "207.60";
    const secDep = "500.00";
    const parisDay = "2026-06-14";

    await run("guest_booking_pending", () =>
      Send.sendGuestBookingPendingEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        nights,
        totalPriceEur: total,
      }),
    );

    await run("admin_booking_approval_request", () =>
      Send.sendAdminBookingApprovalRequestEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        guestPhone: "+33 6 00 00 00 00",
        checkIn: ci,
        checkOut: co,
        nights,
        totalPriceEur: total,
        depositAmountEur: dep,
        approvalToken: "test-approval-token",
        siteUrl,
      }),
    );

    await run("guest_booking_rejected", () =>
      Send.sendGuestBookingRejectedEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        nights,
        hostMessage: "테스트용 거절 사유입니다.",
      }),
    );

    await run("guest_approved_payment_link", () =>
      Send.sendGuestApprovedPaymentLinkEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        nights,
        longStay: false,
        totalPriceEur: total,
        depositAmountEur: dep,
        balanceAmountEur: bal,
        checkoutUrl: `${siteUrl}/checkout/test`,
        expiresAt: "2026-06-01 23:59 (Paris)",
      }),
    );

    await run("guest_deposit_succeeded", () =>
      Send.sendGuestDepositPaymentSucceededEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        nights,
        longStay: false,
        totalPriceEur: total,
        depositAmountEur: dep,
        balanceAmountEur: bal,
        stripeSessionId: "cs_test_session",
      }),
    );

    await run("admin_deposit_succeeded", () =>
      Send.sendAdminDepositPaymentSucceededEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
        nights,
        longStay: false,
        totalPriceEur: total,
        depositAmountEur: dep,
        balanceAmountEur: bal,
        stripeSessionId: "cs_test_session",
        stripePaymentIntentId: "pi_test_deposit",
        confirmedAt: "2026-05-01 12:00",
      }),
    );

    await run("guest_deposit_failed", () =>
      Send.sendGuestDepositPaymentFailedEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
      }),
    );

    await run("admin_deposit_failed", () =>
      Send.sendAdminDepositPaymentFailedEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
      }),
    );

    await run("guest_balance_succeeded", () =>
      Send.sendGuestBalancePaymentSucceededEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        nights,
        totalPriceEur: total,
        depositAmountEur: dep,
        accommodationBalanceAmountEur: bal,
        securityDepositAmountEur: secDep,
        totalChargedAmountEur: "707.60",
      }),
    );

    await run("admin_balance_succeeded", () =>
      Send.sendAdminBalancePaymentSucceededEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
        nights,
        totalPriceEur: total,
        depositAmountEur: dep,
        accommodationBalanceAmountEur: bal,
        securityDepositAmountEur: secDep,
        totalChargedAmountEur: "707.60",
      }),
    );

    await run("guest_security_deposit_refunded", () =>
      Send.sendGuestSecurityDepositRefundedEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        securityDepositAmountEur: secDep,
      }),
    );

    await run("guest_balance_failed", () =>
      Send.sendGuestBalancePaymentFailedEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        balanceAmountEur: bal,
        attemptNumber: 1,
        failureReason: "card_declined (test)",
      }),
    );

    await run("admin_balance_failed", () =>
      Send.sendAdminBalancePaymentFailedEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
        nights,
        totalPriceEur: total,
        depositAmountEur: dep,
        balanceAmountEur: bal,
        attemptCount: 1,
        failureReason: "card_declined (test)",
        stripeBalancePaymentIntentId: "pi_test_balance",
        balancePaymentLinkUrl: null,
      }),
    );

    await run("guest_checkin_reminder_1d", () =>
      Send.sendGuestCheckinReminder1dEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
      }),
    );

    await run("admin_checkin_reminder_1d", () =>
      Send.sendAdminCheckinReminder1dEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
      }),
    );

    await run("guest_checkout_reminder_1d", () =>
      Send.sendGuestCheckoutReminder1dEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkOut: co,
      }),
    );

    await run("admin_checkout_reminder_1d", () =>
      Send.sendAdminCheckoutReminder1dEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
      }),
    );

    await run("admin_security_deposit_refund_request", () =>
      Send.sendAdminSecurityDepositRefundRequestEmail(randomUUID(), {
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        securityDepositAmountCents: 500_00,
        refundLinkUrl: `${siteUrl}/admin/refund-deposit?token=test`,
      }),
    );

    await run("admin_security_deposit_refund_reminder", () =>
      Send.sendAdminSecurityDepositRefundReminderEmail(randomUUID(), {
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        securityDepositAmountCents: 500_00,
        refundLinkUrl: `${siteUrl}/admin/refund-deposit?token=test`,
      }),
    );

    await run("admin_webhook_reconciliation", () =>
      Send.sendAdminWebhookReconciliationAlert(randomUUID(), {
        sessionId: "cs_test_reconcile",
        paymentIntentId: "pi_test_reconcile",
      }),
    );

    await run("admin_refund_alert", () =>
      Send.sendAdminRefundAlert(randomUUID(), {
        reason: "refunded",
        chargeId: "ch_test",
        paymentIntentId: "pi_test",
      }),
    );

    await run("guest_security_deposit_hold_failed", () =>
      Send.sendGuestSecurityDepositHoldFailedEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        holdAmountEur: secDep,
        failureReason: "insufficient_funds (test)",
        parisDate: parisDay,
      }),
    );

    await run("admin_security_deposit_hold_failed", () =>
      Send.sendAdminSecurityDepositHoldFailedEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
        holdAmountEur: secDep,
        failureReason: "insufficient_funds (test)",
        parisDate: parisDay,
      }),
    );

    await run("guest_security_deposit_hold_succeeded", () =>
      Send.sendGuestSecurityDepositHoldSucceededEmail(randomUUID(), {
        to: guestEmail,
        guestName: gn,
        checkIn: ci,
        checkOut: co,
        holdAmountEur: secDep,
        stripePaymentIntentId: "pi_test_hold_ok",
      }),
    );

    await run("admin_security_deposit_hold_succeeded", () =>
      Send.sendAdminSecurityDepositHoldSucceededEmail(randomUUID(), {
        guestName: gn,
        guestEmail: guestEmail,
        checkIn: ci,
        checkOut: co,
        holdAmountEur: secDep,
        stripePaymentIntentId: "pi_test_hold_ok",
      }),
    );

    const failed = results.filter((r) => r.status !== "sent");
    return NextResponse.json({
      ok: failed.length === 0,
      to,
      count: results.length,
      results,
    });
  } finally {
    if (prevOverride === undefined) {
      delete process.env.TEST_ADMIN_EMAIL_OVERRIDE;
    } else {
      process.env.TEST_ADMIN_EMAIL_OVERRIDE = prevOverride;
    }
  }
}

