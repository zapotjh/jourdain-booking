# Smoke test — 수동 확인 안내

## 자동 실행 (스크립트)

게스트 이메일 `tojhlim@gmail.com`, 전화번호 `01098248666` 으로 한 번에 돌리기:

```bash
./scripts/smoke-test.sh
```

- 로컬 기본: `BASE_URL=http://localhost:3000` (서버 실행 후 실행).
- Preview: `BASE_URL=https://your-preview.vercel.app ./scripts/smoke-test.sh`
- 스크립트가 **request-booking** → **host/approve** 까지 자동 실행 후, 결제 링크를 출력합니다.  
  관리자 이메일의 **「승인하기」** 버튼을 눌러도 동일하게 승인됩니다.

자동 실행 완료 후: **request-booking** → **host/approve** 까지 성공한 상태입니다.

---

## 수동으로 할 일 (아래만 확인하면 됨)

### 1) Stripe 결제 (로컬이면 웹훅 수신 준비)

**로컬에서 테스트하는 경우** 터미널 하나 더 열고:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

실행한 뒤, 나오는 **Webhook signing secret** 을 `.env.local` 의 `STRIPE_WEBHOOK_SECRET` 에 넣고 서버를 다시 띄우거나, 이미 같은 secret 이 설정돼 있으면 그대로 두면 됩니다.

> **참고:** Stripe CLI 로그에 `websocket.Client.writePump: Error when writing ping message: websocket: close sent` 가 반복해서 나올 수 있습니다. 무시해도 되며, 웹훅이 수신되지 않을 때만 `stripe listen` 을 한 번 종료 후 다시 실행해 보세요.

**Preview(Vercel) 에서 테스트하는 경우**  
Vercel 대시보드에서 해당 환경의 Stripe Webhook URL 이 올바르게 설정돼 있는지 확인하면 됩니다. 별도 `stripe listen` 은 필요 없습니다.

---

### 2) 결제 링크로 들어가서 테스트 결제

아래 URL 을 **브라우저에서 열고**, Stripe 테스트 카드로 결제까지 진행하세요.

- **카드 번호:** `4242 4242 4242 4242`
- **유효기간·CVC:** 아무 값 (예: 12/34, 123)

**결제 링크 (이번 테스트용):**

```
https://checkout.stripe.com/c/pay/cs_test_a1ZBXyMufKkhoXH6MPrcPl2iT7BLRA2XUqu7GSO7e1T71ruSpAyEDUfSOW#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdkdWxOYHwnPyd1blpxYHZxWjA0Vn1IYEdPVGhpalRXMWEzUFZkckJqQXRIcWFuSkxcUzJ2aHd8VUppakE2TDBzNHxjTEpNQEE0SVcxZnBdbz1fRFMzQT0wfTYxd05DY39AaV0xdTZSPHxANTV8XF1jQjVOMScpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl
```

결제가 끝나면 Stripe 가 `checkout.session.completed` 웹훅을 보냅니다.  
(로컬이면 `stripe listen` 이 그 요청을 `localhost:3000/api/webhook` 으로 전달합니다.)

---

### 3) DB / email_log 확인 (Supabase)

결제 후에 아래만 확인하면 됩니다.

| 확인 항목 | 기대 결과 |
|-----------|-----------|
| **bookings** | `id = 64846cfb-416c-4aa0-9b33-787ab3e6202f` 인 행의 `status` 가 `confirmed`, `payment_status` 가 `paid` |
| **email_log** | 위 `booking_id` 로 `deposit_payment_succeeded` (guest·admin) 등 예상된 이메일 타입들이 기록돼 있는지 |

Supabase Table Editor 에서:

- **bookings** 테이블에서 `id = 64846cfb-416c-4aa0-9b33-787ab3e6202f` 검색 후 `status`, `payment_status` 확인.
- **email_log** 테이블에서 `booking_id = 64846cfb-416c-4aa0-9b33-787ab3e6202f` 로 필터 후, `deposit_payment_succeeded` 등 발송 이력 확인.

---

## 요약

- **자동으로 끝난 것:** `POST /api/request-booking` → `POST /api/host/approve` (예약 생성 + 승인 + 결제 링크 발급).
- **직접 할 일:**  
  1) (로컬이면) `stripe listen` 실행 및 웹훅 시크릿 확인  
  2) 위 결제 링크로 들어가서 4242… 테스트 카드로 결제  
  3) Supabase 에서 해당 booking 행과 email_log 확인  

이 플로우가 정상이면 **request → approve → webhook → confirmed** 주 플로우가 동작하는 것입니다.
