# Supabase에서 예약 보기 + 안정화 테스트

## 1. Supabase에서 예약 데이터 보는 방법

### 1-1. 원본 테이블 `bookings` (센트 단위)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속 후 프로젝트 선택
2. 왼쪽 메뉴에서 **Table Editor** 클릭
3. 상단에서 **`bookings`** 테이블 선택
4. 행을 클릭하면 해당 예약의 모든 컬럼(센트 값 포함) 확인 가능

- 여기서 보는 금액은 **센트** (`total_price_cents`, `deposit_amount_cents` 등)입니다.

---

### 1-2. 관리자용 뷰 `bookings_admin_view` (EUR 표시)

금액을 **유로(EUR)** 로 보고 싶을 때 사용합니다.

1. Supabase Dashboard → 왼쪽 메뉴 **SQL Editor** 클릭
2. **New query** 로 새 쿼리 열기
3. 아래 SQL 붙여넣고 **Run** 실행:

```sql
SELECT * FROM public.bookings_admin_view ORDER BY created_at DESC;
```

4. 결과 테이블에서 다음 컬럼으로 EUR 확인:
   - `total_price_eur_display`
   - `deposit_amount_eur_display`
   - `balance_amount_eur_display`
   - `security_deposit_hold_eur_display`
   - 그 외 `status`, `check_in`, `check_out`, `balance_due_at`, `confirmed_at` 등

**정리**: 관리자 버전(EUR로 보는 버전)은 **Supabase → SQL Editor** 에서 위 쿼리로 `bookings_admin_view` 를 조회하면 됩니다. Table Editor에 Views가 보이는 Supabase 버전이면, 왼쪽에서 `bookings_admin_view` 를 선택해 조회해도 됩니다.

---

## 2. 안정화를 위해 할 테스트

아래 순서대로 한 번씩 돌려 보면, 예약·승인·결제·웹훅·DB까지 전 구간이 정상인지 확인할 수 있습니다.

### 사전 준비

- `npm run dev` 실행 (예: 3000 포트)
- 다른 터미널에서 `stripe listen --forward-to http://localhost:3000/api/webhook`
- `.env.local` 에 아래 변수가 있고 비어 있지 않은지 확인:

**Supabase**

| 변수명 | 용도 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (예: `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 비밀 키 (request-booking, host/approve, webhook에서 사용) |

**Stripe**

| 변수명 | 용도 |
|--------|------|
| `STRIPE_SECRET_KEY` | Stripe 비밀 키 (테스트: `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | 웹훅 서명 검증용. 로컬은 `stripe listen` 실행 시 터미널에 나오는 `whsec_...` 값을 넣음 |
| `NEXT_PUBLIC_SITE_URL` | Checkout success/cancel URL 기준 (로컬: `http://localhost:3000`) |

**확인 방법**: 프로젝트 루트에 `.env.local` 파일을 열어 위 5개 키가 존재하고 값이 비어 있지 않은지 보면 됨. Next는 서버 시작 시점에만 env를 읽으므로 수정 후에는 `npm run dev` 재시작 필요.

---

### 테스트 1: 예약 생성 (request-booking)

**목적**: cents·long_stay·balance_due_at 이 제대로 들어가는지 확인

1. **curl 실행** (날짜는 겹치지 않게):

```bash
curl -s -X POST http://localhost:3000/api/request-booking \
  -H "Content-Type: application/json" \
  -d '{
    "guest_name": "Stabilization Test",
    "email": "stab@test.com",
    "check_in": "2027-01-10",
    "check_out": "2027-01-14",
    "total_price_eur": 800
  }' | jq .
```

2. **확인할 것**
   - 응답: `ok: true`, `booking.status: "pending_approval"`, `booking.approval_token` 존재
   - `booking` 에 `total_price_cents`(80000), `deposit_amount_cents`(32000), `balance_amount_cents`(48000), `security_deposit_hold_cents`, `long_stay`, `balance_due_at` 포함
3. **Supabase에서 확인**
   - **Table Editor → `bookings`** 에서 방금 생긴 행 선택
   - `total_price_cents`, `deposit_amount_cents`, `long_stay`, `balance_due_at` 값 확인
   - 또는 **SQL Editor** 에서 `SELECT * FROM public.bookings_admin_view ORDER BY created_at DESC LIMIT 1;` 로 **관리자 버전(EUR)** 확인

---

### 테스트 2: 승인 + Stripe Checkout (host/approve)

**목적**: checkout_url 반환, stripe_session_id 저장, 두 번 호출 시 idempotent 동작

1. 테스트 1 응답에서 `approval_token` 복사 후:

```bash
# approval_token에는 request-booking 응답에서 받은 값을 그대로 넣으세요.
# 주의: JSON 안에는 반드시 직선 따옴표 " 만 사용 (곡따옴표 " " 사용 시 500 에러)
curl -i -X POST http://localhost:3000/api/host/approve \
  -H "Content-Type: application/json" \
  -d '{"approval_token":"여기에_실제_토큰_붙여넣기"}'
```

2. **확인할 것**
   - 200 응답, 본문에 `checkout_url` (Stripe URL) 존재
3. **같은 토큰으로 한 번 더 호출**
   - 역시 200, 같은 `checkout_url` (새 세션 생성 안 함)
4. **Supabase에서 확인**
   - **Table Editor → `bookings`** 에서 해당 행: `stripe_session_id` 가 `cs_test_...` 로 채워져 있고, `status = 'payment_pending'`

---

### 테스트 3: 결제 완료 + 웹훅

**목적**: 결제 후 웹훅으로 상태가 confirmed 로 바뀌는지

1. 테스트 2에서 받은 `checkout_url` 을 브라우저에서 열기
2. 테스트 카드 `4242 4242 4242 4242` 로 결제 완료
3. **확인할 것**
   - Stripe CLI 터미널: `checkout.session.completed` 이벤트 → `200` 응답
   - Next 로그: `[webhook] booking confirmed` 로그
4. **Supabase에서 확인**
   - **Table Editor → `bookings`** 에서 해당 행: `status = 'confirmed'`, `payment_status = 'paid'`, `stripe_payment_intent_id`, `confirmed_at` 채워짐
   - **SQL Editor** 에서 `SELECT * FROM public.bookings_admin_view ORDER BY created_at DESC LIMIT 1;` 로 **관리자 버전** 에서도 동일한 예약이 EUR로 보이는지 확인

---

### 테스트 4: 날짜 겹침 시 409 (선택)

**목적**: `bookings_no_overlap` 제약이 동작하는지

1. 테스트 1과 **같은 check_in/check_out** 으로 다시 request-booking 호출
2. **확인할 것**: 409 응답, 에러 메시지에 overlap/conflict 관련 내용

---

## 3. 요약: 어디서 뭘 보는지

| 보려는 것 | 보는 곳 |
|-----------|---------|
| 원본 예약 데이터 (센트) | Supabase → **Table Editor** → **bookings** |
| 관리자 버전 (EUR 표시) | Supabase → **SQL Editor** → `SELECT * FROM public.bookings_admin_view ORDER BY created_at DESC;` |

안정화 테스트는 위 1~4번 순서대로 한 번씩 돌리고, 각 단계에서 **Table Editor(bookings)** 와 필요 시 **SQL Editor(bookings_admin_view)** 로 결과를 확인하면 됩니다.
