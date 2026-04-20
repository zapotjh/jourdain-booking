/**
 * Sends only the 3 guest-facing automated guidance emails for final review:
 * - Check-in email (email-checkin.ts)
 * - Booking confirmed email (Email C)
 * - Check-out reminder 1d (guest)
 *
 * POST with x-cron-secret. Query: to=recipient (default ADMIN_EMAIL).
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ADMIN_EMAIL } from "@/lib/emails/mailer";
import { sendEmailCheckin } from "@/lib/emails/email-checkin";
import { sendEmailC } from "@/lib/emails/email-c";
import { sendGuestCheckoutReminder1dEmail, type EmailResult } from "@/lib/emails/send-with-log";

export const runtime = "nodejs";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const to = String(url.searchParams.get("to") ?? "").trim() || (ADMIN_EMAIL || "");
  if (!to) {
    return NextResponse.json({ error: "Missing recipient (set ?to=... or ADMIN_EMAIL)" }, { status: 400 });
  }

  const results: { name: string; status: string; error?: string }[] = [];
  const run = async (name: string, fn: () => Promise<EmailResult | void>) => {
    try {
      const r = await fn();
      // sendEmailCheckin returns Resend data; normalize to sent on success
      if (!r) {
        results.push({ name, status: "sent" });
      } else {
        results.push({ name, status: (r as EmailResult).status });
      }
    } catch (e) {
      results.push({ name, status: "error", error: (e as Error)?.message ?? String(e) });
    }
    await sleep(200);
  };

  const gn = "관리자 검수용 | ADMIN PREVIEW";
  const ci = "2026-06-15";
  const co = "2026-06-17";
  const nights = 2;

  await run("guest_checkin", async () => {
    await sendEmailCheckin({ to, guestName: gn, checkIn: ci });
  });

  await run("guest_booking_confirmed_email_c", async () => {
    await sendEmailC({
      to,
      guestName: gn,
      bookingId: `PREVIEW-${randomUUID()}`,
      checkIn: ci,
      checkOut: co,
      nights,
      longStay: false,
      totalPriceEur: "346.00",
      depositAmountEur: "138.40",
      balanceAmountEur: "207.60",
      stripeSessionId: null,
    });
  });

  await run("guest_checkout_reminder_1d", () =>
    sendGuestCheckoutReminder1dEmail(`PREVIEW-${randomUUID()}`, {
      to,
      guestName: gn,
      checkOut: co,
    }),
  );

  return NextResponse.json({ ok: true, to, results }, { status: 200 });
}

