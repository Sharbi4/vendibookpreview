import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';

/**
 * admin-payout-ach-reveal
 *
 * Admin-only, fully audited retrieval of a seller's ACH details so operations
 * can send a manual payout. Never callable from an ordinary browser query:
 * `payout_ach_details` denies all client reads and only the service role can
 * decrypt. Every call writes an immutable `payout_actions` entry.
 */

const dec = new TextDecoder();
const enc = new TextEncoder();

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
}

async function decryptJson(secret: string, payload: string): Promise<Record<string, unknown>> {
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const key = await aesKey(secret);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(dec.decode(plain));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonError(401, 'unauthorized', 'Admin sign-in required.');
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: userData } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    const actor = userData?.user;
    if (!actor) return jsonError(401, 'unauthorized', 'Admin sign-in required.');

    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: actor.id,
      _role: 'admin',
    });
    if (!isAdmin) return jsonError(403, 'forbidden', 'Admin access required.');

    const body = await req.json().catch(() => ({}));
    const sellerId = typeof body?.seller_id === 'string' ? body.seller_id : null;
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : null;
    if (!sellerId) return jsonError(400, 'invalid_body', 'seller_id is required.');

    const { data: pref } = await admin
      .from('payout_preferences')
      .select('id, method, status, display_label, masked_destination')
      .eq('user_id', sellerId)
      .maybeSingle();

    if (!pref) return jsonError(404, 'not_found', 'No payout preference on file for this seller.');
    if (pref.method !== 'ach') {
      return jsonError(400, 'not_ach', 'This seller is not set up for ACH payouts.');
    }

    const { data: vault } = await admin
      .from('payout_ach_details')
      .select('encrypted_payload, encryption_version, intake_mode')
      .eq('preference_id', pref.id)
      .maybeSingle();

    // Immutable audit entry BEFORE any value is returned.
    await admin.from('payout_actions').insert({
      payable_id: body?.payable_id ?? null,
      action: 'payout_ach_details_revealed',
      actor_id: actor.id,
      note: reason ?? 'Admin viewed ACH payout details for a manual payout.',
      metadata: { seller_id: sellerId, preference_id: pref.id },
    });

    if (!vault?.encrypted_payload) {
      return jsonResponse(200, {
        ok: true,
        available: false,
        intake_mode: vault?.intake_mode ?? 'setup_request',
        message:
          'Bank details were collected as a verification request. Contact the seller through the secure operations workflow to complete setup.',
      });
    }

    const secret = Deno.env.get('PAYOUT_ACH_ENCRYPTION_KEY') ?? '';
    if (!secret) {
      return jsonError(503, 'encryption_unavailable', 'Decryption key is not configured.');
    }

    const details = await decryptJson(secret, vault.encrypted_payload);
    return jsonResponse(200, { ok: true, available: true, details });
  } catch (err) {
    console.error('admin-payout-ach-reveal failed');
    return unknownErrorResponse(err);
  }
});
