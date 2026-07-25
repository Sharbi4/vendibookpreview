// Returns a short-lived embedded signing URL for the current user's
// invite on a document. The frontend loads the URL inside an iframe /
// modal so users never leave the app.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { createEmbeddedSigningLink, getDocument } from '../_shared/signnow.ts';

interface Signer {
  role: string;
  user_id: string | null;
  email: string;
  invite_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  try {
    const { document_id } = await req.json().catch(() => ({}));
    if (!document_id) return jsonError(400, 'invalid_request', 'document_id required');

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return jsonError(401, 'unauthorized', 'auth required');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const uid = claims?.claims?.sub;
    const email = (claims?.claims as any)?.email as string | undefined;
    if (!uid) return jsonError(401, 'unauthorized', 'auth required');

    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: doc, error: dErr } = await svc
      .from('documents')
      .select('id,signnow_document_id,signers,status')
      .eq('id', document_id)
      .maybeSingle();
    if (dErr || !doc) return jsonError(404, 'not_found', 'document not found');

    const signers: Signer[] = Array.isArray(doc.signers) ? (doc.signers as any) : [];
    const mine = signers.find((s) => s.user_id === uid || (email && s.email?.toLowerCase() === email.toLowerCase()));
    if (!mine) return jsonError(403, 'forbidden', 'not a signer on this document');

    // If we didn't persist invite_ids on create (older rows), fetch them now.
    let inviteId = mine.invite_id;
    if (!inviteId) {
      const remote = await getDocument(doc.signnow_document_id);
      const invites = remote?.field_invites ?? [];
      const match = invites.find((i: any) => (i.email ?? '').toLowerCase() === mine.email.toLowerCase());
      inviteId = match?.id;
      if (inviteId) {
        const updated = signers.map((s) => (s.email === mine.email ? { ...s, invite_id: inviteId } : s));
        await svc.from('documents').update({ signers: updated }).eq('id', document_id);
      }
    }
    if (!inviteId) return jsonError(500, 'invite_not_found', 'could not resolve embedded invite id');

    const link = await createEmbeddedSigningLink(doc.signnow_document_id, inviteId, { link_expiration: 30 });
    return jsonResponse(200, { url: link, expires_in: 1800 });
  } catch (e) {
    console.error('[signnow-create-embedded-session]', e);
    return unknownErrorResponse(e);
  }
});
