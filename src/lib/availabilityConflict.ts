/**
 * Detects whether a Stripe-checkout / booking-hold edge function call returned
 * an HTTP 409 `availability_conflict` response, regardless of whether the
 * Supabase functions client surfaced it through `data` or through `error`.
 *
 * Returns a human-readable reason string when a conflict is detected, otherwise null.
 */
export type InvokeResultLike = {
  data?: { code?: string; error?: string } | null;
  error?: unknown;
};

export async function detectAvailabilityConflict(
  result: InvokeResultLike,
): Promise<string | null> {
  // Path 1: functions client returned the body in `data`
  if (result.data && result.data.code === 'availability_conflict') {
    return result.data.error || 'This time is no longer available.';
  }

  // Path 2: functions client wrapped non-2xx in `error` with the raw Response
  const err = result.error as
    | { context?: { response?: Response } }
    | undefined
    | null;
  const ctxResp = err?.context?.response;
  if (ctxResp && ctxResp.status === 409) {
    try {
      const body = await ctxResp.clone().json();
      if (body?.code === 'availability_conflict') {
        return body.error || 'This time is no longer available.';
      }
    } catch {
      // ignore parse failures
    }
  }

  return null;
}
