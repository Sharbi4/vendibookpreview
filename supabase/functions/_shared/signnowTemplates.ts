// deno-lint-ignore-file no-explicit-any
/**
 * SignNow template provisioning.
 *
 * Template IDs come from env first (SIGNNOW_TEMPLATE_*), then from the
 * signnow_templates table, and are otherwise created once on demand and
 * persisted — so agreement generation never silently no-ops because a
 * template ID was never copied into a secret.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { getAccessToken, signnowBase } from './signnow.ts';

const REQUIRED_ROLES = {
  rental: ['Host', 'Renter'],
  billOfSale: ['Buyer', 'Seller'],
};

interface PdfField {
  type: 'text' | 'signature';
  name: string;
  role: string;
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
  label?: string;
}

interface PdfSection {
  label: string;
  x: number;
  y: number;
}

const MARGIN = 60;

function buildRentalPdf(): { pdf: Uint8Array; fields: PdfField[] } {
  const title = 'Rental Agreement';
  const sections: PdfSection[] = [
    { label: 'Host Name:', x: MARGIN, y: 650 },
    { label: 'Renter Name:', x: MARGIN, y: 620 },
    { label: 'Listing Title:', x: MARGIN, y: 590 },
    { label: 'Listing Address:', x: MARGIN, y: 560 },
    { label: 'Start Date:', x: MARGIN, y: 530 },
    { label: 'End Date:', x: 300, y: 530 },
    { label: 'Start Time:', x: MARGIN, y: 500 },
    { label: 'End Time:', x: 300, y: 500 },
    { label: 'Total Price:', x: MARGIN, y: 470 },
    { label: 'Deposit Amount:', x: MARGIN, y: 440 },
    { label: 'Cancellation Policy:', x: MARGIN, y: 410 },
    { label: 'Host Signature', x: MARGIN, y: 150 },
    { label: 'Renter Signature', x: 320, y: 150 },
  ];

  const fields: PdfField[] = [
    { type: 'text', name: 'host_name', role: 'Host', x: 160, y: 650, w: 220, h: 20, required: true, label: 'Host Name' },
    { type: 'text', name: 'renter_name', role: 'Renter', x: 180, y: 620, w: 200, h: 20, required: true, label: 'Renter Name' },
    { type: 'text', name: 'listing_title', role: 'Host', x: 170, y: 590, w: 300, h: 20, required: true, label: 'Listing Title' },
    { type: 'text', name: 'listing_address', role: 'Host', x: 190, y: 560, w: 300, h: 20, required: true, label: 'Listing Address' },
    { type: 'text', name: 'start_date', role: 'Host', x: 150, y: 530, w: 120, h: 20, required: true, label: 'Start Date' },
    { type: 'text', name: 'end_date', role: 'Host', x: 370, y: 530, w: 120, h: 20, required: true, label: 'End Date' },
    { type: 'text', name: 'start_time', role: 'Host', x: 150, y: 500, w: 120, h: 20, required: false, label: 'Start Time' },
    { type: 'text', name: 'end_time', role: 'Host', x: 370, y: 500, w: 120, h: 20, required: false, label: 'End Time' },
    { type: 'text', name: 'total_price', role: 'Host', x: 160, y: 470, w: 120, h: 20, required: true, label: 'Total Price' },
    { type: 'text', name: 'deposit_amount', role: 'Host', x: 190, y: 440, w: 120, h: 20, required: false, label: 'Deposit Amount' },
    { type: 'text', name: 'cancellation_policy', role: 'Host', x: 210, y: 410, w: 300, h: 20, required: false, label: 'Cancellation Policy' },
    { type: 'signature', name: 'host_signature', role: 'Host', x: MARGIN, y: 100, w: 220, h: 40, required: true, label: 'Host Signature' },
    { type: 'signature', name: 'renter_signature', role: 'Renter', x: 320, y: 100, w: 220, h: 40, required: true, label: 'Renter Signature' },
  ];

  return { pdf: makePdfWithSections(title, sections), fields };
}

function buildBillOfSalePdf(): { pdf: Uint8Array; fields: PdfField[] } {
  const title = 'Bill of Sale';
  const sections: PdfSection[] = [
    { label: 'Seller Name:', x: MARGIN, y: 650 },
    { label: 'Buyer Name:', x: MARGIN, y: 620 },
    { label: 'Listing Title:', x: MARGIN, y: 590 },
    { label: 'Listing Address:', x: MARGIN, y: 560 },
    { label: 'Category:', x: MARGIN, y: 530 },
    { label: 'Price:', x: MARGIN, y: 500 },
    { label: 'Sale Date:', x: MARGIN, y: 470 },
    { label: 'As-Is Clause:', x: MARGIN, y: 440 },
    { label: 'Seller Signature', x: MARGIN, y: 150 },
    { label: 'Buyer Signature', x: 320, y: 150 },
  ];

  const fields: PdfField[] = [
    { type: 'text', name: 'seller_name', role: 'Seller', x: 170, y: 650, w: 220, h: 20, required: true, label: 'Seller Name' },
    { type: 'text', name: 'buyer_name', role: 'Buyer', x: 170, y: 620, w: 220, h: 20, required: true, label: 'Buyer Name' },
    { type: 'text', name: 'listing_title', role: 'Seller', x: 170, y: 590, w: 300, h: 20, required: true, label: 'Listing Title' },
    { type: 'text', name: 'listing_address', role: 'Seller', x: 190, y: 560, w: 300, h: 20, required: true, label: 'Listing Address' },
    { type: 'text', name: 'category', role: 'Seller', x: 140, y: 530, w: 150, h: 20, required: false, label: 'Category' },
    { type: 'text', name: 'price', role: 'Seller', x: 130, y: 500, w: 120, h: 20, required: true, label: 'Price' },
    { type: 'text', name: 'sale_date', role: 'Seller', x: 150, y: 470, w: 120, h: 20, required: true, label: 'Sale Date' },
    { type: 'text', name: 'as_is_clause', role: 'Seller', x: 160, y: 440, w: 300, h: 20, required: false, label: 'As-Is Clause' },
    { type: 'signature', name: 'seller_signature', role: 'Seller', x: MARGIN, y: 100, w: 220, h: 40, required: true, label: 'Seller Signature' },
    { type: 'signature', name: 'buyer_signature', role: 'Buyer', x: 320, y: 100, w: 220, h: 40, required: true, label: 'Buyer Signature' },
  ];

  return { pdf: makePdfWithSections(title, sections), fields };
}

function makePdfWithSections(title: string, sections: PdfSection[]): Uint8Array {
  let stream = `BT\n/F1 18 Tf\n${MARGIN} 720 Td\n(${escapePdfString(title)}) Tj\nET\n`;

  for (const s of sections) {
    stream += `BT\n/F1 12 Tf\n${s.x} ${s.y} Td\n(${escapePdfString(s.label)}) Tj\nET\n`;
  }

  // Add some static legal boilerplate near the bottom.
  stream += `BT\n/F1 10 Tf\n${MARGIN} 60 Td\n(${escapePdfString('This document is executed electronically via Vendibook and airSlate SignNow.')}) Tj\nET\n`;

  const obj1 = '1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n';
  const obj2 = '2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n';
  const obj3Base = '3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 5 0 R\n>>\n>>\n>>\nendobj\n';
  const obj5 = '5 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n';

  const enc = new TextEncoder();
  const headerBytes = enc.encode('%PDF-1.4\n');
  const obj1Bytes = enc.encode(obj1);
  const obj2Bytes = enc.encode(obj2);
  const obj3Bytes = enc.encode(obj3Base);
  const obj5Bytes = enc.encode(obj5);
  const streamBytes = enc.encode(stream);
  const obj4 = `4 0 obj\n<<\n/Length ${streamBytes.length}\n>>\nstream\n${stream}endstream\nendobj\n`;
  const obj4Bytes = enc.encode(obj4);

  const off1 = headerBytes.length;
  const off2 = off1 + obj1Bytes.length;
  const off3 = off2 + obj2Bytes.length;
  const off4 = off3 + obj3Bytes.length;
  const off5 = off4 + obj4Bytes.length;

  const fullBytes = new Uint8Array(headerBytes.length + obj1Bytes.length + obj2Bytes.length + obj3Bytes.length + obj4Bytes.length + obj5Bytes.length);
  let pos = 0;
  fullBytes.set(headerBytes, pos); pos += headerBytes.length;
  fullBytes.set(obj1Bytes, pos); pos += obj1Bytes.length;
  fullBytes.set(obj2Bytes, pos); pos += obj2Bytes.length;
  fullBytes.set(obj3Bytes, pos); pos += obj3Bytes.length;
  fullBytes.set(obj4Bytes, pos); pos += obj4Bytes.length;
  fullBytes.set(obj5Bytes, pos); pos += obj5Bytes.length;

  const xrefOffset = fullBytes.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n${String(off1).padStart(10, '0')} 00000 n \n${String(off2).padStart(10, '0')} 00000 n \n${String(off3).padStart(10, '0')} 00000 n \n${String(off4).padStart(10, '0')} 00000 n \n${String(off5).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const out = new Uint8Array(fullBytes.length + xref.length + trailer.length);
  out.set(fullBytes, 0);
  out.set(enc.encode(xref), fullBytes.length);
  out.set(enc.encode(trailer), fullBytes.length + xref.length);
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

async function uploadRawDocument(token: string, name: string, pdf: Uint8Array): Promise<string> {
  const boundary = '----FormBoundary' + crypto.randomUUID().replace(/-/g, '');
  const e = new TextEncoder();
  const header = e.encode(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${name}.pdf"\r\n` +
    `Content-Type: application/pdf\r\n\r\n`,
  );
  const footer = e.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(header.length + pdf.length + footer.length);
  body.set(header, 0);
  body.set(pdf, header.length);
  body.set(footer, header.length + pdf.length);

  const res = await fetch(`${signnowBase()}/document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`document upload [${res.status}]: ${text}`);
  return JSON.parse(text).id;
}

async function editDocumentFields(token: string, documentId: string, name: string, fields: PdfField[]): Promise<void> {
  const body = {
    document_name: name,
    fields: fields.map((f) => ({
      type: f.type,
      required: f.required,
      role: f.role,
      page_number: 0,
      x: f.x,
      y: f.y,
      width: f.w,
      height: f.h,
      label: f.label,
      name: f.name,
    })),
  };
  await signnowApi(token, `/document/${documentId}`, { method: 'PUT', json: body });
}

async function createTemplate(token: string, documentId: string, name: string): Promise<string> {
  const json = await signnowApi(token, '/template', {
    method: 'POST',
    json: { document_id: documentId, document_name: name },
  });
  return String(json.id);
}

async function verifyTemplateRoles(token: string, templateId: string, expected: string[]): Promise<string[]> {
  // Templates are returned as documents in SignNow; the /template/{id} endpoint
  // returns 404 for templates created via /template, so we query /document/{id}.
  const doc = await signnowApi(token, `/document/${templateId}`, { method: 'GET' });
  const roles = (doc.roles || []).map((r: any) => r.name || r.role_name || r);
  const missing = expected.filter((r) => !roles.includes(r));
  if (missing.length) throw new Error(`template ${templateId} missing roles: ${missing.join(', ')} (found: ${roles.join(', ')})`);
  return roles;
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

export type TemplateKind = 'rental_agreement' | 'bill_of_sale';

const ENV_NAME: Record<TemplateKind, string> = {
  rental_agreement: 'SIGNNOW_TEMPLATE_RENTAL_AGREEMENT',
  bill_of_sale: 'SIGNNOW_TEMPLATE_BILL_OF_SALE',
};
const DOC_NAME: Record<TemplateKind, string> = {
  rental_agreement: 'Vendibook Rental Agreement',
  bill_of_sale: 'Vendibook Bill of Sale',
};

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

async function createTemplateForKind(kind: TemplateKind): Promise<{ templateId: string; roles: string[] }> {
  const token = await getAccessToken();
  const built = kind === 'rental_agreement' ? buildRentalPdf() : buildBillOfSalePdf();
  const name = DOC_NAME[kind];
  const docId = await uploadRawDocument(token, name, built.pdf);
  await editDocumentFields(token, docId, name, built.fields);
  const templateId = await createTemplate(token, docId, name);
  const roles = await verifyTemplateRoles(
    token,
    templateId,
    kind === 'rental_agreement' ? REQUIRED_ROLES.rental : REQUIRED_ROLES.billOfSale,
  );
  await ensureBucket(admin() as any);
  return { templateId, roles };
}

/**
 * Returns the SignNow template ID for a kind, provisioning it once if needed.
 * Concurrent callers converge on a single stored template ID.
 */
export async function ensureTemplateId(kind: TemplateKind): Promise<string> {
  const fromEnv = Deno.env.get(ENV_NAME[kind]);
  if (fromEnv) return fromEnv;

  const svc = admin();
  const { data: existing } = await svc
    .from('signnow_templates')
    .select('signnow_template_id')
    .eq('kind', kind)
    .maybeSingle();
  if (existing?.signnow_template_id) return existing.signnow_template_id;

  const { templateId, roles } = await createTemplateForKind(kind);
  const { error } = await svc
    .from('signnow_templates')
    .insert({ kind, signnow_template_id: templateId, roles });
  if (error) {
    const { data: raced } = await svc
      .from('signnow_templates')
      .select('signnow_template_id')
      .eq('kind', kind)
      .maybeSingle();
    if (raced?.signnow_template_id) return raced.signnow_template_id;
    throw new Error(`could not persist template id: ${error.message}`);
  }
  return templateId;
}

export async function ensureSignedDocumentsBucket(): Promise<void> {
  await ensureBucket(admin() as any);
}
