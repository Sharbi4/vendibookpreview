// deno-lint-ignore-file no-explicit-any
/**
 * Vendibook transaction-document generation.
 *
 * Every document in the package is created through `createPackageDocument`,
 * which copies the versioned SignNow master template, prefills it from FROZEN
 * transaction data, creates embedded invites for the two signers, registers
 * the document webhook and writes an immutable `public.documents` row.
 *
 * Rules enforced here:
 *  - a document is only generated at the lifecycle stage it belongs to;
 *  - an existing live document of the same kind is returned, never replaced;
 *  - a completed document is never regenerated or mutated;
 *  - blank data stays blank — nothing is invented to fill a field;
 *  - signing never moves money. Payouts remain a manual administrator action.
 *
 * INTERNAL LEGAL NOTE: the template text in signnowTemplateSpecs.ts is an
 * operational draft and is not attorney-approved. Qualified legal counsel must
 * review all templates before Vendibook relies on them in production.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import {
  createDocumentFromTemplate,
  createEmbeddedInvite,
  inviteIdForEmail,
  prefillFields,
  isSignNowConfigured,
  registerDocumentWebhook,
} from './signnow.ts';
import { resolveTemplate, currentTemplateVersion } from './signnowTemplates.ts';
import type { TemplateKind } from './signnowTemplateSpecs.ts';
import { invokeTransactionalEmail } from './invokeTransactionalEmail.ts';
import {
  buildRequirementsSnapshot,
  describeRequirements,
  describeInsuranceSection,
  REQUIREMENTS_SNAPSHOT_VERSION,
} from './rentalRequirements.ts';

const SITE_URL = 'https://vendibook.com';

/** A sale document may only be generated once payment is authorized/captured. */
const SALE_ELIGIBLE_STATUSES = new Set(['paid', 'buyer_confirmed', 'seller_confirmed', 'completed']);
/** A rental agreement may only be generated once the booking is binding. */
const BOOKING_BINDING_STATUSES = new Set(['approved', 'completed']);

export interface SignerRecord {
  role: 'host' | 'renter' | 'seller' | 'buyer' | 'party_a' | 'party_b' | 'provider' | 'recipient';
  user_id: string | null;
  email: string;
  first_name?: string;
  last_name?: string;
  invite_id?: string;
  signed_at?: string | null;
}

export type EnsureResult = { document_id: string; created: boolean } | { skipped: string };

function svc() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

function partyName(p: { first_name?: string | null; last_name?: string | null; full_name?: string | null; display_name?: string | null; email: string }): string {
  const fn = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return fn || p.full_name?.trim() || p.display_name?.trim() || p.email;
}

async function loadProfile(user_id: string | null): Promise<any | null> {
  if (!user_id) return null;
  const { data } = await svc()
    .from('profiles')
    .select('id,email,full_name,display_name,first_name,last_name')
    .eq('id', user_id)
    .maybeSingle();
  return data;
}

export const money = (v: unknown): string => (v == null || v === '' ? '' : `$${Number(v).toFixed(2)}`);
export const centsToMoney = (v: unknown): string => (v == null ? '' : `$${(Number(v) / 100).toFixed(2)}`);
export const str = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');

/** Join non-empty lines; returns '' rather than inventing placeholder text. */
export function lines(...parts: (string | null | undefined | false)[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join('\n');
}

/** Only quotes dimensions that are actually recorded. */
export function describeDimensions(listing: any, specs: any): string {
  const parts: string[] = [];
  if (listing?.length_inches) parts.push(`${(Number(listing.length_inches) / 12).toFixed(1)} ft long`);
  if (listing?.width_inches) parts.push(`${(Number(listing.width_inches) / 12).toFixed(1)} ft wide`);
  if (!parts.length && typeof specs?.dimensions === 'string') return specs.dimensions;
  return parts.join(', ');
}

/** Flattens recorded inclusions/equipment into readable text, or returns ''. */
export function describeInclusions(specs: any): string {
  const out: string[] = [];
  for (const source of [specs?.inclusions, specs?.equipment_inventory]) {
    if (!source) continue;
    if (typeof source === 'string') { out.push(source); continue; }
    if (Array.isArray(source)) {
      out.push(...source.filter((v) => typeof v === 'string'));
      continue;
    }
    if (typeof source === 'object') {
      for (const [k, v] of Object.entries(source)) {
        if (v === true) out.push(k.replace(/_/g, ' '));
        else if (typeof v === 'string' && v.trim()) out.push(`${k.replace(/_/g, ' ')}: ${v}`);
      }
    }
  }
  return out.join(', ');
}

/**
 * Subscribe to document.complete / document.update for this document so the
 * signnow-webhook function can advance status + store the signed PDF.
 */
async function safeRegisterWebhook(signnowDocId: string): Promise<void> {
  try {
    await registerDocumentWebhook(signnowDocId);
  } catch (e) {
    console.error('[signnow] webhook registration failed', signnowDocId, (e as Error).message);
  }
}

interface PackageSigner {
  /** Vendibook-side role stored on the document row. */
  role: SignerRecord['role'];
  /** SignNow template role name — must match the template exactly. */
  signnowRole: string;
  order: number;
  user_id: string | null;
  profile: any;
}

interface CreateDocumentInput {
  kind: TemplateKind;
  documentName: string;
  parent: { transaction_id: string } | { booking_id: string };
  listingId?: string | null;
  termsId?: string | null;
  signers: PackageSigner[];
  prefill: Record<string, string | number | null | undefined>;
  /** Frozen data this document was generated from. */
  snapshot: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  supersedesDocumentId?: string | null;
  /** Amendments intentionally allow more than one live row. */
  allowMultiple?: boolean;
}

async function findLiveDocument(
  supabase: any,
  parent: CreateDocumentInput['parent'],
  kind: string,
): Promise<{ id: string; status: string } | null> {
  const q = supabase
    .from('documents')
    .select('id,status')
    .eq('document_type', kind)
    .neq('status', 'voided')
    .is('superseded_by_document_id', null)
    .order('created_at', { ascending: false })
    .limit(1);
  const { data } = 'transaction_id' in parent
    ? await q.eq('transaction_id', parent.transaction_id)
    : await q.eq('booking_id', parent.booking_id);
  return (data && data[0]) ?? null;
}

/**
 * Core generator. Idempotent per (parent, kind) unless `allowMultiple`.
 * A completed document is always returned untouched.
 */
export async function createPackageDocument(input: CreateDocumentInput): Promise<EnsureResult> {
  if (!isSignNowConfigured()) return { skipped: 'signnow_not_configured' };

  const supabase = svc();
  if (!input.allowMultiple) {
    const existing = await findLiveDocument(supabase, input.parent, input.kind);
    if (existing) return { document_id: existing.id, created: false };
  }

  let template;
  try {
    template = await resolveTemplate(input.kind);
  } catch (e) {
    console.error('[signnow] template unavailable', input.kind, (e as Error).message);
    return { skipped: 'template_not_configured' };
  }

  for (const s of input.signers) {
    if (!s.profile?.email) return { skipped: 'missing_party_email' };
  }

  const signnowDocId = await createDocumentFromTemplate(template.templateId, input.documentName);
  await prefillFields(signnowDocId, {
    ...input.prefill,
    agreement_version: template.version,
    generated_at: new Date().toISOString(),
  });

  const invites = await createEmbeddedInvite(
    signnowDocId,
    input.signers.map((s) => ({
      email: s.profile.email,
      role_name: s.signnowRole,
      order: s.order,
      first_name: s.profile.first_name ?? undefined,
      last_name: s.profile.last_name ?? undefined,
    })),
  );
  await safeRegisterWebhook(signnowDocId);

  const signerRecords: SignerRecord[] = input.signers.map((s) => ({
    role: s.role,
    user_id: s.user_id,
    email: s.profile.email,
    first_name: s.profile.first_name ?? undefined,
    last_name: s.profile.last_name ?? undefined,
    invite_id: inviteIdForEmail(invites, s.profile.email),
    signed_at: null,
  }));

  const now = new Date().toISOString();
  const { data: row, error: insErr } = await supabase
    .from('documents')
    .insert({
      ...input.parent,
      listing_id: input.listingId ?? null,
      document_type: input.kind,
      signnow_document_id: signnowDocId,
      signnow_template_id: template.templateId,
      template_version: template.version,
      agreement_version: template.version,
      status: 'sent',
      sent_at: now,
      signers: signerRecords,
      snapshot: input.snapshot,
      terms_id: input.termsId ?? null,
      supersedes_document_id: input.supersedesDocumentId ?? null,
      metadata: { ...(input.metadata ?? {}), snapshot_taken_at: now },
    })
    .select('id')
    .single();

  if (insErr) {
    const raced = await findLiveDocument(supabase, input.parent, input.kind);
    if (raced) return { document_id: raced.id, created: false };
    throw new Error(`documents insert failed: ${insErr.message}`);
  }

  if (input.supersedesDocumentId) {
    await supabase
      .from('documents')
      .update({ superseded_by_document_id: row.id })
      .eq('id', input.supersedesDocumentId);
  }

  return { document_id: row.id, created: true };
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

/**
 * Embedded invites do not send SignNow's own email, so Vendibook tells both
 * parties itself. Never throws — a mail failure must not lose the document.
 * Copy is deliberately neutral: signing does not move money.
 */
export async function sendSignatureRequestEmails(
  link: string,
  documentId: string,
  documentLabel: string,
  parties: { role: string; email: string; name: string }[],
  subjectAsset: string,
): Promise<void> {
  for (const p of parties) {
    try {
      await invokeTransactionalEmail({
        templateName: 'generic-notice',
        recipientEmail: p.email,
        idempotencyKey: `signnow-request-${documentId}-${p.role}`,
        templateData: {
          preview: 'Your transaction document is ready to review and sign.',
          kicker: documentLabel,
          heading: 'Your transaction document is ready to review and sign.',
          paragraphs: [
            `The ${documentLabel.toLowerCase()} for ${subjectAsset} was prepared from your Vendibook transaction details and is waiting for your signature.`,
            'Both parties sign inside Vendibook. When everyone has signed, a completed copy is saved with your transaction.',
            'Keep messages, offers and payments on Vendibook so everything stays on the record.',
          ],
          ctaLabel: 'Review and sign',
          ctaUrl: link,
        },
        metadata: { category: 'transaction_document' },
      });
    } catch (e) {
      console.error('[signnow] signature request email failed', p.role, (e as Error).message);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Sale: Purchase & Sale Agreement                                     */
/* ------------------------------------------------------------------ */

async function loadSaleContext(transactionId: string) {
  const supabase = svc();
  const { data: tx, error } = await supabase
    .from('sale_transactions')
    .select(
      'id,listing_id,buyer_id,seller_id,amount,status,terms_id,fulfillment_type,delivery_address,delivery_instructions,' +
        'delivery_fee,freight_cost,tax_amount,tax_jurisdiction,carrier,tracking_number,created_at',
    )
    .eq('id', transactionId)
    .maybeSingle();
  if (error || !tx) throw new Error(`transaction not found: ${error?.message ?? transactionId}`);

  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id,title,category,address,city,state,postal_code,make,model,year_built,mileage,condition,title_status,has_lien,' +
        'length_inches,width_inches,description',
    )
    .eq('id', tx.listing_id)
    .maybeSingle();

  // Ownership facts live in their own table and are only ever quoted, never invented.
  const { data: ownership } = await supabase
    .from('listing_ownership_details')
    .select('title_status,vin_serial,title_number,title_state,active_lien,lien_holder_name,lien_release_available,ownership_notes,documents_available')
    .eq('listing_id', tx.listing_id)
    .maybeSingle();

  const { data: specs } = await supabase
    .from('listing_specs')
    .select('inclusions,equipment_inventory,dimensions')
    .eq('listing_id', tx.listing_id)
    .maybeSingle();

  const { data: terms } = await supabase
    .from('transaction_terms')
    .select('id,terms_version,snapshot,total_cents,subtotal_cents')
    .eq('sale_transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: payment } = await supabase
    .from('payment_records')
    .select('reference,payment_provider,amount')
    .eq('sale_transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const seller = await loadProfile(tx.seller_id);
  const buyer = await loadProfile(tx.buyer_id);
  return { tx, listing, ownership, specs, terms, payment, seller, buyer };
}

function fulfillmentLabel(type: string | null | undefined): string {
  switch (type) {
    case 'pickup': return 'Local pickup';
    case 'delivery': return 'Seller delivery';
    case 'vendibook_freight':
    case 'freight': return 'Freight shipping';
    case 'on_site': return 'On-site access';
    default: return str(type);
  }
}

/**
 * Idempotently create the Purchase & Sale Agreement for a paid sale
 * transaction. Replaces the thin bill of sale for new transactions; historical
 * `bill_of_sale` rows keep working untouched.
 */
export async function ensurePurchaseSaleAgreement(transactionId: string): Promise<EnsureResult> {
  const supabase = svc();

  // Backward compatibility: a historical bill_of_sale already covers this sale.
  const legacy = await findLiveDocument(supabase, { transaction_id: transactionId }, 'bill_of_sale');
  if (legacy) return { document_id: legacy.id, created: false };

  const { tx, listing, ownership, specs, terms, payment, seller, buyer } = await loadSaleContext(transactionId);
  if (!SALE_ELIGIBLE_STATUSES.has(String(tx.status))) return { skipped: 'not_payment_authorized' };
  if (!seller?.email || !buyer?.email) return { skipped: 'missing_party_email' };

  const snap = (terms?.snapshot ?? {}) as Record<string, any>;
  const price = snap.asset_price ?? snap.price ?? tx.amount;
  const reference = str(payment?.reference) || transactionId.slice(0, 8).toUpperCase();
  const effectiveDate = new Date().toISOString().slice(0, 10);
  const area = [listing?.city, listing?.state].filter(Boolean).join(', ');

  const prefill = {
    transaction_reference: reference,
    listing_title: str(listing?.title),
    asset_category: str(listing?.category),
    asset_year: listing?.year_built != null ? String(listing.year_built) : '',
    asset_make: str(listing?.make),
    asset_model: str(listing?.model),
    asset_identifier: str(ownership?.vin_serial),
    asset_mileage: listing?.mileage != null ? String(listing.mileage) : '',
    seller_name: partyName(seller),
    buyer_name: partyName(buyer),
    seller_business_name: str(snap.seller_business_name),
    buyer_business_name: str(snap.buyer_business_name),
    listing_city_state: area,
    fulfillment_method: fulfillmentLabel(tx.fulfillment_type),
    asset_price: money(price),
    selected_addons: str(snap.selected_addons),
    delivery_or_freight_amount: money(tx.delivery_fee ?? tx.freight_cost),
    tax_amount: money(tx.tax_amount),
    other_charges: str(snap.other_charges),
    transaction_total: money(tx.amount),

    // Signature block printed names come from the same frozen party records.
    buyer_printed_name: partyName(buyer),
    seller_printed_name: partyName(seller),

    payment_and_financing_notes: lines(
      `Agreed asset price: ${money(price)}`,
      snap.accepted_offer_cents ? `Accepted offer applied: ${centsToMoney(snap.accepted_offer_cents)}` : '',
      tx.delivery_fee ? `Seller delivery charge: ${money(tx.delivery_fee)}` : '',
      tx.freight_cost ? `Freight charge: ${money(tx.freight_cost)}` : '',
      tx.tax_amount ? `Tax${tx.tax_jurisdiction ? ` (${tx.tax_jurisdiction})` : ''}: ${money(tx.tax_amount)}` : '',
      `Total transaction amount: ${money(tx.amount)}`,
      payment?.payment_provider ? `Payment processed through: ${String(payment.payment_provider).toUpperCase()}` : '',
      str(snap.financing_provider) && `Financing provider selected by Buyer: ${snap.financing_provider}`,
    ),

    seller_disclosures: lines(
      str(listing?.condition) && `Listed condition: ${listing?.condition}`,
      (str(ownership?.title_status) || str(listing?.title_status)) && `Title status: ${str(ownership?.title_status) || str(listing?.title_status)}`,
      ownership?.active_lien == null && listing?.has_lien == null
        ? ''
        : (ownership?.active_lien ?? listing?.has_lien)
          ? lines('Seller has disclosed an existing lien on the asset.', str(ownership?.lien_holder_name) && `Lien holder: ${ownership?.lien_holder_name}`)
          : 'Seller has disclosed no existing lien on the asset.',
      str(ownership?.ownership_notes),
      str(snap.seller_disclosures),
    ),
    condition_clause: lines(
      str(snap.written_warranty) && `Written warranty offered by Seller: ${snap.written_warranty}`,
      snap.as_is === true
        ? 'Seller selected an as-is sale. To the extent permitted by applicable law, the asset is sold as-is, where-is, with no warranty other than any written warranty stated in this document. Rights that cannot be waived under applicable law are not waived.'
        : '',
      'Condition is based on the listing snapshot, written disclosures in the transaction record, and the handoff record created by the parties.',
    ),
    title_status: lines(
      str(ownership?.title_status) || str(listing?.title_status),
      str(ownership?.title_state) && `Title state: ${ownership?.title_state}`,
      ownership?.lien_release_available == null ? '' : ownership.lien_release_available ? 'Seller reports a lien release is available.' : '',
    ),
    included_equipment: describeInclusions(specs),
    excluded_property: str(snap.excluded_property),
    cancellation_terms: str(snap.cancellation_policy),
    fulfillment_details: lines(
      `Fulfillment selected: ${fulfillmentLabel(tx.fulfillment_type)}`,
      tx.fulfillment_type === 'pickup' ? `Pickup area: ${area}. The parties coordinate the exact handoff location and time through Vendibook messages.` : '',
      tx.delivery_address ? `Delivery address: ${tx.delivery_address}` : '',
      str(tx.delivery_instructions) && `Delivery instructions: ${tx.delivery_instructions}`,
      tx.carrier ? `Freight carrier recorded: ${tx.carrier}` : '',
      tx.tracking_number ? `Tracking reference: ${tx.tracking_number}` : '',
    ),
    transaction_id: transactionId,
    terms_version: str(terms?.terms_version),
  };

  const result = await createPackageDocument({
    kind: 'purchase_sale_agreement',
    documentName: `Purchase & Sale Agreement — ${listing?.title ?? 'Listing'} — ${effectiveDate}`,
    parent: { transaction_id: transactionId },
    listingId: tx.listing_id,
    termsId: tx.terms_id ?? terms?.id ?? null,
    signers: [
      { role: 'buyer', signnowRole: 'Buyer', order: 1, user_id: tx.buyer_id, profile: buyer },
      { role: 'seller', signnowRole: 'Seller', order: 2, user_id: tx.seller_id, profile: seller },
    ],
    prefill,
    snapshot: { source: 'sale_transaction', transaction_id: transactionId, reference, prefill },
    metadata: { fulfillment_type: tx.fulfillment_type ?? null, terms_version: terms?.terms_version ?? null },
  });

  if ('document_id' in result && result.created) {
    await sendSignatureRequestEmails(
      `${SITE_URL}/orders/${transactionId}`,
      result.document_id,
      'Purchase & Sale Agreement',
      [
        { role: 'buyer', email: buyer.email, name: partyName(buyer) },
        { role: 'seller', email: seller.email, name: partyName(seller) },
      ],
      listing?.title ?? 'your purchase',
    );
  }
  return result;
}

/** Legacy entry point. New sales generate a Purchase & Sale Agreement. */
export async function ensureBillOfSale(transactionId: string): Promise<EnsureResult> {
  return await ensurePurchaseSaleAgreement(transactionId);
}

/** Sale handoff acknowledgment — only at the handoff stage, never at checkout. */
export async function ensureSaleHandoffAcknowledgment(transactionId: string): Promise<EnsureResult> {
  const { tx, listing, ownership, specs, seller, buyer } = await loadSaleContext(transactionId);
  if (!SALE_ELIGIBLE_STATUSES.has(String(tx.status))) return { skipped: 'not_payment_authorized' };
  if (!seller?.email || !buyer?.email) return { skipped: 'missing_party_email' };

  const isDelivery = tx.fulfillment_type === 'delivery';
  const kind: TemplateKind = isDelivery ? 'delivery_handoff_acknowledgment' : 'sale_handoff_condition_acknowledgment';
  const area = [listing?.city, listing?.state].filter(Boolean).join(', ');

  const common = {
    listing_title: str(listing?.title),
    odometer_or_hours_at_handoff_if_applicable: listing?.mileage != null ? String(listing.mileage) : '',
  };

  return await createPackageDocument({
    kind,
    documentName: `${isDelivery ? 'Delivery Handoff Acknowledgment' : 'Sale Handoff & Condition Acknowledgment'} — ${listing?.title ?? 'Listing'}`,
    parent: { transaction_id: transactionId },
    listingId: tx.listing_id,
    termsId: tx.terms_id ?? null,
    signers: isDelivery
      ? [
          { role: 'recipient', signnowRole: 'Recipient', order: 1, user_id: tx.buyer_id, profile: buyer },
          { role: 'provider', signnowRole: 'Provider', order: 2, user_id: tx.seller_id, profile: seller },
        ]
      : [
          { role: 'buyer', signnowRole: 'Buyer', order: 1, user_id: tx.buyer_id, profile: buyer },
          { role: 'seller', signnowRole: 'Seller', order: 2, user_id: tx.seller_id, profile: seller },
        ],
    prefill: isDelivery
      ? {
          order_or_booking_reference: transactionId,
          listing_title: common.listing_title,
          delivering_party: partyName(seller),
          receiving_party: partyName(buyer),
          delivery_address_or_area: str(tx.delivery_address) || area,
        }
      : {
          transaction_reference: transactionId,
          listing_title: common.listing_title,
          asset_title_description: common.listing_title,
          asset_year_make_model: [listing?.year_built, listing?.make, listing?.model].filter(Boolean).join(' '),
          asset_identifier: str(ownership?.vin_serial),
          asset_identifier_confirm: str(ownership?.vin_serial),
          handoff_mileage: common.odometer_or_hours_at_handoff_if_applicable,
          buyer_name: partyName(buyer),
          seller_name: partyName(seller),
          buyer_printed_name: partyName(buyer),
          seller_printed_name: partyName(seller),
          fulfillment_method: fulfillmentLabel(tx.fulfillment_type),
          handoff_location: area,
          included_equipment_checklist: describeInclusions(specs),
        },
    snapshot: { source: 'sale_handoff', transaction_id: transactionId, fulfillment_type: tx.fulfillment_type ?? null },
  });
}

/* ------------------------------------------------------------------ */
/* Rental: agreement + condition reports                               */
/* ------------------------------------------------------------------ */

async function loadBookingContext(bookingId: string) {
  const supabase = svc();
  const { data: booking, error } = await supabase
    .from('booking_requests')
    .select(
      'id,host_id,shopper_id,listing_id,status,start_date,end_date,start_time,end_time,total_price,deposit_amount,' +
        'is_instant_book,is_hourly_booking,duration_hours,fulfillment_selected,delivery_address,delivery_instructions,' +
        'delivery_fee_snapshot,tax_amount,slot_name',
    )
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !booking) throw new Error(`booking not found: ${error?.message ?? bookingId}`);

  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id,title,category,mode,address,city,state,postal_code,fulfillment_type,pickup_instructions,delivery_instructions,' +
        'pickup_location_text,access_instructions,fuel_type,make,model,year_built,description',
    )
    .eq('id', booking.listing_id)
    .maybeSingle();

  const { data: rentalTerms } = await supabase
    .from('listing_rental_terms').select('terms').eq('listing_id', booking.listing_id).maybeSingle();
  const { data: requirementRows } = await supabase
    .from('listing_required_documents')
    .select('id,document_type,is_required,deadline_type,deadline_offset_hours,description,title,instructions,requirement_config')
    .eq('listing_id', booking.listing_id);
  const { data: terms } = await supabase
    .from('transaction_terms')
    .select('id,terms_version,subtotal_cents,total_cents,deposit_cents,renter_fee_cents')
    .eq('booking_id', bookingId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const host = await loadProfile(booking.host_id);
  const renter = await loadProfile(booking.shopper_id);
  return { booking, listing, rentalTerms, requirementRows, terms, host, renter };
}

const MOBILE_CATEGORIES = new Set(['food_truck', 'food_trailer']);

/** Idempotently create the Rental Agreement for a binding booking. */
export async function ensureRentalAgreement(bookingId: string): Promise<EnsureResult> {
  const { booking, listing, rentalTerms, requirementRows, terms, host, renter } = await loadBookingContext(bookingId);
  if (!host?.email || !renter?.email) return { skipped: 'missing_party_email' };
  // Instant-book bookings are binding on payment; requested bookings only once
  // the host has accepted. Anything else is not yet an agreement.
  if (!BOOKING_BINDING_STATUSES.has(String(booking.status))) return { skipped: 'booking_not_binding' };

  const requirementsSnapshot = buildRequirementsSnapshot((requirementRows ?? []) as any);
  const t = (rentalTerms?.terms ?? {}) as Record<string, any>;
  const isMobile = MOBILE_CATEGORIES.has(String(listing?.category));
  const fulfillment = str(booking.fulfillment_selected) || str(listing?.fulfillment_type);
  const durationLabel = booking.is_hourly_booking
    ? (booking.duration_hours != null ? `${booking.duration_hours} hours` : '')
    : (booking.start_date && booking.end_date ? `${booking.start_date} to ${booking.end_date}` : '');

  const prefill = {
    booking_reference: bookingId,
    host_name: partyName(host),
    renter_name: partyName(renter),
    listing_title: str(listing?.title),
    listing_type: str(listing?.category),
    rental_start: [booking.start_date, booking.start_time].filter(Boolean).join(' '),
    rental_end: [booking.end_date, booking.end_time].filter(Boolean).join(' '),
    duration: durationLabel,
    rate: centsToMoney(terms?.subtotal_cents) || money(booking.total_price),
    service_fees: centsToMoney(terms?.renter_fee_cents),
    delivery_fee: money(booking.delivery_fee_snapshot),
    security_deposit: money(booking.deposit_amount),
    total: money(booking.total_price),
    fulfillment_or_access_mode: fulfillmentLabel(fulfillment),

    asset_details: lines(
      [listing?.year_built, listing?.make, listing?.model].filter(Boolean).join(' '),
      str(listing?.category) && `Listing type: ${listing?.category}`,
      booking.slot_name ? `Reserved space or slot: ${booking.slot_name}` : '',
    ),
    asset_location: [listing?.address, listing?.city, listing?.state, listing?.postal_code].filter(Boolean).join(', '),
    booking_terms: lines(
      `Rental period: ${[booking.start_date, booking.start_time].filter(Boolean).join(' ')} to ${[booking.end_date, booking.end_time].filter(Boolean).join(' ')}`,
      booking.is_hourly_booking ? 'Booking cadence: hourly' : 'Booking cadence: daily or multi-day',
      terms?.subtotal_cents != null ? `Rental subtotal: ${centsToMoney(terms.subtotal_cents)}` : '',
      terms?.renter_fee_cents != null ? `Vendibook service fee: ${centsToMoney(terms.renter_fee_cents)}` : '',
      booking.delivery_fee_snapshot ? `Delivery fee: ${money(booking.delivery_fee_snapshot)}` : '',
      booking.deposit_amount ? `Security deposit: ${money(booking.deposit_amount)}` : '',
      booking.tax_amount ? `Tax: ${money(booking.tax_amount)}` : '',
      `Total: ${money(booking.total_price)}`,
      booking.is_instant_book ? 'Booked with Instant Book' : 'Booked by host-approved request',
    ),
    host_rules: lines(str(t.house_rules), str(t.rules), str(t.condition_and_use)),
    cancellation_policy: str(t.cancellation_policy),
    permit_allocation: str(t.licenses_policy),
    insurance_terms: lines(describeInsuranceSection(requirementsSnapshot), describeRequirements(requirementsSnapshot)),
    vehicle_terms: isMobile
      ? lines(
          str(t.mileage_policy),
          str(t.fuel_policy) || (listing?.fuel_type ? `Fuel type: ${listing.fuel_type}.` : ''),
          str(t.propane_policy),
          str(t.towing_policy),
        )
      : '',
    space_terms: !isMobile
      ? lines(str((listing as any)?.access_instructions), str(t.cleaning_policy), str(t.access_hours))
      : '',
    fulfillment_details: lines(
      `Fulfillment or access: ${fulfillmentLabel(fulfillment)}`,
      str(listing?.pickup_location_text) || str(listing?.pickup_instructions),
      booking.delivery_address ? `Delivery address: ${booking.delivery_address}` : '',
      str(booking.delivery_instructions) || str(listing?.delivery_instructions),
    ),
    return_terms: lines(
      `Return by: ${[booking.end_date, booking.end_time].filter(Boolean).join(' ')}`,
      str(t.late_return_policy),
      str(t.cleaning_policy),
    ),
    booking_id: bookingId,
    terms_version: str(terms?.terms_version),
  };

  const result = await createPackageDocument({
    kind: 'rental_agreement',
    documentName: `Rental Agreement — ${listing?.title ?? 'Listing'} — ${booking.start_date}`,
    parent: { booking_id: bookingId },
    listingId: booking.listing_id,
    termsId: terms?.id ?? null,
    signers: [
      { role: 'renter', signnowRole: 'Renter', order: 1, user_id: booking.shopper_id, profile: renter },
      { role: 'host', signnowRole: 'Host', order: 2, user_id: booking.host_id, profile: host },
    ],
    prefill,
    snapshot: { source: 'booking_request', booking_id: bookingId, prefill },
    metadata: {
      requirements_version: REQUIREMENTS_SNAPSHOT_VERSION,
      is_instant_book: !!booking.is_instant_book,
      fulfillment: fulfillment || null,
    },
  });

  if ('document_id' in result && result.created) {
    await sendSignatureRequestEmails(
      `${SITE_URL}/bookings/${bookingId}`,
      result.document_id,
      'Rental Agreement',
      [
        { role: 'renter', email: renter.email, name: partyName(renter) },
        { role: 'host', email: host.email, name: partyName(host) },
      ],
      listing?.title ?? 'your rental',
    );
  }
  return result;
}

/** Condition report at check-in or check-out. Created at that stage only. */
export async function ensureRentalConditionReport(
  bookingId: string,
  stage: 'checkin' | 'checkout',
): Promise<EnsureResult> {
  const { booking, listing, host, renter } = await loadBookingContext(bookingId);
  if (!host?.email || !renter?.email) return { skipped: 'missing_party_email' };
  if (!BOOKING_BINDING_STATUSES.has(String(booking.status))) return { skipped: 'booking_not_binding' };

  const kind: TemplateKind = stage === 'checkin' ? 'rental_checkin_condition_report' : 'rental_checkout_condition_report';
  const fulfillment = str(booking.fulfillment_selected) || str(listing?.fulfillment_type);
  const when = stage === 'checkin'
    ? [booking.start_date, booking.start_time].filter(Boolean).join(' ')
    : [booking.end_date, booking.end_time].filter(Boolean).join(' ');

  return await createPackageDocument({
    kind,
    documentName: `${stage === 'checkin' ? 'Check-in' : 'Check-out'} Condition Report — ${listing?.title ?? 'Listing'} — ${when}`,
    parent: { booking_id: bookingId },
    listingId: booking.listing_id,
    signers: [
      { role: 'renter', signnowRole: 'Renter', order: 1, user_id: booking.shopper_id, profile: renter },
      { role: 'host', signnowRole: 'Host', order: 2, user_id: booking.host_id, profile: host },
    ],
    prefill: {
      booking_reference: bookingId,
      listing_title: str(listing?.title),
      renter_name: partyName(renter),
      host_name: partyName(host),
      [stage === 'checkin' ? 'check_in_date_and_time' : 'return_date_and_time']: when,
      [stage === 'checkin' ? 'location_or_access_mode' : 'return_location_or_access_mode']: lines(
        fulfillmentLabel(fulfillment),
        [listing?.city, listing?.state].filter(Boolean).join(', '),
      ),
    },
    snapshot: { source: 'booking_request', booking_id: bookingId, stage },
  });
}

/* ------------------------------------------------------------------ */
/* Amendment                                                            */
/* ------------------------------------------------------------------ */

export interface AmendmentInput {
  parent: { transaction_id: string } | { booking_id: string };
  originalDocumentId: string;
  originalTerm: string;
  replacementTerm: string;
  reason?: string;
  effectiveDate?: string;
}

/**
 * Create a two-party amendment. The original signed document is never altered:
 * the amendment is a new document that references it.
 */
export async function createTransactionAmendment(input: AmendmentInput): Promise<EnsureResult> {
  const supabase = svc();
  const { data: original } = await supabase
    .from('documents')
    .select('id,document_type,transaction_id,booking_id,agreement_version,created_at,listing_id')
    .eq('id', input.originalDocumentId)
    .maybeSingle();
  if (!original) return { skipped: 'original_document_not_found' };

  let partyA: any, partyB: any, aId: string | null, bId: string | null;
  if ('transaction_id' in input.parent) {
    const { tx, buyer, seller } = await loadSaleContext(input.parent.transaction_id);
    partyA = buyer; partyB = seller; aId = tx.buyer_id; bId = tx.seller_id;
  } else {
    const { booking, renter, host } = await loadBookingContext(input.parent.booking_id);
    partyA = renter; partyB = host; aId = booking.shopper_id; bId = booking.host_id;
  }
  if (!partyA?.email || !partyB?.email) return { skipped: 'missing_party_email' };

  return await createPackageDocument({
    kind: 'transaction_amendment',
    documentName: `Transaction Amendment — ${new Date().toISOString().slice(0, 10)}`,
    parent: input.parent,
    listingId: original.listing_id ?? null,
    allowMultiple: true,
    signers: [
      { role: 'party_a', signnowRole: 'Party A', order: 1, user_id: aId, profile: partyA },
      { role: 'party_b', signnowRole: 'Party B', order: 2, user_id: bId, profile: partyB },
    ],
    prefill: {
      order_or_booking_reference: 'transaction_id' in input.parent ? input.parent.transaction_id : input.parent.booking_id,
      original_agreement_reference: `${original.document_type} (${original.id})`,
      original_agreement_date: String(original.created_at).slice(0, 10),
      first_party: partyName(partyA),
      second_party: partyName(partyB),
      effective_date_of_this_amendment: input.effectiveDate ?? new Date().toISOString().slice(0, 10),
      original_term: input.originalTerm,
      replacement_term: input.replacementTerm,
      amendment_reason: input.reason ?? '',
    },
    snapshot: {
      source: 'amendment',
      amends_document_id: original.id,
      amends_document_type: original.document_type,
      original_term: input.originalTerm,
      replacement_term: input.replacementTerm,
    },
    metadata: { amends_document_id: original.id },
  });
}

export { currentTemplateVersion };
