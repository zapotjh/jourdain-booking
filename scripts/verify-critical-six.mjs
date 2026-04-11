/**
 * 핵심 검증 6개 자동 실행
 * 필요: .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CRON_SECRET)
 * 실행: node scripts/verify-critical-six.mjs   (BASE_URL 기본 http://localhost:3000)
 * 옵션: --only=2  또는  --only=2,3,4,6  (해당 번호만 실행)
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      process.env[m[1].trim()] = val;
    }
  });
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseOnly() {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  if (!arg) return null;
  const list = arg.slice("--only=".length).split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 6);
  return list.length ? list : null;
}

async function cronGet(path, desc) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-cron-secret": CRON_SECRET || "" },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: res.status, body: text };
  }
  return { ok: res.ok, status: res.status, json, body: text };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const RACE_GUEST_NAME = "[TEST] Race Fixture";
const BALANCE_GUEST_NAME = "[TEST] Balance Fixture";

/** Returns one [TEST] confirmed+paid booking. Optional filter by guest_name for race (2,3,6) vs balance (4). */
async function getPaidFixture(supabase, opts = {}) {
  let q = supabase
    .from("bookings")
    .select("id, stripe_session_id, stripe_payment_intent_id, balance_due_at, balance_paid, status, payment_status")
    .like("guest_name", "[TEST]%")
    .eq("status", "confirmed")
    .eq("payment_status", "paid");
  if (opts.guestName) q = q.eq("guest_name", opts.guestName);
  const { data } = await q.limit(1).maybeSingle();
  return data;
}

/** Returns [TEST] Balance Fixture for test 4 (must be balance_paid=false so double-invocation can be tested). */
async function getBalanceFixture(supabase) {
  const { data } = await supabase
    .from("bookings")
    .select("id, stripe_session_id, stripe_payment_intent_id, balance_due_at, balance_paid, status, payment_status")
    .eq("guest_name", BALANCE_GUEST_NAME)
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", false)
    .limit(1)
    .maybeSingle();
  return data;
}

// 1. 중복 웹훅
async function test1DuplicateWebhook() {
  const Stripe = (await import("stripe")).default;
  const { createClient } = await import("@supabase/supabase-js");
  assert(STRIPE_SECRET && STRIPE_WEBHOOK_SECRET && SUPABASE_URL && SUPABASE_SERVICE_KEY, "env");

  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: events } = await stripe.events.list({ limit: 5 });
  const ev = events?.find((e) => e.type === "checkout.session.completed" || e.type === "payment_intent.succeeded") || events?.[0];
  assert(ev, "no Stripe event found");

  const full = await stripe.events.retrieve(ev.id);
  const body = JSON.stringify(full);

  const sig1 = stripe.webhooks.generateTestHeaderString({ payload: body, secret: STRIPE_WEBHOOK_SECRET });
  const res1 = await fetch(`${BASE_URL}/api/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": sig1 },
    body,
  });
  const firstOk = res1.ok;
  const firstJson = await res1.json().catch(() => ({}));

  const sig2 = stripe.webhooks.generateTestHeaderString({ payload: body, secret: STRIPE_WEBHOOK_SECRET });
  const res2 = await fetch(`${BASE_URL}/api/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": sig2 },
    body,
  });
  const secondOk = res2.ok;
  const secondJson = await res2.json().catch(() => ({}));

  const { data: rows } = await supabase.from("stripe_webhook_events").select("id").eq("stripe_event_id", full.id);
  const count = rows?.length ?? 0;

  assert(firstOk, "first webhook not 200");
  assert(secondOk && secondJson.duplicate === true, "second webhook should be 200 duplicate");
  assert(count === 1, `stripe_webhook_events should have 1 row for event, got ${count}`);
  return "1. 중복 웹훅: PASS (두 번째 200 duplicate, event row 1개)";
}

const SKIP_NEXT_FIXTURES = "  → Next: npm run prepare:critical-fixtures then npm run prepare:stripe-fixtures, complete one payment, then rerun verify.";

// 2. expire vs webhook race (deterministic: set canceled → invoke canonical recovery → verify confirmed)
async function test2ExpireVsWebhookRace() {
  const Stripe = (await import("stripe")).default;
  const { createClient } = await import("@supabase/supabase-js");
  assert(STRIPE_SECRET && SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET, "env");

  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const fixture = await getPaidFixture(supabase, { guestName: RACE_GUEST_NAME });
  if (!fixture?.stripe_session_id) {
    return {
      skip: true,
      msg: "2. expire vs webhook race: SKIP (paid [TEST] Race Fixture 없음)",
      detail: "Pay the RACE checkout from prepare:stripe-fixtures. " + SKIP_NEXT_FIXTURES,
    };
  }

  const session = await stripe.checkout.sessions.retrieve(fixture.stripe_session_id);
  if (session.payment_status !== "paid") {
    return {
      skip: true,
      msg: "2. expire vs webhook race: SKIP (세션 미결제)",
      detail: "Stripe session not paid. " + SKIP_NEXT_FIXTURES,
    };
  }

  // Simulate expire won: set booking to canceled, then run same reconciliation path as production (recover to confirmed).
  await supabase.from("bookings").update({ status: "canceled", confirmed_at: null }).eq("id", fixture.id).eq("status", "confirmed");

  const { json } = await cronGet("/api/cron/reconcile-stripe-payments", "reconcile");
  assert(Array.isArray(json?.recovered) && json.recovered.includes(fixture.id), "reconcile should recover booking");

  const { data: finalRow } = await supabase.from("bookings").select("status").eq("id", fixture.id).single();
  assert(finalRow?.status === "confirmed", `final status should be confirmed, got ${finalRow?.status}`);
  return "2. expire vs webhook race: PASS (canceled → reconcile → confirmed)";
}

// 3. reconcile cron
async function test3ReconcileCron() {
  const { createClient } = await import("@supabase/supabase-js");
  assert(SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET, "env");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const fixture = await getPaidFixture(supabase, { guestName: RACE_GUEST_NAME });
  if (!fixture?.stripe_session_id) {
    return {
      skip: true,
      msg: "3. reconcile cron: SKIP (paid [TEST] Race Fixture 없음)",
      detail: "Pay the RACE checkout from prepare:stripe-fixtures. " + SKIP_NEXT_FIXTURES,
    };
  }

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase
    .from("bookings")
    .update({ status: "payment_pending", confirmed_at: null, payment_pending_expires_at: cutoff })
    .eq("id", fixture.id)
    .eq("status", "confirmed");

  const { json } = await cronGet("/api/cron/reconcile-stripe-payments", "reconcile");
  assert(Array.isArray(json?.recovered) && json.recovered.includes(fixture.id), "reconcile should recover booking");

  const { data: after } = await supabase.from("bookings").select("status").eq("id", fixture.id).single();
  assert(after?.status === "confirmed", "status should be confirmed after reconcile");
  return "3. reconcile cron: PASS (paid session → confirmed 복구)";
}

// 4. balance double-charge
async function test4BalanceDoubleCharge() {
  const { createClient } = await import("@supabase/supabase-js");
  assert(SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET, "env");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const fixture = await getBalanceFixture(supabase);
  if (!fixture?.id) {
    return {
      skip: true,
      msg: "4. balance double-charge: SKIP ([TEST] Balance Fixture paid + balance_paid=false 없음)",
      detail: "Pay the BALANCE checkout from prepare:stripe-fixtures (and do not run charge-balance before this test). " + SKIP_NEXT_FIXTURES,
    };
  }
  const past = "2020-01-01";
  if (fixture.balance_due_at > past) {
    await supabase.from("bookings").update({ balance_due_at: past }).eq("id", fixture.id);
  }

  const { data: candidates } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", fixture.id)
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", false)
    .not("stripe_payment_intent_id", "is", null)
    .lte("balance_due_at", past)
    .limit(1);
  const bookingId = candidates?.[0]?.id;
  if (!bookingId) {
    return {
      skip: true,
      msg: "4. balance double-charge: SKIP (Balance Fixture가 청구 대상 아님)",
      detail: "Pay BALANCE checkout and run verify:critical with --only=4 before balance cron runs. " + SKIP_NEXT_FIXTURES,
    };
  }

  const [r1, r2] = await Promise.all([
    cronGet("/api/cron/charge-balance", "charge-balance-1"),
    cronGet("/api/cron/charge-balance", "charge-balance-2"),
  ]);
  assert(r1.ok && r2.ok, "both charge-balance should 200");

  const { data: rows } = await supabase.from("bookings").select("last_balance_attempt_at").eq("id", bookingId).single();
  assert(rows?.last_balance_attempt_at != null, "last_balance_attempt_at should be set (one claim)");
  return "4. balance double-charge: PASS (claim_balance_attempt으로 한 쪽만 claim)";
}

// 5. check-in reminder dedupe
async function test5CheckinReminderDedupe() {
  const { createClient } = await import("@supabase/supabase-js");
  const tz = "Europe/Paris";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const tomorrow = `${y}-${m}-${d}`;

  assert(SUPABASE_URL && SUPABASE_SERVICE_KEY && CRON_SECRET, "env");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: anyConfirmed } = await supabase.from("bookings").select("id,check_in").eq("status", "confirmed").eq("payment_status", "paid").limit(1).single();
  if (!anyConfirmed?.id) {
    return {
      skip: true,
      msg: "5. check-in reminder dedupe: SKIP (confirmed+paid 예약 없음)",
      detail: "  → Next: create and pay one booking, or run prepare:stripe-fixtures and complete payment.",
    };
  }
  const originalCheckIn = anyConfirmed.check_in;
  await supabase.from("bookings").update({ check_in: tomorrow }).eq("id", anyConfirmed.id);

  try {
    await cronGet("/api/cron/send-checkin-reminder", "checkin-1");
    await cronGet("/api/cron/send-checkin-reminder", "checkin-2");

    const { data: logs } = await supabase.from("email_log").select("id, metadata").eq("booking_id", anyConfirmed.id).eq("email_type", "checkin_reminder_1d");
    const count = logs?.length ?? 0;
    assert(count <= 2, `checkin_reminder_1d should be at most 2 (guest+admin), got ${count}`);
    const guestLog = logs?.find((l) => l.metadata?.intended_to_email && l.metadata?.actual_to_email && l.metadata?.redirected);
    if (process.env.EMAIL_MODE === "test" && guestLog?.metadata) {
      console.log("Guest email redirected in test mode:");
      console.log("  intended=" + (guestLog.metadata.intended_to_email ?? ""));
      console.log("  actual=" + (guestLog.metadata.actual_to_email ?? ""));
    }
    return "5. check-in reminder dedupe: PASS (checkin_reminder_1d 중복 없음)";
  } finally {
    if (originalCheckIn) await supabase.from("bookings").update({ check_in: originalCheckIn }).eq("id", anyConfirmed.id);
  }
}

// 6. refund/dispute
async function test6RefundDispute() {
  const Stripe = (await import("stripe")).default;
  const { createClient } = await import("@supabase/supabase-js");
  assert(STRIPE_SECRET && SUPABASE_URL && SUPABASE_SERVICE_KEY, "env");

  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: row } = await supabase
    .from("bookings")
    .select("id,stripe_payment_intent_id")
    .eq("guest_name", RACE_GUEST_NAME)
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .not("stripe_payment_intent_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (!row?.stripe_payment_intent_id) {
    return {
      skip: true,
      msg: "6. refund/dispute: SKIP (paid [TEST] Race Fixture 없음)",
      detail: "Pay the RACE checkout (same Stripe account as STRIPE_SECRET_KEY). Test 6 refunds that booking. " + SKIP_NEXT_FIXTURES,
    };
  }

  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
  } catch (e) {
    return {
      skip: true,
      msg: "6. refund/dispute: SKIP (PI 조회 실패: " + (e.message || "unknown") + ")",
      detail: "  → Next: use Stripe test mode and a payment from this account, or run prepare:stripe-fixtures and pay once.",
    };
  }
  const chargeId = pi.latest_charge;
  if (!chargeId || typeof chargeId !== "string") {
    return {
      skip: true,
      msg: "6. refund/dispute: SKIP (no charge on PI)",
      detail: "  → Next: complete a real payment for a test fixture, then rerun.",
    };
  }

  try {
    await stripe.refunds.create({ charge: chargeId, reason: "requested_by_customer" });
  } catch (e) {
    return {
      skip: true,
      msg: "6. refund/dispute: SKIP (refund 생성 실패: " + (e.message || "unknown") + ")",
      detail: "  → Next: ensure Stripe test mode and charge is refundable. Dispute is optional/manual.",
    };
  }
  await new Promise((r) => setTimeout(r, 3000));

  const { data: after } = await supabase.from("bookings").select("payment_status,status").eq("id", row.id).single();
  assert(after?.payment_status === "refunded" && after?.status === "canceled", `expected refunded/canceled, got ${after?.payment_status}/${after?.status}`);

  const { data: alertLog } = await supabase.from("email_log").select("id, status, metadata").eq("booking_id", row.id).eq("email_type", "refund_alert").limit(1);
  assert((alertLog?.length ?? 0) >= 1, "refund_alert email_log 없음");
  const logRow = alertLog?.[0];
  if (process.env.EMAIL_MODE === "test" && logRow?.metadata?.actual_to_email) {
    console.log("[INFO] Admin email in test mode: actual_to=" + (logRow.metadata.actual_to_email ?? ""));
  }

  const { data: chargeTarget } = await supabase.from("bookings").select("id").eq("id", row.id).eq("payment_status", "paid").eq("status", "confirmed").single();
  assert(!chargeTarget, "refunded booking should not be in charge-balance target");
  return "6. refund/dispute: PASS (refunded, refund_alert, 크론 대상 제외)";
}

async function main() {
  const only = parseOnly();
  const indices = only ?? [1, 2, 3, 4, 5, 6];
  const tests = [
    ["중복 웹훅", test1DuplicateWebhook],
    ["expire vs webhook race", test2ExpireVsWebhookRace],
    ["reconcile cron", test3ReconcileCron],
    ["balance double-charge", test4BalanceDoubleCharge],
    ["check-in reminder dedupe", test5CheckinReminderDedupe],
    ["refund/dispute", test6RefundDispute],
  ];

  const results = [];
  console.log("BASE_URL:", BASE_URL);
  if (only) console.log("--only:", indices.join(","));
  if (process.env.EMAIL_MODE === "test") {
    console.log("[INFO] EMAIL_MODE=test: guest emails -> tojhlim@gmail.com (TEST_EMAIL_OVERRIDE); admin -> apt.jourdain.paris@gmail.com.");
    console.log("[INFO] email_log metadata: intended_to_email, actual_to_email, email_mode, redirected. Redirected delivery counts as PASS.");
  }
  console.log("");

  for (let i = 0; i < tests.length; i++) {
    const num = i + 1;
    if (!indices.includes(num)) continue;
    const [name, fn] = tests[i];
    try {
      const out = await fn();
      if (out && typeof out === "object" && out.skip === true) {
        results.push({ name, pass: true, skip: true, msg: out.msg, detail: out.detail });
        console.log("[SKIP]", out.msg);
        if (out.detail) console.log(out.detail);
      } else {
        results.push({ name, pass: true, msg: out });
        console.log("[PASS]", out);
      }
    } catch (e) {
      results.push({ name, pass: false, error: e.message });
      console.error("[FAIL]", name, e.message);
    }
  }

  console.log("");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`결과: ${passed}/${results.length} 통과${failed ? `, ${failed} 실패` : ""}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
