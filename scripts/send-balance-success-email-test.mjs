/**
 * Sends the real production "balance payment completed" guest email by calling
 * the deployed dev-only endpoint that uses the production template:
 *   POST /api/test/resend-balance-success?booking_id=...&to=...
 *
 * This does NOT mutate payment/booking state; it only reads booking fields to render the email.
 *
 * Usage:
 *   CRON_SECRET=... node scripts/send-balance-success-email-test.mjs
 *   CRON_SECRET=... BOOKING_ID=... TO=... BASE_URL=https://www.lappartementjourdain.com node scripts/send-balance-success-email-test.mjs
 */

const BASE_URL = (process.env.BASE_URL || "https://www.lappartementjourdain.com").replace(/\/+$/, "");
const bookingId = process.env.BOOKING_ID || "31998310-893c-4283-91bd-b9ec07ba97d2";
const to = process.env.TO || "apt.jourdain.paris@gmail.com";
const cronSecret = process.env.CRON_SECRET;

async function main() {
  if (!cronSecret) {
    throw new Error("Missing CRON_SECRET env var");
  }

  const url = new URL(`${BASE_URL}/api/test/resend-balance-success`);
  url.searchParams.set("booking_id", bookingId);
  url.searchParams.set("to", to);

  console.log("[test-send] POST", url.toString());

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-cron-secret": cronSecret,
      "content-type": "application/json",
    },
  });

  const text = await res.text();
  console.log("[test-send] status:", res.status);
  console.log("[test-send] body:", text);
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error("[test-send] failed:", e);
  process.exitCode = 1;
});

