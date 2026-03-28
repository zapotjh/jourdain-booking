/**
 * Reuse Stripe Customer + PaymentMethod from the original deposit PaymentIntent
 * (same pattern as charge-balance cron).
 */

import Stripe from "stripe";

export type CustomerPmResult = {
  customerId: string | null;
  paymentMethodId: string | null;
};

export async function getCustomerAndPaymentMethodFromDepositIntent(
  stripe: Stripe,
  depositPaymentIntentId: string,
): Promise<CustomerPmResult> {
  const depositPI = await stripe.paymentIntents.retrieve(depositPaymentIntentId);

  let customerId: string | null = null;
  if (typeof depositPI.customer === "string") {
    customerId = depositPI.customer;
  } else if (depositPI.customer && typeof depositPI.customer === "object") {
    customerId = (depositPI.customer as { id?: string }).id ?? null;
  }

  let paymentMethodId: string | null = null;
  const pm = depositPI.payment_method as
    | string
    | { id?: string }
    | null
    | undefined;
  if (typeof pm === "string") {
    paymentMethodId = pm;
  } else if (pm && typeof pm === "object") {
    paymentMethodId = pm.id ?? null;
  }

  if (customerId && !paymentMethodId) {
    try {
      const pmList = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      if (pmList.data.length > 0) {
        paymentMethodId = pmList.data[0].id;
      }
    } catch (e) {
      console.error(
        "[stripe-deposit-customer-pm] list payment methods error",
        e,
      );
    }
  }

  return { customerId, paymentMethodId };
}
