// Parse structured error payloads from Supabase Edge Function invocations.
// supabase.functions.invoke throws a FunctionsHttpError for non-2xx responses;
// the JSON body sits on `error.context` as a Response we must read once.

import { FunctionsHttpError } from "@supabase/supabase-js";

export type EdgeErrorPayload = {
  error?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

export type ParsedEdgeError = {
  status: number | null;
  code: string | null;
  message: string;
  raw: EdgeErrorPayload | null;
};

/**
 * Best-effort extraction of a structured `{ error, code }` body from either
 * a thrown FunctionsHttpError, a data.error payload, or a generic Error.
 */
export async function parseEdgeError(
  err: unknown,
  dataError?: EdgeErrorPayload | string | null,
): Promise<ParsedEdgeError> {
  // Prefer explicit data.error when the function returned 2xx but signalled failure.
  if (dataError) {
    if (typeof dataError === "string") {
      return { status: 200, code: null, message: dataError, raw: null };
    }
    return {
      status: 200,
      code: (dataError.code as string) ?? null,
      message: (dataError.error as string) ?? (dataError.message as string) ?? "Request failed",
      raw: dataError,
    };
  }

  if (err instanceof FunctionsHttpError) {
    const res = err.context as Response | undefined;
    let body: EdgeErrorPayload | null = null;
    try {
      body = await res?.clone().json();
    } catch {
      try {
        const text = await res?.clone().text();
        if (text) body = { error: text };
      } catch {
        /* ignore */
      }
    }
    return {
      status: res?.status ?? null,
      code: (body?.code as string) ?? null,
      message: (body?.error as string) ?? (body?.message as string) ?? err.message ?? "Request failed",
      raw: body,
    };
  }

  if (err instanceof Error) {
    return { status: null, code: null, message: err.message, raw: null };
  }

  return { status: null, code: null, message: String(err ?? "Request failed"), raw: null };
}
