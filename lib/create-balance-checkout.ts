/**
 * Creates a Stripe Checkout Session for balance-only payment (e.g. manual link after 3 auto-charge failures).
 * Session metadata.kind = "balance_manual" so the webhook marks balance_paid and sends balance success emails.
 */

import { stripe } from "@/lib/stripe";

const DEFAULT_SITE_URL = "https://lappartementjourdain.com";

export async function createBalanceCheckoutUrl(params: {
  bookingId: string;
  balanceAmountCents: number;
  customerEmail: string;
}): Promise<string | null> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  if (!Number.isFinite(params.balanceAmountCents) || params.balanceAmountCents <= 0) {
    return null;
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: params.customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "L'appartement Jourdain — 잔금 결제 (Balance)",
              description: "Balance payment for your reservation",
            },
            unit_amount: params.balanceAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: params.bookingId,
        kind: "balance_manual",
      },
      success_url: `${siteUrl}/success?balance=1`,
      cancel_url: `${siteUrl}/cancel`,
    });
    return session.url ?? null;
  } catch (err) {
    console.error("[create-balance-checkout] Stripe error", { bookingId: params.bookingId, error: err });
    return null;
  }
}
