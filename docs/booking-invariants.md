# Booking Invariants — L'appartement Jourdain, Paris

These rules must never be broken in code, database migrations, or operational scripts.

---

## Status & State Invariants

1. **Confirmed bookings must never revert to `payment_pending`.**  
Once `status = confirmed`, no code path may change it back to `payment_pending`.

2. **Paid bookings must never be auto-canceled.**  
Any job (cron, script, manual tool) must skip rows where `payment_status = 'paid'`.

3. **A successful Stripe payment must never leave a booking canceled or missing.**  
If the webhook receives `checkout.session.completed` but the booking is already `canceled` (e.g. expire-pending ran first), the webhook must **recover** the booking to `confirmed` and send an admin alert via canonical send-with-log. The reconciliation cron (`/api/cron/reconcile-stripe-payments`) is the last-resort safety net for payments that never confirmed. Refunds or manual correction are operator responsibilities.

4. **The `bookings_no_overlap` constraint must never be bypassed.**  
All inserts/updates must respect the database constraint.  
No raw SQL, migrations, or scripts may disable or work around it.

5. **Booking status must follow the defined state machine.**

Allowed transitions:

pending_approval → payment_pending  (host approve)  
pending_approval → canceled         (host reject; GET/POST /api/host/reject)  
payment_pending → confirmed         (webhook checkout.session.completed)  
payment_pending → canceled          (expire cron or host action)  
confirmed → canceled               (refund/dispute webhook only)

Forbidden transitions:

confirmed → payment_pending  
confirmed → pending_approval  
confirmed → canceled (except refund workflow)

---

## Money & Stripe Invariants

6. **Money must always be stored in integer cents.**

Canonical columns:

total_price_cents  
deposit_amount_cents  
balance_amount_cents  
security_deposit_hold_cents  

Currency values must never be stored as floats.

7. **Money formatting must only happen at the display layer.**

Values shown in UI or email must be formatted from cents.

Example:

display_price = total_price_cents / 100

8. **`stripe_session_id` is the canonical Stripe session reference.**

All logic that needs the Checkout Session must use `stripe_session_id`.

9. **Deprecated fields must not be used as source of truth.**

Legacy columns such as:

stripe_checkout_session_id  
total_price_eur  
deposit_amount_eur  

may exist for compatibility but must never be used in new logic.

10. **Stripe webhooks are the only source of payment truth.**

Client-side payment confirmation must never update booking state.  
Only Stripe webhook events may confirm payment.

11. **The security deposit is a hold, not an actual charge.**

The €28/night security deposit must be implemented as a card authorization hold.

It must never be charged automatically.

---

## Pricing Invariants

11. **Base pricing must remain deterministic.**

Standard pricing:

Weekday: €140  
Weekend (Fri/Sat): €160  

12. **Discounts are calculated dynamically.**

7+ nights → 18% discount  
28+ nights → 40% discount  

Discounts must not be stored as database columns.

They are computed during price calculation only.

---

## Flow & Idempotency Invariants

13. **Approval must be idempotent.**

Repeated approval calls must:

• reuse the existing `stripe_session_id`  
• never create duplicate Stripe sessions  
• never send duplicate payment emails

14. **Webhook must be idempotent.**

Reprocessing the same Stripe webhook event must not:

• double-confirm bookings  
• double-charge customers  
• send duplicate emails

15. **Cron jobs must be idempotent.**

Cron endpoints must produce the same result when executed multiple times.

Cron must never:

• cancel confirmed bookings  
• modify paid bookings  
• send duplicate notifications  

16. **All email sends are canonical via send-with-log.**  
No route may call `mailer` directly for booking-related emails. Every send is logged to `email_log` with a dedicated `email_type`. Webhook reconciliation alert and refund alert use send-with-log only.

17. **All automated payment attempts are protected by DB claim + Stripe idempotency.**  
Balance charge cron uses `claim_balance_attempt(booking_id)` RPC before calling Stripe and uses idempotency key `balance:{booking_id}:attempt:{N}`. No reliance on idempotency key alone for rate limiting.

18. **All inventory-blocking statuses are used for overlap checks.**  
Before approving a booking (pending_approval → payment_pending), the system must check for overlapping dates with other bookings in status `payment_pending` or `confirmed`. If conflict exists, return 409 and do not create a Stripe session.

19. **Business-day and reminder logic use Europe/Paris as the canonical timezone.**  
Cron selection for balance_due_at, check-in reminder “tomorrow”, and rate-limit “one attempt per Paris day” all use Paris-local date. Helpers in `lib/paris-time.ts` are the single source.

20. **Webhook returns non-2xx only for invalid signature or malformed payload.**  
For verified Stripe events, the handler returns 200 even if business reconciliation fails, to avoid endless retries. All branches are logged with structured data for operator follow-up.

21. **Refunded bookings are excluded from normal flow.**  
On `charge.refunded`, `payment_intent.canceled`, or `charge.dispute.created`, the booking is marked `payment_status = refunded`, `status = canceled`, and an admin alert is sent. Check-in reminder and balance charge exclude refunded bookings.

22. **Stale checkout session policy.**  
If the webhook receives a successful payment for a session that does not match the booking’s current `stripe_session_id` (e.g. older link used after re-approval), the event is logged and not applied; operator handles manually.

---

## Balance Due Invariants

23. **Short-stay balance due = 14 days before check-in.**

When:

long_stay = false

then:

balance_due_at = check_in - 14 days

24. **Long-stay balance due = 30 days before check-in.**

When:

long_stay = true

then:

balance_due_at = check_in - 30 days

---

## Email System Invariants

25. **Emails must be triggered by system state changes only.**

Email A → booking request created  
Email B → host approval  
Email C → deposit payment success  
Email C2 → admin payment notification  

Emails must never be triggered directly by UI actions.

26. **Email sending must be idempotent.**

Reprocessing events must not send duplicate confirmation emails.

---

## Security Invariants

27. **Check-in instructions must never be sent earlier than 2 days before check-in.**

Access instructions must only be delivered:

check_in - 2 days

This prevents accidental exposure of entry codes.

---

## Balance Payment Retry Policy

Automatic balance charge will retry up to 3 times.

**Retry schedule**

Attempt 1: balance_due_at  
Attempt 2: next day  
Attempt 3: next day  

After 3 failed attempts the system stops retrying.

---

## Manual Payment Fallback

If automatic balance charge fails 3 times, the administrator may send a manual Stripe payment link to the guest.

---

## Reservation Cancellation Policy

Reservations may be cancelled if:

• balance payment remains unpaid  
• guest cannot be contacted  
• payment issues are not resolved before check-in  

Cancellation decisions are handled manually by the administrator.

---

## Operational Summary

These invariants guarantee:

• payment correctness  
• Stripe webhook safety  
• booking integrity  
• non-overlapping reservations  
• predictable automation  
• secure check-in procedures  

Any change violating these invariants must be rejected.

