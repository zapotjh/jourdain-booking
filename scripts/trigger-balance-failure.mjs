/**
 * Optional: trigger one balance_payment_failed so verify-all-flows can PASS "balance failure/retry evidence".
 * Uses a [TEST] confirmed+paid booking with balance_paid=false, detaches its Stripe customer payment methods,
 * then runs charge-balance cron once. Expect: email_log gets balance_payment_failed with attempt_number.
 *
 * Prereq: one paid [TEST] booking (e.g. pay BALANCE checkout, or any [TEST] confirmed+paid with balance_paid=false).
 * Run: node scripts/trigger-balance-failure.mjs  (BASE_URL, CRON_SECRET, STRIPE_SECRET_KEY, Supabase from .env.local)
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!STRIPE_SECRET || !SUPABASE_URL || !SUPABASE_KEY || !CRON_SECRET) {
    console.error("Missing CRON_SECRET, STRIPE_SECRET_KEY, or Supabase in .env.local");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const Stripe = (await import("stripe")).default;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, stripe_payment_intent_id, balance_due_at")
    .like("guest_name", "[TEST]%")
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", false)
    .not("stripe_payment_intent_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!booking?.stripe_payment_intent_id) {
    console.error("No [TEST] confirmed+paid booking with balance_paid=false and stripe_payment_intent_id. Pay one BALANCE checkout first.");
    process.exit(1);
  }

  const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
  const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
  if (!customerId) {
    console.error("No customer on PaymentIntent");
    process.exit(1);
  }

  const { data: pms } = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  for (const pm of pms?.data ?? []) {
    await stripe.paymentMethods.detach(pm.id);
  }

  const res = await fetch(`${BASE_URL}/api/cron/charge-balance`, {
    headers: { "x-cron-secret": CRON_SECRET },
  });
  if (!res.ok) {
    console.error("charge-balance cron failed:", res.status, await res.text());
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 2000));
  const { data: logs } = await supabase
    .from("email_log")
    .select("id, status, metadata")
    .eq("booking_id", booking.id)
    .eq("email_type", "balance_payment_failed");

  if (logs?.length >= 1) {
    console.log("OK: balance_payment_failed logged for booking", booking.id, "— run npm run verify:all-flows to see PASS on balance failure evidence.");
  } else {
    console.log("charge-balance ran; no balance_payment_failed in email_log yet (check cron response or DB).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
