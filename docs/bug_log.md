# Bug Log — L'appartement Jourdain Booking System

> 새 대화를 시작하는 AI 에이전트는 이 파일을 먼저 읽어 기존에 해결된 문제를 파악하세요.

---

## ✅ 해결된 버그

---

### [2026-03-06] CRON_SECRET 환경변수 미설정

**상태:** 해결됨 | **파일:** `.env.local`

`openssl rand -hex 32` 명령어를 실행해 출력된 hex 값을 `.env.local`에 저장. dev 서버 재시작 필수.

---

### [2026-03-06] bookings_admin_view에 canceled_at 누락

**상태:** 해결됨 | **파일:** `supabase/migrations/02_bookings_admin_view.sql`

`DROP VIEW IF EXISTS` 후 `canceled_at` 포함하여 재생성. 마이그레이션 파일 동기화.

---

### [2026-03-06] 잘못된 프로젝트 루트 사용

**상태:** 해결됨 (지속 주의)

항상 `/Users/imac/jourdain-booking/jourdain-booking` 만 사용. outer dir 사용 금지.

---

### [2026-03-14] host/approve — Stripe API version 불일치

**상태:** 해결됨 | **파일:** `app/api/host/approve/route.ts`

`"2025-02-24.acacia"` → `"2026-02-25.clover"` 로 수정. 전체 라우트 통일.

---

### [2026-03-14] host/approve — idempotent path Email B 미발송

**상태:** 해결됨 | **파일:** `app/api/host/approve/route.ts`

기존 세션 재사용 경로에 `sendGuestApprovedPaymentLinkEmail()` 호출 추가.
`resolvedExpiresAt`: backfill한 `expiresIso`를 email에 직접 사용.

---

### [2026-03-14] host/approve — idempotent guard에서 confirmed/canceled 예약도 reuse 진입

**상태:** 해결됨 | **파일:** `app/api/host/approve/route.ts`

guard 조건: `booking.stripe_session_id && booking.status === "payment_pending"`.
`confirmed` / `canceled` 상태는 409 guard로 처리됨.

---

### [2026-03-14] host/approve — expiresAt DB 값과 email 값 불일치

**상태:** 해결됨 | **파일:** `app/api/host/approve/route.ts`

**원인:** DB update에 inline `new Date(...)`, 이메일 payload에 별도 `new Date(...)` 사용.
**해결:** `const expiresAt = ...` 하나를 먼저 선언하고 DB update + email payload 양쪽에 동일 값 사용.

---

### [2026-03-14] webhook — confirmedAt이 null인 pre-fetch 값 사용

**상태:** 해결됨 | **파일:** `app/api/webhook/route.ts`

```typescript
const row = {
  ...existing,
  confirmed_at: updated?.confirmed_at ?? existing.confirmed_at ?? new Date().toISOString(),
  status: updated?.status ?? existing.status,
};
```

---

### [2026-03-14] charge-balance — today 날짜 UTC 기준

**상태:** 해결됨 | **파일:** `app/api/cron/charge-balance/route.ts`

```typescript
// 변경 전 (UTC)
const todayIsoDate = new Date().toISOString().slice(0, 10);
// 변경 후 (Europe/Paris)
const todayParis = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
```

---

### [2026-03-14] charge-balance — 컬럼명 불일치 (balance payment intent ID)

**상태:** 해결됨

Canonical: **`stripe_balance_payment_intent_id`** (DB update 구문 기준).
문서 및 로그 출력 전체 통일 완료.

---

### [2026-03-14] charge-balance — 실패 이메일 중복 발송 위험

**상태:** 해결됨 | **파일:** `app/api/cron/charge-balance/route.ts`

**원인:** 실패 경로에서 DB update 결과와 무관하게 항상 failure email 발송.
이미 다른 프로세스가 `balance_paid=true`로 처리했어도 실패 이메일이 나갈 수 있었음.

**해결:** 모든 실패 path에 `.select("id").maybeSingle()` 추가. `updatedFailRow` 가 null이 아닐 때만 이메일 발송.
```typescript
if (updatedFailRow) {
  await sendBalanceFailedEmails(...);
} else {
  console.log("skipping failure email: balance_paid already true or row gone");
}
```

---

### [2026-03-14] charge-balance — balance_payment_attempts null-safe 미처리

**상태:** 해결됨 | **파일:** `app/api/cron/charge-balance/route.ts`

**원인:** `.lt("balance_payment_attempts", 3)` 는 DB column이 null인 경우 해당 행을 제외함.

**해결:**
```typescript
.or("balance_payment_attempts.is.null,balance_payment_attempts.lt.3")
```
**권장:** DB에서 `balance_payment_attempts NOT NULL DEFAULT 0` 보장. 현재 쿼리로 방어.

---

### [2026-03-14] charge-balance — 성공 시 balance_payment_attempts 미reset

**상태:** 해결됨 | **파일:** `app/api/cron/charge-balance/route.ts`

성공 path의 DB update에 `balance_payment_attempts: 0` 추가.
성공 후 clean slate 상태로 유지.

---

## ⚠️ 미해결 버그 / 잠재적 문제

---

### [미해결] ADMIN_EMAIL 미설정

**상태:** 미해결 | **파일:** `.env.local`

`ADMIN_EMAIL` 미설정 시 admin 이메일 skip + warn 로그만 출력됨. 실제 이메일 주소 입력 필요.

---

### [잠재적] Webhook vs Expiry Cron Race Condition

**상태:** 방어 중 (완전 보장 아님)

현재 cron은 `payment_status != 'paid'` 조건으로 방어 중.
Supabase transaction 또는 RLS 추가 검토 권장.

---

### [잠재적] charge-balance — Double Charge 위험

**상태:** 부분 방어 | **파일:** `app/api/cron/charge-balance/route.ts`

Stripe charge 실행 후 DB update 전 crash 시 재시도로 이중 청구 가능.

**현재 방어:** `.eq("balance_paid", false)` optimistic lock. 이미 true면 success update가 0 rows → success email skip.

**권장 강화 (Phase 9 미구현):** Stripe idempotency key `booking_id-balance-attempt-N` 전달.

---

### [잠재적] charge-balance — 1일 1회 재시도 코드 레벨 미보장

**상태:** 문서화 완료 (설계 의도)

**내용:**
"retry_interval = 1 day" 는 daily cron schedule(`0 8 * * *`)로만 보장됨.
코드 내부에 `balance_payment_failed_at` 기반 24h lock 없음. cron이 더 자주 실행될 경우 같은 날 여러 번 시도 가능.

**결정:** 현재는 daily cron으로 충분하다고 판단. 필요시 `balance_payment_failed_at` 체크 조건 추가.

---

## 📋 향후 추가 시 주의사항

| 항목 | 주의 |
|---|---|
| 금액 | cents integer 전용. float EUR 금지 |
| Stripe currency | `"eur"` 고정 |
| Stripe API version | `"2026-02-25.clover"` 통일 |
| 이메일 발송 | `send-with-log.ts` 함수만 사용 |
| 이메일 실패 | rollback 없이 catch → log만 |
| balance_due_at | `Europe/Paris` 기준 오늘 날짜 (`sv-SE` locale) |
| expiresAt | 단일 변수로 DB + email에 동일 값 사용 |
| 실패 이메일 | DB update row 확인 후에만 발송 |
| balance 성공 | `balance_payment_attempts = 0` reset |
| 재시도 정책 | daily cron 기준. 코드 레벨 24h lock 없음 |
| stripe_balance_payment_intent_id | canonical 컬럼명 |
| balance_payment_attempts | NOT NULL DEFAULT 0 DB 보장 필요 |
| approve idempotent guard | `stripe_session_id AND status === "payment_pending"` |
