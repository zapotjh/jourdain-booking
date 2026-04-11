/**
 * Prepare DB-side test bookings for critical verification (tests 2, 3, 4, 6).
 * Idempotent: inserts missing fixtures, reuses existing [TEST] fixtures. Never touches non-test bookings.
 * Output: writes scripts/.critical-fixtures.json with booking ids and approval_tokens for prepare-stripe script.
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FIXTURES = [
  { key: "race", guestName: "[TEST] Race Fixture", checkIn: "2032-01-10", checkOut: "2032-01-12" },
  { key: "reconcile", guestName: "[TEST] Reconcile Fixture", checkIn: "2032-02-10", checkOut: "2032-02-12" },
  { key: "balance", guestName: "[TEST] Balance Fixture", checkIn: "2032-03-10", checkOut: "2032-03-12" },
  { key: "refund", guestName: "[TEST] Refund Fixture", checkIn: "2032-04-10", checkOut: "2032-04-12" },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const out = {};

  for (const f of FIXTURES) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, approval_token")
      .eq("guest_name", f.guestName)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      out[f.key] = { id: existing.id, approval_token: existing.approval_token ?? null };
      console.log(`[REUSE] ${f.key}: ${existing.id} (${f.guestName})`);
      continue;
    }

    const res = await fetch(`${BASE_URL}/api/request-booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guest_name: f.guestName,
        email: `fixture-${f.key}@test.local`,
        phone: "0000000000",
        check_in: f.checkIn,
        check_out: f.checkOut,
        total_price_eur: 300,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[FAIL] ${f.key}: request-booking failed`, res.status, json?.error || res.statusText);
      process.exit(1);
    }
    const booking = json.booking;
    if (!booking?.id || !booking?.approval_token) {
      console.error(`[FAIL] ${f.key}: missing id or approval_token in response`);
      process.exit(1);
    }
    out[f.key] = { id: booking.id, approval_token: booking.approval_token };
    console.log(`[CREATE] ${f.key}: ${booking.id} (${f.guestName})`);
  }

  const fixturePath = join(process.cwd(), "scripts", ".critical-fixtures.json");
  writeFileSync(fixturePath, JSON.stringify(out, null, 2), "utf8");

  console.log("");
  console.log("Fixture summary (saved to scripts/.critical-fixtures.json):");
  Object.entries(out).forEach(([k, v]) => console.log(`  ${k}: ${v.id}`));
  console.log("");
  console.log("Next: npm run prepare:stripe-fixtures");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
