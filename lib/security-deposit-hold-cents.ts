/**
 * Security deposit **card authorization hold** amount (separate from 40% deposit / 60% balance).
 *
 * stayLengthDays = nights between check_in and check_out (same as `bookings.nights`).
 */
export function computeSecurityDepositHoldCentsFromStayLengthDays(
  stayLengthDays: number,
): number {
  const n = Math.max(0, Math.floor(Number(stayLengthDays)));
  if (n <= 0) return 0;
  if (n <= 14) return 50_000; // €500
  return 120_000; // €1200
}
