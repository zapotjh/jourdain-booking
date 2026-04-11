# Verification matrix — email, payment, cron, webhook

All flows are listed with trigger, emails, and how they are verified. **Manual** = human-verified once. **Auto** = covered by scripts. **Skip** = explicitly out of scope or duplicate of another.

---

## 1. Email flows and triggers

| # | Trigger | Guest email_type | Admin email_type | Verification |
|---|--------|-------------------|------------------|---------------|
| 1 | POST /api/request-booking | booking_pending | booking_approval_request | Auto: verify-all-flows (request-booking + email_log) |
| 2 | POST /api/host/approve (new session) | booking_approved_payment_link | — | Auto: prepare-stripe-fixtures creates session; manual pay then webhook |
| 3 | Webhook checkout.session.completed (normal) | deposit_payment_succeeded | deposit_payment_succeeded | **Manual (done)** — guest confirmation after payment |
| 4 | Webhook checkout.session.completed (recovered canceled) | deposit_payment_succeeded | deposit_payment_succeeded + webhook_reconciliation_alert | Auto: verify-critical-six test 2 & 3 |
| 5 | Cron expire-pending-bookings (expired payment_pending) | deposit_payment_failed | deposit_payment_failed | Auto: verify-all-flows (expire cron + email_log) |
| 6 | Cron charge-balance (success) | balance_payment_succeeded | balance_payment_succeeded | Auto: verify-critical-six test 4 + email_log check |
| 7 | Cron charge-balance (failure, attempt 1–3) | balance_payment_failed | balance_payment_failed | Auto: **verify-balance-failure-retry** (attempt 1/2/3 increment, email per attempt_number, dedupe same attempt, stop after 3). One manual step: pay one [TEST] BALANCE checkout. |
| 8 | Cron send-checkin-reminder | checkin_reminder_1d | checkin_reminder_1d | **Manual (done)** — 1-day check-in reminder |
| 9 | Webhook charge.refunded / payment_intent.canceled / dispute | — | refund_alert | Auto: verify-critical-six test 6 |
| 10 | Host rejects booking | booking_rejected | — | Auto: verify-all-flows (reject + email_log) if reject API exists |

---

## 2. Cron jobs

| Cron | Purpose | Verification |
|------|---------|--------------|
| GET /api/cron/expire-pending-bookings | Cancel expired payment_pending; send deposit_payment_failed | Auto: verify-all-flows |
| GET /api/cron/charge-balance | Charge balance for due bookings; send success/failure emails | Auto: verify-critical-six test 4 (double-invocation safety); verify-all-flows checks email_log for balance_payment_succeeded |
| GET /api/cron/send-checkin-reminder | Send checkin_reminder_1d for tomorrow check-in | Auto: verify-critical-six test 5 (dedupe) |
| GET /api/cron/reconcile-stripe-payments | Recover paid-but-not-confirmed bookings | Auto: verify-critical-six test 2 & 3 |

---

## 3. Webhook flows

| Event | Action | Verification |
|-------|--------|---------------|
| checkout.session.completed | Confirm booking; send deposit_payment_succeeded guest+admin | Manual (done) + critical-six test 2/3 (recovery path) |
| charge.refunded | Set payment_status=refunded, status=canceled; send refund_alert | Auto: verify-critical-six test 6 |
| charge.dispute.created | Send refund_alert | Auto: same webhook handler; test 6 covers refund path |
| payment_intent.canceled | Send refund_alert | Auto: same handler |

---

## 4. Duplicate and safety

| Concern | Mechanism | Verification |
|--------|-----------|--------------|
| Duplicate webhook (same event twice) | stripe_webhook_events + recordWebhookEvent → duplicate: true, 1 row | Auto: verify-critical-six test 1 |
| Duplicate cron (e.g. check-in reminder twice) | alreadySentEmail → deduped; email_log unique | Auto: verify-critical-six test 5 |
| Duplicate expire (run twice on same booking) | alreadySentEmail(deposit_payment_failed) → second run no-op send | Auto: verify-all-flows (expire twice, count email_log rows) |
| Balance double-charge (two crons same booking) | claim_balance_attempt RPC; one claim per Paris day | Auto: verify-critical-six test 4 |
| Balance failure same attempt (cron run twice same day) | claim_balance_attempt fails second run; alreadySentEmail(attemptNumber) dedupes | Auto: verify-balance-failure-retry (duplicate run after attempt 1 → no extra emails) |

---

## 5. Email provider failure

| Scenario | Expected | Verification |
|----------|----------|--------------|
| Resend returns error | send-with-log catches; insertEmailLog(status: "failed", error_message); EmailResult.status === "failed" | **verify:email-failure-inject**: calls POST /api/test/inject-email-failure (magic address); asserts email_log has one row with status=failed, error_message set, provider_message_id null, useful metadata; reinvoke is deduped (no second row). |
| Safe failure injection | Mailer throws for recipient `inject-failure@verification.local` (no Resend call) | Same script; POST /api/test/inject-email-failure uses that address; reinvoke uses `?booking_id=...`. |

**Rerun:** `npm run verify:email-failure-inject` (dev server at BASE_URL, CRON_SECRET and Supabase in .env.local).

**Manual resend:** Not implemented. email_log is canonical and alreadySentEmail prevents duplicate sends. To "resend" a failed email you would need either (1) to delete the failed row in email_log and re-trigger the same business flow (e.g. re-approve, re-run cron), or (2) an admin-only "force resend" that bypasses alreadySentEmail for a given (booking_id, recipient_type, email_type)—currently **the exact missing piece** is such an API or script (e.g. POST /api/admin/force-resend-email with booking_id, email_type, optional attempt_number for balance_payment_failed).

---

## 6. Env safety

| Env var | Required for | Verification |
|---------|--------------|--------------|
| CRON_SECRET | All crons | Auto: verify-all-flows env check |
| STRIPE_SECRET_KEY | Webhook, charge-balance, reconcile | Auto: verify-critical-six |
| STRIPE_WEBHOOK_SECRET | Webhook signature | Auto: verify-critical-six test 1 |
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | DB, email_log | Auto: all scripts |
| ADMIN_EMAIL | Admin emails | Doc / runtime |
| EMAIL_MODE, TEST_EMAIL_OVERRIDE | Test redirect | Doc |

---

## 7. Already manually verified (skip in auto)

- Guest booking confirmation email after successful payment (deposit_payment_succeeded).
- Guest 1-day-before check-in reminder (checkin_reminder_1d).

---

## 8. Run order

1. `npm run prepare:critical-fixtures` (once)
2. `npm run prepare:stripe-fixtures` (prints two checkout URLs: RACE and BALANCE)
3. Manual: pay **both** RACE and BALANCE checkouts (same Stripe account; card 4242 4242 4242 4242)
4. `npm run verify:critical -- --only=2,3,4,6` (test 4 uses BALANCE fixture; test 6 refunds RACE)
5. `npm run verify:all-flows` (request-booking, expire, reject, balance success/dedupe, balance failure evidence, email failure logging, production env checklist)
6. **Balance failure/retry (exact production behavior):** `npm run verify:balance-failure-retry` — one manual step: pay one [TEST] BALANCE checkout; script detaches PM, runs 3 failures + stop-after-3 + dedupe check. See §9.
7. **Email provider failure injection:** `npm run verify:email-failure-inject` — proves send-with-log records status=failed and metadata when send fails; reinvoke is deduped. No manual step (uses magic address). See §5.

---

## 9. Balance auto-charge failure and retry (detailed)

| Check | Production behavior | Verification |
|-------|---------------------|--------------|
| Attempt 1 | balance_payment_attempts 0→1; guest+admin balance_payment_failed with attempt_number=1 | verify-balance-failure-retry |
| Attempt 2 | balance_payment_attempts 1→2; guest+admin balance_payment_failed with attempt_number=2 | Same script (sets last_balance_attempt_at to past so claim succeeds) |
| Attempt 3 | balance_payment_attempts 2→3; guest+admin balance_payment_failed with attempt_number=3 | Same script |
| Duplicate same attempt | Second cron run same Paris day: claim_balance_attempt returns no row → no second email | Script runs charge-balance twice after attempt 1; asserts still 2 rows for attempt 1 |
| Stop after 3 | Booking with balance_payment_attempts=3 excluded from cron select (`.or("balance_payment_attempts.is.null", "balance_payment_attempts.lt.3")`) | Script runs charge-balance again; asserts no new emails, balance_payment_attempts still 3 |

**Safe failure scenario:** Script detaches all payment methods from the booking’s Stripe customer so charge-balance fails with “no reusable payment_method” — no Stripe balance charge is created.

**Admin/manual follow-up after 3 failures:**

- Booking remains `status=confirmed`, `payment_status=paid`, `balance_paid=false`, `balance_payment_attempts=3`. Cron will no longer select it.
- **Follow-up:** Admin sends manual payment link (e.g. new checkout session) or collects payment outside Stripe and marks balance as paid in DB. See `docs/balance-auto-charge-e2e.md` and operational runbooks. No automatic retry after attempt 3.

**Conclusion (balance failure/retry):** **Safe.** Attempts 1–3 increment correctly; one email per attempt per recipient; duplicate execution for the same attempt does not send duplicate emails; retry stops after 3; admin path is documented.
