# Booking flow test checklist (cents as single source of truth)

## Prerequisites

- Next dev: `npm run dev` (e.g. port 3000)
- Stripe CLI: `stripe listen --forward-to http://localhost:3000/api/webhook`
- `.env.local`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`, Supabase vars
- Supabase: run `01_backfill_cents.sql` (and optionally `02_optional_view_eur.sql`) so cents columns exist and old rows are backfilled

---

## 1) Request booking (POST /api/request-booking)

**Checklist**

- [ ] Response 200 with `booking` containing: `id`, `status: "pending_approval"`, `approval_token`
- [ ] `booking` includes cents fields: `total_price_cents`, `deposit_amount_cents`, `balance_amount_cents`, `security_deposit_hold_cents`, `currency: "eur"`
- [ ] Overlapping date range returns 409 (bookings_no_overlap)

**curl**

```bash
curl -i -X POST http://localhost:3000/api/request-booking \
  -H "Content-Type: application/json" \
  -d '{
    "guest_name": "Test Guest",
    "email": "test@guest.com",
    "phone": "+33123456789",
    "check_in": "2026-10-01",
    "check_out": "2026-10-05",
    "total_price_eur": 1000
  }'
```

**Expected (example)**

- `total_price_cents`: 100000  
- `deposit_amount_cents`: 40000  
- `balance_amount_cents`: 60000  
- `security_deposit_hold_cents`: 11200 (4 nights × 2800)

Copy `approval_token` for the next step.

---

## 2) Approve (POST /api/host/approve)

**Checklist**

- [ ] Response 200 with `checkout_url` (non-null Stripe URL)
- [ ] In Supabase `bookings`: same row has `stripe_session_id` set (e.g. `cs_test_...`), `status = 'payment_pending'`
- [ ] Second call with same `approval_token`: still 200, same `checkout_url` (idempotent)

**curl**

```bash
curl -i -X POST http://localhost:3000/api/host/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approval_token": "<PASTE_APPROVAL_TOKEN_FROM_STEP_1>"
  }'
```

Open `checkout_url` in browser and pay with test card `4242 4242 4242 4242`.

---

## 3) Webhook (checkout.session.completed)

**Checklist**

- [ ] Stripe CLI shows `checkout.session.completed` forwarded and response 200
- [ ] Next server log: `[webhook] booking confirmed` with `bookingId`, `stripe_payment_intent_id`, `confirmed_at`
- [ ] In Supabase: that booking row has `status = 'confirmed'`, `payment_status = 'paid'`, `stripe_payment_intent_id` set, `confirmed_at` set

---

## Quick full sequence (copy-paste, zsh-safe)

```bash
# 1) Create booking
RESP=$(curl -s -X POST http://localhost:3000/api/request-booking \
  -H "Content-Type: application/json" \
  -d '{"guest_name":"T","email":"t@t.com","check_in":"2026-11-01","check_out":"2026-11-03","total_price_eur":500}')
echo "$RESP" | jq .
TOKEN=$(echo "$RESP" | jq -r '.booking.approval_token')
echo "approval_token: $TOKEN"

# 2) Approve (zsh-safe: no nested double quotes)
curl -i -X POST http://localhost:3000/api/host/approve \
  -H "Content-Type: application/json" \
  -d '{"approval_token":"'"$TOKEN"'"}'
# Then open checkout_url from the response in browser and pay with 4242...; webhook runs automatically.
```

**3) Webhook** — 별도 curl 없음. 브라우저에서 결제 완료하면 Stripe가 `/api/webhook`으로 이벤트를 보냄. Stripe CLI 터미널에서 `200` 응답, Next 로그에서 `[webhook] booking confirmed` 확인.
