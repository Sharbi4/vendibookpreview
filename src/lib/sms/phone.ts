/**
 * Client-side phone helpers for SMS consent.
 * Normalizes US/CA numbers to E.164; returns null for anything that isn't
 * a plausible NANP number. Server-side callers must re-validate.
 */
export function normalizeNanpToE164(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Already E.164 with a country code we accept
  const trimmed = raw.trim();
  if (/^\+1\d{10}$/.test(trimmed)) return trimmed;
  return null;
}

export function isValidNanp(raw: string): boolean {
  return normalizeNanpToE164(raw) !== null;
}

export function formatDisplayUsPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const digits = e164.replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}
