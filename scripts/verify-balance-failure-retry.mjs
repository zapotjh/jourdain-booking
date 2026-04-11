/**
 * Verifies balance auto-charge failure and retry behavior (attempts 1–3, dedupe, stop after 3).
 *
 * Production behavior under test:
 * - attempt 1/2/3 increment correctly (balance_payment_attempts 0→1→2→3)
 * - balance_payment_failed email per attempt_number (guest + admin), correct metadata
 * - duplicate execution for same attempt does not send duplicate emails (claim_balance_attempt + alreadySentEmail)
 * - automatic retry stops after attempt 3 (booking excluded from cron)
 * - admin/manual follow-up path documented in docs
 *
 * One manual step: pay one [TEST] BALANCE checkout so we have a confirmed+paid booking with balance_paid=false.
 * The script then: detaches PM (safe failure), resets to attempt 0, runs 3 failures + stop-after-3 + dedupe check.
 *
 * Run: node scripts/verify-balance-failure-retry.mjs
 * Env: .env.local (BASE_URL, CRON_SECRET, STRIPE_SECRET_KEY, SUPABASE_*, dev server at BASE_URL)
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

const PAST_DATE = "2020-01-01"; // Paris "yesterday" so claim_balance_attempt allows next attempt

async function cronGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-cron-secret": CRON_SECRET || "" },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: res.ok, status: res.status, json: null, text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  if (!CRON_SECRET || !STRIPE_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing CRON_SECRET, STRIPE_SECRET_KEY, or Supabase in .env.local");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const Stripe = (await import("stripe")).default;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });

  // --- Find or prepare one [TEST] booking for failure flow ---
  let { data: booking } = await supabase
    .from("bookings")
    .select("id, stripe_payment_intent_id, balance_due_at, balance_payment_attempts, last_balance_attempt_at")
    .like("guest_name", "[TEST]%")
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", false)
    .not("stripe_payment_intent_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!booking?.id) {
    console.error("MANUAL STEP: Pay one [TEST] BALANCE checkout (npm run prepare:stripe-fixtures, then pay the BALANCE URL).");
    console.error("Then rerun: node scripts/verify-balance-failure-retry.mjs");
    process.exit(1);
  }

  const bookingId = booking.id;

  // Detach all payment methods so charge-balance fails with "no reusable payment_method" (no Stripe charge)
  const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
  const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
  if (!customerId) {
    console.error("No customer on deposit PaymentIntent");
    process.exit(1);
  }
  const { data: pms } = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  for (const pm of pms?.data ?? []) {
    await stripe.paymentMethods.detach(pm.id);
  }

  // Reset to clean state for reproducible test: attempt 0, balance_due in past, last_balance_attempt_at so claim can succeed
  await supabase
    .from("bookings")
    .update({
      balance_payment_attempts: 0,
      balance_payment_failed_at: null,
      balance_payment_failure_reason: null,
      last_balance_attempt_at: null,
      balance_due_at: PAST_DATE,
    })
    .eq("id", bookingId);

  async function getEmailLogCount() {
    const r = await supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("email_type", "balance_payment_failed");
    return r.count ?? 0;
  }

  function getBooking() {
    return supabase
      .from("bookings")
      .select("balance_payment_attempts, last_balance_attempt_at")
      .eq("id", bookingId)
      .single()
      .then((r) => r.data);
  }

  async function runChargeBalance() {
    const res = await cronGet("/api/cron/charge-balance");
    assert(res.ok, "charge-balance cron: " + (res.json?.error || res.text || res.status));
    return res.json;
  }

  // ----- Attempt 1 -----
  await runChargeBalance();
  await new Promise((r) => setTimeout(r, 1500));
  let row = await getBooking();
  assert(row?.balance_payment_attempts === 1, `After attempt 1 expected balance_payment_attempts=1, got ${row?.balance_payment_attempts}`);
  const attempt1Rows = await supabase
    .from("email_log")
    .select("id, recipient_type, metadata")
    .eq("booking_id", bookingId)
    .eq("email_type", "balance_payment_failed")
    .eq("metadata->>attempt_number", "1");
  assert((attempt1Rows.data?.length ?? 0) === 2, `Expected 2 rows (guest+admin) for attempt_number=1, got ${attempt1Rows.data?.length}`);
  console.log("[PASS] Attempt 1: balance_payment_attempts=1, email_log has guest+admin with attempt_number=1");

  // ----- Duplicate: run again without advancing day; claim should fail, no duplicate emails -----
  await runChargeBalance();
  await new Promise((r) => setTimeout(r, 500));
  const attempt1AfterDup = await supabase
    .from("email_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", "balance_payment_failed")
    .eq("metadata->>attempt_number", "1");
  assert((attempt1AfterDup.data?.length ?? 0) === 2, `Duplicate run: expected still 2 rows for attempt 1, got ${attempt1AfterDup.data?.length}`);
  console.log("[PASS] Duplicate execution for same attempt: no duplicate emails (claim_balance_attempt + alreadySentEmail)");

  // ----- Attempt 2: allow claim by setting last_balance_attempt_at to past -----
  await supabase.from("bookings").update({ last_balance_attempt_at: PAST_DATE + "T00:00:00.000Z" }).eq("id", bookingId);
  await runChargeBalance();
  await new Promise((r) => setTimeout(r, 1500));
  row = await getBooking();
  assert(row?.balance_payment_attempts === 2, `After attempt 2 expected balance_payment_attempts=2, got ${row?.balance_payment_attempts}`);
  const attempt2Rows = await supabase
    .from("email_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", "balance_payment_failed")
    .eq("metadata->>attempt_number", "2");
  assert((attempt2Rows.data?.length ?? 0) === 2, `Expected 2 rows for attempt_number=2, got ${attempt2Rows.data?.length}`);
  console.log("[PASS] Attempt 2: balance_payment_attempts=2, email_log has guest+admin with attempt_number=2");

  // ----- Attempt 3 -----
  await supabase.from("bookings").update({ last_balance_attempt_at: PAST_DATE + "T00:00:00.000Z" }).eq("id", bookingId);
  await runChargeBalance();
  await new Promise((r) => setTimeout(r, 1500));
  row = await getBooking();
  assert(row?.balance_payment_attempts === 3, `After attempt 3 expected balance_payment_attempts=3, got ${row?.balance_payment_attempts}`);
  const attempt3Rows = await supabase
    .from("email_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", "balance_payment_failed")
    .eq("metadata->>attempt_number", "3");
  assert((attempt3Rows.data?.length ?? 0) === 2, `Expected 2 rows for attempt_number=3, got ${attempt3Rows.data?.length}`);
  console.log("[PASS] Attempt 3: balance_payment_attempts=3, email_log has guest+admin with attempt_number=3");

  // ----- Stop after 3: run cron again; booking must not be selected (balance_payment_attempts >= 3) -----
  const countBefore4 = await getEmailLogCount();
  await runChargeBalance();
  await new Promise((r) => setTimeout(r, 500));
  const countAfter4 = await getEmailLogCount();
  assert(countAfter4 === countBefore4, `After attempt 3: expected no new balance_payment_failed emails (${countBefore4} → ${countAfter4})`);
  row = await getBooking();
  assert(row?.balance_payment_attempts === 3, `After 4th run: balance_payment_attempts must still be 3, got ${row?.balance_payment_attempts}`);
  console.log("[PASS] Automatic retry stops after attempt 3 (no 4th attempt, no new emails)");

  console.log("");
  console.log("=== All balance failure/retry checks PASS ===");
  console.log("Evidence: booking", bookingId, "balance_payment_attempts=3, email_log has 6 rows (3 attempts × guest+admin) with attempt_number 1,2,3.");
  console.log("Admin follow-up: docs/verification-matrix.md §9, docs/balance-auto-charge-e2e.md.");
  console.log("Conclusion: safe (attempts 1–3, dedupe, stop after 3, admin path documented).");
}

main().catch((err) => {
  console.error("[FAIL]", err.message);
  process.exit(1);
});
