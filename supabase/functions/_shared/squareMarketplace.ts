/**
 * Square marketplace plumbing for rental bookings: host OAuth, encrypted
 * seller tokens, and API calls made on the host's behalf.
 *
 * Vendibook's own billing (square-billing, square-webhook) keeps using
 * _shared/square.ts with the platform token; nothing here touches it.
 *
 * Environment (all server-side; never sent to the browser except the
 * application id, which Square's Web Payments SDK requires):
 *   RENTAL_SQUARE_ENVIRONMENT       sandbox | production for rentals only
 *                                   (falls back to SQUARE_ENVIRONMENT, then sandbox)
 *   RENTAL_SQUARE_APPLICATION_ID    rental app id (falls back to SQUARE_APPLICATION_ID)
 *   SQUARE_APPLICATION_SECRET       OAuth client secret (RENTAL_SQUARE_APPLICATION_SECRET wins)
 * The RENTAL_* overrides let rentals run on a sandbox app while Vendibook
 * billing stays on the production app.
 *   SQUARE_OAUTH_REDIRECT_URL       https://vendibook.com/dashboard/payments/square/callback
 *   SQUARE_TOKEN_ENCRYPTION_KEY     base64 of 32 random bytes (AES-256-GCM)
 *   RENTAL_SQUARE_ENABLED           'true' routes rental payments to Square
 *   RENTAL_SQUARE_PLATFORM_ENABLED  'false' stops using Vendibook's own Square account
 *                                   when the host hasn't connected Square
 */
declare const Deno: { env: { get(key: string): string | undefined } };

export const SQUARE_API_VERSION = '2026-09-16';

/** OAuth permissions a host grants. ADDITIONAL_RECIPIENTS enables app_fee_money. */
export const SQUARE_SELLER_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE',
  'PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS',
];

export type SquareEnvironment = 'sandbox' | 'production';

export class SquareApiError extends Error {
  constructor(public status: number, public code: string, public category?: string, public detail?: string) {
    super(`Square request failed (${code}).`);
  }
}

export function marketplaceEnv() {
  const environment = (Deno.env.get('RENTAL_SQUARE_ENVIRONMENT') || Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox') as SquareEnvironment;
  if (environment !== 'sandbox' && environment !== 'production') throw new Error('Invalid Square environment');
  return {
    environment,
    applicationId: Deno.env.get('RENTAL_SQUARE_APPLICATION_ID') || Deno.env.get('SQUARE_APPLICATION_ID') || '',
    applicationSecret: Deno.env.get('RENTAL_SQUARE_APPLICATION_SECRET') || Deno.env.get('SQUARE_APPLICATION_SECRET') || '',
    redirectUrl: Deno.env.get('SQUARE_OAUTH_REDIRECT_URL') || '',
    encryptionKey: Deno.env.get('SQUARE_TOKEN_ENCRYPTION_KEY') || '',
    rentalsEnabled: Deno.env.get('RENTAL_SQUARE_ENABLED') === 'true',
    base: environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  };
}

/** True when every secret the rental marketplace flow needs is present. */
export function marketplaceConfigured() {
  const env = marketplaceEnv();
  return Boolean(env.rentalsEnabled && env.applicationId && env.applicationSecret && env.redirectUrl && env.encryptionKey);
}

// ------------------------------------------------------------ token crypto

async function aesKey() {
  const raw = marketplaceEnv().encryptionKey;
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) throw new Error('SQUARE_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64).');
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

export async function encryptToken(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return `v1:${b64(out)}`;
}

export async function decryptToken(sealed: string): Promise<string> {
  if (!sealed?.startsWith('v1:')) throw new Error('Unknown token format');
  const bytes = Uint8Array.from(atob(sealed.slice(3)), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await aesKey(), bytes.slice(12));
  return new TextDecoder().decode(plain);
}

// ------------------------------------------------------------ HTTP

export async function squareApi(path: string, opts: { token?: string; body?: unknown; method?: string; clientSecret?: boolean; base?: string } = {}) {
  const env = marketplaceEnv();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Square-Version': SQUARE_API_VERSION };
  if (opts.clientSecret) headers.Authorization = `Client ${env.applicationSecret}`;
  else if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const response = await fetch((opts.base ?? env.base) + path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    signal: AbortSignal.timeout(25_000),
  });
  let data: any = {};
  try { data = await response.json(); } catch { /* empty body */ }
  if (!response.ok || data?.errors?.length) {
    // Log codes only: never tokens, card data, or provider payloads.
    const first = data?.errors?.[0] ?? {};
    throw new SquareApiError(response.status, first.code || data?.type || 'SQUARE_UNAVAILABLE', first.category, first.field);
  }
  return data;
}

// ------------------------------------------------------------ OAuth

export function authorizeUrl(state: string) {
  const env = marketplaceEnv();
  const params = new URLSearchParams({
    client_id: env.applicationId,
    scope: SQUARE_SELLER_SCOPES.join(' '),
    session: 'false',
    state,
    redirect_uri: env.redirectUrl,
  });
  return `${env.base}/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string) {
  const env = marketplaceEnv();
  return await squareApi('/oauth2/token', {
    body: {
      client_id: env.applicationId,
      client_secret: env.applicationSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: env.redirectUrl,
    },
  }) as { access_token: string; refresh_token?: string; expires_at?: string; merchant_id: string };
}

export async function revokeSellerToken(accessToken: string) {
  const env = marketplaceEnv();
  await squareApi('/oauth2/revoke', { clientSecret: true, body: { client_id: env.applicationId, access_token: accessToken } });
}

/** Picks the host's main active location that can take card payments. */
export async function primaryLocation(token: string) {
  const { locations = [] } = await squareApi('/v2/locations', { token });
  const active = (locations as any[]).filter((l) => l.status === 'ACTIVE' && (l.capabilities ?? []).includes('CREDIT_CARD_PROCESSING'));
  const main = active.find((l) => l.type === 'PHYSICAL') ?? active[0] ?? null;
  return main as null | { id: string; name?: string; business_name?: string; currency?: string };
}

/**
 * Returns a usable access token for the host, refreshing it when it expires
 * within a week. Marks the account for reconnection when Square refuses.
 */
export async function sellerAccessToken(admin: any, account: Record<string, any>): Promise<string> {
  const env = marketplaceEnv();
  const expiresAt = account.token_expires_at ? Date.parse(account.token_expires_at) : Infinity;
  if (expiresAt - Date.now() > 7 * 86_400_000 || !account.refresh_token_encrypted) {
    return await decryptToken(account.access_token_encrypted);
  }
  try {
    const refreshed = await squareApi('/oauth2/token', {
      body: {
        client_id: env.applicationId,
        client_secret: env.applicationSecret,
        refresh_token: await decryptToken(account.refresh_token_encrypted),
        grant_type: 'refresh_token',
      },
    });
    await admin.from('square_seller_accounts').update({
      access_token_encrypted: await encryptToken(refreshed.access_token),
      ...(refreshed.refresh_token ? { refresh_token_encrypted: await encryptToken(refreshed.refresh_token) } : {}),
      token_expires_at: refreshed.expires_at ?? null,
      refreshed_at: new Date().toISOString(),
      status: 'active',
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', account.id);
    return refreshed.access_token;
  } catch (err) {
    const code = err instanceof SquareApiError ? err.code : 'refresh_failed';
    await admin.from('square_seller_accounts').update({
      status: 'needs_reconnect', last_error: code, updated_at: new Date().toISOString(),
    }).eq('id', account.id);
    throw err;
  }
}

/** The host's active Square connection for the current environment, if any. */
export async function activeSellerAccount(admin: any, userId: string) {
  const { data } = await admin.from('square_seller_accounts').select('*')
    .eq('user_id', userId).eq('environment', marketplaceEnv().environment).maybeSingle();
  return data && data.status === 'active' && data.location_id ? data : null;
}

// ------------------------------------------------------------ payment context

/**
 * Where a rental card payment is taken:
 *  - 'host'     the host's own Square account (OAuth), Vendibook keeps its
 *               share as app_fee_money;
 *  - 'platform' Vendibook's own live Square account (the billing account:
 *               SQUARE_ENVIRONMENT / SQUARE_APPLICATION_ID / SQUARE_LOCATION_ID /
 *               SQUARE_ACCESS_TOKEN). The host's share becomes a seller payable
 *               released by Vendibook, exactly like the earlier first-party flow.
 * Set RENTAL_SQUARE_PLATFORM_ENABLED=false to require host accounts.
 */
export interface RentalSquareContext {
  mode: 'host' | 'platform';
  environment: SquareEnvironment;
  applicationId: string;
  locationId: string;
  merchantId: string | null;
  businessName: string | null;
  base: string;
  token: () => Promise<string>;
}

export function platformSquare() {
  const environment = (Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox') as SquareEnvironment;
  const applicationId = Deno.env.get('SQUARE_APPLICATION_ID') || '';
  const locationId = Deno.env.get('SQUARE_LOCATION_ID') || '';
  const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN') || '';
  if (Deno.env.get('RENTAL_SQUARE_PLATFORM_ENABLED') === 'false') return null;
  if (environment !== 'sandbox' && environment !== 'production') return null;
  if (!applicationId || !locationId || !accessToken) return null;
  return {
    environment,
    applicationId,
    locationId,
    accessToken,
    base: environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  };
}

function platformContext(locationId?: string | null): RentalSquareContext | null {
  const p = platformSquare();
  if (!p) return null;
  return {
    mode: 'platform',
    environment: p.environment,
    applicationId: p.applicationId,
    locationId: locationId || p.locationId,
    merchantId: null,
    businessName: null,
    base: p.base,
    token: () => Promise.resolve(p.accessToken),
  };
}

function hostContext(admin: any, account: Record<string, any>): RentalSquareContext {
  const env = marketplaceEnv();
  return {
    mode: 'host',
    environment: env.environment,
    applicationId: env.applicationId,
    locationId: account.location_id,
    merchantId: account.merchant_id ?? null,
    businessName: account.business_name ?? account.location_name ?? null,
    base: env.base,
    token: () => sellerAccessToken(admin, account),
  };
}

/** The Square account a new rental payment for this host should use. */
export async function rentalSquareContext(admin: any, hostId: string): Promise<RentalSquareContext | null> {
  if (marketplaceConfigured()) {
    const account = await activeSellerAccount(admin, hostId);
    if (account) return hostContext(admin, account);
  }
  return platformContext();
}

/** The Square account an existing rental payment record was taken on. */
export async function recordSquareContext(admin: any, record: Record<string, any>): Promise<RentalSquareContext | null> {
  if (record?.metadata?.square_mode === 'platform') return platformContext(record.square_location_id);
  const account = record?.seller_id ? await activeSellerAccount(admin, record.seller_id) : null;
  return account ? hostContext(admin, account) : null;
}
