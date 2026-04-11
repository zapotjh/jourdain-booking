/**
 * Prepares Stripe checkouts for verify:critical tests 2, 3, 4, 6.
 * Approves RACE (tests 2, 3, 6) and BALANCE (test 4) — pay BOTH in same Stripe account.
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

async function approveOne(approvalToken) {
  const res = await fetch(`${BASE_URL}/api/host/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approval_token: approvalToken }),
  });
  return res.json().catch(() => ({}));
}

async function main() {
  const fixturePath = join(process.cwd(), "scripts", ".critical-fixtures.json");
  if (!existsSync(fixturePath)) {
    console.error("Run first: npm run prepare:critical-fixtures");
    process.exit(1);
  }

  const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
  const race = fixtures.race;
  const balance = fixtures.balance;
  if (!race?.approval_token) {
    console.error("Missing race fixture or approval_token. Run: npm run prepare:critical-fixtures");
    process.exit(1);
  }

  const raceJson = await approveOne(race.approval_token);
  if (!raceJson?.checkout_url) {
    console.error("host/approve race failed:", raceJson?.error || "no checkout_url");
    process.exit(1);
  }

  if (!balance?.approval_token) {
    console.error("Missing balance fixture. Run: npm run prepare:critical-fixtures");
    process.exit(1);
  }
  const balanceJson = await approveOne(balance.approval_token);
  if (!balanceJson?.checkout_url) {
    console.error("host/approve balance failed:", balanceJson?.error || "no checkout_url");
    process.exit(1);
  }

  console.log("");
  if (process.env.EMAIL_MODE === "test") {
    console.log("[INFO] EMAIL_MODE=test: guest emails redirected to TEST_EMAIL_OVERRIDE or ADMIN_EMAIL.");
    console.log("");
  }
  console.log("=== STRIPE PAYMENT FIXTURES READY ===");
  console.log("Pay BOTH checkouts (same Stripe account) then run: npm run verify:critical -- --only=2,3,4,6");
  console.log("");
  console.log("1) RACE (tests 2, 3, 6):", raceJson.booking_id);
  console.log("   ", raceJson.checkout_url);
  console.log("");
  console.log("2) BALANCE (test 4):", balanceJson.booking_id);
  console.log("   ", balanceJson.checkout_url);
  console.log("");
  console.log("Card: 4242 4242 4242 4242 | Exp: 12/34 | CVC: any | ZIP: any");
  console.log("(Test 6 refunds the RACE booking automatically.)");
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
