# A+ Hardening pass — summary

Minimal, surgical changes to align code with invariants, architecture docs, and operational safety. No redesign.

---

## What was changed

### P0 — Must fix

1. **Webhook reconciliation → canonical email only**  
   - Removed direct `@/lib/emails/mailer` from webhook.  
   - Added `sendAdminWebhookReconciliationAlert()` in `lib/emails/send-with-log.ts` with `email_type: webhook_reconciliation_alert`, logged to `email_log`.  
   - Alert is sent **only when the recovery DB update succeeds**; if update fails or returns 0 rows, webhook logs structured error and returns 200 without sending any email claiming recovery.  
   - After recovery, deposit success emails (C/C2) sent via canonical layer (deduped by alreadySentEmail).

2. **Approve flow → no orphaned Stripe sessions**  
   - In `lib/approve-booking.ts`, when the DB update after session creation returns 0 rows (or errors), the code now calls `stripe.checkout.sessions.expire(session.id)` and returns 409.  
   - Structured logging added for the orphan-session case.

3. **Balance “once per Paris day” → DB-enforced claim**  
   - New migration `08_claim_balance_attempt.sql`: RPC `claim_balance_attempt(booking_id)` atomically sets `last_balance_attempt_at = now()` only when the row is eligible (Paris-date of last attempt < today Paris, attempts < 3, etc.).  
   - `app/api/cron/charge-balance/route.ts` calls the RPC before Stripe; only the caller that gets a row back proceeds to charge.  
   - Idempotency key `balance:{booking_id}:attempt:{N}` unchanged; used together with DB claim.

4. **Balance attempt semantics**  
   - Docs and code comments now define `balance_payment_attempts` as **current retry counter** (reset to 0 on success; stops after 3 failures). **Not** a lifetime total.  
   - Updated: `booking-system-architecture.md`, `email-log-system.md`, `task.md`.

### P1 — Consistency

5. **Check-in reminder dedupe**  
   - Route no longer uses `checkin_email_sent`. Dedupe is via `email_log` only (`alreadySentEmail(..., "checkin_reminder_1d")`).  
   - Docs state email_log is the single source of truth for check-in reminder.

6. **Stripe API version**  
   - Webhook and all Stripe clients use `apiVersion: "2026-02-25.clover"`.

7. **next-env.d.ts**  
   - Removed `import "./.next/dev/types/routes.d.ts"`. File restored to standard Next.js form.

8. **task.md**  
   - Updated: balance_payment_attempts semantics, 1-day rate limit (DB claim), Phase 6 check-in (done, email_log dedupe), Phase 9 (idempotency key + DB claim). Removed stale “future hardening” wording.

### P2 — Safety / polish

9. **Webhook response policy**  
   - On reconciliation failure (recover update 0 rows or error), webhook returns 200, logs structured data (bookingId, sessionId, branch, recoverResult), does not send success/recovery email.

10. **Checkout route**  
    - `app/api/checkout/route.ts` labeled as **non-canonical** (standalone/test only; not part of request → approve → webhook flow).

11. **Docs**  
    - `booking-status-transitions-audit.md`: reconciliation and send-checkin-reminder bullets updated.  
    - `email-log-system.md`: added `webhook_reconciliation_alert`; check-in dedupe source of truth.  
    - Testing checklist added to `booking-system-architecture.md`.

---

## Invariant each change protects

| Change | Invariant / goal |
|--------|-------------------|
| Webhook canonical email + only if recovered | No paid booking remains canceled; all emails via send-with-log; no false “recovered” email. |
| Expire orphan session on approve failure | No orphaned Stripe Checkout sessions without DB ownership. |
| DB claim before Stripe (balance) | No duplicate balance charge from concurrent/retried cron runs (once per Paris day). |
| balance_payment_attempts semantics | Clear, single meaning in code and docs; no confusion with lifetime counter. |
| Check-in dedupe via email_log | Single source of truth for email dedupe; docs and code consistent. |
| Single Stripe apiVersion | Consistent Stripe behavior and docs. |
| next-env.d.ts restore | No committed .next references; standard Next.js type setup. |
| task.md update | No stale instructions for future agents. |
| Webhook 200 on internal failure | Avoid endless Stripe retries for irrecoverable states. |
| Non-canonical checkout label | Production booking flow is only request → approve → webhook. |

---

## Intentionally deferred

- **balance_attempts_total** — Optional permanent observability column; not added to avoid scope creep.  
- **New status `approval_in_progress`** — Preferred “claim then create session” would add a new status; current “create session then update; expire session if update fails” was chosen as minimal fix.  
- **Large refactors** — No architecture rewrite; no duplicate approval logic; no change to core state machine.  
- **`checkin_email_sent` column** — 사용하지 않음(제거 권장). 중복 판단은 email_log 단일 소스.  
- **/api/bookings/approve route** — Not created; architecture doc already notes it as alternative/future admin UI; only `host/approve` exists and calls `approveBooking()`.

---

## Production hardening (10 failure modes) — summary

| Failure mode | Defense |
|--------------|--------|
| 1. Webhook duplicate delivery | Table `stripe_webhook_events`; insert event_id before logic; unique violation → 200. |
| 2. Webhook vs expire-cron race | Canonical reconciliation path (CASE A–D); recover canceled+paid; alert only if DB update succeeds. |
| 3. Stripe retry on non-2xx | Return non-2xx only for invalid signature/malformed payload; 200 + structured logs otherwise. |
| 4. Payment succeeded but booking not updated | Cron `/api/cron/reconcile-stripe-payments` (hourly); recovers using same logic as webhook. |
| 5. Duplicate emails | EmailResult return type; email_log exact attempt_number match; all sends via send-with-log. |
| 6. Balance double-charge | DB claim (claim_balance_attempt) + Stripe idempotency key; structured logging. |
| 7. Stale checkout session | Webhook checks session.id === booking.stripe_session_id; if not, log and 200 (no recover). |
| 8. Timezone bugs | lib/paris-time.ts (getParisDateString, startOfTomorrowParis, etc.); crons use Paris. |
| 9. Refund out of sync | charge.refunded, payment_intent.canceled, charge.dispute.created → payment_status=refunded, status=canceled, admin refund_alert. |
| 10. Double booking / overlap | approveBooking() overlap check before session create; 409 if conflict. |

---

## Final checklist

- [x] Webhook duplicate-safe (stripe_webhook_events)
- [x] Cron duplicate-safe (balance claim RPC; reconcile idempotent)
- [x] Email duplicate-safe (email_log + EmailResult)
- [x] Stale session-safe (webhook rejects non-matching session)
- [x] Refund-aware (refund/dispute handlers + alert)
- [x] Overlap-safe (approval overlap check)
- [x] Timezone-safe (Paris helpers)
- [x] Reconciliation-safe (webhook path + reconcile cron)
- [x] Balance charge-safe (DB claim + idempotency key)
- [x] Operator-visible on anomalies (structured logs, alerts via send-with-log)
