# Booking System Architecture — L'appartement Jourdain, Paris

## Project Root

/Users/imac/jourdain-booking/jourdain-booking   ← REAL APP ROOT (always use this)  
/Users/imac/jourdain-booking                     ← OUTER DIR (do NOT work here)

Always run the app from:

cd /Users/imac/jourdain-booking/jourdain-booking  
npm run dev

Do not run the server from the outer directory.

---

# System Overview

This is a single-property booking system for:

L'appartement Jourdain  
314 rue des Pyrénées  
75020 Paris

The system already implements the full booking pipeline:

guest booking request  
→ host approval  
→ Stripe Checkout deposit payment  
→ webhook confirmation  
→ reservation confirmed

Unpaid reservations automatically expire after 24 hours.

Future development must extend the existing implementation without rebuilding it.

---

# Tech Stack

Framework: Next.js 16 App Router  
Database: Supabase (Postgres)  
Payments: Stripe Checkout Sessions  
Email: Resend  
Runtime: Node.js (all API routes use `export const runtime = "nodejs"`)

---

# File Map

## API Routes

POST /api/request-booking  
app/api/request-booking/route.ts  
Creates booking row and generates approval_token.

POST /api/host/approve  
app/api/host/approve/route.ts  
Approves booking using approval_token and creates Stripe Checkout Session.

POST /api/bookings/approve — **미구현.** 승인은 POST /api/host/approve 또는 GET /api/host/approve?approval_token=… (이메일 링크) 만 사용. 향후 admin UI용으로 구현 시 `approveBooking(approval_token)` 만 호출할 것.

POST /api/webhook  
app/api/webhook/route.ts  
Handles Stripe checkout.session.completed, payment_intent.succeeded (balance with refundable security deposit), and charge.refunded / payment_intent.canceled / charge.dispute.created. Event-level idempotency via `stripe_webhook_events` table; duplicate event_id returns 200 without reprocessing. Confirms booking or recovers canceled+paid (reconciliation path). Returns non-2xx only for invalid signature or malformed payload.

GET /api/cron/reconcile-stripe-payments  
app/api/cron/reconcile-stripe-payments/route.ts  
Last-resort safety net: finds payment_pending (past confirmation window) or canceled bookings with stripe_session_id, verifies with Stripe; if payment succeeded, recovers to confirmed and sends canonical reconciliation alert + deposit emails (deduped). Hourly.

GET /api/cron/expire-pending-bookings  
app/api/cron/expire-pending-bookings/route.ts  
Cancels unpaid bookings after payment_pending_expires_at.

GET /api/cron/charge-balance  
app/api/cron/charge-balance/route.ts  
Charges remaining balance (60%) for confirmed bookings when balance_due_at has passed.  
Uses Europe/Paris calendar date for today comparison.  
Max 3 attempts. Sends success/failure emails via send-with-log.ts.

GET /api/cron/security-deposit-hold  
app/api/cron/security-deposit-hold/route.ts  
**Legacy only.** Creates a **separate** Stripe PaymentIntent for the security-deposit authorization hold (`capture_method: manual`). This must **not** run for new bookings using REV 2 refundable deposit model.

Selection includes an explicit legacy guard:

- `security_deposit_amount_cents = 0` (new model rows are excluded)
- and `security_deposit_hold_cents > 0` (legacy-only amount)

Other behavior remains the same for legacy rows: runs daily, selects bookings whose Paris `check_in` is 3 days after today, DB claim RPC + Stripe idempotency key, emails via `send-with-log.ts`.

POST /api/host/security-deposit/release  
Releases the uncaptured authorization (`paymentIntents.cancel`). Header `x-cron-secret` (same as crons).

POST /api/host/security-deposit/capture  
Captures part or full hold (`paymentIntents.capture`). Optional body `amount_cents`; omit for full `amount_capturable`. Header `x-cron-secret`.

Stripe **idempotency key** for each balance PaymentIntent: `balance:{booking_id}:attempt:{attempt_number}` (where attempt_number = balance_payment_attempts + 1). Repeated retries with the same key return the same PaymentIntent; DB update remains conditional on `.eq("balance_paid", false)`.

**Rate limit:** At most one balance attempt per Paris calendar day, **DB-enforced**. Before calling Stripe, the cron calls `claim_balance_attempt(booking_id)` RPC; the RPC updates `last_balance_attempt_at = now()` only when the row matches (status=confirmed, balance_paid=false, payment_status=paid, attempts < 3, and Paris-date of `last_balance_attempt_at` < today Paris). Only the caller that gets a row back proceeds to Stripe. Idempotency key `balance:{booking_id}:attempt:{N}` is used in addition.

---

# Balance payment automation

**Cron endpoint**

api/cron/charge-balance

**Conditions**

status = confirmed  
payment_status = paid  
balance_paid = false  
balance_payment_attempts < 3  
balance_due_at <= today  

**Retry policy**

max_attempts = 3  
retry_interval = 1 day  

**Manual fallback**

After 3 failed attempts, automatic retries stop.

Admin may send a manual Stripe checkout link to collect the remaining balance.

---

# Approval (single shared logic)

**Shared function:** `lib/approve-booking.ts` — `approveBooking(approvalToken: string)`.

Responsibilities: validate booking status === pending_approval (or reuse session if payment_pending), create Stripe Checkout session, update booking (status = payment_pending, stripe_session_id, payment_pending_expires_at), send Email B (payment link). Returns `{ ok, checkoutUrl, bookingId }` or `{ ok: false, error, status }`.

**Route:**

POST /api/host/approve  
Calls `approveBooking(body.approval_token)` only. No duplicate approval logic in the route.

Any future approval route (e.g. POST /api/bookings/approve) must call `approveBooking()` only and must not implement approval logic separately.

---

# Library / Helpers

lib/supabase-admin.ts  
Supabase service role client.

lib/emails/send-with-log.ts  
Canonical email dispatcher. All routes must call functions from this file.  
Logs every send attempt (success or failure) to the email_log table in Supabase.

lib/emails/  
Email templates directory:

Email A — email-a.ts  
Email A2 — email-a2.ts  
Email B — email-b.ts  
Email C — email-c.ts  
Email C2 — email-c2.ts  
Email Balance Success — email-balance-success.ts  
Email Balance Failed Admin — email-balance-failed-admin.ts  
Email Checkin — email-checkin.ts

Email templates must always remain inside:

lib/emails/

Do not introduce additional email template folders.

---

## Deprecated / Legacy Helpers (do NOT use for new code)

lib/send-payment-email.ts  
Legacy Resend helper, predates send-with-log.ts.  
Do not call this from any new or modified route. Use lib/emails/send-with-log.ts instead.

---

## Balance Tracking Columns (canonical)

| Column | Type | Purpose |
|---|---|---|
| `balance_paid` | boolean | true once balance successfully charged |
| `balance_payment_attempts` | int | **current retry counter** (stops after 3 failed attempts). Reset to 0 on success. **Not** a lifetime historical total. |
| `stripe_balance_payment_intent_id` | text | Stripe PaymentIntent ID for the balance charge |
| `balance_paid_at` | timestamptz | timestamp of successful balance charge |
| `balance_payment_failed_at` | timestamptz | timestamp of last failure |
| `balance_payment_failure_reason` | text | reason string from last failure |
| `last_balance_attempt_at` | timestamptz | set on every attempt (success or failure); DB-enforced rate limit via `claim_balance_attempt` RPC (≤ 1 attempt per Paris calendar day) |

> ⚠️ Canonical name is `stripe_balance_payment_intent_id`. Do not use `balance_stripe_payment_intent_id`.

## Security deposit hold columns (canonical)

| Column | Type | Purpose |
|---|---|---|
| `stripe_security_deposit_payment_intent_id` | text | Manual-capture PI for the hold (separate from 40% deposit PI) |
| `security_deposit_hold_status` | text | `held` \| `released` \| `captured` \| `failed` |
| `security_deposit_hold_created_at` | timestamptz | When hold PI was authorized |
| `security_deposit_hold_released_at` | timestamptz | When hold was canceled (normal path) |
| `security_deposit_hold_captured_at` | timestamptz | Last capture time (partial or full damage path) |
| `security_deposit_hold_failure_reason` | text | Last cron failure (e.g. missing PM) |
| `last_security_deposit_hold_attempt_at` | timestamptz | Rate limit for cron (Paris daily) via `claim_security_deposit_hold_attempt` |

---

# Database Migrations

supabase/migrations/01_backfill_cents_and_balance_due.sql  
Backfills cents-based pricing columns and balance_due_at.

supabase/migrations/02_bookings_admin_view.sql  
Creates admin view with EUR display values.

supabase/migrations/03_payment_pending_expiration.sql  
Adds payment_pending_expires_at and supporting index.

supabase/migrations/04_charge_balance.sql  
Adds balance_paid, balance_payment_attempts, stripe_balance_payment_intent_id, balance_payment_failed_at, balance_payment_failure_reason.

supabase/migrations/05_email_log.sql  
Creates email_log table for canonical email tracking.

supabase/migrations/06_email_log_unique_event.sql  
Partial unique index on (booking_id, recipient_type, email_type) excluding balance_payment_failed.

supabase/migrations/07_last_balance_attempt_at.sql  
Adds last_balance_attempt_at for balance retry rate limit (≤ 1 attempt per calendar day Paris).

supabase/migrations/08_claim_balance_attempt.sql  
Adds `claim_balance_attempt(booking_id)` RPC for atomic DB claim before Stripe; prevents concurrent cron runs from double-charging the same day.

supabase/migrations/09_stripe_webhook_events.sql  
Creates `stripe_webhook_events` table for durable webhook event idempotency (stripe_event_id unique). Insert before business logic; duplicate returns 200.

supabase/migrations/11_security_deposit_hold.sql  
Adds security-deposit hold columns + `claim_security_deposit_hold_attempt(booking_id)` RPC.

---

# Webhook event idempotency

Table `stripe_webhook_events`: one row per Stripe event (stripe_event_id unique). Flow: verify signature → parse event → insert event row → if unique violation, return 200 immediately → else process → on success set processed_at. Both event-level idempotency and booking-level conditional updates are used.

---

# Reconciliation cron

GET /api/cron/reconcile-stripe-payments (hourly). Finds bookings in suspicious states (payment_pending past confirmation window, or canceled with stripe_session_id). For each, fetches Stripe Checkout Session; if payment_status === paid, recovers booking to confirmed (status, payment_status, confirmed_at, stripe_payment_intent_id) and sends admin `webhook_reconciliation_alert` + guest/admin deposit emails (send-with-log, deduped). 로직은 webhook의 recovery 경로와 동일. Purpose: last-resort safety net when webhook failed or never arrived.

---

# Refund / dispute handling

Webhook handles charge.refunded, payment_intent.canceled, charge.dispute.created. Booking is updated to payment_status = refunded, status = canceled; admin alert sent via send-with-log (email_type refund_alert). Check-in reminder and balance charge exclude refunded bookings (payment_status = paid only).

---

# Overlap / double-booking prevention

Before creating a Stripe Checkout Session in approveBooking(), the system queries for overlapping active bookings (check_in < other.check_out AND check_out > other.check_in, status in payment_pending, confirmed). If any exist, returns 409 and does not create a session. Inventory-blocking statuses: payment_pending, confirmed.

---

# Stale checkout session policy

If checkout.session.completed refers to a session that does not match the booking’s current stripe_session_id (e.g. guest paid an old link after re-approval), the webhook logs the anomaly and returns 200 without applying the payment; operator handles manually.

---

# Paris timezone (canonical)

Business-day and reminder logic use Europe/Paris. Helpers in lib/paris-time.ts: getNowParis(), getParisDateString(), startOfTodayParis(), startOfTomorrowParis(), isTomorrowParis(). Used by charge-balance (today Paris for balance_due_at and claim), send-checkin-reminder (tomorrow Paris for check_in).

---

# Database Views

public.bookings_admin_view

Used for admin visibility.

Displays:

total_price_eur_display  
deposit_amount_eur_display  
balance_amount_eur_display  
security_deposit_hold_eur_display

These are display-only conversions from canonical cents columns.

---

# Request Booking Flow

Client sends POST /api/request-booking.

Steps:

validate request fields  
calculate nights  
calculate deposit and balance in cents  
calculate security deposit hold  
generate approval_token using crypto.randomBytes  
insert booking row with status = pending_approval  
send Email A to customer — ✅ DONE (via sendGuestBookingPendingEmail in send-with-log.ts)  
send Email A2 to admin — ✅ DONE (via sendAdminBookingApprovalRequestEmail in send-with-log.ts)

Return booking object.

Email failures are caught and logged — they do not roll back the booking insert.

---

# Request Input

{
  "guest_name": "...",
  "email": "...",
  "phone": "...",
  "check_in": "YYYY-MM-DD",
  "check_out": "YYYY-MM-DD",
  "total_price_eur": 1050
}

---

# Pricing Rules

Short stay pricing:

- €140 per night
- Friday and Saturday: €160 per night

Discounts:

- 7+ nights: 18% discount
- 28+ nights: 40% discount

Important:

- 7-night discount must remain calculation-only logic
- 28+ night discount may exist in DB/system
- Do not create a separate DB field for 7-night discount

---

# Pricing Constants

DEPOSIT_RATIO = 0.4

Security deposit **hold** (separate PI, not the 40% deposit): fixed EUR tiers in cents — **≤14 nights: €500 (50_000 cents)**; **>14 nights: €1,200 (120_000 cents)**. Implemented in `lib/security-deposit-hold-cents.ts` (`computeSecurityDepositHoldCentsFromStayLengthDays`).

LONG_STAY_NIGHTS_THRESHOLD = 28

BALANCE_DUE_DAYS_SHORT = 14

BALANCE_DUE_DAYS_LONG = 30

---

# Host Approval Flow

Admin calls POST /api/host/approve.

Steps:

receive approval_token  
find booking  
if stripe_session_id already exists → reuse existing session (idempotent)  
if status != pending_approval → return 409  
create Stripe Checkout Session for deposit_amount_cents  
currency must always be "eur"  
metadata.booking_id included

Update booking:

status = payment_pending  
stripe_session_id = session.id  
amount_total  
currency  
payment_status  
payment_pending_expires_at = now + 24 hours

Send Email B to customer — ✅ DONE (via sendGuestApprovedPaymentLinkEmail in send-with-log.ts).  
Email B is sent in BOTH paths: new Stripe session creation AND existing session reuse (idempotent).  
When payment_pending_expires_at was null and backfilled, the backfilled expiresIso is used directly in the email payload.

Email failures are caught and logged — they do not prevent checkout_url from being returned.

**Idempotency guard:** The session-reuse branch only activates when `booking.status === 'payment_pending'`. Bookings in `confirmed` or `canceled` status fall through to the 409 guard even if a `stripe_session_id` exists.

Return checkout_url.

### Balance Due — Timezone & Semantics

- `balance_due_at`는 **파리 현지(Europe/Paris) 달력 날짜 기준**으로 계산되고 해석된다.
- 단기 예약 (`long_stay = false`)의 경우:
  - `balance_due_at = check_in - 14 days` (파리 현지 날짜 기준)
- 장기 예약 (`long_stay = true`)의 경우:
  - `balance_due_at = check_in - 30 days` (파리 현지 날짜 기준)
- 잔금 자동 청구 크론(`/api/cron/charge-balance`) 역시 **파리 현지 날짜 기준 “오늘”**을 기준으로 대상 여부를 판단해야 한다.
- 애플리케이션 코드에서 `balance_due_at` 비교 시, UTC 시각이 아니라 **Europe/Paris 기준 “오늘 날짜(YYYY-MM-DD)”**에 맞춰 동작하도록 고려해야 한다.
---

# Stripe Metadata

Stripe Checkout Session must include:

metadata.booking_id  
metadata.kind = deposit_40

---

# Webhook Flow

POST /api/webhook

Handles Stripe event:

checkout.session.completed

Steps:

verify Stripe signature  
extract metadata.booking_id  
find booking  
update booking:

status = confirmed  
payment_status = paid  
stripe_payment_intent_id  
confirmed_at = now

Send Email C to customer — ✅ DONE (via sendGuestDepositPaymentSucceededEmail in send-with-log.ts).  
Send Email C2 to admin — ✅ DONE (via sendAdminDepositPaymentSucceededEmail in send-with-log.ts).

Return success response.

---

# Webhook Idempotency

Stripe may resend webhook events.

Webhook handler must ensure:

confirmed bookings are not processed twice  
duplicate emails are not sent  
duplicate database updates do not occur

---

# Cron Expiration Flow

GET /api/cron/expire-pending-bookings

Verify x-cron-secret header matches CRON_SECRET.

Find bookings where:

status = payment_pending  
payment_status is NULL or not equal to paid  
payment_pending_expires_at is earlier than now

Update those bookings:

status = canceled  
canceled_at = now

Return number of expired bookings.

---

# Race Condition Safety

A race condition can occur between Stripe webhook (payment confirmation) and the expiration cron (cancel unpaid). If the cron runs first and sets status to canceled, the webhook’s conditional update (WHERE status = payment_pending) matches 0 rows.

**Invariant:** A successful Stripe payment must never leave a booking canceled.

**Webhook reconciliation:** When the confirm update matches 0 rows, the webhook re-fetches the booking. If status is already `confirmed` → idempotent success (200). If status is `canceled` and session.payment_status is `paid` → **recover**: update booking to `confirmed`, log structured error, send admin alert email, return 200. If status is still `payment_pending` → retry the confirm update once. Otherwise log unexpected state and return 200 to Stripe. See `docs/booking-status-transitions-audit.md` §4.

**Email policy:** Emails are sent only after a successful DB state update (e.g. UPDATE ... RETURNING id; only if row updated then send email). Never send email before the update succeeds.

---

# Environment Variables

NEXT_PUBLIC_SUPABASE_URL  
NEXT_PUBLIC_SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE_KEY

STRIPE_SECRET_KEY  
STRIPE_WEBHOOK_SECRET

NEXT_PUBLIC_SITE_URL

CRON_SECRET

RESEND_API_KEY  
RESEND_FROM_EMAIL

ADMIN_EMAIL

---

# Canonical Database Fields

Money fields (source of truth):

total_price_cents  
deposit_amount_cents  
balance_amount_cents  
security_deposit_hold_cents  
amount_total  
currency

Booking flow fields:

status  
payment_status  
approval_token  
check_in  
check_out  
nights  
long_stay  
balance_due_at  
payment_pending_expires_at  
confirmed_at  
canceled_at

Stripe fields:

stripe_session_id  
stripe_payment_intent_id

---

# Deprecated Fields

These may still exist but must not be used for new logic:

stripe_checkout_session_id  
total_price_eur  
deposit_amount_eur

---

# Current System Status

The following features already work:

booking request creation  
host approval  
Stripe Checkout session creation  
Stripe webhook confirmation  
automatic expiration of unpaid bookings  
overlap protection via database constraint  
admin view via bookings_admin_view

This system is already a working MVP reservation system.

---

# Testing checklist (hardening)

After any change to webhook, approve, charge-balance, expire-pending, or send-checkin-reminder, verify:

1. **Duplicate webhook delivery**  
   Send the same `checkout.session.completed` twice (e.g. replay from Stripe dashboard).  
   Booking must remain confirmed; no duplicate Email C/C2; `email_log` shows single deposit_payment_succeeded per recipient.

2. **Expire cron vs webhook race**  
   Cancel a booking via expire-pending first, then deliver webhook with paid session.  
   Booking must be recovered to confirmed; canonical reconciliation alert sent once (email_log `webhook_reconciliation_alert`); no false duplicate confirmation emails.

3. **Concurrent balance cron**  
   Simulate two overlapping charge-balance runs on the same booking (same Paris day).  
   Only one DB claim must succeed for the day; Stripe must receive at most one effective attempt for that day; no duplicate balance success/failure emails.

4. **Approval race**  
   Change booking status after read but before the final update (e.g. cancel from another tab).  
   No orphaned reusable Stripe session must remain active; route returns 409; logs show orphan session expired.

5. **Check-in reminder rerun**  
   Run send-checkin-reminder cron twice the same day for the same eligible booking.  
   Reminder must be sent once only; second run skipped via `email_log` dedupe (alreadySentEmail).

---

# Production hardening test scenarios (10)

| # | Scenario | Setup | Expected DB | Expected email | Expected Stripe | Operator visibility |
|---|----------|--------|-------------|----------------|-----------------|---------------------|
| 1 | Duplicate webhook same event.id twice | Replay same checkout.session.completed | One row in stripe_webhook_events; booking confirmed once | No duplicate C/C2; email_log one per recipient | N/A | Second delivery returns 200 duplicate |
| 2 | Webhook after expire cron canceled booking | Expire cron runs first; webhook arrives with paid session | Booking recovered to confirmed | Reconciliation alert + deposit emails (deduped if already sent) | N/A | Admin gets webhook_reconciliation_alert |
| 3 | Webhook verified but DB update fails | Force DB error or 0-row update | stripe_webhook_events has row; booking may stay payment_pending/canceled | No email claiming success | Webhook returns 200 | Structured log; reconcile cron can recover later |
| 4 | Balance cron overlaps with itself | Two charge-balance runs same Paris day same booking | One claim_balance_attempt succeeds; one row updated | One success or failure email set | One PaymentIntent per idempotency key | Logs show claim_succeeded true/false |
| 5 | Crash after Stripe charge before DB success update | Simulate crash after balance PI succeeded, before DB update | Reconcile or manual: booking can be updated to balance_paid | Emails sent when DB fixed | Idempotency key prevents double charge on retry | charge-balance structured logs |
| 6 | Stale checkout session succeeds | Guest pays old session after re-approval (new session exists) | Booking unchanged (stale session not applied) | No duplicate confirm | Webhook returns 200 | Log branch_taken stale_session_rejected |
| 7 | Refund on confirmed booking | Trigger charge.refunded or payment_intent.canceled | payment_status = refunded, status = canceled | Admin refund_alert once | N/A | email_log refund_alert; check-in/balance exclude booking |
| 8 | Two overlapping approval attempts same dates | Approve booking A (dates X–Y); try approve booking B (dates X–Y) | Second approve returns 409; no second session | No second payment link | No second session created | Log overlap conflict |
| 9 | Check-in reminder Paris midnight / DST | Booking check_in = tomorrow Paris; run cron at Paris midnight edge | Reminder sent once; eligible by startOfTomorrowParis() | One checkin_reminder_1d | N/A | email_log dedupe |
| 10 | Reconciliation cron recovers paid-but-not-confirmed | Booking payment_pending or canceled, Stripe session paid | Booking recovered to confirmed | Reconciliation alert + deposit emails (deduped) | N/A | Cron response recovered[] |
