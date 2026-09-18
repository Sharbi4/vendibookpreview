// deno-lint-ignore-file no-explicit-any
/**
 * SignNow template provisioning, versioned.
 *
 * For each (kind, version) pair there is exactly one SignNow template. A
 * template that has already been provisioned is NEVER overwritten or deleted:
 * bumping a spec version provisions a brand new template and retires the old
 * row, so documents generated earlier stay tied to the template they were
 * built from.
 *
 * Resolution order for the active template of a kind:
 *   1. SIGNNOW_TEMPLATE_* env override (operator escape hatch)
 *   2. signnow_templates row for (kind, current spec version)
 *   3. provision a new template through the SignNow API and persist it
 */
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { getAccessToken, signnowBase } from './signnow.ts';
import { getTemplateSpec, SPEC_VERSIONS, TEMPLATE_SPECS, variantVersion, supportsVariants, type AssetVariant, type SignNowFieldDef, type TemplateKind } from './signnowTemplateSpecs.ts';

export type { TemplateKind } from './signnowTemplateSpecs.ts';
export { SPEC_VERSIONS, variantVersion } from './signnowTemplateSpecs.ts';
export type { AssetVariant } from './signnowTemplateSpecs.ts';

const ENV_NAME: Partial<Record<TemplateKind, string>> = {
  rental_agreement: 'SIGNNOW_TEMPLATE_RENTAL_AGREEMENT',
  purchase_sale_agreement: 'SIGNNOW_TEMPLATE_PURCHASE_SALE_AGREEMENT',
  bill_of_sale: 'SIGNNOW_TEMPLATE_BILL_OF_SALE',
  sale_handoff_condition_acknowledgment: 'SIGNNOW_TEMPLATE_SALE_HANDOFF',
  rental_checkin_condition_report: 'SIGNNOW_TEMPLATE_RENTAL_CHECKIN',
  rental_checkout_condition_report: 'SIGNNOW_TEMPLATE_RENTAL_CHECKOUT',
  transaction_amendment: 'SIGNNOW_TEMPLATE_AMENDMENT',
  delivery_handoff_acknowledgment: 'SIGNNOW_TEMPLATE_DELIVERY_HANDOFF',
};

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

async function editDocumentFields(token: string, documentId: string, name: string, fields: SignNowFieldDef[]): Promise<void> {
  const body = {
    document_name: name,
    fields: fields.map((f) => ({
      type: f.type,
      required: f.required,
      role: f.role,
      page_number: f.page,
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

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/** Current content version for a kind (and asset variant where one applies). */
export function currentTemplateVersion(kind: TemplateKind, variant: AssetVariant = 'general'): string {
  return variantVersion(kind, variant) ?? SPEC_VERSIONS[kind] ?? '1';
}

async function createTemplateForKind(kind: TemplateKind, variant: AssetVariant): Promise<{ templateId: string; roles: string[] }> {
  const spec = getTemplateSpec(kind);
  const token = await getAccessToken();
  const built = spec.build(variant);
  const version = currentTemplateVersion(kind, variant);
  const name = `${spec.documentName} (v${version})`;
  const docId = await uploadRawDocument(token, name, built.pdf);
  await editDocumentFields(token, docId, name, built.fields);
  const templateId = await createTemplate(token, docId, name);
  const roles = await verifyTemplateRoles(token, templateId, spec.roles);
  await ensureBucket(admin() as any);
  return { templateId, roles };
}

export interface ResolvedTemplate {
  templateId: string;
  version: string;
  kind: TemplateKind;
  variant: AssetVariant;
}

/**
 * Returns the SignNow template for a kind at its current content version,
 * provisioning it once if needed. Concurrent callers converge on one row.
 * Older versions are retired, never deleted or overwritten.
 */
export async function resolveTemplate(kind: TemplateKind, variant: AssetVariant = 'general'): Promise<ResolvedTemplate> {
  const v: AssetVariant = supportsVariants(kind) ? variant : 'general';
  const version = currentTemplateVersion(kind, v);
  const envName = ENV_NAME[kind];
  const fromEnv = envName ? Deno.env.get(envName) : undefined;
  if (fromEnv) return { templateId: fromEnv, version, kind, variant: v };

  const svc = admin();
  const { data: existing } = await svc
    .from('signnow_templates')
    .select('signnow_template_id')
    .eq('kind', kind)
    .eq('version', version)
    .maybeSingle();
  if (existing?.signnow_template_id) return { templateId: existing.signnow_template_id, version, kind, variant: v };

  const { templateId, roles } = await createTemplateForKind(kind, v);

  // Retire any other active version of this kind/variant before activating the
  // new one — existing documents keep their own stored template id. Variant
  // rows are retired only against their own variant suffix.
  const suffix = supportsVariants(kind) && v !== 'general' ? `-${v}` : '';
  const { data: activeRows } = await svc
    .from('signnow_templates').select('version').eq('kind', kind).eq('status', 'active');
  for (const row of activeRows ?? []) {
    const rv = String((row as any).version ?? '');
    const rowSuffix = rv.endsWith('-mobile') ? '-mobile' : rv.endsWith('-space') ? '-space' : '';
    if (rowSuffix !== suffix || rv === version) continue;
    await svc.from('signnow_templates').update({ status: 'retired' }).eq('kind', kind).eq('version', rv);
  }

  const { error } = await svc
    .from('signnow_templates')
    .insert({ kind, version, signnow_template_id: templateId, roles, status: 'active' });
  if (error) {
    const { data: raced } = await svc
      .from('signnow_templates')
      .select('signnow_template_id')
      .eq('kind', kind)
      .eq('version', version)
      .maybeSingle();
    if (raced?.signnow_template_id) return { templateId: raced.signnow_template_id, version, kind, variant: v };
    throw new Error(`could not persist template id: ${error.message}`);
  }
  return { templateId, version, kind, variant: v };
}

/** Backwards-compatible helper used by older call sites. */
export async function ensureTemplateId(kind: TemplateKind): Promise<string> {
  const resolved = await resolveTemplate(kind);
  return resolved.templateId;
}

/** Provision every missing template version. Returns ids only — never secrets. */
export async function provisionAllTemplates(): Promise<Record<string, { template_id: string; version: string }>> {
  const out: Record<string, { template_id: string; version: string }> = {};
  for (const kind of Object.keys(TEMPLATE_SPECS) as TemplateKind[]) {
    const variants: AssetVariant[] = supportsVariants(kind) ? ['general', 'mobile', 'space'] : ['general'];
    for (const variant of variants) {
      const resolved = await resolveTemplate(kind, variant);
      out[variant === 'general' ? kind : `${kind}:${variant}`] = { template_id: resolved.templateId, version: resolved.version };
    }
  }
  return out;
}

export async function ensureSignedDocumentsBucket(): Promise<void> {
  await ensureBucket(admin() as any);
}
