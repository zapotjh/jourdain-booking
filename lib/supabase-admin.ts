import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (process.env.NODE_ENV === "development") {
    console.log("SUPABASE_URL present?", !!url);
    console.log("SERVICE_ROLE present?", !!key);
  }
  let resolvedUrl = url;
  let resolvedKey = key;
  if (!resolvedUrl || !resolvedKey) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      resolvedUrl = "https://build-placeholder.invalid";
      resolvedKey = "build-placeholder-service-role";
    } else {
      throw new Error(
        "Missing Supabase URL (set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
  }
  cached = createClient(resolvedUrl, resolvedKey, { auth: { persistSession: false } });
  return cached;
}

/** Lazy client so importing API/route modules does not require env at build time. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
}) as SupabaseClient;
