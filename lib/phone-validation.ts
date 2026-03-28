/**
 * International phone validation for checkout form.
 * Uses libphonenumber-js so we support all regions without maintaining prefix lists.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Returns true if the input is a valid international phone number.
 * Accepts E.164-style input with optional spaces/dashes (e.g. +82 10 1234 5678).
 * Malformed or non-international input returns false.
 */
export function isValidInternationalPhone(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  // Require leading + for international format
  if (!trimmed.startsWith('+')) return false;

  try {
    const parsed = parsePhoneNumberFromString(trimmed);
    return parsed != null && parsed.isValid();
  } catch {
    return false;
  }
}
