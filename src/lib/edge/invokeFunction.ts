import { supabase } from '@/integrations/supabase/client';

export interface EdgeInvokeResult<T> {
  data: T | null;
  /** Human-readable message pulled from the function's JSON body when present. */
  error: string | null;
  status: number | null;
}

const FRIENDLY: Record<string, string> = {
  unauthenticated: 'Your session expired. Please sign in again and retry.',
  invalid_request: 'Some required details are missing. Check the form and try again.',
  method_not_allowed: 'That action is not available right now. Please try again.',
};

const readErrorBody = async (err: unknown): Promise<{ message: string | null; status: number | null }> => {
  const ctx = (err as { context?: unknown } | null)?.context;
  if (ctx && typeof (ctx as Response).text === 'function') {
    const res = ctx as Response;
    try {
      const text = await res.clone().text();
      try {
        const parsed = JSON.parse(text);
        const msg = parsed?.error ?? parsed?.message ?? null;
        return { message: typeof msg === 'string' ? msg : text || null, status: res.status ?? null };
      } catch {
        return { message: text || null, status: res.status ?? null };
      }
    } catch {
      return { message: null, status: res.status ?? null };
    }
  }
  return { message: null, status: null };
};

const TIMED_OUT = Symbol('timed-out');

/**
 * Calls an edge function and always surfaces a real, actionable message instead
 * of supabase-js's opaque "Edge Function returned a non-2xx status code".
 * Transient network/gateway failures are retried once. An expired access token
 * (401) refreshes the session once and retries. With `timeoutMs`, a call that
 * never settles resolves as an error instead of leaving the UI waiting.
 */
export async function invokeEdge<T = unknown>(
  name: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
  { retries = 1, timeoutMs }: { retries?: number; timeoutMs?: number } = {},
): Promise<EdgeInvokeResult<T>> {
  let attempt = 0;
  let refreshed = false;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const call = supabase.functions.invoke(name, options as never);
    const settled = timeoutMs
      ? await Promise.race([call, new Promise<typeof TIMED_OUT>((r) => setTimeout(() => r(TIMED_OUT), timeoutMs))])
      : await call;
    if (settled === TIMED_OUT) {
      return { data: null, error: 'This is taking longer than expected. Please try again.', status: null };
    }
    const { data, error } = settled;
    if (!error) return { data: (data as T) ?? null, error: null, status: 200 };

    const { message, status } = await readErrorBody(error);

    if (status === 401 && !refreshed) {
      refreshed = true;
      const { data: session } = await supabase.auth.refreshSession();
      if (session.session) continue;
    }

    const isTransient = status === null || status === 429 || (status >= 500 && status <= 599);
    if (isTransient && attempt < retries) {
      attempt += 1;
      await new Promise((r) => setTimeout(r, 600 * attempt));
      continue;
    }

    const key = (message || '').trim();
    const friendly =
      FRIENDLY[key] ||
      (key && !/non-2xx/i.test(key) ? key : null) ||
      (status === null
        ? 'We could not reach the server. Check your connection and try again.'
        : `Something went wrong (${status}). Please try again.`);

    return { data: null, error: friendly, status };
  }
}
