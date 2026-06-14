/**
 * Shared phone number formatting helpers for Kenyan (+254) numbers.
 *
 * Usage:
 *   makePhoneUrl("0712 345 678", "tel")  → "tel:+254712345678"
 *   makePhoneUrl("+254 712 345 678", "wa") → "https://wa.me/254712345678"
 *   makePhoneUrl("", "tel")              → null
 *
 *   normalizePhone("+254712345678")      → "0712345678"
 *   normalizePhone("712345678")          → "0712345678"
 *   phoneVariants("0712345678")          → ["0712345678", "254712345678"]
 *   phoneVariants("712345678")           → ["0712345678", "254712345678"]
 */

type PhoneUrlType = "tel" | "wa";

/**
 * Strip all non-digit characters from a phone string.
 */
function stripToDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normalize a Kenyan phone number to the standard 10-digit format starting with "0".
 * Handles "+254...", "254...", "0...", "7..." prefixes.
 * Returns empty string for invalid input.
 *
 * Examples:
 *   "+254712345678" → "0712345678"
 *   "254712345678"  → "0712345678"
 *   "0712345678"    → "0712345678"
 *   "712345678"     → "0712345678"
 */
export function normalizePhone(phone: string): string {
  const digits = stripToDigits(phone);
  if (digits.length < 9) return "";

  // If it starts with "254" and has 12+ digits, strip the country code
  if (digits.startsWith("254")) {
    return "0" + digits.slice(3, 12);
  }
  // If it already starts with "0", return as-is (trim to 10 digits)
  if (digits.startsWith("0")) {
    return digits.slice(0, 10);
  }
  // If it starts with "7" or "1" (no prefix), prepend "0"
  if (digits.length === 9 && /^[17]/.test(digits)) {
    return "0" + digits;
  }
  // Fallback: strip to 10 digits
  return digits.slice(0, 10);
}

/**
 * Generate phone number variants for Firestore "in" queries.
 * Returns an array of up to 3 possible formats to match against stored phone numbers.
 *
 * Examples:
 *   "0712345678"  → ["0712345678", "254712345678"]
 *   "+254712345678" → ["254712345678", "0712345678"]
 *   "712345678"   → ["0712345678", "254712345678"]
 */
export function phoneVariants(phone: string): string[] {
  const digits = stripToDigits(phone);
  if (digits.length < 9) return [];

  const variants: string[] = [];

  // Always include the raw digits
  variants.push(digits);

  // If it starts with "254", also generate the "0" format
  if (digits.startsWith("254")) {
    variants.push("0" + digits.slice(3));
  }
  // If it starts with "0", also generate the "254" format
  else if (digits.startsWith("0")) {
    variants.push("254" + digits.slice(1));
  }
  // If it doesn't start with 0 or 254 (e.g., "712345678"), generate both
  else if (digits.length >= 9) {
    if (!variants.includes("0" + digits)) {
      variants.push("0" + digits);
    }
    if (!variants.includes("254" + digits)) {
      variants.push("254" + digits);
    }
  }

  return variants;
}

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
