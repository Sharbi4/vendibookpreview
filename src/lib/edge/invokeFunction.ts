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

/**
 * Calls an edge function and always surfaces a real, actionable message instead
 * of supabase-js's opaque "Edge Function returned a non-2xx status code".
 * Transient network/gateway failures are retried once.
 */
export async function invokeEdge<T = unknown>(
  name: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
  { retries = 1 }: { retries?: number } = {},
): Promise<EdgeInvokeResult<T>> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.functions.invoke(name, options as never);
    if (!error) return { data: (data as T) ?? null, error: null, status: 200 };

    const { message, status } = await readErrorBody(error);

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
