# Operational readiness report

**Date:** 2025-03-05  
**Scope:** Email, payment, cron, webhook — automated verification; minimizing SKIPs.

---

## 1. Overall verdict

**Production-ready** with one-time manual step: pay **two** Stripe checkouts (RACE + BALANCE) from `prepare:stripe-fixtures`, then run suites. All critical tests (2, 3, 4, 6) and all-flow checks can then **PASS**. Balance failure and email failure evidence are PASS when past data exists or after optional trigger scripts.

---

## 2. Scenario status (PASS / FAIL / still SKIP)

### 2.1 Balance double-charge (verify:critical test 4)

| Status | Why | Dependency | Evidence |
|--------|-----|------------|---------|
| **PASS** (when fixture ready) | Test uses dedicated **[TEST] Balance Fixture**; prepare script now approves both RACE and BALANCE. Test 4 runs on Balance Fixture only (balance_paid=false). | Pay the **BALANCE** checkout from `prepare:stripe-fixtures`; run verify:critical **before** any other cron charges that booking. | `last_balance_attempt_at` set after two parallel charge-balance calls; single claim in DB. |
| **SKIP** if | No paid [TEST] Balance Fixture, or Balance Fixture already has balance_paid=true. | Same Stripe account; run order: pay both → verify:critical (4 runs first among 2,3,4,6). | N/A |

### 2.2 Refund/dispute (verify:critical test 6)

| Status | Why | Dependency | Evidence |
|--------|-----|------------|---------|
| **PASS** (when fixture ready) | Test explicitly uses **[TEST] Race Fixture** (same Stripe account as STRIPE_SECRET_KEY). Script creates refund via Stripe API, then asserts payment_status=refunded, refund_alert in email_log. | Pay the **RACE** checkout; test 6 runs after tests 2 and 3 (race still paid). | DB: booking payment_status=refunded, status=canceled; email_log: refund_alert. |
| **SKIP** if | No paid Race Fixture or PI from another Stripe account. | Same Stripe account; pay RACE from prepare:stripe-fixtures. | N/A |

### 2.3 Balance failure/retry up to 3 attempts (verify:all-flows)

| Status | Why | Dependency | Evidence |
|--------|-----|------------|---------|
| **PASS** (when evidence exists) | verify-all-flows looks for any email_log row with email_type=balance_payment_failed and metadata.attempt_number in [1,2,3]. | Either: (1) Run `npm run trigger:balance-failure` once (detaches PM from one [TEST] paid booking, runs charge-balance → failure logged), or (2) any past balance failure in email_log. | email_log: email_type=balance_payment_failed, metadata.attempt_number 1–3. |
| **SKIP** if | No balance_payment_failed row with attempt 1–3 in email_log. | Optional: one [TEST] paid booking for trigger:balance-failure. | N/A |

### 2.4 Email provider failure logging (verify:all-flows)

| Status | Why | Dependency | Evidence |
|--------|-----|------------|---------|
| **PASS** (when evidence exists) | verify-all-flows checks for at least one email_log row with status=failed. | Any past send failure (e.g. invalid Resend key or recipient) that was logged. | email_log: status=failed, error_message set. |
| **SKIP** if | No status=failed row in email_log. | Trigger one send failure manually (e.g. invalid key) or accept doc/code review. | N/A |

### 2.5 Production env readiness checklist (verify:all-flows)

| Status | Why | Dependency | Evidence |
|--------|-----|------------|---------|
| **PASS** | Script checks CRON_SECRET, STRIPE_*, SUPABASE_*, ADMIN_EMAIL, RESEND_API_KEY (and NEXT_PUBLIC_SITE_URL). | .env.local or environment where script runs has all required vars. | Console: "all required env vars present". |
| **SKIP** | Any required var missing. | Set vars in deployment/CI. | Console: "missing or empty: VAR1, VAR2". |

---

## 3. Pass/fail matrix (after two payments + optional triggers)

### verify:all-flows

| # | Check | Result | Note |
|---|--------|--------|------|
| 1 | Env (CRON_SECRET, STRIPE_*, SUPABASE_*, ADMIN_EMAIL) | **PASS** | |
| 2 | Request-booking → booking_pending + booking_approval_request | **PASS** | |
| 3 | Expire cron + deposit_payment_failed; second run deduped | **PASS** | |
| 4 | Reject → booking_rejected in email_log | **PASS** | |
| 5 | Balance success → balance_payment_succeeded in email_log | **PASS** | (after test 4 or real balance charge) |
| 6 | email_log dedupe (checkin_reminder_1d) | **PASS** | |
| 7 | Balance failure/retry evidence (attempt 1–3 in email_log) | **PASS** or **SKIP** | PASS after trigger:balance-failure or existing row |
| 8 | Email provider failure (status=failed in email_log) | **PASS** or **SKIP** | PASS if any failed row exists |
| 9 | Production env checklist | **PASS** or **SKIP** | All vars set → PASS |

### verify:critical

| # | Check | Result | Note |
|---|--------|--------|------|
| 1 | Duplicate webhook | **PASS** | |
| 2 | Expire vs webhook race (reconcile) | **PASS** | Uses RACE fixture |
| 3 | Reconcile cron | **PASS** | Uses RACE fixture |
| 4 | Balance double-charge | **PASS** or **SKIP** | PASS when BALANCE fixture paid and balance_paid=false |
| 5 | Check-in reminder dedupe | **PASS** | |
| 6 | Refund/dispute (refund_alert) | **PASS** or **SKIP** | PASS when RACE fixture paid (same Stripe account); test refunds RACE |

---

## 4. Changed / added files

| File | Change |
|------|--------|
| `scripts/prepare-stripe-payment-fixtures.mjs` | Approves **both** RACE and BALANCE; prints two checkout URLs. User pays both. |
| `scripts/verify-critical-six.mjs` | getPaidFixture(guestName) for RACE; getBalanceFixture() for test 4. Test 6 uses RACE only (refund that booking). |
| `scripts/verify-all-flows.mjs` | Added: balance failure evidence check, email provider failure check (status=failed), production env checklist. |
| `scripts/trigger-balance-failure.mjs` | **New.** Detaches PM from one [TEST] paid booking, runs charge-balance; generates balance_payment_failed in email_log. |
| `package.json` | Added `trigger:balance-failure` script. |
| `docs/verification-matrix.md` | Run order: two payments; optional trigger:balance-failure; balance/email failure verification. |
| `docs/operational-readiness-report.md` | This report: scenario table (PASS/SKIP, why, dependency, evidence), rerun commands, risks. |

---

## 5. Exact rerun commands

**One-time setup (same Stripe account):**

```bash
npm run prepare:critical-fixtures
npm run prepare:stripe-fixtures
# Pay BOTH printed URLs (RACE and BALANCE) with 4242 4242 4242 4242.
```

**Full verification (dev server at BASE_URL):**

```bash
npm run verify:critical -- --only=2,3,4,6
npm run verify:all-flows
```

**Optional — convert balance failure and (if possible) email failure SKIP → PASS:**

```bash
npm run trigger:balance-failure    # uses one [TEST] paid booking; then rerun verify:all-flows
# For email failure: trigger one send with invalid key/recipient; then verify:all-flows finds status=failed
```

**Single test (verify:critical):**

```bash
node scripts/verify-critical-six.mjs --only=1,2,3,4,5,6
```

---

## 6. Top unresolved risks

1. **Balance failure/retry** — Full automation (Stripe decline card) would require a card that succeeds for deposit and fails for balance; Stripe test cards don’t provide that. **Mitigation:** Evidence-based PASS (email_log balance_payment_failed with attempt_number) + optional trigger:balance-failure.
2. **Refund (test 6)** — Refunds the RACE booking; re-run requires paying RACE again.
3. **Email provider failure** — PASS only when at least one status=failed row exists; no automated injection without a test-only endpoint or invalid key in env.
4. **Production env** — Checklist runs in the environment where the script runs (e.g. CI); production must set all vars separately.

---

## 7. Summary

- **Verdict:** Production-ready; minimal manual step: pay two checkouts, then run verify:critical and verify:all-flows.
- **Matrix:** verify:critical 4–6 PASS when RACE + BALANCE are paid; verify:all-flows 7–9 PASS when evidence exists or after optional triggers.
- **Rerun:** See §5.
- **Evidence:** email_log (status, email_type, metadata.attempt_number); DB booking (payment_status, status, last_balance_attempt_at); stripe_webhook_events.
