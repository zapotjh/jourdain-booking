# 핵심 검증 6개 (운영 전 필수)

아래 6가지를 자동 스크립트로 검증합니다. 모두 통과하면 운영 배포해도 됩니다.

```bash
npm run verify:critical
# 또는
node scripts/verify-critical-six.mjs
# 특정 검증만 실행
npm run verify:critical -- --only=2,3,4,6
```

**필요 조건:** `.env.local`에  
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`  
설정. `BASE_URL` 기본값 `http://localhost:3000` (서버 실행 후 실행).

**이메일 테스트 모드:** `EMAIL_MODE=test` 시 관리자 메일은 **apt.jourdain.paris@gmail.com**, 게스트 메일은 **tojhlim@gmail.com** (TEST_EMAIL_OVERRIDE)로 발송됩니다. Resend 도메인 미검증/샌드박스 제한 때문에 게스트 메일을 검증된 수신처로 리다이렉트하는 것이며, 검증 스크립트는 `email_log`에 `intended_to_email` ≠ `actual_to_email`, `email_mode=test`, `redirected=true`인 경우를 정상 발송(PASS)으로 인정합니다. 자세한 내용은 `docs/email-log-system.md` §0, `docs/ops-setup.md` §1.1 참고.

---

## 1. 중복 웹훅

- **검증:** 같은 Stripe event를 두 번 보냄 → 두 번째는 `200` + `duplicate: true`. `stripe_webhook_events`에 해당 event row 1개만 존재.
- **자동:** Stripe에서 최근 이벤트 1개 조회 후 동일 payload로 웹훅 2회 호출, DB row 수 확인.

---

## 2. expire vs webhook race

- **검증:** `payment_pending` 예약을 만료 직전으로 두고 expire cron과 webhook를 거의 동시에 호출 → 최종 상태는 `confirmed` (canceled 아님). admin reconciliation alert 1회만 기록.
- **자동:** 예약 생성 → 승인 → DB에서 `payment_pending_expires_at` 과거로 설정 → expire cron 호출 → 해당 세션의 PaymentIntent confirm → 대기 후 booking status 확인.
- **SKIP:** Checkout Session에 `payment_intent`가 아직 없으면 스킵 (세션 생성 직후에는 Stripe가 PI를 채우지 않을 수 있음). 수동으로 결제 완료한 뒤 같은 DB/웹훅 조건으로 한 번 더 검증 권장.

---

## 3. reconcile cron

- **검증:** 웹훅을 일부러 놓친 상태(paid session인데 booking은 payment_pending)를 만들고 `reconcile-stripe-payments` 호출 → paid session 기준으로 confirmed 복구.
- **자동:** 예약 생성 → 승인 → PI confirm (세션 paid) → 대기 후 booking을 다시 payment_pending으로 되돌림 → reconcile cron 호출 → confirmed 복구 여부 확인.
- **SKIP:** Session에 `payment_intent` 없으면 스킵.

---

## 4. balance double-charge

- **검증:** 같은 booking으로 charge-balance를 거의 동시에 2번 호출 → 한 쪽만 claim 성공, 다른 쪽은 skip. `claim_balance_attempt`로 이중 청구 방지.
- **자동:** `confirmed` + `payment_status=paid` + `balance_paid=false` + `balance_due_at` 과거 + `stripe_payment_intent_id` 있는 예약 1건 선택 후 charge-balance 2회 동시 호출, `last_balance_attempt_at` 설정 여부 확인.
- **SKIP:** 조건을 만족하는 예약이 없으면 스킵.

---

## 5. check-in reminder dedupe

- **검증:** 같은 날 `send-checkin-reminder`를 두 번 실행 → `checkin_reminder_1d`가 guest/admin 각 1회만 (총 2건, 중복 없음). email_log가 단일 진실원.
- **자동:** Paris 기준 내일이 check_in인 confirmed+paid 예약 1건 사용(없으면 기존 예약의 check_in을 내일로 임시 변경) → reminder cron 2회 호출 → email_log에서 해당 booking의 `checkin_reminder_1d` 개수 ≤ 2 확인.

---

## 6. refund/dispute

- **검증:** 테스트용 refund webhook(또는 실제 refund) 후 `payment_status=refunded`, `status=canceled`, admin `refund_alert` 1회 기록. 이후 check-in reminder / charge-balance 대상에서 제외.
- **자동:** confirmed+paid 예약 1건의 `stripe_payment_intent_id`로 PI 조회 → charge에 refund 생성 → 대기 후 booking 상태·email_log·크론 대상 제외 여부 확인.
- **SKIP:** PI 조회 실패(다른 Stripe 계정/이미 삭제 등) 또는 refund 생성 실패 시 스킵.

---

## 결과 해석

- **PASS:** 해당 검증 통과.
- **SKIP:** 환경/데이터 부족으로 검증을 수행하지 않음. 조건을 만족하면 다시 실행 시 PASS 가능.
- **FAIL:** assertion 실패 → 로그 확인 후 수정 필요.

실패가 0이면(모든 항목이 PASS 또는 SKIP) exit code 0. 하나라도 FAIL이면 exit code 1.

---

## 단계별 실행 (테스트 2, 3, 4, 6 통과용)

테스트 2·3·4·6은 **실제 Stripe 결제 1회**가 필요합니다. 아래 순서대로 하면 최소 수동 작업으로 통과할 수 있습니다.

### 1) 한 번만: 픽스처 생성

DB에 검증용 테스트 예약 4건([TEST] Race / Reconcile / Balance / Refund)을 만듭니다. 이미 있으면 재사용합니다.

```bash
npm run prepare:critical-fixtures
```

출력에 나온 예약 ID들을 `scripts/.critical-fixtures.json`에 저장합니다.

### 2) Stripe 결제 링크 준비

픽스처 중 하나(race)를 승인해 Checkout URL을 받습니다.

```bash
npm run prepare:stripe-fixtures
```

출력에 **열어야 할 URL**과 **사용할 테스트 카드**가 나옵니다.

### 3) 수동 결제 (1회)

1. 출력된 **Checkout URL**을 브라우저에서 연다.
2. Stripe 테스트 카드로 결제:
   - 카드: `4242 4242 4242 4242`
   - 유효기간: 아무 미래 날짜 (예: 12/34)
   - CVC: 아무 3자리
   - ZIP: 아무 값
3. 결제 완료될 때까지 진행한다.

### 4) 검증 실행

결제가 끝난 뒤 아래 명령으로 테스트 2·3·4·6을 실행합니다. 한 번 결제한 예약 하나로 2 → 3 → 4 → 6 순서로 자동 검증합니다.

```bash
npm run verify:critical -- --only=2,3,4,6
```

전체 6개를 돌리려면:

```bash
npm run verify:critical
```

### 5) 결과 해석

- **PASS:** 해당 검증 통과.
- **SKIP:** 필요한 데이터가 없을 때. 출력된 `→ Next:` 안내대로 픽스처/결제 준비 후 다시 실행.
- **FAIL:** assertion 실패. 로그 확인 후 수정 필요.

**참고:** 테스트 6(refund/dispute)은 검증 스크립트가 Stripe API로 refund를 생성한 뒤 웹훅 처리·DB·이메일을 확인합니다. dispute는 자동화되지 않으며, 필요 시 Stripe 대시보드에서 수동으로 진행할 수 있습니다.
