# Email log system

Canonical email tracking lives in `public.email_log`. No per-email-type booleans on `bookings` are used for dedupe. For check-in reminder, **email_log is the single source of truth** (alreadySentEmail for `checkin_reminder_1d`). **비권장/제거:** `bookings.checkin_email_sent` 같은 컬럼은 사용하지 않음(코드에서 참조 없음). 중복 판단은 오직 `email_log` 기준.

- **Duplicate prevention:** Before each send we check `alreadySentEmail(bookingId, recipientType, emailType, attemptNumber?, opts?)`. If a row exists, we skip send and do not insert again. For `balance_payment_failed` we pass `attemptNumber` so up to 3 rows per (booking, recipient) are allowed. For `security_deposit_hold_failed` we pass `opts.parisDate` (YYYY-MM-DD, Europe/Paris) so one guest+admin pair per Paris calendar day per booking.
- **Insert always:** Pattern is `try { send(); status = 'sent' } catch { status = 'failed' }; insertEmailLog(...)` — one insert per send attempt, so every attempt is recorded.
- **UNIQUE index:** `email_log_unique_event` on `(booking_id, recipient_type, email_type)` WHERE `email_type NOT IN ('balance_payment_failed', 'security_deposit_hold_failed')` so the DB rejects duplicate inserts for non-retry types (webhook/cron re-runs, bugs). `security_deposit_hold_failed` is excluded so app-level dedupe via `metadata.paris_date` can allow one failure email per Paris day.
- **metadata (jsonb):** The table has a `metadata` column. We store e.g. `stripe_session_id`, `checkout_url`, `attempt` / `attempt_number`, `stripe_payment_intent_id` for debugging. For every send we store `intended_to_email`, `actual_to_email`, `email_mode`, and `redirected` so logs preserve the original recipient and the actual outbound address.

---

## 0. Resend sandbox / test mode and EMAIL_MODE

**Resend restriction:** In Resend’s sandbox or before domain verification, you can only send to your own verified address. Sending to arbitrary guest addresses returns a validation error. So in test/dev we redirect guest emails to a safe inbox until domain verification is complete.

**EMAIL_MODE and safe testing:**

**Current test-mode routing (EMAIL_MODE=test):** Admin emails → **apt.jourdain.paris@gmail.com**; guest emails → **tojhlim@gmail.com** (TEST_EMAIL_OVERRIDE).

- **EMAIL_MODE=production** (default): No redirection. Guest emails go to the real guest address; admin emails go to ADMIN_EMAIL. Use in production after the sending domain is verified in Resend.

- **EMAIL_MODE=test**: Guest emails are redirected to TEST_EMAIL_OVERRIDE (or ADMIN_EMAIL if unset). Subject prefixed with `[TEST REDIRECT]`. Admin emails go to ADMIN_EMAIL; admin subject may be prefixed with `[TEST MODE]`. All sends are logged to email_log with metadata: intended_to_email, actual_to_email, email_mode, redirected.

**Production switch (after domain verification):** Set EMAIL_MODE=production (or omit). Keep ADMIN_EMAIL=apt.jourdain.paris@gmail.com. Remove TEST_EMAIL_OVERRIDE or leave unused. Guest emails will then send to real guest recipients.

---

## 1. Event → recipient → function → email_type mapping

| Event | Recipient | Function | email_type |
|-------|-----------|----------|------------|
| New booking request created | guest | `sendGuestBookingPendingEmail` | `booking_pending` |
| New booking request created | admin | `sendAdminBookingApprovalRequestEmail` | `booking_approval_request` |
| Host approved + Stripe session created | guest | `sendGuestApprovedPaymentLinkEmail` | `booking_approved_payment_link` |
| Deposit payment succeeded (webhook) | guest | `sendGuestDepositPaymentSucceededEmail` | `deposit_payment_succeeded` |
| Deposit payment succeeded (webhook) | admin | `sendAdminDepositPaymentSucceededEmail` | `deposit_payment_succeeded` |
| Deposit payment failed/expired (expire-pending cron) | guest | `sendGuestDepositPaymentFailedEmail` | `deposit_payment_failed` |
| Deposit payment failed/expired (expire-pending cron) | admin | `sendAdminDepositPaymentFailedEmail` | `deposit_payment_failed` |
| Balance payment succeeded (charge-balance cron) | guest | `sendGuestBalancePaymentSucceededEmail` | `balance_payment_succeeded` |
| Balance payment succeeded (charge-balance cron) | admin | `sendAdminBalancePaymentSucceededEmail` | `balance_payment_succeeded` |
| Balance payment failed (charge-balance cron, up to 3 attempts) | guest | `sendGuestBalancePaymentFailedEmail` | `balance_payment_failed` |
| Balance payment failed (charge-balance cron) | admin | `sendAdminBalancePaymentFailedEmail` | `balance_payment_failed` |
| Check-in 1 day before | guest | `sendGuestCheckinReminder1dEmail` | `checkin_reminder_1d` |
| Check-in 1 day before (optional) | admin | `sendAdminCheckinReminder1dEmail` | `checkin_reminder_1d` |
| Webhook reconciliation (paid was canceled, recovered) | admin | `sendAdminWebhookReconciliationAlert` | `webhook_reconciliation_alert` |
| Refund / dispute (charge.refunded, payment_intent.canceled, charge.dispute.created) | admin | `sendAdminRefundAlert` | `refund_alert` |
| Security deposit hold succeeded (security-deposit-hold cron) | guest | `sendGuestSecurityDepositHoldSucceededEmail` | `security_deposit_hold_succeeded` |
| Security deposit hold succeeded (security-deposit-hold cron) | admin | `sendAdminSecurityDepositHoldSucceededEmail` | `security_deposit_hold_succeeded` |
| Security deposit hold failed (security-deposit-hold cron; dedupe by `metadata.paris_date`) | guest | `sendGuestSecurityDepositHoldFailedEmail` | `security_deposit_hold_failed` |
| Security deposit hold failed (security-deposit-hold cron) | admin | `sendAdminSecurityDepositHoldFailedEmail` | `security_deposit_hold_failed` |

---

## 2. Duplicate check query (run as a single statement)

To avoid "trailing junk after numeric literal" errors, run this query **alone** (no other SQL on the same line or pasted right after). In Supabase SQL editor, run one statement at a time.

```sql
SELECT 1
FROM public.email_log
WHERE booking_id = 'YOUR_BOOKING_UUID'
  AND recipient_type = 'guest'
  AND email_type = 'deposit_payment_succeeded'
LIMIT 1;
```

If a row is returned, this event was already sent. For `balance_payment_failed` you’d also filter by attempt, e.g. `AND (metadata->>'attempt_number')::int = 2`.

---

## 3. Example queries (email history)

**All emails for one booking**

```sql
SELECT id, recipient_type, email_type, to_email, subject, status, error_message, sent_at, metadata
FROM public.email_log
WHERE booking_id = 'YOUR_BOOKING_UUID'
ORDER BY sent_at DESC;
```

**All failed emails**

```sql
SELECT id, booking_id, recipient_type, email_type, to_email, error_message, sent_at
FROM public.email_log
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

**All admin emails**

```sql
SELECT id, booking_id, email_type, to_email, subject, status, sent_at
FROM public.email_log
WHERE recipient_type = 'admin'
ORDER BY sent_at DESC;
```

**All guest emails**

```sql
SELECT id, booking_id, email_type, to_email, subject, status, sent_at
FROM public.email_log
WHERE recipient_type = 'guest'
ORDER BY sent_at DESC;
```

---

## 4. Balance retry limit (3 attempts)

In `app/api/cron/charge-balance/route.ts`, only bookings with `balance_payment_attempts < 3` are selected. `balance_payment_attempts` is the **current retry counter** (reset to 0 on success; not a lifetime total). The 4th attempt is never run. Each failure is logged in `email_log` with `metadata.attempt` and `metadata.attempt_number` (1, 2, or 3).

---

## 5. Minimal manual testing checklist

- **booking_pending + booking_approval_request**  
  - `POST /api/request-booking` with valid body → check inbox (guest) and admin inbox; check `email_log` for `booking_pending` and `booking_approval_request`.

- **booking_approved_payment_link**  
  - Create a pending booking, then `POST /api/host/approve` with `approval_token` → guest receives payment link email; `email_log` has `booking_approved_payment_link` with `checkout_url` in metadata.

- **deposit_payment_succeeded**  
  - Complete Stripe Checkout for deposit (or trigger webhook with `checkout.session.completed`) → guest and admin receive confirmation; `email_log` has two rows: guest and admin `deposit_payment_succeeded`.

- **deposit_payment_failed**  
  - Either let a payment_pending booking expire (run expire-pending cron after expiry) or manually set `payment_pending_expires_at` in the past and run cron → guest and admin receive deposit failed emails; `email_log` has `deposit_payment_failed` for both.

- **balance_payment_succeeded**  
  - For a confirmed booking with balance due, run charge-balance cron so that the balance charge succeeds → guest and admin receive balance success emails; `email_log` has both `balance_payment_succeeded` rows.

- **balance_payment_failed (up to 3 attempts)**  
  - For a confirmed booking with balance due, force failure (e.g. insufficient funds or invalid payment method) and run charge-balance cron → guest and admin receive balance failed email; `email_log` has `balance_payment_failed` with `metadata.attempt` and `metadata.attempt_number` (1, 2, 3). After 3 failures the booking is no longer selected by the cron (`balance_payment_attempts < 3`).

- **checkin_reminder_1d**  
  - Set a confirmed, balance-paid booking’s `check_in` to tomorrow (Paris date), run send-checkin-reminder cron → guest receives check-in email; optionally admin receives reminder; `email_log` has `checkin_reminder_1d` for guest (and admin if sent).

### Curl examples

```bash
# Request booking (triggers booking_pending + booking_approval_request)
curl -s -X POST "http://localhost:3000/api/request-booking" \
  -H "Content-Type: application/json" \
  -d '{"guest_name":"Test","email":"guest@example.com","check_in":"2026-04-01","check_out":"2026-04-05","total_price_eur":500}'

# Host approve (use approval_token from DB; triggers booking_approved_payment_link)
curl -s -X POST "http://localhost:3000/api/host/approve" \
  -H "Content-Type: application/json" \
  -d '{"approval_token":"<TOKEN>"}'

# Cron (require CRON_SECRET header)
curl -s "http://localhost:3000/api/cron/expire-pending-bookings" -H "x-cron-secret: $CRON_SECRET"
curl -s "http://localhost:3000/api/cron/charge-balance" -H "x-cron-secret: $CRON_SECRET"
curl -s "http://localhost:3000/api/cron/send-checkin-reminder" -H "x-cron-secret: $CRON_SECRET"
```

Webhook and balance success/failure are best tested with Stripe CLI or real checkout; then verify `email_log` and inboxes.
