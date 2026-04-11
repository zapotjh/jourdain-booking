/**
 * WARNING: This script updates PRODUCTION bookings rows temporarily.
 *
 * It performs:
 * 1) Find a real paid+confirmed booking with security deposit > 0
 * 2) Temporarily set check_out to tomorrow (Paris) and call /api/cron/send-checkout-reminder
 * 3) Restore check_out
 * 4) Temporarily set check_out to yesterday (Paris), null out security_deposit_refund_link_sent_at,
 *    and call /api/cron/send-security-deposit-refund-link
 * 5) Restore check_out, and keep security_deposit_refund_link_sent_at NULL (for re-testing)
 *
 * No payment mutations are performed. Only check_out + (optionally) security_deposit_refund_link_sent_at are touched.
 *
 * Required env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - CRON_SECRET
 *
 * Optional env:
 * - BASE_URL (default http://localhost:3000)
 */

import { createClient } from "@supabase/supabase-js";

function parisYmd(offsetDays = 0) {
  const tz = "Europe/Paris";
  const now = new Date();
  const ymd = now.toLocaleDateString("sv-SE", { timeZone: tz }); // YYYY-MM-DD
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + offsetDays);
  return new Date(utc).toISOString().slice(0, 10);
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchCron(path) {
  const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "x-cron-secret": mustEnv("CRON_SECRET") },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, url, bodyText: text, bodyJson: json };
}

async function main() {
  const supabaseUrl = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const todayParis = parisYmd(0);
  const tomorrowParis = parisYmd(1);
  const yesterdayParis = parisYmd(-1);

  // 1) Find candidate booking
  // We'll temporarily shift BOTH check_in and check_out, so we don't need the candidate's current dates
  // to be compatible with tomorrow/yesterday. We will restore them afterwards.
  const { data: candidates, error: candErr } = await supabase
    .from("bookings")
    .select("id,guest_name,email,check_in,check_out,status,payment_status,balance_paid,security_deposit_amount_cents,security_deposit_refund_token,security_deposit_refund_link_sent_at")
    .eq("status", "confirmed")
    .eq("payment_status", "paid")
    .eq("balance_paid", true)
    .gt("security_deposit_amount_cents", 0)
    .order("check_out", { ascending: false })
    .limit(10);

  if (candErr) throw candErr;
  const rows = candidates || [];
  console.log("[step1] candidates:", rows.map((r) => ({
    booking_id: r.id,
    guest_name: r.guest_name,
    check_in: r.check_in,
    check_out: r.check_out,
    email: r.email,
  })));

  const chosen = rows[0];
  if (!chosen) {
    console.log("[step1] no candidate bookings found");
    return;
  }
  const bookingId = chosen.id;
  const original = {
    check_in: chosen.check_in,
    check_out: chosen.check_out,
    security_deposit_refund_token: chosen.security_deposit_refund_token,
    security_deposit_refund_link_sent_at: chosen.security_deposit_refund_link_sent_at,
  };
  console.log("[step1] chosen booking_id:", bookingId);

  // Helper: query email_log for this booking
  async function printEmailLog(emailTypes) {
    const { data, error } = await supabase
      .from("email_log")
      .select("sent_at,recipient_type,email_type,to_email,status,error_message")
      .eq("booking_id", bookingId)
      .in("email_type", emailTypes)
      .order("sent_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    console.log("[email_log]", data || []);
  }

  // 2) Checkout reminder test
  // We also shift check_in to keep check_in <= check_out constraints happy.
  const checkInForTest = parisYmd(-3);
  console.log("[step2] set check_in/check_out for checkout reminder test", {
    check_in: checkInForTest,
    check_out: tomorrowParis,
  });
  try {
    const { error: updErr } = await supabase
      .from("bookings")
      .update({ check_in: checkInForTest, check_out: tomorrowParis })
      .eq("id", bookingId);
    if (updErr) throw updErr;

    const cronRes = await fetchCron("/api/cron/send-checkout-reminder");
    console.log("[step2] cron response", { status: cronRes.status, url: cronRes.url, body: cronRes.bodyJson || cronRes.bodyText });

    await printEmailLog(["checkout_reminder_guest", "checkout_reminder_admin"]);
  } finally {
    const { error: restoreErr } = await supabase
      .from("bookings")
      .update({ check_in: original.check_in, check_out: original.check_out })
      .eq("id", bookingId);
    if (restoreErr) console.error("[step2] restore check_out failed", restoreErr);
    console.log("[step2] restored check_in/check_out", { check_in: original.check_in, check_out: original.check_out });
  }

  // 3) Security deposit refund link test (admin email)
  console.log("[step3] set check_out -> yesterdayParis, null link_sent_at", { yesterdayParis });
  try {
    const { error: updErr2 } = await supabase
      .from("bookings")
      .update({
        check_in: checkInForTest,
        check_out: yesterdayParis,
        security_deposit_refund_link_sent_at: null,
      })
      .eq("id", bookingId);
    if (updErr2) throw updErr2;

    const cronRes2 = await fetchCron("/api/cron/send-security-deposit-refund-link");
    console.log("[step3] cron response", { status: cronRes2.status, url: cronRes2.url, body: cronRes2.bodyJson || cronRes2.bodyText });

    await printEmailLog(["security_deposit_refund_request_admin"]);
  } finally {
    // Restore only check_out. Keep link_sent_at NULL for re-testing as requested.
    const { error: restoreErr2 } = await supabase
      .from("bookings")
      .update({ check_in: original.check_in, check_out: original.check_out })
      .eq("id", bookingId);
    if (restoreErr2) console.error("[step3] restore check_out failed", restoreErr2);
    console.log("[step3] restored check_in/check_out", { check_in: original.check_in, check_out: original.check_out });
  }

  console.log("[done] booking updated fields summary:", {
    booking_id: bookingId,
    restored_check_in: original.check_in,
    restored_check_out: original.check_out,
    security_deposit_refund_link_sent_at: null,
  });
}

main().catch((e) => {
  console.error("[script] failed", e);
  process.exitCode = 1;
});

