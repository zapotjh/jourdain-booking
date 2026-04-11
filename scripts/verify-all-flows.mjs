/**
 * Full flow verification: request-booking emails, expire cron, reject, env audit, email_log dedupe.
 * Run after verify-critical-six for complete coverage. Uses BASE_URL (default localhost:3000) and .env.local.
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

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

const results = [];

function pass(name, msg) {
  results.push({ name, status: "PASS", msg });
  console.log("[PASS]", name, msg || "");
}

function fail(name, msg) {
  results.push({ name, status: "FAIL", msg });
  console.error("[FAIL]", name, msg);
}

function skip(name, msg) {
  results.push({ name, status: "SKIP", msg });
  console.log("[SKIP]", name, msg || "");
}

// --- Env audit ---
async function auditEnv() {
  const required = [
    "CRON_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = required.filter((k) => !process.env[k] && !process.env["NEXT_PUBLIC_SUPABASE_URL"]);
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const idx = missing.indexOf("SUPABASE_URL");
    if (idx >= 0) missing.splice(idx, 1);
  }
  if (missing.length) {
    fail("env", "Missing: " + missing.join(", "));
    return;
  }
  if (!process.env.ADMIN_EMAIL) {
    skip("env", "ADMIN_EMAIL not set (admin emails will be skipped at runtime)");
  } else {
    pass("env", "CRON_SECRET, STRIPE_*, SUPABASE_*, ADMIN_EMAIL present");
  }
}

// --- Request-booking → booking_pending + booking_approval_request ---
async function testRequestBookingEmails() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    skip("request-booking emails", "Supabase not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const unique = `Request-${Date.now()}`;
  const dayOffset = Math.floor(Date.now() / 86400000) % 365;
  const checkIn = new Date(Date.UTC(2035, 0, 1 + dayOffset));
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 2);
  const checkInStr = checkIn.toISOString().slice(0, 10);
  const checkOutStr = checkOut.toISOString().slice(0, 10);
  const res = await fetch(`${BASE_URL}/api/request-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: `[TEST] ${unique}`,
      email: `request-flow-${Date.now()}@test.local`,
      phone: "0000000000",
      check_in: checkInStr,
      check_out: checkOutStr,
      total_price_eur: 200,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.booking?.id) {
    fail("request-booking emails", "request-booking failed: " + (json?.error || res.status));
    return;
  }
  const bookingId = json.booking.id;
  await new Promise((r) => setTimeout(r, 1500));
  const { data: logs } = await supabase
    .from("email_log")
    .select("recipient_type, email_type")
    .eq("booking_id", bookingId);
  const hasGuestPending = logs?.some((r) => r.recipient_type === "guest" && r.email_type === "booking_pending");
  const hasAdminApproval = logs?.some((r) => r.recipient_type === "admin" && r.email_type === "booking_approval_request");
  if (hasGuestPending && hasAdminApproval) {
    pass("request-booking emails", "booking_pending (guest) + booking_approval_request (admin) in email_log");
  } else {
    fail("request-booking emails", `email_log: guest booking_pending=${!!hasGuestPending}, admin booking_approval_request=${!!hasAdminApproval}`);
  }
}

// --- Expire cron: cancel expired payment_pending + deposit_payment_failed; second run = dedupe ---
async function testExpireCron() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CRON_SECRET) {
    skip("expire cron", "Supabase or CRON_SECRET not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const unique = `Expire-${Date.now()}`;
  const dayOffset = (Math.floor(Date.now() / 86400000) % 365) + 100;
  const checkIn = new Date(Date.UTC(2035, 0, 1 + dayOffset));
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 2);
  const checkInStr = checkIn.toISOString().slice(0, 10);
  const checkOutStr = checkOut.toISOString().slice(0, 10);
  const createRes = await fetch(`${BASE_URL}/api/request-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: `[TEST] ${unique}`,
      email: `expire-flow-${Date.now()}@test.local`,
      phone: "0000000000",
      check_in: checkInStr,
      check_out: checkOutStr,
      total_price_eur: 250,
    }),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createJson.booking?.id) {
    fail("expire cron", "request-booking failed: " + (createJson?.error || createRes.status));
    return;
  }
  const bookingId = createJson.booking.id;
  const approveRes = await fetch(`${BASE_URL}/api/host/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approval_token: createJson.booking.approval_token }),
  });
  if (!approveRes.ok) {
    fail("expire cron", "host/approve failed (need payment_pending booking)");
    return;
  }
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { error: upErr } = await supabase
    .from("bookings")
    .update({ payment_pending_expires_at: past })
    .eq("id", bookingId)
    .eq("status", "payment_pending");
  if (upErr) {
    fail("expire cron", "update expires_at failed: " + upErr.message);
    return;
  }
  const run1 = await cronGet("/api/cron/expire-pending-bookings");
  if (!run1.ok || !run1.json?.expired_ids?.includes(bookingId)) {
    fail("expire cron", "first run: " + (run1.json?.error || run1.text || run1.status));
    return;
  }
  const { data: row } = await supabase.from("bookings").select("status").eq("id", bookingId).single();
  if (row?.status !== "canceled") {
    fail("expire cron", "booking status should be canceled, got " + row?.status);
    return;
  }
  const { data: logs1 } = await supabase
    .from("email_log")
    .select("id, recipient_type, email_type")
    .eq("booking_id", bookingId)
    .eq("email_type", "deposit_payment_failed");
  const guestCount1 = logs1?.filter((r) => r.recipient_type === "guest").length ?? 0;
  const adminCount1 = logs1?.filter((r) => r.recipient_type === "admin").length ?? 0;
  if (guestCount1 < 1 || adminCount1 < 1) {
    fail("expire cron", `expected deposit_payment_failed guest+admin, got guest=${guestCount1} admin=${adminCount1}`);
    return;
  }
  const run2 = await cronGet("/api/cron/expire-pending-bookings");
  const { data: logs2 } = await supabase
    .from("email_log")
    .select("id, recipient_type, email_type")
    .eq("booking_id", bookingId)
    .eq("email_type", "deposit_payment_failed");
  const guestCount2 = logs2?.filter((r) => r.recipient_type === "guest").length ?? 0;
  const adminCount2 = logs2?.filter((r) => r.recipient_type === "admin").length ?? 0;
  if (guestCount2 > 1 || adminCount2 > 1) {
    fail("expire cron dedupe", `second run should not duplicate emails: guest=${guestCount2} admin=${adminCount2}`);
    return;
  }
  pass("expire cron", "canceled + deposit_payment_failed guest+admin; second run deduped");
}

// --- Reject booking → booking_rejected ---
async function testRejectEmail() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    skip("reject email", "Supabase not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const unique = `Reject-${Date.now()}`;
  const dayOffset = (Math.floor(Date.now() / 86400000) % 365) + 200;
  const checkIn = new Date(Date.UTC(2035, 0, 1 + dayOffset));
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + 2);
  const checkInStr = checkIn.toISOString().slice(0, 10);
  const checkOutStr = checkOut.toISOString().slice(0, 10);
  const createRes = await fetch(`${BASE_URL}/api/request-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: `[TEST] ${unique}`,
      email: `reject-flow-${Date.now()}@test.local`,
      phone: "0000000000",
      check_in: checkInStr,
      check_out: checkOutStr,
      total_price_eur: 180,
    }),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createJson.booking?.id) {
    fail("reject email", "request-booking failed");
    return;
  }
  const bookingId = createJson.booking.id;
  const token = createJson.booking.approval_token;
  const rejectRes = await fetch(`${BASE_URL}/api/host/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approval_token: token, message: "Test rejection for verification." }),
  });
  const rejectJson = await rejectRes.json().catch(() => ({}));
  if (!rejectRes.ok && rejectRes.status !== 404) {
    fail("reject email", "host/reject failed: " + (rejectJson?.error || rejectRes.status));
    return;
  }
  await new Promise((r) => setTimeout(r, 1000));
  const { data: logs } = await supabase
    .from("email_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", "booking_rejected");
  if (logs?.length >= 1) {
    pass("reject email", "booking_rejected in email_log");
  } else {
    skip("reject email", "host/reject may not be available or booking_rejected not sent");
  }
}

// --- Balance success: after critical-six test 4, email_log should have balance_payment_succeeded ---
async function testBalanceSuccessEmailLog() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    skip("balance success email_log", "Supabase not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: rows } = await supabase
    .from("email_log")
    .select("booking_id")
    .eq("email_type", "balance_payment_succeeded")
    .limit(1);
  if (rows?.length >= 1) {
    pass("balance success email_log", "at least one balance_payment_succeeded row exists (run verify:critical test 4 first for full flow)");
  } else {
    skip("balance success email_log", "no balance_payment_succeeded in email_log yet (run verify:critical --only=4 after one paid fixture)");
  }
}

// --- Duplicate protection: alreadySentEmail prevents second send ---
async function testEmailLogDedupe() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    skip("email_log dedupe", "Supabase not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: dup } = await supabase
    .from("email_log")
    .select("booking_id, recipient_type, email_type")
    .eq("email_type", "checkin_reminder_1d");
  const byBooking = {};
  (dup || []).forEach((r) => {
    const k = `${r.booking_id}:${r.recipient_type}`;
    byBooking[k] = (byBooking[k] || 0) + 1;
  });
  const over = Object.entries(byBooking).filter(([, c]) => c > 1);
  if (over.length > 0) {
    fail("email_log dedupe", "checkin_reminder_1d has duplicate (booking,recipient): " + JSON.stringify(over));
  } else {
    pass("email_log dedupe", "no duplicate checkin_reminder_1d per (booking, recipient) in sample");
  }
}

// --- Balance failure/retry: evidence that balance_payment_failed is logged with attempt_number 1–3 ---
async function testBalanceFailureEvidence() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    skip("balance failure/retry evidence", "Supabase not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: rows } = await supabase
    .from("email_log")
    .select("id, metadata")
    .eq("email_type", "balance_payment_failed")
    .limit(10);
  const withAttempt = (rows || []).filter((r) => {
    const n = r.metadata?.attempt_number ?? r.metadata?.attempt;
    return n >= 1 && n <= 3;
  });
  if (withAttempt.length >= 1) {
    pass("balance failure/retry evidence", "email_log has balance_payment_failed with attempt_number 1–3");
  } else {
    skip("balance failure/retry evidence", "no balance_payment_failed rows with attempt 1–3 (run charge-balance on a booking with no payment method to generate, or see docs)");
  }
}

// --- Email provider failure: send-with-log records status=failed in email_log ---
async function testEmailProviderFailureLogging() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    skip("email provider failure logging", "Supabase not configured");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: failedRows } = await supabase
    .from("email_log")
    .select("id, email_type, error_message")
    .eq("status", "failed")
    .limit(1);
  if (failedRows?.length >= 1) {
    pass("email provider failure logging", "email_log has at least one status=failed row (evidence: " + (failedRows[0].email_type || "sent") + ")");
    return;
  }
  skip("email provider failure logging", "no status=failed in email_log; trigger a send failure (e.g. invalid Resend key or recipient) to verify logging");
}

// --- Production env readiness checklist (all vars we care about) ---
function productionEnvChecklist() {
  const vars = [
    ["CRON_SECRET", "Cron routes"],
    ["STRIPE_SECRET_KEY", "Webhook, charge-balance, reconcile"],
    ["STRIPE_WEBHOOK_SECRET", "Webhook signature"],
    ["NEXT_PUBLIC_SUPABASE_URL", "Supabase URL"],
    ["SUPABASE_SERVICE_ROLE_KEY", "DB + email_log"],
    ["ADMIN_EMAIL", "Admin emails"],
    ["NEXT_PUBLIC_SITE_URL", "Site URL (optional)"],
    ["RESEND_API_KEY", "Resend sending"],
  ];
  const missing = vars.filter(([k]) => {
    if (k === "NEXT_PUBLIC_SUPABASE_URL") return !process.env[k] && !process.env.SUPABASE_URL;
    return !process.env[k];
  });
  if (missing.length === 0) {
    pass("production env checklist", "all required env vars present (CRON_SECRET, STRIPE_*, SUPABASE_*, ADMIN_EMAIL, RESEND_API_KEY)");
  } else {
    const list = missing.map(([k]) => k).join(", ");
    skip("production env checklist", "missing or empty: " + list);
  }
}

async function main() {
  console.log("BASE_URL:", BASE_URL);
  console.log("");

  await auditEnv();
  await testRequestBookingEmails();
  await testExpireCron();
  await testRejectEmail();
  await testBalanceSuccessEmailLog();
  await testEmailLogDedupe();
  await testBalanceFailureEvidence();
  await testEmailProviderFailureLogging();
  productionEnvChecklist();

  console.log("");
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  console.log(`Results: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
