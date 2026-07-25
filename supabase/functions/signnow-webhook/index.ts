// SignNow webhook handler.
// Handles document.complete + document.update events. Idempotent via the
// signnow_webhook_events table (each event_id inserted once). On completion
// we download the signed PDF, drop it in the private `signed-documents`
// bucket at "{document_id}.pdf", and flip the documents.status to 'completed'.
// Also stamps sale_transactions.bill_of_sale_completed_at when relevant.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { downloadDocumentPdf, getDocument, verifyWebhookSignature } from '../_shared/signnow.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  const raw = await req.text();
  const secret = Deno.env.get('SIGNNOW_WEBHOOK_SECRET');
  const sig = req.headers.get('x-neap-signature') ?? req.headers.get('X-Neap-Signature');
  if (secret) {
    const ok = await verifyWebhookSignature(raw, sig, secret);
    if (!ok) return jsonError(401, 'invalid_signature', 'signature mismatch');
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return jsonError(400, 'invalid_json', 'bad body'); }

  const eventId: string = payload?.event_id ?? payload?.id ?? crypto.randomUUID();
  const eventType: string = payload?.event ?? payload?.event_type ?? 'unknown';
  const signnowDocId: string | undefined = payload?.meta?.document_id ?? payload?.document_id ?? payload?.data?.document_id;

  const svc = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // Idempotency guard.
  const { error: idemErr } = await svc.from('signnow_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    signnow_document_id: signnowDocId ?? null,
    payload,
  });
  if (idemErr && !String(idemErr.message).toLowerCase().includes('duplicate')) {
    console.error('[signnow-webhook] idempotency insert error', idemErr);
  }
  // If it was a duplicate insert (23505), acknowledge without reprocessing.
  if (idemErr && (idemErr as any).code === '23505') {
    return jsonResponse(200, { ok: true, duplicate: true });
  }

  try {
    if (!signnowDocId) return jsonResponse(200, { ok: true, note: 'no document_id in payload' });

    const { data: doc } = await svc
      .from('documents')
      .select('id,document_type,transaction_id,booking_id,signers,status')
      .eq('signnow_document_id', signnowDocId)
      .maybeSingle();
    if (!doc) return jsonResponse(200, { ok: true, note: 'unknown document' });

    // Pull the current SignNow document to figure out which invites have signed.
    const remote = await getDocument(signnowDocId);
    const invites: any[] = remote?.field_invites ?? [];
    const allSigned = invites.length > 0 && invites.every((i) => (i.status ?? '').toLowerCase() === 'fulfilled');
    const anySigned = invites.some((i) => (i.status ?? '').toLowerCase() === 'fulfilled');

    // Merge signed_at into our signer records.
    const signers = Array.isArray(doc.signers) ? [...(doc.signers as any[])] : [];
    for (const inv of invites) {
      const idx = signers.findIndex((s: any) => (s.email ?? '').toLowerCase() === (inv.email ?? '').toLowerCase());
      if (idx >= 0 && (inv.status ?? '').toLowerCase() === 'fulfilled' && !signers[idx].signed_at) {
        signers[idx].signed_at = inv.updated ?? new Date().toISOString();
      }
      if (idx >= 0 && !signers[idx].invite_id && inv.id) {
        signers[idx].invite_id = inv.id;
      }
    }

    let nextStatus: string = doc.status;
    if (allSigned) nextStatus = 'completed';
    else if (anySigned) nextStatus = 'partially_signed';

    const updates: Record<string, unknown> = { signers, status: nextStatus, updated_at: new Date().toISOString() };

    // On completion, pull PDF and stash it in private storage.
    if (allSigned && doc.status !== 'completed') {
      try {
        const pdf = await downloadDocumentPdf(signnowDocId);
        const path = `${doc.id}.pdf`;
        const up = await svc.storage.from('signed-documents').upload(path, pdf, {
          contentType: 'application/pdf',
          upsert: true,
        });
        if (up.error) throw up.error;
        updates.signed_pdf_path = path;
      } catch (e) {
        console.error('[signnow-webhook] pdf download/upload failed', e);
      }

      if (doc.document_type === 'bill_of_sale' && doc.transaction_id) {
        await svc
          .from('sale_transactions')
          .update({ bill_of_sale_completed_at: new Date().toISOString() })
          .eq('id', doc.transaction_id);
      }
    }

    await svc.from('documents').update(updates).eq('id', doc.id);

    return jsonResponse(200, { ok: true, status: nextStatus });
  } catch (e) {
    console.error('[signnow-webhook] handler error', e);
    return unknownErrorResponse(e);
  }
});
