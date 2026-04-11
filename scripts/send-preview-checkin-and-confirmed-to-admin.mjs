/**
 * Sends preview emails to ADMIN_EMAIL so you can verify template changes:
 * - Check-in reminder email
 * - Booking confirmed email (Email C)
 *
 * Does NOT touch booking/payment/DB.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/send-preview-checkin-and-confirmed-to-admin.mjs
 */

import { ADMIN_EMAIL } from "../lib/emails/mailer";
import { sendEmailCheckin } from "../lib/emails/email-checkin";
import { sendEmailC } from "../lib/emails/email-c";

function must(val, name) {
  if (!val) throw new Error(`Missing ${name}`);
  return val;
}

async function main() {
  const to = must(ADMIN_EMAIL, "ADMIN_EMAIL");

  console.log("[preview] sending to", to);

  await sendEmailCheckin({
    to,
    guestName: "테스트 게스트",
    checkIn: "2026-06-15",
  });

  await sendEmailC({
    to,
    guestName: "테스트 게스트",
    bookingId: "PREVIEW-BOOKING-ID",
    checkIn: "2026-06-15",
    checkOut: "2026-06-17",
    nights: 2,
    longStay: false,
    totalPriceEur: "346.00",
    depositAmountEur: "138.40",
    balanceAmountEur: "207.60",
    stripeSessionId: null,
  });

  console.log("[preview] done");
}

main().catch((e) => {
  console.error("[preview] failed", e);
  process.exitCode = 1;
});

