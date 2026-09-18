// TEMPORARY one-shot provisioning helper. Provisions a single SignNow master
// template (kind + variant) and the private signed-documents bucket, then is
// deleted. Returns no credentials and mutates nothing user-owned.
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { ensureSignedDocumentsBucket, resolveTemplate } from '../_shared/signnowTemplates.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');
  try {
    const { kind, variant } = await req.json().catch(() => ({}));
    await ensureSignedDocumentsBucket();
    if (!kind) return jsonResponse(200, { ok: true, bucket: true });
    const resolved = await resolveTemplate(kind, variant ?? 'general');
    return jsonResponse(200, { ok: true, kind, variant: variant ?? 'general', version: resolved.version });
  } catch (e) {
    console.error('[signnow-bootstrap-run]', e);
    return unknownErrorResponse(e);
  }
});
