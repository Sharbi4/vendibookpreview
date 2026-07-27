// Pure helpers for monetization-webhook. Kept out of index.ts so unit tests
// don't have to typecheck the entire handler graph (which relies on generic
// Supabase client typings that aren't self-contained).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateConsentId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null;
}

// Marker error: outer handler removes the idempotency row and returns non-2xx
// so Stripe retries the delivery instead of us silently marking it processed.
export class PersistenceError extends Error {
  cause_?: unknown;
  constructor(message: string, cause_?: unknown) {
    super(message);
    this.name = "PersistenceError";
    this.cause_ = cause_;
  }
}
