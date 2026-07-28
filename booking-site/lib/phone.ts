/**
 * Phone normalization, US/Canada only.
 *
 * Everything stored in the database is E.164 (+15551234567) because that's the
 * only format Twilio accepts. Everything shown to a human is (555) 123-4567.
 * Convert at the boundary, never in between.
 */

/** "(555) 123-4567" -> "+15551234567". Returns null if it isn't a valid NANP number. */
export function toE164(input: string): string | null {
  const raw = input.trim();

  // Already international and not US — pass through if it looks sane.
  if (raw.startsWith("+") && !raw.startsWith("+1")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  const digits = raw.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (national.length !== 10) return null;

  // NANP area codes never start with 0 or 1. That's the only structural rule
  // worth enforcing here — the stricter one (exchange codes also start 2-9)
  // is technically correct but would reject a real prospect over a typo class
  // that barely exists. A wrong number costs one failed text; a rejected
  // number costs a client.
  if (!/^[2-9]\d{9}$/.test(national)) return null;

  return `+1${national}`;
}

export function isValidUsPhone(input: string): boolean {
  return toE164(input) !== null;
}

/** "+15551234567" -> "(555) 123-4567" */
export function formatForDisplay(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/**
 * Progressive formatting for the input field — runs on every keystroke, so it
 * has to tolerate partial input without fighting the user's cursor.
 */
export function formatAsYouType(input: string): string {
  const d = input.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
