/**
 * 새 부킹 생성 후 체크인(1일 전) 이메일이 크론으로 자동 발송되는지 검증.
 * 1) request-booking (check_in = Paris 내일)
 * 2) host/approve
 * 3) DB에서 해당 예약을 confirmed + paid 로 설정 (결제 시뮬)
 * 4) send-checkin-reminder 크론 호출
 * 5) email_log 에 checkin_reminder_1d (guest + admin) 기록 확인
 *
 * Run: node scripts/verify-checkin-email.mjs
 * 필요: BASE_URL(dev 서버), CRON_SECRET, Supabase (.env.local)
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

function parisTomorrow() {
  const now = new Date();
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  parisNow.setDate(parisNow.getDate() + 1);
  const y = parisNow.getFullYear();
  const m = String(parisNow.getMonth() + 1).padStart(2, "0");
  const d = String(parisNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!CRON_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing CRON_SECRET or Supabase in .env.local");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const tomorrow = parisTomorrow();
  const checkOut = addDays(tomorrow, 2);
  const unique = `Checkin-${Date.now()}`;

  console.log("1) Creating booking: check_in (Paris tomorrow) =", tomorrow);

  const createRes = await fetch(`${BASE_URL}/api/request-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guest_name: `[TEST] ${unique}`,
      email: `checkin-test-${Date.now()}@test.local`,
      phone: "0000000000",
      check_in: tomorrow,
      check_out: checkOut,
      total_price_eur: 200,
    }),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !createJson.booking?.id) {
    console.error("request-booking failed:", createRes.status, createJson?.error || createJson);
    process.exit(1);
  }

  const bookingId = createJson.booking.id;
  const approvalToken = createJson.booking.approval_token;
  console.log("   booking_id:", bookingId);

  console.log("2) Approving (host/approve)...");
  const approveRes = await fetch(`${BASE_URL}/api/host/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approval_token: approvalToken }),
  });
  if (!approveRes.ok) {
    console.error("host/approve failed:", approveRes.status, await approveRes.text());
    process.exit(1);
  }

  console.log("3) Setting booking to confirmed + paid (simulate webhook)...");
  const { error: upErr } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "payment_pending");

  if (upErr) {
    console.error("DB update failed:", upErr);
    process.exit(1);
  }

  console.log("4) Calling send-checkin-reminder cron...");
  const cronRes = await fetch(`${BASE_URL}/api/cron/send-checkin-reminder`, {
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const cronJson = await cronRes.json().catch(() => ({}));
  if (!cronRes.ok) {
    console.error("send-checkin-reminder failed:", cronRes.status, cronJson);
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 1500));

  console.log("5) Checking email_log for checkin_reminder_1d...");
  const { data: logs } = await supabase
    .from("email_log")
    .select("id, recipient_type, email_type, status")
    .eq("booking_id", bookingId)
    .eq("email_type", "checkin_reminder_1d");

  const guestLog = logs?.find((r) => r.recipient_type === "guest");
  const adminLog = logs?.find((r) => r.recipient_type === "admin");

  if (guestLog && adminLog) {
    console.log("");
    console.log("[PASS] Check-in email sent automatically:");
    console.log("  - guest checkin_reminder_1d:", guestLog.status);
    console.log("  - admin checkin_reminder_1d:", adminLog.status);
  } else {
    console.error("[FAIL] Missing checkin_reminder_1d in email_log:", { guest: !!guestLog, admin: !!adminLog });
    console.error("cron response:", cronJson);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
