import { afterEach, describe, expect, it, vi } from 'vitest';
import { marketplaceEnv, oauthConfigIssues } from '../../../supabase/functions/_shared/squareMarketplace';

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
function withEnv(env: Record<string, string>) {
  vi.stubGlobal('Deno', { env: { get: (k: string) => env[k] } });
}
const base = {
  SQUARE_ENVIRONMENT: 'sandbox',
  SQUARE_APPLICATION_ID: 'sandbox-sq0idb-shared',
  SQUARE_APPLICATION_SECRET: 'shared-secret',
  SQUARE_OAUTH_REDIRECT_URL: 'https://vendibook.com/dashboard/payments/square/callback',
  SQUARE_TOKEN_ENCRYPTION_KEY: KEY,
};

afterEach(() => vi.unstubAllGlobals());

describe('Square OAuth configuration checks', () => {
  it('is ready when id, secret, redirect and a 32-byte key are set', () => {
    withEnv(base);
    expect(oauthConfigIssues()).toEqual([]);
  });

  it('uses the rental pair only when both rental values are set', () => {
    withEnv({ ...base, RENTAL_SQUARE_APPLICATION_ID: 'sandbox-sq0idb-rental', RENTAL_SQUARE_APPLICATION_SECRET: 'rental-secret' });
    expect(marketplaceEnv()).toMatchObject({ applicationId: 'sandbox-sq0idb-rental', applicationSecret: 'rental-secret' });
    expect(oauthConfigIssues()).toEqual([]);
  });

  it('flags a half-set rental pair instead of mixing apps', () => {
    withEnv({ ...base, RENTAL_SQUARE_APPLICATION_ID: 'sandbox-sq0idb-rental' });
    expect(oauthConfigIssues()).toContain('rental_credentials_incomplete');
  });

  it('flags a bad encryption key before the host ever reaches Square', () => {
    withEnv({ ...base, SQUARE_TOKEN_ENCRYPTION_KEY: btoa('too-short') });
    expect(oauthConfigIssues()).toContain('invalid_encryption_key');
  });

  it('flags a production app id used with the sandbox environment', () => {
    withEnv({ ...base, SQUARE_APPLICATION_ID: 'sq0idp-production' });
    expect(oauthConfigIssues()).toContain('environment_app_mismatch');
  });
});
