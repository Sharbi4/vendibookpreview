import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import {
  normalizePayoutPreference,
  PayoutValidationError,
  type PayoutPreferenceInput,
} from '../_shared/payoutMethods.ts';

/**
 * payout-preference-save
 *
 * Server-authoritative save for a seller's MANUAL payout preference
 * (PayPal | Venmo | Cash App | ACH). Vendibook reviews and sends every payout
 * by hand — this endpoint never triggers a payout and never creates a
 * connected merchant account.
 *
 * SECURITY:
 *  - Full ACH routing/account numbers never reach `payout_preferences` (the
 *    client-readable table) and are never logged. They are AES-GCM encrypted
 *    with PAYOUT_ACH_ENCRYPTION_KEY and written to the service-role-only
 *    `payout_ach_details` vault. If no key is configured we fall back to an
 *    explicit setup-request workflow (last4 + pending_review) rather than
 *    storing anything sensitive in plaintext.
 */

const enc = new TextEncoder();

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
}

async function encryptJson(secret: string, payload: unknown): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload))),
  );
  const joined = new Uint8Array(iv.length + cipher.length);
  joined.set(iv);
  joined.set(cipher, iv.length);
  return btoa(String.fromCharCode(...joined));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonError(401, 'unauthorized', 'Sign in to save your payout preference.');
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    const user = userData?.user;
    if (userError || !user) {
      return jsonError(401, 'unauthorized', 'Sign in to save your payout preference.');
    }

    let body: PayoutPreferenceInput;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, 'invalid_body', 'Could not read your payout details.');
    }

    let normalized;
    try {
      normalized = normalizePayoutPreference(body);
    } catch (err) {
      if (err instanceof PayoutValidationError) {
        return jsonError(400, 'invalid_payout_details', err.message);
      }
      throw err;
    }

    const isAch = normalized.method === 'ach';
    const encryptionSecret = Deno.env.get('PAYOUT_ACH_ENCRYPTION_KEY') ?? '';

    const row = {
      user_id: user.id,
      method: normalized.method,
      status: normalized.status,
      display_label: normalized.display_label,
      masked_destination: normalized.masked_destination,
      paypal_email: normalized.paypal_email ?? null,
      venmo_identifier_type: normalized.venmo_identifier_type ?? null,
      venmo_masked_identifier: normalized.venmo_masked_identifier ?? null,
      cash_app_cashtag: normalized.cash_app_cashtag ?? null,
      ach_bank_name: normalized.ach_bank_name ?? null,
      ach_account_type: normalized.ach_account_type ?? null,
      ach_account_holder: normalized.ach_account_holder ?? null,
      ach_routing_last4: normalized.ach_routing_last4 ?? null,
      ach_account_last4: normalized.ach_account_last4 ?? null,
      payee_first_name: normalized.payee_first_name,
      payee_last_name: normalized.payee_last_name,
      contact_email: normalized.contact_email,
      contact_phone: normalized.contact_phone,
      address_line1: normalized.address_line1,
      address_line2: normalized.address_line2,
      address_city: normalized.address_city,
      address_region: normalized.address_region,
      address_postal_code: normalized.address_postal_code,
      address_country: normalized.address_country,
      verified_at: normalized.status === 'verified' ? new Date().toISOString() : null,
      needs_attention_reason: null,
    };

    const { data: saved, error: saveError } = await admin
      .from('payout_preferences')
      .upsert(row, { onConflict: 'user_id' })
      .select(
        'id, method, status, display_label, masked_destination, ach_bank_name, ach_account_type, ach_routing_last4, ach_account_last4, verified_at, updated_at',
      )
      .single();

    if (saveError) {
      console.error('payout-preference-save: could not persist preference', saveError.message);
      return jsonError(500, 'save_failed', 'We could not save your payout preference. Try again.');
    }

    if (isAch) {
      const intakeMode = encryptionSecret ? 'encrypted' : 'setup_request';
      const encrypted = encryptionSecret
        ? await encryptJson(encryptionSecret, {
          routing_number: (body.ach_routing_number ?? '').replace(/\D+/g, ''),
          account_number: (body.ach_account_number ?? '').replace(/\D+/g, ''),
          account_holder: normalized.ach_account_holder,
          bank_name: normalized.ach_bank_name,
          account_type: normalized.ach_account_type,
          captured_at: new Date().toISOString(),
        })
        : null;

      const { error: vaultError } = await admin.from('payout_ach_details').upsert({
        preference_id: saved.id,
        user_id: user.id,
        encrypted_payload: encrypted,
        encryption_version: encryptionSecret ? 'aes-gcm-v1' : 'none',
        intake_mode: intakeMode,
      }, { onConflict: 'preference_id' });

      if (vaultError) {
        console.error('payout-preference-save: ACH vault write failed', vaultError.message);
        return jsonError(500, 'save_failed', 'We could not securely store your bank details. Try again.');
      }

      // Operational task for the manual-review queue. No sensitive values.
      await admin.from('payout_actions').insert({
        payable_id: null,
        action: 'payout_preference_ach_submitted',
        actor_id: user.id,
        note: `ACH payout preference submitted for manual verification (${intakeMode}).`,
        metadata: {
          preference_id: saved.id,
          bank_name: normalized.ach_bank_name,
          account_last4: normalized.ach_account_last4,
        },
      }).then(({ error }) => {
        if (error) console.warn('payout-preference-save: audit insert skipped', error.message);
      });
    }

    return jsonResponse(200, {
      ok: true,
      preference: saved,
      pending_verification: normalized.status === 'pending_review',
    });
  } catch (err) {
    console.error('payout-preference-save failed');
    return unknownErrorResponse(err);
  }
});
