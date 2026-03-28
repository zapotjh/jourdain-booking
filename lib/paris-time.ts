/**
 * Canonical business timezone: Europe/Paris.
 * All cron selection logic, due dates, and reminder logic use Paris-local rules.
 */

const PARIS_TZ = "Europe/Paris";

/** Current time interpreted in Paris (same instant, Paris calendar/clock). */
export function getNowParis(): Date {
  const s = new Date().toLocaleString("en-CA", { timeZone: PARIS_TZ });
  return new Date(s);
}

/**
 * Paris-local date string YYYY-MM-DD for a given date (or now).
 * Uses Europe/Paris for date boundaries.
 */
export function getParisDateString(date?: Date): string {
  const d = date ?? new Date();
  return d.toLocaleDateString("sv-SE", { timeZone: PARIS_TZ });
}

/** Today's date (YYYY-MM-DD) in Paris. */
export function startOfTodayParis(): string {
  return getParisDateString();
}

/** Paris date string for tomorrow. */
export function startOfTomorrowParis(): string {
  const now = new Date();
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: PARIS_TZ }));
  parisNow.setDate(parisNow.getDate() + 1);
  const y = parisNow.getFullYear();
  const m = String(parisNow.getMonth() + 1).padStart(2, "0");
  const d = String(parisNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if the given date string (YYYY-MM-DD) is tomorrow in Paris. */
export function isTomorrowParis(dateStr: string): boolean {
  return dateStr === startOfTomorrowParis();
}

/**
 * Paris-local calendar date YYYY-MM-DD that is `plusDays` after **today** in Europe/Paris.
 * Used e.g. security-deposit hold when check_in is exactly 3 days from today (Paris).
 */
export function startOfParisPlusDaysFromToday(plusDays: number): string {
  const safe = Math.max(0, Math.floor(Number(plusDays)));
  const now = new Date();
  const parisNow = new Date(
    now.toLocaleString("en-US", { timeZone: PARIS_TZ }),
  );
  parisNow.setDate(parisNow.getDate() + safe);
  const y = parisNow.getFullYear();
  const m = String(parisNow.getMonth() + 1).padStart(2, "0");
  const d = String(parisNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
