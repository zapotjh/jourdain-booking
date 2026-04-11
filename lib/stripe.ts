import Stripe from "stripe";

const API_VERSION = "2026-02-25.clover" as const;

type StripeClient = InstanceType<typeof Stripe>;

let cached: StripeClient | null = null;

const BUILD_PLACEHOLDER_KEY = "sk_build_placeholder_invalid";

function getStripe(): StripeClient {
  if (cached) return cached;
  let key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      key = BUILD_PLACEHOLDER_KEY;
    } else {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
  }
  cached = new Stripe(key, { apiVersion: API_VERSION });
  return cached;
}

/**
 * Lazily-initialized Stripe client so importing server modules during `next build`
 * does not construct Stripe without STRIPE_SECRET_KEY.
 */
export const stripe = new Proxy({} as StripeClient, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
}) as StripeClient;
