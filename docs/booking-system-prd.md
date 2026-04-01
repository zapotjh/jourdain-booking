# Booking System PRD — L'appartement Jourdain, Paris

## Overview

Single-property booking system for a Paris apartment.

Stack:

Next.js App Router  
Supabase  
Stripe  
Resend

Real project root:

/Users/imac/jourdain-booking/jourdain-booking

Do NOT work from:

/Users/imac/jourdain-booking

---

# Primary Goal

Continue the existing system.

Do not rebuild working functionality.

Development rules:

understand the existing architecture first  
preserve current working flows  
implement only missing features  
prefer minimal safe changes  
avoid unnecessary refactors

---

# Existing Features (Already Implemented)

POST /api/request-booking → booking request creation

POST /api/host/approve → approval and Stripe Checkout session creation

POST /api/webhook → Stripe payment confirmation

GET /api/cron/expire-pending-bookings → unpaid reservation expiration

Supabase view bookings_admin_view → admin visibility

Database constraint bookings_no_overlap → prevents overlapping bookings

These features must not be rebuilt.

---

# Canonical Money Model

All money values must be stored as integer cents.

total_price_cents  
deposit_amount_cents  
balance_amount_cents  
security_deposit_hold_cents  
amount_total  
currency

Stripe Checkout sessions must always use:

currency = eur

---

# Deprecated Columns

Do not use these for new logic.

stripe_checkout_session_id  
total_price_eur  
deposit_amount_eur

---

# Booking Status Flow

pending_approval → created after booking request

payment_pending → created after approval

confirmed → created after successful Stripe payment

canceled → created by expiration cron

Status transitions:

pending_approval → payment_pending (approval)

payment_pending → confirmed (payment success)

payment_pending → canceled (expiration cron)

---

# Payment Model

Stage 1 — Deposit

Guest pays 40% deposit after approval.

Stage 2 — Balance

Remaining 60% charged automatically later.

Short stay (< 28 nights):

balance charged 14 days before check-in.

Long stay (≥ 28 nights):

balance charged 30 days before check-in.

### Balance Due Date Semantics (Timezone)

- `balance_due_at`는 **Europe/Paris (파리 현지) 기준 달력일**을 의미한다.
- 단기 예약 (long_stay = false):
  - `balance_due_at = check_in - 14 days` (파리 날짜 기준)
- 장기 예약 (long_stay = true):
  - `balance_due_at = check_in - 30 days` (파리 날짜 기준)
- 잔금 자동 청구 크론(`/api/cron/charge-balance`)은 이 `balance_due_at`을 기준으로,
  **파리 현지 날짜 기준 “오늘 또는 과거”**인 예약만 잔금을 청구 대상으로 삼는다.

---

# Security Deposit

**REV 2 (current):** Security deposit is a **refundable deposit** charged together with the balance payment (not a separate hold) for new bookings.

- Tier (EUR): **≤14 nights: €500**; **>14 nights: €1,200**
- Stored in DB: `security_deposit_amount_cents`
- **Not included** in `total_price_cents` (accommodation revenue) and does **not** affect `deposit_amount_cents` (40%).
- Charged at balance time (`/api/cron/charge-balance`): `amount = balance_amount_cents + security_deposit_amount_cents`
- Stripe metadata on the balance PaymentIntent must include:
  - `kind = balance_with_security_deposit`
  - `accommodation_balance_cents`
  - `security_deposit_amount_cents`
  - `booking_id`
- After checkout: refundable security deposit is refunded via **partial refund** on the same balance PaymentIntent charge.

**Legacy (do not apply to new bookings):** The old `security_deposit_hold_cents` / manual-capture hold system may still exist for legacy rows, but it must not run for new rows where `security_deposit_amount_cents > 0`.

---

# Cancellation Policy

Short stay:

Cancel ≥ 14 days before check-in → full refund

Cancel 14–7 days before check-in → 50% refund of deposit

Cancel < 7 days before check-in or no-show → no refund

During this period, balance payment may already be processed according to the payment schedule.

Long stay (28+ nights):

Cancel ≥ 30 days before check-in → full refund

Cancel < 30 days before check-in → no refund

---

# Pricing Rules

Base short-stay pricing:

- €143 per night (weekday = base + €3)
- Friday and Saturday nights: €160 per night

Discounts:

- 7+ nights: 18% discount
- 28+ nights: 40% discount

Important:

- 28+ night discount may exist in database
- 7-night discount must remain calculation only
- Do not create a database column for 7-night discount

---

# Email System

Email sending uses Resend.

All email templates must be located in:

lib/emails/

---

# Email Language Format

All emails must follow this structure:

Korean content first  
English translation below

Do not mix Korean and English sentence by sentence.

Tone must be:

polite  
clear  
premium  
trustworthy

Subject rule:

- Korean-first subject is mandatory.
- English may appear only as secondary/support (optional).

---

## Post-checkout security deposit refund (Admin workflow)

Security deposit (REV 2) is charged together with the balance PaymentIntent. After check-out, the operator refunds **only the deposit amount** via partial refund.

Workflow:

- System generates/stores a persistent token `security_deposit_refund_token` (no expiry).
- System emails admin a refund link after check-out (max once).
- If not refunded, system re-sends the link 24h after check-out (max once).
- Admin opens `/admin/refund-deposit?booking_id=...&token=...` and clicks “보증금 환불 실행”.
- Server validates token + booking, blocks if already refunded, and creates a Stripe **partial refund** for `security_deposit_amount_cents` only.

Operational emails (new):

- `checkout_reminder_guest` (1 day before check-out, Paris date logic)
- `checkout_reminder_admin` (1 day before check-out, Paris date logic)
- `security_deposit_refund_request_admin` (after check-out)
- `security_deposit_refund_reminder_admin` (24h after check-out if still not refunded)

---

# Email A — Booking Request Received

Trigger:

after POST /api/request-booking

Subject:

[예약 요청 접수] 승인 대기 중 - L'appartement Jourdain, Paris

Content must explain:

booking request received  
awaiting host approval  
payment link will arrive after approval

---

# Email A2 — Admin Notification

Trigger:

after booking request creation

Subject:

[관리자 알림] 새로운 예약 승인 요청 - L'appartement Jourdain, Paris

Include:

guest information  
booking dates  
approval link or token

---

# Email B — Deposit Payment Link

Trigger:

after approval when Stripe session is created

Subject:

[예약 승인] 보증금 결제 안내 - L'appartement Jourdain, Paris

Must explain:

payment is 40% deposit  
remaining 60% auto-charged later  
short stay balance timing = 14 days before check-in  
long stay balance timing = 30 days before check-in  
payment deadline is 24 hours  
unpaid bookings are automatically canceled

---

# Email C — Booking Confirmation

Trigger:

after Stripe payment success (webhook)

Subject:

[예약 확정] 결제가 완료되었습니다 - L'appartement Jourdain, Paris

Content must include:

deposit paid  
remaining balance  
balance charge date  
check-in instructions will be sent later

---

# Email C2 — Admin Payment Notification

Trigger:

same webhook event as Email C

Subject:

[관리자 알림] 결제 완료 및 예약 확정 - L'appartement Jourdain, Paris

Include:

guest name  
guest email  
booking dates  
deposit paid  
balance remaining  
Stripe reference  
confirmation timestamp

---

# Status Safety Rules

Paid bookings must never be canceled.

Confirmed bookings must never revert to payment_pending.

Webhook must remain idempotent.

Approval endpoint must remain idempotent.

---

# Race Condition Protection

Stripe webhook and expiration cron may occur near the same time.

If payment succeeds close to expiration:

webhook confirmation must take precedence.

---

# Not Implemented Yet

Balance auto-charge scheduler

Refund engine

Security deposit hold system

Admin dashboard UI

Multi-property system

Schema refactor

Replacing Stripe Checkout

---

# Engineering Rules

Do not rebuild existing routes.

Do not create duplicate APIs.

Do not introduce a second Stripe flow.

Always use canonical cents fields.

All money values stored in cents.

Reuse existing architecture.

Avoid large refactors.
