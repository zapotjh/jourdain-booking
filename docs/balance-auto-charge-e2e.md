# Balance auto-charge — End-to-end 테스트 시나리오

`/api/cron/charge-balance` 동작 검증용 시나리오.  
호출 시 `x-cron-secret: <CRON_SECRET>` 헤더 필요.

---

## 공통 전제

- 대상 예약은 `status=confirmed`, `payment_status=paid`, `balance_paid=false`, `balance_due_at <= 오늘(Paris)`, `stripe_payment_intent_id` 있음, `balance_payment_attempts < 3`.
- Cron은 위 조건으로 조회한 뒤, 건별로 Stripe에 balance PaymentIntent 생성·확정 후 성공 시 DB에 `balance_paid=true` 반영.

---

## 1. 성공 케이스

**목적:** 정상적으로 잔금이 결제되고 DB가 갱신되는지 확인.

**준비:**

- `status=confirmed`, `payment_status=paid`, `balance_paid=false`, `balance_due_at` = 오늘 이전, `stripe_payment_intent_id` 존재.
- 해당 deposit PaymentIntent의 customer에 사용 가능한 결제 수단이 있음.

**실행:**

```bash
curl -s -X GET "https://<YOUR_DOMAIN>/api/cron/charge-balance" \
  -H "x-cron-secret: $CRON_SECRET"
```

**기대:**

- 응답 `{ "ok": true, "charged": ["<booking_id>"], "failures": [] }` (해당 예약이 charged에 포함).
- DB: 해당 예약의 `balance_paid=true`, `balance_paid_at` 설정, `stripe_balance_payment_intent_id` 설정.
- 게스트/관리자 잔금 결제 완료 이메일 발송 및 `email_log` 에 `balance_payment_succeeded` 기록.

**재호출 시 (이미 balance_paid=true):**

- 같은 예약은 조회 대상에서 제외됨 (`balance_paid=false` 조건).
- charged에 포함되지 않음 → **이미 balance_paid 인 예약 skip** 동작 확인.

---

## 2. Payment method 없음 — 실패 케이스

**목적:** deposit 시 사용한 Stripe customer에 재사용 가능한 결제 수단이 없을 때 실패 처리·이메일·attempt 증가만 되고, 이중 결제는 발생하지 않는지 확인.

**준비:**

- 위와 같은 조건의 예약 하나.
- 해당 예약의 `stripe_payment_intent_id` 로 조회한 PaymentIntent의 customer에서:
  - 결제 수단을 Stripe Dashboard에서 제거하거나,
  - 테스트용 customer를 새로 만들고 `stripe_payment_intent_id`만 그 customer의 PI로 바꾼 예약 사용 (실무에서는 어렵고, 보통은 customer에서 카드 제거로 시뮬레이션).

**실행:**

- 동일하게 `/api/cron/charge-balance` 호출.

**기대:**

- 응답에 해당 `booking_id`가 `failures` 배열에 포함되고, reason에 `no reusable payment_method for customer` (또는 유사) 포함.
- DB: `balance_paid` 는 그대로 false, `balance_payment_attempts` +1, `balance_payment_failed_at` / `balance_payment_failure_reason` 설정.
- 게스트/관리자 잔금 결제 실패 이메일 발송, `email_log` 에 `balance_payment_failed` (attempt 1).
- Stripe에는 balance 용 PaymentIntent가 생성되지 않거나, 실패한 PI만 존재 (실제 청구 완료 없음).

---

## 3. 3회 실패 후 중단 케이스

**목적:** 같은 예약에 대해 실패가 3번 누적되면 더 이상 시도하지 않는지 확인.

**준비:**

- `balance_payment_attempts` 가 이미 2 인 예약 (이전에 2번 실패한 상태).
- 세 번째 시도에서도 실패하도록 (payment method 없음, 또는 카드 거절 등).

**실행:**

- `/api/cron/charge-balance` 호출 (1회).

**기대:**

- 해당 예약에 대해 실패 처리되고 `balance_payment_attempts` 가 3이 됨.
- 다음 cron 실행 시: 조회 조건에 `balance_payment_attempts < 3` 이 있으므로 이 예약은 **선택되지 않음**.
- 같은 예약으로 cron을 다시 여러 번 호출해도 charged/failures에 더 이상 해당 예약이 나오지 않음 → **3회 실패 후 중단** 확인.

**추가 검증:**

- `balance_payment_attempts` 를 0으로 돌리고, payment method 없음 상태로 cron을 연속 3번 실행하면, 1/2/3차 시도가 각각 실패하고 4번째 실행부터는 해당 예약이 대상에서 제외되는지 확인.

---

## 4. 이미 balance_paid=true 인 예약 skip 케이스

**목적:** 이미 잔금 결제가 완료된 예약은 조회·결제 대상에서 제외되는지 확인.

**준비:**

- `status=confirmed`, `payment_status=paid`, **`balance_paid=true`**, `balance_paid_at` 설정된 예약.

**실행:**

- `/api/cron/charge-balance` 호출.

**기대:**

- 해당 예약은 `balance_paid=false` 조건 때문에 조회되지 않음.
- 응답의 `charged` / `failures` 에 해당 `booking_id` 없음.
- Stripe에 해당 예약에 대한 새 balance PaymentIntent 생성 없음.
- (선택) DB에서 해당 예약만 `balance_paid=false` 로 바꾼 뒤 cron 호출 시, 그 시점에는 charged에 포함될 수 있으나, 한 번 성공 처리된 뒤 다시 cron을 돌리면 그 다음부터는 다시 skip됨.

---

## 5. Idempotency (중복 결제 방지)

**목적:** 같은 attempt에 대해 Stripe idempotency key로 동일 요청이 두 번 가도 한 번만 결제되는지 확인.

**방법:**

- 동일 예약·동일 attempt에서 cron이 짧은 시간 안에 두 번 실행되거나, 네트워크 재시도로 `stripe.paymentIntents.create(..., { idempotencyKey: '<booking_id>-balance-attempt-<N>' })` 가 두 번 호출되는 상황을 시뮬레이션.
- **기대:** Stripe가 같은 idempotency key로 한 번만 결제를 생성하고, 두 번째 요청은 첫 번째와 동일한 PaymentIntent를 반환. DB 업데이트도 조건 `balance_paid=false` 로 한 번만 성공.

---

## 요약 표

| 시나리오 | 조회 대상 | Stripe 동작 | DB 변경 | 이메일 |
|----------|-----------|-------------|---------|--------|
| 성공 | O | PI 생성·확정 성공 | balance_paid=true | balance_payment_succeeded |
| Payment method 없음 | O | PI 생성 안 함(또는 실패) | attempts+1, 실패 메타 | balance_payment_failed |
| 3회 실패 후 | X (attempts≥3 제외) | 호출 안 함 | 없음 | 없음 |
| 이미 balance_paid | X (balance_paid=false만 조회) | 호출 안 함 | 없음 | 없음 |
