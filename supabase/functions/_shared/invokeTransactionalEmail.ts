// ONE canonical convention for internal (server-to-server) calls into
// `send-transactional-email`.
//
// Why this exists: the Supabase edge gateway rejects a request with
// HTTP 401 `Conflicting API keys` when it receives BOTH an `apikey` header and
// an `Authorization: Bearer <key>` header that it does not resolve to the same
// credential (e.g. anon `apikey` + service-role bearer, or a legacy JWT in one
// header and a new-format key in the other). Internal callers must therefore
// send exactly ONE credential header:
//
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>     (and no `apikey`)
//
// The service-role bearer is also what `send-transactional-email` recognises as
// a privileged caller, so any registered template may be sent. Never use this
// from the browser.

export interface TransactionalEmailPayload {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
  subjectPrefix?: string;
  metadata?: Record<string, unknown>;
}

export async function sendTransactionalEmailInternal(
  payload: TransactionalEmailPayload,
): Promise<{ ok: boolean; status: number; body: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Server configuration error: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Single credential header on purpose — see note above.
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await resp.text();
  return { ok: resp.ok, status: resp.status, body };
}
