# Task List — L'appartement Jourdain Booking System

> AI 에이전트용 작업 목록입니다.
> 새 대화를 시작할 때 이 파일과 `bug_log.md`, `booking-system-architecture.md`, `booking-system-prd.md`를 먼저 읽고 이어서 작업하세요.

---

## ⚠️ AI 에이전트 필독 원칙

| 원칙 | 값 / 내용 |
|---|---|
| Short stay canonical | `BALANCE_DUE_DAYS_SHORT = 14` — 절대 변경 금지 |
| 이메일 발송 | `lib/emails/send-with-log.ts` 함수만 사용. `lib/send-payment-email.ts` 금지 |
| 이메일 실패 | rollback 없이 catch → log만 |
| 금액 | 항상 cents integer. float EUR 금지 |
| Stripe currency | `"eur"` 고정 |
| Stripe API version | `"2026-02-25.clover"` (모든 라우트) |
| balance_due_at 비교 | `Europe/Paris` 기준 오늘 날짜. UTC 사용 금지 |
| balance PaymentIntent 컬럼 | `stripe_balance_payment_intent_id` canonical |
| approve idempotent guard | `stripe_session_id && status === "payment_pending"` |
| approve expiresAt | `const expiresAt` 하나를 DB update와 email payload에 동시 사용 |
| balance_payment_attempts | 현재 재시도 카운터 (성공 시 0 리셋). 평생 누적 아님. NOT NULL DEFAULT 0 권장, 쿼리 null 방어 |
| balance_payment_attempts 성공 시 | `0` 으로 reset (성공 후 clean slate) |
| 실패 이메일 guard | DB update `.select("id").maybeSingle()` 후 row 반환 시만 발송 |
| 재시도 1일 1회 | DB RPC `claim_balance_attempt(booking_id)` 로 Paris 기준 1일 1회 claim 후 Stripe 호출. 동시 cron 중복 방지. |
| 보증금 홀드 이메일 | 실패/성공 모두 `send-with-log.ts` (`security_deposit_hold_failed` 는 `metadata.paris_date` 로 파리 달력일당 dedupe). |
| 프로젝트 루트 | `/Users/imac/jourdain-booking/jourdain-booking` 만 사용 |

---

## Phase 0 — 문서 정합성 ✅ 완료

---

## Phase 1 — Email A, A2 (request-booking) ✅ 완료

- [x] `lib/emails/email-a.ts`, `lib/emails/email-a2.ts` 생성
- [x] `app/api/request-booking/route.ts` 에 Email A, A2 연결

---

## Phase 2 — Email B (host/approve) ✅ 완료

- [x] `lib/emails/email-b.ts` 생성
- [x] `app/api/host/approve/route.ts` 에 Email B 연결 (신규 + 재사용 path)
- [x] Idempotent guard: `stripe_session_id && status === "payment_pending"`
- [x] expiresAt: `const expiresAt` 하나로 DB update + email payload 동시 사용 (일치 보장)
- [x] Race-safe DB update: `.eq("status", "pending_approval")` + `.maybeSingle()` 체크
- [x] Stripe API version `"2026-02-25.clover"`

---

## Phase 3 — Email C, C2 + Webhook Idempotency ✅ 완료

- [x] `lib/emails/email-c.ts`, `lib/emails/email-c2.ts` 생성
- [x] `app/api/webhook/route.ts` 에 Email C, C2 연결
- [x] Webhook idempotency: `status === 'confirmed'` 이면 skip
- [x] `confirmedAt`: `updated?.confirmed_at` 우선 사용 (row merge)

---

## Phase 5 — Balance Auto-Charge Cron ✅ 완료

> DB 컬럼 전제 (`NOT NULL DEFAULT 0` 보장 권장):
> `balance_paid`, `balance_payment_attempts`, `stripe_balance_payment_intent_id`,
> `balance_paid_at`, `balance_payment_failed_at`, `balance_payment_failure_reason`

- [x] `app/api/cron/charge-balance/route.ts` 구현 완료
  - GET, x-cron-secret 보호
  - `todayParis`: Europe/Paris 기준 (`sv-SE` locale)
  - 쿼리: `.or("balance_payment_attempts.is.null,balance_payment_attempts.lt.3")` — null-safe
  - Stripe off-session PaymentIntent (deposit PI Customer + PM 재사용, Customer PM fallback)
  - **실패 이메일**: DB update `.select("id").maybeSingle()` 결과가 있을 때만 발송 (duplicate guard)
  - **성공 시**: `balance_payment_attempts = 0` reset, `balance_payment_failed_at/reason = null`
  - **1일 1회 재시도**: DB RPC `claim_balance_attempt` 로 행 단위 claim 후 Stripe 호출 (동시 cron 이중 청구 방지)
  - max 3회 실패 후 중단, admin 수동 처리 안내
- [x] Stripe API version `"2026-02-25.clover"`
- [x] `stripe_balance_payment_intent_id` 컬럼명 통일
- [x] Stripe idempotency key `balance:{booking_id}:attempt:{N}` + DB claim으로 이중 청구 방지

---

## Phase 6 — 체크인 리마인더 Cron ✅ 완료

- [x] `lib/emails/email-checkin.ts` 생성 완료
- [x] `app/api/cron/send-checkin-reminder/route.ts` 구현
  - 조건: status=confirmed, payment_status=paid, check_in = tomorrow (Europe/Paris 기준)
  - `sendGuestCheckinReminder1dEmail()` + `sendAdminCheckinReminder1dEmail()`
  - **중복 방지**: `email_log` 단일 소스 (alreadySentEmail `checkin_reminder_1d`). `checkin_email_sent` 컬럼은 사용하지 않음.

---

## Phase 7 — 환경변수

- [x] CRON_SECRET 설정 완료
- [x] **ADMIN_EMAIL** — 운영값 `apt.jourdain.paris@gmail.com` (로컬 `.env.local` 및 Vercel 환경변수에 설정, 문서: `docs/ops-setup.md`)
- [ ] Vercel 환경변수 전체 동기화 확인

---

## Phase 8 — Vercel Cron 설정 ✅ 완료

- [x] `vercel.json` 에 cron 추가 (루트 `vercel.json` 참고)
- [x] Vercel Pro 플랜 확인 — Cron 사용 시 Pro 필요 (`docs/ops-setup.md` 참고)

---

## Phase 9 — charge-balance Stripe Idempotency + DB claim ✅ 완료

- [x] PaymentIntent 생성 시 idempotency key: `balance:{booking_id}:attempt:{N}` (`N = balance_payment_attempts + 1`)
- [x] DB RPC `claim_balance_attempt(booking_id)` 로 Paris 기준 1일 1회 행 claim 후 Stripe 호출 (동시 cron 이중 시도 방지)

---

## Phase 10 — Security deposit hold (Stripe manual capture) ✅ 완료

- [x] `supabase/migrations/11_security_deposit_hold.sql` — hold 컬럼 + `claim_security_deposit_hold_attempt(booking_id)` (+ `13_security_deposit_hold_three_days_before.sql` — claim RPC: Paris 기준 `check_in` = 오늘+3일)
- [x] `GET /api/cron/security-deposit-hold` — 파리 기준 `check_in === 오늘+3일` 인 confirmed+paid 예약만 (체크인 3일 전 홀드 시도), 별도 PI (`capture_method: manual`, metadata `kind=security_deposit_hold`). 보증금 금액: 숙박 ≤14박 €500, >14박 €1,200 (`security_deposit_hold_cents`)
- [x] Stripe idempotency: `security_deposit_hold:{booking_id}:{paris_today}:{claim_timestamp}` (per successful claim)
- [x] `POST /api/host/security-deposit/release` — authorization 해제 (cancel)
- [x] `POST /api/host/security-deposit/capture` — partial/full capture (`amount_cents` 선택)
- [x] `vercel.json` cron: `/api/cron/security-deposit-hold` (UTC 스케줄; 로직은 전부 Europe/Paris)
- [x] 홀드 성공/실패 시 게스트+운영자 이메일 (`send-with-log`), `supabase/migrations/12_email_log_security_deposit_hold_failed.sql` 로 `email_log` unique 예외

> NOTE (REV 2): 신규 예약은 `security_deposit_amount_cents > 0` 를 사용하며, 보증금은 잔금 결제 시 함께 청구(환불)됩니다. 따라서 신규 예약에는 **홀드 크론이 적용되면 안 됩니다** (legacy rows only).

---

## Phase 11 — Check-out reminders + security deposit refund workflow (REV 2) ✅

- [x] 체크아웃 1일 전 리마인더 크론: `GET /api/cron/send-checkout-reminder`
  - 조건: status=confirmed, payment_status=paid, check_out = tomorrow (Europe/Paris 기준)
  - 게스트: `checkout_reminder_guest`
  - 관리자: `checkout_reminder_admin`
- [x] 체크아웃 후 보증금 환불 링크 발송 크론: `GET /api/cron/send-security-deposit-refund-link`
  - 조건: status=confirmed, payment_status=paid, balance_paid=true, security_deposit_amount_cents>0, check_out <= todayParis
  - 1회만 발송: `security_deposit_refund_link_sent_at IS NULL`
  - 토큰 생성/저장: `security_deposit_refund_token`
  - 관리자 이메일: `security_deposit_refund_request_admin`
- [x] 24시간 후 리마인더 크론: `GET /api/cron/remind-security-deposit-refund-link`
  - 조건: 위와 동일 + check_out <= yesterdayParis + refunded=false + reminder_sent_at IS NULL
  - 관리자 이메일: `security_deposit_refund_reminder_admin`
- [x] 관리자 환불 페이지: `/admin/refund-deposit?booking_id=...&token=...`
  - 버튼 “보증금 환불 실행” → `POST /api/admin/refund-deposit`
  - Stripe 부분 환불: amount = `security_deposit_amount_cents` (절대 전체 환불 금지)
  - 멱등: Stripe idempotencyKey + DB 업데이트 가드(`security_deposit_refunded=false` AND `stripe_deposit_refund_id IS NULL`)
- [x] 이메일 제목 규칙: Korean-first subject 필수 (English는 보조/옵션만)
