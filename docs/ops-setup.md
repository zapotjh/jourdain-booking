# 운영 설정 (Ops Setup)

## 1. ADMIN_EMAIL

관리자 알림 수신용 이메일. 미설정 시 admin 이메일은 skip되고 warn 로그만 출력됩니다.

**운영값:**

```bash
ADMIN_EMAIL=apt.jourdain.paris@gmail.com
```

- **로컬:** `.env.local`에 추가
- **Vercel:** Project → Settings → Environment Variables 에서 `ADMIN_EMAIL` 추가 (Production / Preview / Development 원하는 환경에)

---

## 1.1. EMAIL_MODE and TEST_EMAIL_OVERRIDE (로컬/테스트용)

Resend 샌드박스 또는 도메인 미검증 시에는 **검증된 수신 주소로만** 발송 가능합니다. 게스트 주소로 보내면 403 등으로 실패하므로, 테스트 모드에서는 게스트 메일을 안전한 수신처로 리다이렉트합니다.

**현재 테스트 모드 라우팅 (EMAIL_MODE=test):**

- **관리자 이메일** → `ADMIN_EMAIL` = **apt.jourdain.paris@gmail.com**
- **게스트 이메일** → `TEST_EMAIL_OVERRIDE` = **tojhlim@gmail.com** (모든 게스트 발송이 이 주소로 리다이렉트)

**설정 예시 (.env.local):**

```bash
ADMIN_EMAIL=apt.jourdain.paris@gmail.com
EMAIL_MODE=test
TEST_EMAIL_OVERRIDE=tojhlim@gmail.com
```

**운영 전환 (도메인 검증 완료 후):**

- `EMAIL_MODE=production` 으로 설정하거나 생략.
- `ADMIN_EMAIL=apt.jourdain.paris@gmail.com` 유지.
- `TEST_EMAIL_OVERRIDE` 제거 또는 미사용.
- 게스트 이메일은 실제 게스트 수신자로 발송됩니다.

---

## 2. Vercel Cron (vercel.json)

프로젝트 루트 `vercel.json`에 아래 cron이 정의되어 있습니다.

| Path | Schedule (UTC) | 설명 |
|------|----------------|------|
| `/api/cron/expire-pending-bookings` | 10분마다 (`*/10 * * * *`) | 결제 대기 만료 예약 취소 |
| `/api/cron/charge-balance` | 매일 08:00 (`0 8 * * *`) | 잔금 자동 결제 시도 |
| `/api/cron/send-checkin-reminder` | 매일 10:00 (`0 10 * * *`) | 체크인 1일 전 리마인더 발송 (Paris 기준 내일) |
| `/api/cron/reconcile-stripe-payments` | 매시 정각 (`0 * * * *`) | Stripe 결제 성공 but DB 미반영 시 복구 (안전망) |

- Cron 요청에는 **Vercel이 자동으로** `x-cron-secret` 헤더를 붙입니다. 환경변수 `CRON_SECRET`을 Vercel에 설정해야 합니다.
- **Vercel Pro 플랜 필요:** Cron Jobs 기능은 Pro 플랜 이상에서만 사용 가능합니다. 플랜 확인: [Vercel Pricing](https://vercel.com/pricing).

---

## 3. Check-in / access email policy (통일)

- **ACCESS INSTRUCTIONS (입실 안내)**  
  셀프 체크인/입실 안내 이메일은 **체크인 2일 전 이전**에는 발송하지 않는다. (invariant: `booking-invariants.md` §20)

- **CHECK-IN REMINDER (체크인 1일 전)**  
  **1일 전**에 발송하는 리마인더. 크론 경로는 **단일 경로만 사용:** `/api/cron/send-checkin-reminder` (복수형 `send-checkin-reminders` 아님).

- **라우트:** `app/api/cron/send-checkin-reminder/route.ts`
- **동작:** Paris 기준 **내일**이 `check_in`인 예약 중 `status=confirmed`, `payment_status=paid` 인 건에 대해 `sendGuestCheckinReminder1dEmail` + `sendAdminCheckinReminder1dEmail` 호출. 중복 발송 방지는 **email_log** 단일 소스 (alreadySentEmail `checkin_reminder_1d`). refunded 예약은 제외 (payment_status = paid 만 대상).
- **Vercel Cron:** `vercel.json`에 `"/api/cron/send-checkin-reminder"` 등록.
