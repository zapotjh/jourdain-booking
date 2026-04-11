# Bookings schema: canonical vs deprecated

## Canonical columns (single source of truth)

Use these in all application logic.

| Column | Type | Description |
|--------|------|-------------|
| `total_price_cents` | integer | Total booking price in cents (e.g. 100000 = 1000 EUR). |
| `deposit_amount_cents` | integer | 40% deposit in cents. |
| `balance_amount_cents` | integer | Remaining 60% in cents. |
| `security_deposit_hold_cents` | integer | Hold amount (e.g. 28 EUR/night × nights, in cents). |
| `currency` | text | e.g. `'eur'`. |
| `stripe_session_id` | text | Stripe Checkout Session ID (e.g. `cs_test_...`). Only column used for checkout session. |
| `long_stay` | boolean | `true` if `nights >= 28`; drives balance due date. |
| `balance_due_at` | date | Date by which the 60% balance must be paid: `check_in - 14` (short) or `check_in - 30` (long stay). |

Plus standard fields: `id`, `email`, `status`, `check_in`, `check_out`, `nights`, `approval_token`, `payment_status`, `amount_total` (Stripe session total in cents), `stripe_payment_intent_id`, `confirmed_at`, `created_at`, etc.

## Deprecated columns (do not use in app logic)

Kept for legacy data / migration only. Do **not** read or write these in new code.

| Column | Note |
|--------|------|
| `total_price_eur` | Use `total_price_cents`; display EUR as `total_price_cents / 100`. |
| `deposit_amount_eur` | Use `deposit_amount_cents`. |
| `stripe_checkout_session_id` | Use `stripe_session_id` only. |

We do **not** drop these columns yet; they are marked deprecated in DB comments.

## Why Stripe uses cents (not EUR) for amounts

- **API contract**: Stripe’s API requires amounts in the **smallest currency unit** (cents for EUR). Fields like `unit_amount`, `amount_total` are defined as integers in cents.
- **Precision**: Storing and sending integers avoids floating‑point rounding errors (e.g. 0.1 + 0.2). Money must be exact to the cent.
- **Our design**: We store **cents** in the DB as the single source of truth and convert to EUR only for display (e.g. in `bookings_admin_view` or in the UI).

## Admin view

- **`public.bookings_admin_view`**: Read-only view that exposes canonical data with money in **EUR** for readability (`total_price_eur_display`, `deposit_amount_eur_display`, etc.). Use this for admin dashboards; do **not** use it for booking or payment logic.
