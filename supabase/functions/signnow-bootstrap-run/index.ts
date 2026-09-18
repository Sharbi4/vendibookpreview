// TEMPORARY one-shot provisioning helper. Provisions the SignNow master
// templates and the private signed-documents bucket, then is deleted.
// It returns no credentials and mutates nothing user-owned.
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { ensureSignedDocumentsBucket, provisionAllTemplates } from '../_shared/signnowTemplates.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');
  try {
    await ensureSignedDocumentsBucket();
    const templates = await provisionAllTemplates();
    return jsonResponse(200, { ok: true, templates });
  } catch (e) {
    console.error('[signnow-bootstrap-run]', e);
    return unknownErrorResponse(e);
  }
});
