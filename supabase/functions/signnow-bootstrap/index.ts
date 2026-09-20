// One-time SignNow bootstrap.
// Creates every master template in the Vendibook document package and the
// private signed-documents bucket. Safe to re-run: template IDs are persisted
// in public.signnow_templates and reused, so this returns existing IDs.
//
// Auth: the one-time bootstrap token (SIGNNOW_BOOTSTRAP_TOKEN) OR an admin JWT.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { signnowBase } from '../_shared/signnow.ts';
import { ensureSignedDocumentsBucket, provisionAllTemplates } from '../_shared/signnowTemplates.ts';

async function isAdminCaller(authHeader: string): Promise<boolean> {
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  const uid = authError ? undefined : authData?.user?.id;
  if (!uid) return false;
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: role } = await svc.rpc('has_role', { _user_id: uid, _role: 'admin' });
  return !!role;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  const token = req.headers.get('x-bootstrap-token') ?? '';
  const expected = Deno.env.get('SIGNNOW_BOOTSTRAP_TOKEN');
  const tokenOk = !!expected && token === expected;
  const adminOk = tokenOk ? true : await isAdminCaller(req.headers.get('Authorization') ?? '');
  if (!tokenOk && !adminOk) {
    return jsonError(403, 'forbidden', 'bootstrap token or admin access required');
  }

  try {
    await ensureSignedDocumentsBucket();
    // Provisions any missing (kind, version) template. Existing templates are
    // returned as-is and never overwritten or deleted.
    const templates = await provisionAllTemplates();

    return jsonResponse(200, {
      ok: true,
      api_base: signnowBase(),
      templates,
      note: 'Template IDs and versions are stored in public.signnow_templates and reused automatically. No credentials are returned.',
    });
  } catch (e) {
    console.error('[signnow-bootstrap]', e);
    return unknownErrorResponse(e);
  }
});
