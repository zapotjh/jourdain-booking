# Booking status transitions – race-condition audit

## 1. All current state transitions

| From | To | Where | Condition (intended) |
|------|-----|-------|----------------------|
| (none) | `pending_approval` | request-booking | INSERT only |
| `pending_approval` | `payment_pending` | host/approve | Host approved; Stripe session created |
| `pending_approval` | `canceled` | host/reject | Host rejected; GET/POST /api/host/reject |
| `payment_pending` | `confirmed` | webhook | checkout.session.completed |
| `payment_pending` | `canceled` | expire-pending-bookings | Expired & unpaid |
| `confirmed` | (same row, balance fields updated) | charge-balance | balance_paid flip or attempt/failure metadata |
| `confirmed` | `canceled` | webhook | charge.refunded, payment_intent.canceled, charge.dispute.created → payment_status=refunded, status=canceled |
| (any) | (no status change) | send-checkin-reminder | status=confirmed, payment_status=paid, check_in=tomorrow; dedupe via email_log only |

**Status values:** `pending_approval` → `payment_pending` → `confirmed` | `canceled`. Refund 시에만 `confirmed` → `canceled`.

---

## 2. Unsafe transitions (before patches)

| Route / job | Update | Issue |
|-------------|--------|--------|
| **webhook** | Set `status=confirmed`, `payment_status=paid`, etc. | No `.eq("status", "payment_pending")`. Replay or late webhook could overwrite an already canceled or already confirmed booking. |
| **host/approve** | Set `status=payment_pending`, `stripe_session_id`, etc. | No `.eq("status", "pending_approval")`. If expire-pending ran after the select, we’d overwrite a canceled booking to payment_pending. |
| **expire-pending-bookings** | Set `status=canceled` for list of ids | No `.eq("status", "payment_pending")` on the update. If the guest paid (webhook) between our select and update, we’d cancel an already confirmed booking. |
| **charge-balance** | All 5 updates (failure metadata x3, balance_paid success x1, failure non-succeeded x1) | Only the success path had `.eq("balance_paid", false)`. No update required `status=confirmed` or `balance_paid=false`, so in theory we could overwrite a canceled or already balance_paid row. |
| **send-checkin-reminder** | No DB update | Dedupe via email_log only (alreadySentEmail). No booking column written. Safe. |

**Already safe:**

- **host/approve** backfill of `payment_pending_expires_at`: already uses `.eq("status", "payment_pending").is("payment_pending_expires_at", null)`.
- **request-booking**: insert only, no update.

---

## 3. Patches applied (conditional, race-safe updates)

- **webhook:** `.eq("status", "payment_pending")` on the confirm update. Only confirm when still waiting for deposit payment.
- **host/approve:** `.eq("status", "pending_approval")` on the update that sets `payment_pending` and Stripe session. Only transition when still pending approval.
- **expire-pending-bookings:** `.eq("status", "payment_pending")` on the cancel update. Only cancel rows that are still payment_pending (and we already selected unpaid + expired).
- **charge-balance:** Every booking update now includes `.eq("status", "confirmed").eq("balance_paid", false)` where applicable (failure metadata and success path). Exception handler update also conditional.
- **send-checkin-reminder:** No DB update for sent flag. Dedupe is via `email_log` only (alreadySentEmail for `checkin_reminder_1d`). Route only selects status=confirmed, payment_status=paid, check_in=tomorrow.

---

## 4. Payment reconciliation

When Stripe reports a successful payment but the booking is not in the expected state (e.g. expire-pending ran first and set status to `canceled`), the webhook applies **reconciliation** so that **a successful Stripe payment never leaves a booking canceled** (invariant).

**Reconciliation cases:**

| Scenario | Handling |
|----------|----------|
| **Paid but canceled** | Webhook re-fetches booking; if `status === 'canceled'` and `session.payment_status === 'paid'`, it runs a conditional update to `confirmed`. **Only if the update returns a row** does it send the canonical **admin reconciliation alert** (send-with-log, email_type `webhook_reconciliation_alert`). If the update fails or returns 0 rows, webhook logs structured error and returns 200 without sending any email claiming recovery. Operator can refund manually if needed. |
| **Charged but DB update failed** | Webhook retries the confirm update once. If still 0 rows, reconciliation treats as above (re-fetch, recover if canceled). |
| **Webhook delivered after expiration** | Expire cron may have set `canceled` before webhook. Webhook reconciliation detects `canceled` + paid and recovers to `confirmed`. |

**Operator response:**

- **Admin alert email** — Indicates a paid booking was in `canceled` state and has been recovered to `confirmed`.
- **Refund path** — If the guest was already refunded or the booking was intentionally canceled, operator must refund or adjust manually.
- **Manual recovery** — No automatic refund; recovery only sets `status = confirmed` to satisfy the invariant. Any business decision (refund vs. keep) is manual.
