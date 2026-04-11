# Booking State Machine — L'appartement Jourdain, Paris

## Status Flow

[Customer submits booking]
         │
         ▼
  pending_approval
         │
         ├── Admin reject: GET/POST /api/host/reject → status = canceled
         │
         │  Admin approve: POST /api/host/approve or GET (이메일 승인하기)
         │  → Stripe Checkout Session created
         │  → Email B sent to customer (payment link)
         ▼
  payment_pending
         │
         ├──────────────────────────────────────────────────────────┐
         │                                                          │
         │  Stripe: checkout.session.completed                      │  payment_pending_expires_at < now
         │  → POST /api/webhook                                     │  AND payment_status != paid
         │  → Email C sent to customer                              │  → GET /api/cron/expire-pending-bookings
         │  → Email C2 sent to admin                                │
         ▼                                                          ▼
     confirmed                                                   canceled

---

# Status Definitions

| Status | Meaning |
|---|---|
| pending_approval | Booking request submitted; awaiting host decision |
| payment_pending | Host approved; Stripe checkout session active; awaiting deposit payment |
| confirmed | Deposit paid successfully; reservation is confirmed |
| canceled | Booking expired, manually canceled, or system-canceled |

---

# Payment Status Values

| payment_status | Meaning |
|---|---|
| null or unpaid | Deposit payment has not been completed |
| paid | Deposit payment successfully completed |
| refunded | Refund or dispute; booking is canceled and excluded from check-in/balance crons |

---

# Transition Rules

## pending_approval → payment_pending

Trigger:

POST /api/host/approve (with approval_token) 또는 GET /api/host/approve?approval_token=… (이메일 링크).  
*(POST /api/bookings/approve 는 미구현.)*

Guard:

Booking must currently be in pending_approval.

Actions:

- Create Stripe Checkout Session for deposit_amount_cents
- Set stripe_session_id
- Set payment_pending_expires_at = now + 24h
- Send Email B to customer (deposit payment link)

Stripe Checkout metadata must include:

booking_id  
kind = deposit_40

Idempotency:

If stripe_session_id already exists for this booking, reuse the existing Stripe session instead of creating a new one.

Both approval routes must reuse the same internal approval logic.  
They must not create separate Stripe sessions for the same booking.

---

## payment_pending → confirmed

Trigger:

Stripe webhook event:

checkout.session.completed

Endpoint:

POST /api/webhook

Guard:

session.metadata.booking_id must be present.

Actions:

- Set payment_status = paid
- Set confirmed_at = now
- Set stripe_payment_intent_id
- Send Email C to customer
- Send Email C2 to admin

Idempotency:

If booking status is already confirmed, skip database writes and skip sending emails.

Webhook must be safe if Stripe retries the event.

---

## payment_pending → canceled

Trigger:

GET /api/cron/expire-pending-bookings

Guard:

payment_pending_expires_at < now  
AND payment_status != paid

Actions:

- Set status = canceled
- Set canceled_at = now

Safety rules:

Cron must never cancel bookings where:

payment_status = paid

Cron must also never cancel bookings already in:

confirmed

Cron must be safe to run repeatedly.

---

# Email Triggers

| Email | Trigger | Recipient |
|---|---|---|
| Email A | After booking request created | Customer |
| Email A2 | After booking request created | Admin |
| Email B | After host approval + Stripe session creation (both new and reused paths) | Customer |
| Email C | After Stripe deposit payment webhook | Customer |
| Email C2 | After Stripe deposit payment webhook | Admin |
| Balance Success | After charge-balance cron succeeds | Customer + Admin |
| Balance Failed | After charge-balance cron fails (each attempt) | Customer + Admin |

---

# Payment Schedule Notes

Deposit payment:

- 40% is paid after approval

Remaining balance:

- short stay: 14 days before check-in
- long stay: 30 days before check-in

Security deposit:

- €28 per night
- authorization hold only
- not charged at booking stage

---

# Safety Invariants

The following system invariants must never be broken.

1. confirmed bookings must never revert to payment_pending
2. Paid bookings (payment_status = paid) must never be auto-canceled
3. Webhook must be idempotent (safe if Stripe retries events)
4. Approval must be idempotent (reuse existing Stripe session)
5. Cron must be safe to run repeatedly without side effects
6. Stripe session must always reference booking_id metadata

---

# Race Condition Protection

A race condition can occur between:

Stripe webhook payment confirmation  
expiration cron cancellation

If payment success occurs very close to the expiration time:

Webhook confirmation must take precedence over cron cancellation.

Paid bookings must never be canceled by the expiration job.

---

# Implemented Future Transitions

confirmed
    │
    ├── balance_due_at reached (Europe/Paris calendar date)
    │       → GET /api/cron/charge-balance
    │       → off-session Stripe PaymentIntent for 60% balance
    │       → max 3 attempts (null-safe OR query)
    │       → 1 attempt per day: enforced by daily cron schedule, not by code
    │       → success: balance_paid=true, balance_payment_attempts=0, Email Balance Success
    │       → failure: balance_payment_attempts += 1, Email Balance Failed
    │         (email only sent when DB row was actually claimed)
    │
    └── refund requested
            → refund engine (not yet implemented)

These transitions must never break existing deposit/confirmed state rules.