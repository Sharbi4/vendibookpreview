// deno-lint-ignore-file no-explicit-any
/**
 * SignNow (airSlate) API client.
 *
 * Uses the OAuth2 `password` grant — SignNow's documented server-to-server
 * auth flow: `Authorization: Basic <base64(client_id:client_secret)>` plus
 * a service-user username/password.
 *
 * Sandbox base:      https://api-eval.signnow.com
 * Production base:   https://api.signnow.com
 *
 * All required config comes from Deno env:
 *   SIGNNOW_API_BASE
 *   SIGNNOW_BASIC_AUTH               (base64 of client_id:client_secret)
 *   SIGNNOW_SERVICE_USER_EMAIL
 *   SIGNNOW_SERVICE_USER_PASSWORD
 *
 * Optional (used by higher-level helpers):
 *   SIGNNOW_TEMPLATE_RENTAL_AGREEMENT
 *   SIGNNOW_TEMPLATE_BILL_OF_SALE
 */

interface CachedToken {
  access_token: string;
  expires_at: number; // ms epoch
}

let cachedToken: CachedToken | null = null;

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function signnowBase(): string {
  return env('SIGNNOW_API_BASE').replace(/\/+$/, '');
}

export function isSignNowConfigured(): boolean {
  return !!(
    Deno.env.get('SIGNNOW_API_BASE') &&
    Deno.env.get('SIGNNOW_BASIC_AUTH') &&
    Deno.env.get('SIGNNOW_SERVICE_USER_EMAIL') &&
    Deno.env.get('SIGNNOW_SERVICE_USER_PASSWORD')
  );
}

/** Get a live access token (cached in the isolate until 60s before expiry). */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at - 60_000 > now) {
    return cachedToken.access_token;
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    username: env('SIGNNOW_SERVICE_USER_EMAIL'),
    password: env('SIGNNOW_SERVICE_USER_PASSWORD'),
    scope: '*',
  });

  const res = await fetch(`${signnowBase()}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${env('SIGNNOW_BASIC_AUTH')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SignNow token error [${res.status}]: ${text}`);
  }

  const json = await res.json();
  const ttl = Number(json.expires_in ?? 1800);
  cachedToken = {
    access_token: String(json.access_token),
    expires_at: now + ttl * 1000,
  };
  return cachedToken.access_token;
}

async function apiFetch(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  let body: BodyInit | undefined = init.body as BodyInit | undefined;
  if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${signnowBase()}${path}`, { ...init, headers, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SignNow ${init.method ?? 'GET'} ${path} [${res.status}]: ${text}`);
  }
  return res;
}

/**
 * Copy a template into a new document. Returns the new document id.
 * https://docs.signnow.com/docs/signnow/reference/operations/create-a-new-template-a-1
 */
export async function createDocumentFromTemplate(
  templateId: string,
  documentName: string,
): Promise<string> {
  const res = await apiFetch(`/template/${templateId}/copy`, {
    method: 'POST',
    json: { document_name: documentName },
  });
  const json = await res.json();
  return String(json.id);
}

/**
 * Prefill text fields by field name (only works when the template used
 * text-tag names, e.g. `{{host_name}}`).
 */
export async function prefillFields(
  documentId: string,
  fields: Record<string, string | number | null | undefined>,
): Promise<void> {
  const entries = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([field_name, prefilled_text]) => ({
      field_name,
      prefilled_text: String(prefilled_text),
    }));
  if (!entries.length) return;
  await apiFetch(`/v2/documents/${documentId}/prefill-texts`, {
    method: 'PUT',
    json: { fields: entries },
  });
}

export interface EmbeddedInviteSigner {
  email: string;
  role_name: string;   // must match the template role
  order: number;       // 1-based signing order
  auth_method?: 'none' | 'password' | 'phone' | 'sms';
  first_name?: string;
  last_name?: string;
}

/**
 * Create an embedded invite for a document. Returns the invite id needed
 * later to generate short-lived signing links.
 * https://docs.signnow.com/docs/signnow/reference/operations/embedded-invites
 */
export async function createEmbeddedInvite(
  documentId: string,
  signers: EmbeddedInviteSigner[],
  nameFormula?: string,
): Promise<string> {
  const res = await apiFetch(`/v2/documents/${documentId}/embedded-invites`, {
    method: 'POST',
    json: {
      invites: signers.map((s) => ({
        email: s.email,
        role_name: s.role_name,
        order: s.order,
        auth_method: s.auth_method ?? 'none',
        first_name: s.first_name,
        last_name: s.last_name,
      })),
      name_formula: nameFormula,
    },
  });
  const json = await res.json();
  // Response returns { data: [{ id, email, role_name, order, ... }] }
  return String(json?.data?.[0]?.id ?? json?.id ?? '');
}

/**
 * Generate a short-lived signing link for one embedded signer.
 * Link_expiration is minutes (15..45). Redirect_uri sends the signer back
 * to a static page inside the SignNow session iframe (no external redirect
 * fires because our client dismisses the iframe on completion).
 */
export async function createEmbeddedSigningLink(
  documentId: string,
  fieldInviteId: string,
  opts: { link_expiration?: number; auth_method?: string } = {},
): Promise<string> {
  const res = await apiFetch(
    `/v2/documents/${documentId}/embedded-invites/${fieldInviteId}/link`,
    {
      method: 'POST',
      json: {
        link_expiration: opts.link_expiration ?? 30,
        auth_method: opts.auth_method ?? 'none',
      },
    },
  );
  const json = await res.json();
  return String(json?.data?.link ?? json?.link ?? '');
}

/** Fetch the document with roles + field invites (for polling status/signers). */
export async function getDocument(documentId: string): Promise<any> {
  const res = await apiFetch(`/document/${documentId}`, { method: 'GET' });
  return await res.json();
}

/** Download the completed PDF as bytes. */
export async function downloadDocumentPdf(documentId: string): Promise<Uint8Array> {
  const res = await apiFetch(
    `/document/${documentId}/download?type=collapsed&with_history=1`,
    { method: 'GET', headers: { Accept: 'application/pdf' } },
  );
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Verify a SignNow webhook signature.
 * SignNow's webhooks include an HMAC-SHA256 signature over the raw request
 * body using the subscription's secret. Header is documented as `x-neap-signature`
 * (lower-case, hex digest).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headerSignature: string | null,
  secret: string,
): Promise<boolean> {
  if (!headerSignature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(rawBody),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const provided = headerSignature.trim().toLowerCase();
  // Timing-safe-ish compare
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
