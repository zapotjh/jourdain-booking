/**
 * Security deposit hold — 자동 검증 (DB / 로컬 vercel.json / 배포 URL / Stripe)
 *
 * 필요: 프로젝트 루트의 .env.local
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   CRON_SECRET, STRIPE_SECRET_KEY (Stripe PI 조회·캡처 시)
 *   NEXT_PUBLIC_SITE_URL 또는 BASE_URL (배포 URL; 기본 http://localhost:3000)
 *
 * 실행:
 *   node scripts/verify-security-deposit-hold.mjs
 *   node scripts/verify-security-deposit-hold.mjs --hold-smoke
 *   node scripts/verify-security-deposit-hold.mjs --hold-smoke --booking-id=<uuid> --allow-non-test
 *   node scripts/verify-security-deposit-hold.mjs --hold-then-release [--booking-id=... --allow-non-test]
 *   node scripts/verify-security-deposit-hold.mjs --full
 *   node scripts/verify-security-deposit-hold.mjs --full --booking-id=<uuid>
 *
 * --hold-smoke: 홀드만 검증 (캡처/릴리스 없음, STRIPE_SECRET_KEY 불필요).
 * --hold-then-release: 홀드 성공 후 POST /api/host/security-deposit/release 로 승인 취소(즉시).
 *   카드망 “며칠 뒤 자동 소멸”은 이 스크립트로 재현 불가(시간 필요). STRIPE_SECRET_KEY 있으면 PI=canceled 까지 확인.
 *
 * --full: [TEST]… 이름의 confirmed+paid 예약을 찾거나 --booking-id 지정,
 *         파리 오늘+3일 체크인으로 맞춘 뒤 홀드 cron → DB·Stripe 확인 →
 *         100센트 캡처 → 잔여 릴리스
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

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

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const BASE_URL =
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

const HOLD_COLS = [
  "stripe_security_deposit_payment_intent_id",
  "security_deposit_hold_status",
  "security_deposit_hold_created_at",
  "security_deposit_hold_released_at",
  "security_deposit_hold_captured_at",
  "security_deposit_hold_failure_reason",
  "last_security_deposit_hold_attempt_at",
].join(", ");

function arg(name) {
  const a = process.argv.find((x) => x.startsWith(`${name}=`));
  return a ? a.slice(name.length + 1) : null;
}

const FULL = process.argv.includes("--full");
const HOLD_SMOKE = process.argv.includes("--hold-smoke");
const HOLD_THEN_RELEASE = process.argv.includes("--hold-then-release");
const ALLOW_NON_TEST = process.argv.includes("--allow-non-test");
const BOOKING_ID_ARG = arg("--booking-id");

function log(title, ok, detail = "") {
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${title}${detail ? ` — ${detail}` : ""}`);
}

async function stepMigration() {
  const { createClient } = await import("@supabase/supabase-js");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log("DB 컬럼 확인", false, ".env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 없음");
    return false;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("bookings")
    .select(HOLD_COLS)
    .limit(1);

  if (error) {
    const msg = error.message || String(error);
    if (/column|does not exist/i.test(msg)) {
      log("DB 컬럼 확인", false, "MIGRATION NOT APPLIED — " + msg);
      return false;
    }
    log("DB 컬럼 확인", false, msg);
    return false;
  }
  log("DB 컬럼 확인", true, "bookings 에 홀드 컬럼 7개 조회 성공");

  const fakeId = "00000000-0000-4000-8000-000000000001";
  const { error: rpcErr } = await supabase.rpc("claim_security_deposit_hold_attempt", {
    p_booking_id: fakeId,
  });
  if (rpcErr) {
    const m = rpcErr.message || "";
    if (/function.*does not exist|Could not find/i.test(m)) {
      log("RPC claim_security_deposit_hold_attempt", false, "MIGRATION NOT APPLIED — " + m);
      return false;
    }
    log("RPC claim_security_deposit_hold_attempt", false, m);
    return false;
  }
  log("RPC claim_security_deposit_hold_attempt", true, "호출 가능(존재)");
  return true;
}

function stepVercelJson() {
  const p = join(process.cwd(), "vercel.json");
  if (!existsSync(p)) {
    log("vercel.json cron", false, "파일 없음");
    return false;
  }
  const j = JSON.parse(readFileSync(p, "utf8"));
  const crons = j.crons || [];
  const found = crons.find(
    (c) => c.path === "/api/cron/security-deposit-hold",
  );
  if (!found) {
    log("vercel.json cron", false, "path /api/cron/security-deposit-hold 없음");
    return false;
  }
  if (found.schedule !== "0 6 * * *") {
    log(
      "vercel.json schedule",
      false,
      `예상 0 6 * * * 인데 실제 ${found.schedule}`,
    );
    return false;
  }
  log("vercel.json", true, `cron ${found.path} @ ${found.schedule}`);
  return true;
}

async function stepHttp() {
  const url = BASE_URL.replace(/\/+$/, "");
  const path = "/api/cron/security-deposit-hold";

  const r401 = await fetch(`${url}${path}`, { redirect: "follow" });
  const noSecretOk = r401.status === 401;
  log(
    "배포 GET (시크릿 없음) → 401",
    noSecretOk,
    noSecretOk ? "ok" : `got ${r401.status} (404면 BASE_URL이 Next 앱이 아니거나 해당 배포에 라우트 없음)`,
  );

  if (!CRON_SECRET) {
    log("배포 GET (시크릿 있음) → 200", false, "CRON_SECRET 없음 — 스킵");
    return { httpOk: noSecretOk, warn404: r401.status === 404 };
  }

  const r200 = await fetch(`${url}${path}`, {
    headers: { "x-cron-secret": CRON_SECRET },
    redirect: "follow",
  });
  const text = await r200.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const ok200 = r200.status === 200 && json?.ok === true;
  log(
    "배포 GET security-deposit-hold → 200 + ok:true",
    ok200,
    ok200 ? `placed=${JSON.stringify(json.placed)}` : text.slice(0, 120),
  );
  return {
    httpOk: noSecretOk && ok200,
    warn404: r401.status === 404 || r200.status === 404,
  };
}

/** Paris calendar today + n days (same rule as lib/paris-time + SQL Paris date + n). */
function parisPlusDaysFromToday(plusDays) {
  const safe = Math.max(0, Math.floor(Number(plusDays)));
  const parisToday = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Paris",
  });
  const [y, mo, da] = parisToday.split("-").map(Number);
  const utc = Date.UTC(y, mo - 1, da + safe);
  return new Date(utc).toISOString().slice(0, 10);
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** @param {{ requireTestName: boolean }} opts */
async function resolveBookingRow(supabase, opts) {
  let bookingId = BOOKING_ID_ARG;
  let row;

  if (bookingId) {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id,guest_name,status,payment_status,stripe_payment_intent_id,check_in,check_out,security_deposit_hold_cents",
      )
      .eq("id", bookingId)
      .single();
    if (error || !data) {
      console.error("✗ booking not found:", error?.message);
      process.exit(1);
    }
    row = data;
    const hasTest = String(row.guest_name || "").includes("[TEST]");
    if (opts.requireTestName && !hasTest && !ALLOW_NON_TEST) {
      console.error(
        "✗ guest_name 에 [TEST] 없음 — 실제 예약이면 --allow-non-test 와 함께 --booking-id 로만 실행하세요",
      );
      process.exit(1);
    }
  } else {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id,guest_name,status,payment_status,stripe_payment_intent_id,check_in,check_out,security_deposit_hold_cents",
      )
      .like("guest_name", "[TEST]%")
      .eq("status", "confirmed")
      .eq("payment_status", "paid")
      .not("stripe_payment_intent_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (!data?.id) {
      console.error(
        "✗ [TEST]로 시작하는 guest_name 의 confirmed+paid+deposit PI 예약 없음. --booking-id=<uuid> 지정 또는 예약 생성 후 재시도",
      );
      process.exit(1);
    }
    row = data;
    bookingId = data.id;
  }

  return { bookingId, row };
}

async function prepareBookingForHoldCron(supabase, bookingId, row) {
  const checkIn = parisPlusDaysFromToday(3);
  const checkOutStr = addDaysYmd(checkIn, 2);

  console.log("\n--- 준비: 체크인 = 파리 오늘+3일, 홀드 필드 초기화 ---");
  const { error: upErr } = await supabase
    .from("bookings")
    .update({
      check_in: checkIn,
      check_out: checkOutStr,
      currency: "eur",
      security_deposit_hold_cents: Math.max(
        Number(row.security_deposit_hold_cents || 0),
        50000,
      ),
      stripe_security_deposit_payment_intent_id: null,
      security_deposit_hold_status: null,
      security_deposit_hold_created_at: null,
      security_deposit_hold_released_at: null,
      security_deposit_hold_captured_at: null,
      security_deposit_hold_failure_reason: null,
      last_security_deposit_hold_attempt_at: null,
    })
    .eq("id", bookingId);

  if (upErr) {
    console.error("✗ update failed:", upErr.message);
    process.exit(1);
  }
  console.log(`✓ booking ${bookingId} check_in=${checkIn} (Paris today+3d)`);
  return checkIn;
}

async function callHoldCronAndFetchRow(supabase, bookingId) {
  const base = BASE_URL.replace(/\/+$/, "");
  console.log("\n--- 홀드 cron 호출 ---");
  const holdRes = await fetch(`${base}/api/cron/security-deposit-hold`, {
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const holdJson = await holdRes.json().catch(() => ({}));
  console.log(JSON.stringify(holdJson, null, 2));

  const { data: afterHold } = await supabase
    .from("bookings")
    .select(HOLD_COLS)
    .eq("id", bookingId)
    .single();

  return { afterHold, holdJson, holdStatus: holdRes.status };
}

/** 홀드 크론까지 성공 시 bookingId, hold PI id, supabase 클라이언트 */
async function runHoldSmokeCore() {
  const { createClient } = await import("@supabase/supabase-js");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CRON_SECRET) {
    console.error(
      "✗ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET 필요",
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { bookingId, row } = await resolveBookingRow(supabase, {
    requireTestName: true,
  });

  await prepareBookingForHoldCron(supabase, bookingId, row);
  const { afterHold, holdJson, holdStatus } = await callHoldCronAndFetchRow(
    supabase,
    bookingId,
  );

  if (holdStatus !== 200 || !holdJson?.ok) {
    console.error("✗ cron 응답이 200+ok:true 가 아님");
    process.exit(1);
  }

  if (!afterHold?.stripe_security_deposit_payment_intent_id) {
    console.error(
      "✗ 홀드 PI 없음 — failure_reason:",
      afterHold?.security_deposit_hold_failure_reason,
    );
    process.exit(1);
  }

  if (afterHold.security_deposit_hold_status !== "held") {
    console.error(
      "✗ security_deposit_hold_status 가 held 가 아님:",
      afterHold.security_deposit_hold_status,
    );
    process.exit(1);
  }

  return {
    bookingId,
    piId: afterHold.stripe_security_deposit_payment_intent_id,
    supabase,
  };
}

/** 홀드 생성만 검증 (Stripe 키 불필요) */
async function holdSmokeFlow() {
  const { piId } = await runHoldSmokeCore();
  console.log("\n✓ HOLD SMOKE OK — PI:", piId);
}

/**
 * 홀드 → 호스트 release API(승인 취소). 실제 “며칠 후 자동 만료”는 미검증.
 * STRIPE_SECRET_KEY 있으면 PI status=canceled 확인.
 */
async function holdThenReleaseFlow() {
  const { bookingId, piId, supabase } = await runHoldSmokeCore();
  const base = BASE_URL.replace(/\/+$/, "");

  console.log("\n✓ 홀드 성공 — PI:", piId);
  console.log(
    "(참고) capture_method=manual + requires_capture 는 **캡처 전**이라 최종 청구 아님. 체크카드는 잔액에서 **가승인/보류**로 보일 수 있음.",
  );

  console.log("\n--- POST /api/host/security-deposit/release (즉시 승인 취소) ---");
  const relRes = await fetch(`${base}/api/host/security-deposit/release`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": CRON_SECRET,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const relText = await relRes.text();
  console.log(relRes.status, relText);

  if (!relRes.ok) {
    console.error("✗ release HTTP 실패");
    process.exit(1);
  }

  const { data: finalRow } = await supabase
    .from("bookings")
    .select("security_deposit_hold_status,security_deposit_hold_released_at")
    .eq("id", bookingId)
    .single();

  if (finalRow?.security_deposit_hold_status !== "released") {
    console.error("✗ DB security_deposit_hold_status 가 released 아님:", finalRow);
    process.exit(1);
  }

  if (!STRIPE_SECRET) {
    console.log(
      "\n⚠ STRIPE_SECRET_KEY 없음 — Stripe PI canceled 는 스킵. 넣으면 PI 상태까지 검증합니다.",
    );
    console.log("\n✓ HOLD → RELEASE OK (DB만 확인)");
    return;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });
  const pi = await stripe.paymentIntents.retrieve(piId);
  console.log("\n--- Stripe PI after release ---");
  console.log("status:", pi.status);

  if (pi.status !== "canceled") {
    console.error("✗ 기대: PI canceled, 실제:", pi.status);
    process.exit(1);
  }

  console.log(
    "\n✓ HOLD → RELEASE OK — DB released, Stripe PI canceled",
  );
  console.log(
    "(참고) **시간 경과 자동 소멸**은 카드사/네트워크 규칙(종종 수일) — 자동화하려면 Stripe Test Clock 등 별도 설정이 필요합니다.",
  );
}

async function fullFlow() {
  const { createClient } = await import("@supabase/supabase-js");
  const Stripe = (await import("stripe")).default;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CRON_SECRET || !STRIPE_SECRET) {
    console.error("✗ --full 는 SUPABASE_URL, SERVICE_ROLE, CRON_SECRET, STRIPE_SECRET_KEY 필요");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-02-25.clover" });
  const base = BASE_URL.replace(/\/+$/, "");

  const { bookingId, row } = await resolveBookingRow(supabase, {
    requireTestName: true,
  });

  await prepareBookingForHoldCron(supabase, bookingId, row);

  const { afterHold } = await callHoldCronAndFetchRow(supabase, bookingId);

  if (!afterHold?.stripe_security_deposit_payment_intent_id) {
    console.error("✗ 홀드 실패 — failure_reason:", afterHold?.security_deposit_hold_failure_reason);
    process.exit(1);
  }

  const piId = afterHold.stripe_security_deposit_payment_intent_id;
  const pi = await stripe.paymentIntents.retrieve(piId);
  console.log("\n--- Stripe PI ---");
  console.log("status:", pi.status, "capture_method:", pi.capture_method, "amount:", pi.amount);

  if (pi.metadata?.kind !== "security_deposit_hold") {
    console.error("✗ metadata.kind mismatch");
    process.exit(1);
  }

  console.log("\n--- 캡처 100센트 ---");
  const capRes = await fetch(`${base}/api/host/security-deposit/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": CRON_SECRET,
    },
    body: JSON.stringify({ booking_id: bookingId, amount_cents: 100 }),
  });
  const capText = await capRes.text();
  console.log(capRes.status, capText);

  const { data: afterCap } = await supabase
    .from("bookings")
    .select(
      "security_deposit_hold_captured_at,security_deposit_hold_status",
    )
    .eq("id", bookingId)
    .single();

  if (!afterCap?.security_deposit_hold_captured_at) {
    console.error("✗ 캡처 후 DB captured_at 없음");
    process.exit(1);
  }

  console.log("\n--- 잔여 릴리스 ---");
  const relRes = await fetch(`${base}/api/host/security-deposit/release`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": CRON_SECRET,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  console.log(relRes.status, await relRes.text());

  const { data: finalRow } = await supabase
    .from("bookings")
    .select(
      "security_deposit_hold_status,security_deposit_hold_released_at",
    )
    .eq("id", bookingId)
    .single();

  const piFinal = await stripe.paymentIntents.retrieve(piId);
  console.log("최종 PI status:", piFinal.status);

  if (finalRow?.security_deposit_hold_status !== "released") {
    console.error("✗ 최종 status released 아님:", finalRow);
    process.exit(1);
  }

  console.log("\n✓ FULL PASS — 홀드 → 캡처(100) → 릴리스(잔여) 완료");
}

async function main() {
  console.log("BASE_URL:", BASE_URL);

  const modeCount = [FULL, HOLD_SMOKE, HOLD_THEN_RELEASE].filter(Boolean).length;
  if (modeCount > 1) {
    console.error(
      "✗ --full / --hold-smoke / --hold-then-release 중 하나만 쓰세요",
    );
    process.exit(1);
  }

  const m = await stepMigration();
  const v = stepVercelJson();
  const http = await stepHttp();

  if (!m) {
    console.log("\n→ Supabase SQL Editor 에서 migrations/11_security_deposit_hold.sql 실행 필요.");
    process.exit(1);
  }
  if (!v) process.exit(1);

  if (HOLD_SMOKE || HOLD_THEN_RELEASE) {
    if (http.warn404) {
      console.error(
        "\n✗ BASE_URL 404 — .env.local 의 NEXT_PUBLIC_SITE_URL(또는 BASE_URL)을 프로덕션 도메인으로 설정하세요.",
      );
      process.exit(1);
    }
    if (!CRON_SECRET) {
      console.error("\n✗ CRON_SECRET 없음");
      process.exit(1);
    }
    if (HOLD_THEN_RELEASE) {
      await holdThenReleaseFlow();
    } else {
      await holdSmokeFlow();
    }
    return;
  }

  if (FULL) {
    if (http.warn404) {
      console.error(
        "\n✗ BASE_URL에서 API가 404입니다. Vercel 프로젝트의 Production URL(예: xxx.vercel.app)로 BASE_URL 또는 NEXT_PUBLIC_SITE_URL을 맞춘 뒤 다시 실행하세요.",
      );
      process.exit(1);
    }
    if (!http.httpOk) {
      console.error("\n✗ HTTP 검증 실패 — --full 중단");
      process.exit(1);
    }
    await fullFlow();
    return;
  }

  if (http.warn404) {
    console.log(
      "\n⚠ 배포 URL 확인: 이 호스트에서 /api/cron/security-deposit-hold 가 열리지 않습니다. Vercel 배포 주소로 BASE_URL을 설정하세요.",
    );
  } else if (!http.httpOk) {
    process.exit(1);
  }
  console.log(
    "\n✓ 기본 자동 검증 완료. 홀드: --hold-smoke | 홀드+릴리스: --hold-then-release | 전체(1€캡처+릴리스): --full",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
