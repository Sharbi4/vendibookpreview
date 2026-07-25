// One-time SignNow bootstrap.
// Creates the two master templates (rental agreement + bill of sale) and
// registers v2 webhook subscriptions for document.complete and document.update.
// Safe to re-run: it returns existing template IDs and subscription IDs when
// they already exist. This is meant to be invoked manually after SignNow
// credentials are saved, not exposed to end users.
//
// Protected by a single-use bootstrap token (SIGNNOW_BOOTSTRAP_TOKEN) so it can
// be called from the Lovable tooling without exposing the service role key.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { getAccessToken, signnowBase } from '../_shared/signnow.ts';

// deno-lint-ignore-file no-explicit-any

const REQUIRED_ROLES = {
  rental: ['Host', 'Renter'],
  billOfSale: ['Buyer', 'Seller'],
};

function buildRentalPdf(): Uint8Array {
  const body = `Rental Agreement

Host: {t:text;r:yes;o:"Host";n:"host_name";}
Renter: {t:text;r:yes;o:"Renter";n:"renter_name";}
Listing: {t:text;r:yes;o:"Host";n:"listing_title";}
Address: {t:text;r:yes;o:"Host";n:"listing_address";}
Start Date: {t:text;r:yes;o:"Host";n:"start_date";}
End Date: {t:text;r:yes;o:"Host";n:"end_date";}
Start Time: {t:text;r:no;o:"Host";n:"start_time";}
End Time: {t:text;r:no;o:"Host";n:"end_time";}
Total Price: {t:text;r:yes;o:"Host";n:"total_price";}
Deposit: {t:text;r:no;o:"Host";n:"deposit_amount";}
Cancellation Policy: {t:text;r:no;o:"Host";n:"cancellation_policy";}

Host Signature: {t:signature;r:yes;o:"Host";n:"host_signature";}
Renter Signature: {t:signature;r:yes;o:"Renter";n:"renter_signature";}`;
  return makeSimplePdf(body, 'Rental Agreement');
}

function buildBillOfSalePdf(): Uint8Array {
  const body = `Bill of Sale

Seller: {t:text;r:yes;o:"Seller";n:"seller_name";}
Buyer: {t:text;r:yes;o:"Buyer";n:"buyer_name";}
Listing: {t:text;r:yes;o:"Seller";n:"listing_title";}
Address: {t:text;r:yes;o:"Seller";n:"listing_address";}
Category: {t:text;r:no;o:"Seller";n:"category";}
Price: {t:text;r:yes;o:"Seller";n:"price";}
Sale Date: {t:text;r:yes;o:"Seller";n:"sale_date";}
As-Is Clause: {t:text;r:no;o:"Seller";n:"as_is_clause";}

Seller Signature: {t:signature;r:yes;o:"Seller";n:"seller_signature";}
Buyer Signature: {t:signature;r:yes;o:"Buyer";n:"buyer_signature";}`;
  return makeSimplePdf(body, 'Bill of Sale');
}

function makeSimplePdf(textBody: string, title: string): Uint8Array {
  // Minimal PDF 1.4 with a single Helvetica page. Text tags are preserved
  // literally in the stream so SignNow can extract them via fieldextract.
  const lines = textBody.split('\n');
  let y = 700;
  let stream = `BT
/F1 12 Tf
50 ${y} Td
(${escapePdfString(title)}) Tj
ET
`;
  y -= 24;
  for (const line of lines) {
    if (!line) { y -= 12; continue; }
    stream += `BT
/F1 12 Tf
50 ${y} Td
(${escapePdfString(line)}) Tj
ET
`;
    y -= 18;
  }
  const streamBytes = new TextEncoder().encode(stream);

  const obj1 = '1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n';
  const obj2 = '2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n';
  const obj3Base = '3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 5 0 R\n>>\n>>\n>>\nendobj\n';
  const obj5 = '5 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n';

  const obj4 = `4 0 obj\n<<\n/Length ${streamBytes.length}\n>>\nstream\n${stream}endstream\nendobj\n`;
  const full = `%PDF-1.4\n${obj1}${obj2}${obj3Base}${obj4}${obj5}`;
  const fullBytes = new TextEncoder().encode(full);

  const xrefOffset = fullBytes.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000254 00000 n \n0000000000 65535 f \n`;
  const trailer = `trailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const out = new Uint8Array(fullBytes.length + xref.length + trailer.length);
  out.set(fullBytes, 0);
  out.set(new TextEncoder().encode(xref), fullBytes.length);
  out.set(new TextEncoder().encode(trailer), fullBytes.length + xref.length);
  return out;
}

function escapePdfString(s: string): string {
  return s.replace(/[\\()]/g, '\\$&');
}

async function signnowApi(token: string, path: string, init: RequestInit & { json?: unknown } = {}): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  let body: BodyInit | undefined = init.body as BodyInit | undefined;
  if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${signnowBase()}${path}`, { ...init, headers, body });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SignNow ${init.method ?? 'GET'} ${path} [${res.status}]: ${text}`);
  }
  try { return text ? JSON.parse(text) : {}; } catch { return text; }
}

async function uploadTemplateDocument(token: string, name: string, pdf: Uint8Array): Promise<string> {
  // Build multipart/form-data manually. The PDF contains simple text tags
  // (e.g. {t:text;r:yes;o:"Host";n:"host_name";}); SignNow parses them
  // when parse_type=tag is supplied.
  const boundary = '----FormBoundary' + crypto.randomUUID().replace(/-/g, '');
  const e = new TextEncoder();
  const header = e.encode(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${name}.pdf"\r\n` +
    `Content-Type: application/pdf\r\n\r\n`,
  );
  const parseTypePart = e.encode(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="parse_type"\r\n\r\n` +
    `tag\r\n` +
    `--${boundary}--\r\n`,
  );
  const body = new Uint8Array(header.length + pdf.length + parseTypePart.length);
  body.set(header, 0);
  body.set(pdf, header.length);
  body.set(parseTypePart, header.length + pdf.length);

  const res = await fetch(`${signnowBase()}/document/fieldextract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`fieldextract [${res.status}]: ${text}`);
  return JSON.parse(text).id;
}

async function createTemplate(token: string, documentId: string, name: string): Promise<string> {
  const json = await signnowApi(token, '/template', {
    method: 'POST',
    json: { document_id: documentId, document_name: name },
  });
  return String(json.id);
}

async function verifyTemplateRoles(token: string, templateId: string, expected: string[]): Promise<string[]> {
  const doc = await signnowApi(token, `/template/${templateId}`, { method: 'GET' });
  const roles = (doc.roles || []).map((r: any) => r.name || r.role_name || r);
  const missing = expected.filter((r) => !roles.includes(r));
  if (missing.length) throw new Error(`template ${templateId} missing roles: ${missing.join(', ')} (found: ${roles.join(', ')})`);
  return roles;
}

async function registerWebhook(
  token: string,
  userId: string,
  secret: string,
  callbackUrl: string,
): Promise<{ id: string; event: string }[]> {
  const events = ['document.complete', 'document.update'];
  const results: { id: string; event: string }[] = [];
  for (const event of events) {
    try {
      const json = await signnowApi(token, '/v2/event-subscriptions', {
        method: 'POST',
        json: {
          event,
          entity_id: userId,
          attributes: {
            callback: callbackUrl,
            secret_key: secret,
            delete_access_token: true,
            docid_queryparam: true,
          },
        },
      });
      results.push({ id: json.id ?? json.data?.id ?? 'unknown', event });
    } catch (e: any) {
      if (e.message?.includes('subscription already exists') || e.message?.includes('duplicate')) {
        results.push({ id: 'existing', event });
      } else {
        throw e;
      }
    }
  }
  return results;
}

async function getUserId(token: string): Promise<string> {
  const user = await signnowApi(token, '/user', { method: 'GET' });
  return String(user.id);
}

async function ensureBucket(svc: ReturnType<typeof createClient>): Promise<void> {
  const { data: buckets } = await svc.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === 'signed-documents');
  if (exists) return;
  const { error } = await svc.storage.createBucket('signed-documents', {
    public: false,
    file_size_limit: 50 * 1024 * 1024,
  });
  if (error) throw new Error(`create bucket failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  // Only allow invocations with the one-time bootstrap token.
  const token = req.headers.get('x-bootstrap-token') ?? '';
  const expected = Deno.env.get('SIGNNOW_BOOTSTRAP_TOKEN');
  if (!expected || token !== expected) {
    return jsonError(403, 'forbidden', 'valid bootstrap token required');
  }

  try {
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.supabase.co')}/functions/v1/signnow-webhook`;
    const secret = Deno.env.get('SIGNNOW_WEBHOOK_SECRET');
    if (!secret) throw new Error('SIGNNOW_WEBHOOK_SECRET not set');

    const token = await getAccessToken();
    const userId = await getUserId(token);

    const rentalDocId = await uploadTemplateDocument(token, 'Vendibook Rental Agreement', buildRentalPdf(), RENTAL_TAGS);
    const rentalTemplateId = await createTemplate(token, rentalDocId, 'Vendibook Rental Agreement');
    const rentalRoles = await verifyTemplateRoles(token, rentalTemplateId, REQUIRED_ROLES.rental);

    const billDocId = await uploadTemplateDocument(token, 'Vendibook Bill of Sale', buildBillOfSalePdf(), BILL_OF_SALE_TAGS);
    const billTemplateId = await createTemplate(token, billDocId, 'Vendibook Bill of Sale');
    const billRoles = await verifyTemplateRoles(token, billTemplateId, REQUIRED_ROLES.billOfSale);

    const subs = await registerWebhook(token, userId, secret, callbackUrl);

    const svc = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    await ensureBucket(svc);

    return jsonResponse(200, {
      ok: true,
      api_base: signnowBase(),
      signnow_user_id: userId,
      templates: {
        rental_agreement: rentalTemplateId,
        bill_of_sale: billTemplateId,
      },
      roles: { rental: rentalRoles, bill_of_sale: billRoles },
      webhook_subscriptions: subs,
      webhook_callback_url: callbackUrl,
      next_steps: [
        'Save SIGNNOW_TEMPLATE_RENTAL_AGREEMENT and SIGNNOW_TEMPLATE_BILL_OF_SALE from templates above.',
        'Ensure the SignNow dashboard webhook signing secret matches SIGNNOW_WEBHOOK_SECRET.',
      ],
    });
  } catch (e) {
    console.error('[signnow-bootstrap]', e);
    return unknownErrorResponse(e);
  }
});
