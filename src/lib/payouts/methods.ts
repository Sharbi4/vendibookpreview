/**
 * Canonical payout-method validation and masking for Vendibook's MANUAL payout
 * model. Vendibook records seller proceeds internally (`seller_payables`) and an
 * admin reviews and sends every payout by hand — nothing here is a connected
 * merchant account, and nothing here gates publishing or buyer checkout.
 *
 * NOTE: `supabase/functions/_shared/payoutMethods.ts` is the server mirror of
 * this file. Keep the two in sync — the server copy is authoritative.
 */

export const PAYOUT_METHODS = ['paypal', 'venmo', 'cash_app', 'ach'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_METHOD_LABEL: Record<PayoutMethod, string> = {
  paypal: 'PayPal',
  venmo: 'Venmo',
  cash_app: 'Cash App',
  ach: 'Bank transfer (ACH)',
};

export type PayoutPreferenceStatus =
  | 'not_set'
  | 'pending_review'
  | 'verified'
  | 'needs_attention';

export const PAYOUT_STATUS_LABEL: Record<PayoutPreferenceStatus, string> = {
  not_set: 'Not set',
  pending_review: 'Pending review',
  verified: 'Verified',
  needs_attention: 'Needs attention',
};

export type VenmoIdentifierType = 'handle' | 'phone' | 'email';

export interface PayoutPreferenceInput {
  method: PayoutMethod;
  paypal_email?: string;
  venmo_identifier_type?: VenmoIdentifierType;
  venmo_identifier?: string;
  cash_app_cashtag?: string;
  ach_bank_name?: string;
  ach_account_type?: 'checking' | 'savings';
  ach_account_holder?: string;
  ach_routing_number?: string;
  ach_account_number?: string;
}

export interface NormalizedPayoutPreference {
  method: PayoutMethod;
  display_label: string;
  masked_destination: string;
  /** Set only for methods that never require the secure ACH workflow. */
  status: Exclude<PayoutPreferenceStatus, 'not_set'>;
  paypal_email?: string | null;
  venmo_identifier_type?: VenmoIdentifierType | null;
  venmo_masked_identifier?: string | null;
  cash_app_cashtag?: string | null;
  ach_bank_name?: string | null;
  ach_account_type?: string | null;
  ach_account_holder?: string | null;
  ach_routing_last4?: string | null;
  ach_account_last4?: string | null;
}

export class PayoutValidationError extends Error {}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

const fail = (message: string): never => {
  throw new PayoutValidationError(message);
};

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

export function maskPhone(digits: string): string {
  return `•••-•••-${digits.slice(-4)}`;
}

export function normalizeCashtag(raw: string): string {
  const value = raw.trim().replace(/^\$+/, '');
  if (!/^[A-Za-z][A-Za-z0-9_]{1,19}$/.test(value)) {
    fail('Enter a valid $Cashtag (letters, numbers or underscores, starting with a letter).');
  }
  return `$${value}`;
}

export function digitsOnly(raw: string): string {
  return raw.replace(/\D+/g, '');
}

/**
 * Validates and normalizes user input into the columns that are safe to store
 * in the client-readable `payout_preferences` row. Raw ACH routing/account
 * numbers are deliberately NOT returned here — they never touch that table.
 */
export function normalizePayoutPreference(
  input: PayoutPreferenceInput,
): NormalizedPayoutPreference {
  const method = input.method;
  if (!PAYOUT_METHODS.includes(method)) fail('Choose a supported payout method.');

  if (method === 'paypal') {
    const email = (input.paypal_email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) fail('Enter the valid email address on your PayPal account.');
    return {
      method,
      status: 'verified',
      display_label: 'PayPal',
      masked_destination: maskEmail(email),
      paypal_email: email,
    };
  }

  if (method === 'venmo') {
    const type = input.venmo_identifier_type;
    const raw = (input.venmo_identifier ?? '').trim();
    if (!raw) fail('Enter your Venmo handle, phone number or email.');
    if (type === 'handle') {
      const handle = raw.replace(/^@+/, '');
      if (!/^[A-Za-z0-9_-]{3,30}$/.test(handle)) fail('Enter a valid Venmo handle, e.g. @jane-doe.');
      return {
        method,
        status: 'verified',
        display_label: 'Venmo',
        masked_destination: `@${handle}`,
        venmo_identifier_type: 'handle',
        venmo_masked_identifier: `@${handle}`,
      };
    }
    if (type === 'phone') {
      const digits = digitsOnly(raw);
      if (digits.length < 10 || digits.length > 11) fail('Enter a valid 10-digit phone number.');
      return {
        method,
        status: 'verified',
        display_label: 'Venmo',
        masked_destination: maskPhone(digits),
        venmo_identifier_type: 'phone',
        venmo_masked_identifier: maskPhone(digits),
      };
    }
    if (type === 'email') {
      const email = raw.toLowerCase();
      if (!EMAIL_RE.test(email)) fail('Enter a valid email address for your Venmo account.');
      return {
        method,
        status: 'verified',
        display_label: 'Venmo',
        masked_destination: maskEmail(email),
        venmo_identifier_type: 'email',
        venmo_masked_identifier: maskEmail(email),
      };
    }
    return fail('Tell us whether that Venmo identifier is a handle, phone or email.');
  }

  if (method === 'cash_app') {
    const cashtag = normalizeCashtag(input.cash_app_cashtag ?? '');
    return {
      method,
      status: 'verified',
      display_label: 'Cash App',
      masked_destination: cashtag,
      cash_app_cashtag: cashtag,
    };
  }

  // ACH — secure workflow. Only bank name, holder, type and last four are ever
  // stored in the client-readable row; full numbers go to the server-only vault.
  const bank = (input.ach_bank_name ?? '').trim();
  const holder = (input.ach_account_holder ?? '').trim();
  const accountType = input.ach_account_type;
  const routing = digitsOnly(input.ach_routing_number ?? '');
  const account = digitsOnly(input.ach_account_number ?? '');
  if (bank.length < 2) fail('Enter your bank name.');
  if (holder.length < 2) fail('Enter the account holder name.');
  if (accountType !== 'checking' && accountType !== 'savings') {
    fail('Choose checking or savings.');
  }
  if (routing.length !== 9) fail('Enter the 9-digit routing number.');
  if (account.length < 4 || account.length > 17) fail('Enter a valid account number.');

  return {
    method,
    // ACH always goes to manual verification — never auto-mark as verified.
    status: 'pending_review',
    display_label: `${bank} ${accountType === 'savings' ? 'savings' : 'checking'}`,
    masked_destination: `••••${account.slice(-4)}`,
    ach_bank_name: bank,
    ach_account_type: accountType,
    ach_account_holder: holder,
    ach_routing_last4: routing.slice(-4),
    ach_account_last4: account.slice(-4),
  };
}

/** Copy shown next to a saved preference. Never promises automated payouts. */
export const PAYOUT_PREFERENCE_DISCLOSURE =
  'This is a payout preference for Vendibook operations — not a connected merchant account. Vendibook reviews and sends every payout manually.';
