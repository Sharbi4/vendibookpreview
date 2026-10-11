import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Recursively collect source files under src/. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

const RETIRED_FUNCTIONS = [
  'create-stripe-connect',
  'create-stripe-dashboard-link',
  'check-stripe-connect',
  'customer-portal',
  'create-checkout',
  'create-featured-checkout',
  'create-notary-checkout',
  'manage-subscription',
  'get-checkout-session',
  'send-stripe-onboarding-reminder',
  'create-identity-verification',
  'check-identity-verification',
];

/** Edge functions that must no longer exist in the repo at all. */
const DELETED_FUNCTION_DIRS = [
  'stripe-webhook',
  'monetization-webhook',
  'create-stripe-connect',
  'create-stripe-dashboard-link',
  'check-stripe-connect',
  'send-stripe-onboarding-reminder',
  'create-identity-verification',
  'check-identity-verification',
];

describe('payment provider cutover', () => {
  const files = walk('src');

  it('never invokes a retired payment edge function from the app', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const fn of RETIRED_FUNCTIONS) {
        if (src.includes(`functions.invoke('${fn}'`) || src.includes(`functions.invoke("${fn}"`)) {
          offenders.push(`${file} -> ${fn}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not import a Stripe SDK anywhere in the app bundle', () => {
    const offenders = files.filter((file) => /from ['"]@?stripe/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('has no Stripe Connect or Stripe Identity edge functions in the repo', () => {
    const present = DELETED_FUNCTION_DIRS.filter((dir) =>
      existsSync(join('supabase/functions', dir)),
    );
    expect(present).toEqual([]);
  });
});
