/**
 * Verifies email provider failure injection for send-with-log:
 * - When send fails, email_log gets one row with status=failed and useful metadata
 * - sent is not falsely recorded (provider_message_id null, status failed)
 * - Reinvoke is deduped (alreadySentEmail); no second row
 *
 * Uses POST /api/test/inject-email-failure (magic address inject-failure@verification.local).
 * Requires: BASE_URL (dev server), CRON_SECRET, Supabase in .env.local.
 *
 * Run: node scripts/verify-email-failure-inject.mjs
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  if (!CRON_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing CRON_SECRET or Supabase in .env.local");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1) Trigger failure injection (first call → send throws, send-with-log records failed)
  const res1 = await fetch(`${BASE_URL}/api/test/inject-email-failure`, {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const text1 = await res1.text();
  assert(res1.ok, "inject-email-failure first call: " + res1.status + " " + text1);
  const data1 = JSON.parse(text1);
  const bookingId = data1.booking_id;
  assert(bookingId, "missing booking_id in response");
  assert(data1.result === "failed", "first call should result in failed (provider threw), got " + data1.result);

  // 2) Verify email_log: one row, status=failed, useful metadata, not sent (poll briefly for insert)
  let rows = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const { data } = await supabase
      .from("email_log")
      .select("id, status, error_message, provider_message_id, metadata, email_type, recipient_type")
      .eq("booking_id", bookingId)
      .eq("email_type", "booking_pending")
      .eq("recipient_type", "guest");
    if (Array.isArray(data) && data.length >= 1) {
      rows = data;
      break;
    }
  }

  assert(Array.isArray(rows) && rows.length === 1, "expected exactly 1 email_log row for booking_pending guest (booking_id=" + bookingId + "), got " + (rows?.length ?? 0) + ". Ensure app and script use same Supabase (e.g. same .env.local).");
  const row = rows[0];
  assert(row.status === "failed", "status must be failed, got " + row.status);
  assert(row.error_message && row.error_message.includes("Injected failure"), "error_message must contain Injected failure, got " + (row.error_message || "null"));
  assert(row.provider_message_id == null || row.provider_message_id === "", "provider_message_id must be null when failed, got " + row.provider_message_id);
  assert(row.metadata && (row.metadata.intended_to_email === "inject-failure@verification.local" || row.metadata.actual_to_email), "metadata must have intended_to_email or actual_to_email");

  console.log("[PASS] email_log row created with status=failed, error_message and metadata set; sent not falsely recorded");

  // 3) Reinvoke: same booking + type → alreadySentEmail returns true → deduped, no second insert
  const res2 = await fetch(`${BASE_URL}/api/test/inject-email-failure?booking_id=${encodeURIComponent(bookingId)}`, {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET },
  });
  assert(res2.ok, "inject-email-failure second call: " + res2.status);
  const data2 = await res2.json();
  assert(data2.result === "deduped", "reinvoke must be deduped, got " + data2.result);

  const { data: rows2 } = await supabase
    .from("email_log")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", "booking_pending")
    .eq("recipient_type", "guest");

  assert(Array.isArray(rows2) && rows2.length === 1, "after reinvoke: still exactly 1 row (no duplicate), got " + (rows2?.length ?? 0));

  console.log("[PASS] retry/reinvoke behavior correct (deduped, no duplicate email_log row)");
  console.log("");
  console.log("=== Email provider failure injection verification PASS ===");
}

main().catch((err) => {
  console.error("[FAIL]", err.message);
  process.exit(1);
});
