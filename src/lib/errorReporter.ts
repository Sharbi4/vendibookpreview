/**
 * Vendibook production error reporter.
 *
 * Sends non-2xx / unexpected errors to the `log-error-event` edge function,
 * which assigns a VB-xxxxxx reference code, classifies priority, dedupes
 * repeated failures, and emails support@vendibook.com for HIGH-priority
 * customer-impacting failures (payments, boosts, publish, uploads, etc.).
 *
 * Usage:
 *   const { referenceCode } = await reportError({
 *     action: 'listing.publish',
 *     endpoint: '/functions/v1/create-featured-checkout',
 *     status: 500,
 *     errorType: 'PayPalCheckoutFailed',
 *     errorMessage: err.message,
 *     listingId: listing.id,
 *   });
 *   toast({ title: friendlyMessage('publish', referenceCode) });
 */

import { supabase } from "@/integrations/supabase/client";

export interface ErrorReportInput {
  action?: string;            // e.g. 'listing.publish', 'boost.purchase'
  endpoint?: string;
  method?: string;
  status?: number;
  errorType?: string;
  errorMessage?: string;
  stack?: string;
  listingId?: string;
  boostId?: string;
  paymentId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReportResult {
  referenceCode: string;     // e.g. "VB-K3M9XQ"
  priority: "high" | "normal";
  alertSent: boolean;
}

let cachedSessionId: string | null = null;
function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  try {
    const existing = sessionStorage.getItem("vb_session_id");
    if (existing) { cachedSessionId = existing; return existing; }
    const fresh = crypto.randomUUID();
    sessionStorage.setItem("vb_session_id", fresh);
    cachedSessionId = fresh;
    return fresh;
  } catch {
    cachedSessionId = crypto.randomUUID();
    return cachedSessionId;
  }
}

function fallbackRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `VB-${s}`;
}

/**
 * Fire-and-await error report. Never throws — returns a local fallback
 * reference code if the logging endpoint itself is unreachable, so UI
 * code can always surface a code to the user.
 */
export async function reportError(input: ErrorReportInput): Promise<ErrorReportResult> {
  const fallback: ErrorReportResult = {
    referenceCode: fallbackRef(),
    priority: "normal",
    alertSent: false,
  };

  try {
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
      userEmail = data?.user?.email ?? null;
    } catch { /* unauthenticated is fine */ }

    const payload = {
      source: "frontend" as const,
      action: input.action ?? null,
      endpoint: input.endpoint ?? null,
      method: input.method ?? null,
      status_code: input.status ?? null,
      error_type: input.errorType ?? null,
      error_message: input.errorMessage ?? null,
      stack: input.stack ?? null,
      listing_id: input.listingId ?? null,
      boost_id: input.boostId ?? null,
      payment_id: input.paymentId ?? null,
      user_id: userId,
      user_email: userEmail,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      session_id: getSessionId(),
      metadata: input.metadata ?? {},
    };

    const { data, error } = await supabase.functions.invoke("log-error-event", { body: payload });
    if (error || !data?.reference_code) {
      console.warn("[errorReporter] log failed, using fallback ref", error);
      return fallback;
    }
    return {
      referenceCode: data.reference_code,
      priority: data.priority ?? "normal",
      alertSent: !!data.alert_sent,
    };
  } catch (e) {
    console.warn("[errorReporter] unexpected failure", e);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Friendly user-facing messages                                       */
/* ------------------------------------------------------------------ */

export type FriendlyContext = "generic" | "publish" | "boost" | "payment" | "upload" | "support";

const BASE_MESSAGES: Record<FriendlyContext, string> = {
  generic:
    "We’re sorry, something didn’t go through. Please try again, or contact support and we’ll help you finish this.",
  publish:
    "We’re sorry, your listing did not publish correctly. Our team has been notified and will help review it.",
  boost:
    "We’re sorry, your payment or Boost did not complete correctly. Our team has been notified and will review your listing.",
  payment:
    "We’re sorry, your payment or Boost did not complete correctly. Our team has been notified and will review your listing.",
  upload:
    "We’re sorry, your file did not upload correctly. Please try again, or contact support and we’ll help you finish this.",
  support:
    "We’re sorry, your message didn’t go through. Please try again or call (725) 755-9598.",
};

export function friendlyMessage(context: FriendlyContext, referenceCode?: string): string {
  const base = BASE_MESSAGES[context] ?? BASE_MESSAGES.generic;
  return referenceCode ? `${base} (Reference: ${referenceCode})` : base;
}

/**
 * Strips raw technical phrases ("non-2xx HTTP status code", "TypeError",
 * "stack trace", JSON blobs, etc.) from any error string before showing
 * it to a customer.
 */
export function sanitizeErrorForUser(raw: unknown, context: FriendlyContext = "generic", referenceCode?: string): string {
  const str = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : "";
  const looksTechnical =
    /non-?2xx|status code|stack|TypeError|ReferenceError|undefined is not|fetch failed|TypeError:|HTTP \d{3}|\{".*":/i.test(str);
  if (!str || looksTechnical) return friendlyMessage(context, referenceCode);
  return referenceCode ? `${str} (Reference: ${referenceCode})` : str;
}
