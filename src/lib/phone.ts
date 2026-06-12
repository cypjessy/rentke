/**
 * Shared phone number formatting helpers for Kenyan (+254) numbers.
 *
 * Usage:
 *   makePhoneUrl("0712 345 678", "tel")  → "tel:+254712345678"
 *   makePhoneUrl("+254 712 345 678", "wa") → "https://wa.me/254712345678"
 *   makePhoneUrl("", "tel")              → null
 */

type PhoneUrlType = "tel" | "wa";

/**
 * Strips whitespace and normalizes a Kenyan phone number to pure digits.
 * Handles "0..." / "+254..." / "254..." / "7..." prefixes.
 * Returns null for empty or invalid input.
 */
export function formatPhoneDigits(phone: string): string | null {
  const raw = phone.replace(/\s/g, "");
  if (!raw) return null;
  // Strip leading "+" or "0" — we'll prepend +254
  const stripped = raw.startsWith("+") ? raw.slice(1) : raw;
  const normalized = stripped.startsWith("0") ? stripped.slice(1) : stripped;
  // If it already starts with 254, use as-is (removing any leading +)
  const digits = normalized.startsWith("254") ? normalized : `254${normalized}`;
  return digits;
}

/**
 * Build a clickable URL for a phone number.
 * Returns null if the phone string is empty/invalid.
 *
 * @param phone  A raw phone string, e.g. "0712 345 678", "+254712345678"
 * @param type   "tel" for a call link, "wa" for a WhatsApp link
 */
export function makePhoneUrl(phone: string, type: PhoneUrlType): string | null {
  const digits = formatPhoneDigits(phone);
  if (!digits) return null;
  return type === "tel" ? `tel:+${digits}` : `https://wa.me/${digits}`;
}

/**
 * Opens a phone link in the browser. Handles errors silently.
 * "tel" links open in _self (the dialer replaces the page).
 * "wa" links open in _blank (new tab / app switch).
 */
export function openPhoneUrl(phone: string, type: PhoneUrlType): void {
  const url = makePhoneUrl(phone, type);
  if (!url) return;
  try {
    window.open(url, type === "tel" ? "_self" : "_blank");
  } catch {
    // Silently fail — the phone number was invalid
  }
}
