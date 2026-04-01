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

/**
 * Gregorian calendar add on a Paris YYYY-MM-DD (matches Postgres
 * `(ts AT TIME ZONE 'Europe/Paris')::date + n` for the same "Paris today").
 */
function addCalendarDaysToParisYmd(parisYmd: string, days: number): string {
  const [y, mo, da] = parisYmd.split("-").map(Number);
  const utc = Date.UTC(y, mo - 1, da + days);
  return new Date(utc).toISOString().slice(0, 10);
}

/** Paris date string for tomorrow. */
export function startOfTomorrowParis(): string {
  return addCalendarDaysToParisYmd(getParisDateString(), 1);
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
  const n = Number(plusDays);
  const days = Number.isFinite(n) ? Math.floor(n) : 0;
  return addCalendarDaysToParisYmd(getParisDateString(), days);
}
