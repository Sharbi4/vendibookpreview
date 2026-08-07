/**
 * Verified Seller — pure decision logic.
 *
 * Deliberately free of Deno / network / database imports so it can be unit
 * tested from vitest as well as imported by the edge functions. Everything
 * that decides "do we capture, void, wait, or activate the badge" lives here
 * and nowhere else.
 */

// ------------------------------------------------------------------ config
export const VERIFIED_SELLER = {
  /** Feature switch key in public.app_feature_flags. */
  flagKey: "verified_seller_enabled",
  priceCents: 1999,
  currency: "USD",
  displayPrice: "$19.99",
  termsVersion: "verified-seller-v1",
  /** Free self-service Plaid retries allowed after a first failure. */
  selfServiceRetryLimit: 1,
  /** Open PayPal authorizations older than this are voided by cleanup. */
  authorizationTtlHours: 24,
  productLabel: "Vendibook Verified Seller identity check",
  badgeLabel: "Identity Verified",
} as const;

/** Sanitized offer config the browser is allowed to see. */
export function publicOfferConfig(enabled: boolean) {
  return {
    enabled,
    price_cents: VERIFIED_SELLER.priceCents,
    currency: VERIFIED_SELLER.currency,
    display_price: VERIFIED_SELLER.displayPrice,
    terms_version: VERIFIED_SELLER.termsVersion,
    retry_limit: VERIFIED_SELLER.selfServiceRetryLimit,
  };
}

// ------------------------------------------------------------------ types
/** Plaid Identity Verification statuses we act on. */
export type PlaidIdvStatus =
  | "active"
  | "success"
  | "failed"
  | "expired"
  | "canceled"
  | "pending_review";

export type PaymentState =
  | "none"
  | "created"
  | "authorized"
  | "captured"
  | "voided"
  | "refunded"
  | "failed";

export type VerificationStatus =
  | "not_started"
  | "terms_accepted"
  | "awaiting_authorization"
  | "authorized"
  | "identity_in_progress"
  | "pending_review"
  | "payment_required"
  | "verified"
  | "failed"
  | "canceled"
  | "expired"
  | "revoked";

export interface VerificationRecord {
  status: VerificationStatus;
  identity_status: PlaidIdvStatus | null;
  payment_state: PaymentState;
  verified_at: string | null;
  revoked_at: string | null;
  retry_count: number;
  retry_allowance: number;
}

export type PaymentAction = "capture" | "void" | "wait" | "none";

export interface StatusDecision {
  action: PaymentAction;
  status: VerificationStatus;
  /** True only when Plaid reached a terminal successful state. */
  identitySucceeded: boolean;
  /** True when the outcome is terminal and unsuccessful. */
  terminalFailure: boolean;
}

// ------------------------------------------------------------- transitions
const TERMINAL_FAILURES: PlaidIdvStatus[] = ["failed", "expired", "canceled"];

export function isTerminalPlaidStatus(status: PlaidIdvStatus): boolean {
  return status === "success" || TERMINAL_FAILURES.includes(status);
}

/**
 * Maps an authoritative Plaid status onto what the payment layer must do.
 *
 * - success        -> capture the existing authorization
 * - failed/expired/canceled -> void the authorization, never charge
 * - active/pending_review   -> hold; do nothing to the money
 */
export function decideFromPlaidStatus(status: PlaidIdvStatus): StatusDecision {
  switch (status) {
    case "success":
      return {
        action: "capture",
        status: "verified",
        identitySucceeded: true,
        terminalFailure: false,
      };
    case "failed":
      return { action: "void", status: "failed", identitySucceeded: false, terminalFailure: true };
    case "expired":
      return { action: "void", status: "expired", identitySucceeded: false, terminalFailure: true };
    case "canceled":
      return { action: "void", status: "canceled", identitySucceeded: false, terminalFailure: true };
    case "pending_review":
      return {
        action: "wait",
        status: "pending_review",
        identitySucceeded: false,
        terminalFailure: false,
      };
    case "active":
    default:
      return {
        action: "wait",
        status: "identity_in_progress",
        identitySucceeded: false,
        terminalFailure: false,
      };
  }
}

/**
 * Webhooks arrive out of order. Once an attempt has reached a terminal state
 * we never accept a regression back to `active` / `pending_review`, and a
 * paid-and-verified record is never downgraded by a stale event.
 */
export function shouldApplyPlaidStatus(
  current: PlaidIdvStatus | null | undefined,
  incoming: PlaidIdvStatus,
  opts: { alreadyPaidAndVerified?: boolean } = {},
): boolean {
  if (opts.alreadyPaidAndVerified) return false;
  if (!current) return true;
  if (current === incoming) return true;
  if (current === "success") return false;
  if (isTerminalPlaidStatus(current) && !isTerminalPlaidStatus(incoming)) return false;
  return true;
}

// ------------------------------------------------------- webhook integrity
/** Hex SHA-256. Available in Deno, browsers and Node 18+ via Web Crypto. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deduplication key for a Plaid webhook.
 *
 * Derived from a digest of the VERIFIED raw body, so two legitimate status
 * updates for the same identity_verification_id (active -> pending_review ->
 * success) each process, while an exact duplicate delivery is dropped. Plaid
 * does not always send a timestamp, so a field-composed key is not safe.
 */
export async function webhookEventKey(
  webhookCode: string,
  rawBody: string,
): Promise<string> {
  return `${webhookCode}:${await sha256Hex(rawBody)}`;
}

/**
 * Plaid signs webhooks with a short-lived JWT. Reject anything older than five
 * minutes AND anything materially in the future (clock-skew tolerance only),
 * which would otherwise widen the replay window arbitrarily.
 */
export function isFreshPlaidIat(
  iat: number | undefined | null,
  nowSeconds: number = Date.now() / 1000,
  opts: { maxAgeSeconds?: number; maxSkewSeconds?: number } = {},
): boolean {
  const maxAge = opts.maxAgeSeconds ?? 300;
  const maxSkew = opts.maxSkewSeconds ?? 30;
  if (!iat || !Number.isFinite(iat)) return false;
  const age = nowSeconds - iat;
  if (age > maxAge) return false;
  if (age < -maxSkew) return false;
  return true;
}

/** Purpose recorded on a Verified Seller payment row. */
export type PaymentPurpose = "initial" | "retry" | "payment_only";


// ------------------------------------------------------------------ badge
/** The single authoritative badge rule. Mirrors is_seller_identity_verified(). */
export function isBadgeEligible(record: Partial<VerificationRecord> | null | undefined): boolean {
  if (!record) return false;
  return (
    record.identity_status === "success" &&
    record.payment_state === "captured" &&
    !!record.verified_at &&
    !record.revoked_at
  );
}

/**
 * Identity passed but the money never landed. The seller must be offered
 * "Complete payment" — never a fresh (billable) Plaid session.
 */
export function needsPaymentOnly(record: Partial<VerificationRecord> | null | undefined): boolean {
  if (!record) return false;
  return (
    record.identity_status === "success" &&
    !record.revoked_at &&
    record.payment_state !== "captured"
  );
}

export function canSelfServiceRetry(record: Partial<VerificationRecord> | null | undefined): boolean {
  if (!record) return false;
  if (record.identity_status === "success") return false;
  if (!isTerminalPlaidStatus((record.identity_status ?? "active") as PlaidIdvStatus)) return false;
  const used = record.retry_count ?? 0;
  const allowed = record.retry_allowance ?? VERIFIED_SELLER.selfServiceRetryLimit;
  return used < allowed;
}

// -------------------------------------------------------------- PayPal read
/** Extracts the authorization id from a PayPal authorize-order response. */
export function extractAuthorizationId(order: any): string | null {
  return order?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id ?? null;
}

export function extractAuthorizationStatus(order: any): string | null {
  return order?.purchase_units?.[0]?.payments?.authorizations?.[0]?.status ?? null;
}

export function extractCaptureId(result: any): string | null {
  return (
    result?.id ??
    result?.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
    null
  );
}

export function extractCaptureStatus(result: any): string | null {
  return (
    result?.status ??
    result?.purchase_units?.[0]?.payments?.captures?.[0]?.status ??
    null
  );
}

/** PayPal issues that mean "this account cannot authorize" — never fall back. */
export const AUTHORIZATION_CAPABILITY_ISSUES = [
  "AUTH_CAPTURE_NOT_ENABLED",
  "AUTHORIZATION_CURRENCY_NOT_SUPPORTED",
  "INTENT_NOT_SUPPORTED",
  "PAYEE_ACCOUNT_RESTRICTED",
  "PERMISSION_DENIED",
];

export function isAuthorizationCapabilityIssue(issue?: string | null): boolean {
  if (!issue) return false;
  return AUTHORIZATION_CAPABILITY_ISSUES.includes(issue.toUpperCase());
}

/** Human, non-leaky copy for each state the seller can be shown. */
export const STATE_COPY: Record<string, { title: string; body: string }> = {
  not_started: {
    title: "Stand out as a Verified Seller",
    body:
      "Confirm your identity through Plaid and add an Identity Verified badge to your seller profile and active listings.",
  },
  awaiting_authorization: {
    title: "Authorizing your payment",
    body:
      "PayPal is placing a temporary authorization. You are not charged until your identity check succeeds.",
  },
  authorized: {
    title: "Ready to verify",
    body: "Your payment is authorized but not charged. Continue to the identity check to finish.",
  },
  identity_in_progress: {
    title: "Verification in progress",
    body: "Pick up where you left off — your authorization is still open and you have not been charged.",
  },
  pending_review: {
    title: "Pending review",
    body:
      "Your identity check is being reviewed. Nothing has been charged. We'll update you as soon as there's a result.",
  },
  payment_required: {
    title: "Identity confirmed — payment needed",
    body:
      "Your identity check succeeded but the payment did not go through. Complete payment to activate your badge. You will not need to verify again.",
  },
  verified: {
    title: "Identity Verified",
    body: "Your Identity Verified badge is live on your seller profile and active listings.",
  },
  failed: {
    title: "Verification not completed",
    body: "The identity check did not succeed and you were not charged.",
  },
  canceled: {
    title: "Verification canceled",
    body: "You canceled the identity check. Nothing was charged and any authorization was released.",
  },
  expired: {
    title: "Verification expired",
    body: "The identity session expired before it finished. You were not charged.",
  },
  revoked: {
    title: "Badge revoked",
    body: "This badge is no longer active. Contact support if you believe this is a mistake.",
  },
};
