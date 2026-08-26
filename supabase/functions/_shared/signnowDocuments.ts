// deno-lint-ignore-file no-explicit-any
/**
 * Higher-level helpers that create rental agreements and bills of sale from
 * SignNow templates, wire up embedded invites, and persist to public.documents.
 *
 * These are called by ensure-rental-agreement and ensure-bill-of-sale, which
 * are themselves triggered fire-and-forget from booking approval /
 * instant-book payment / sale payment paths.
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
import {
  buildRequirementsSnapshot,
  describeRequirements,
  describeInsuranceSection,
  REQUIREMENTS_SNAPSHOT_VERSION,
  RENTAL_AGREEMENT_VERSION,
  BILL_OF_SALE_VERSION,
} from './rentalRequirements.ts';

/**
 * Generic, non listing-specific clause text. Listing-specific facts are only
 * ever pulled from stored listing / booking / requirement data.
 */
const DEFAULT_CANCELLATION_POLICY =
  'Cancellations are handled through Vendibook. Platform service fees are non-refundable once a booking is confirmed. Any security deposit is returned after the rental ends if there is no damage or late return.';
const DEFAULT_CONDITION_CLAUSE =
  'Renter accepts the asset in its current condition at pickup and shall return it in the same condition, ordinary wear and tear excepted. Both parties should document condition with photos at pickup and return.';
const DEFAULT_DAMAGE_CLAUSE =
  'Renter is responsible for loss of or damage to the asset occurring during the rental period, excluding ordinary wear and tear.';
const DEFAULT_PERMITTED_USE =
  'The asset may be used only for the lawful purpose agreed between the parties. Renter may not sublease, assign, or transfer possession of the asset to any other party without the Host\u2019s written consent.';
const DEFAULT_INCIDENT_CLAUSE =
  'Renter shall notify the Host and Vendibook promptly of any accident, theft, mechanical failure, injury, or other incident involving the asset during the rental period.';
const DEFAULT_LICENSES_CLAUSE =
  'Renter is responsible for obtaining and maintaining any licenses, permits, or approvals required by law for Renter\u2019s use of the asset.';
const DEFAULT_LIABILITY_CLAUSE =
  'To the fullest extent permitted by law, Renter assumes responsibility for its use of the asset and shall indemnify and hold harmless the Host and Vendibook from claims, damages, and expenses arising out of Renter\u2019s use, except to the extent caused by the Host\u2019s own negligence or willful misconduct. Vendibook is a marketplace and is not a party to the rental itself.';
const DEFAULT_ESIGN_CONSENT =
  'The parties consent to sign this agreement electronically. An electronic signature has the same legal effect as a handwritten signature, and each party may request a copy of the completed document.';

/**
 * Bill of Sale may be generated once the buyer's payment is authorized or
 * captured — never for a pending/unauthorized or cancelled transaction.
 */
const BILL_OF_SALE_ELIGIBLE_STATUSES = new Set([
  'paid',
  'buyer_confirmed',
  'seller_confirmed',
  'completed',
]);



/**
 * Subscribe to document.complete / document.update for this document so the
 * signnow-webhook function can advance status + store the signed PDF.
 * Registration failures must not lose the document we just created.
 */
async function safeRegisterWebhook(signnowDocId: string): Promise<void> {
  try {
    await registerDocumentWebhook(signnowDocId);
  } catch (e) {
    console.error('[signnow] webhook registration failed', signnowDocId, (e as Error).message);
  }
}


export interface SignerRecord {
  role: 'host' | 'renter' | 'seller' | 'buyer';
  user_id: string | null;
  email: string;
  first_name?: string;
  last_name?: string;
  invite_id?: string;
  signed_at?: string | null;
}

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
  const { data } = await svc().from('profiles').select('id,email,full_name,display_name,first_name,last_name').eq('id', user_id).maybeSingle();
  return data;
}

/**
 * Idempotently create + send a Rental Agreement for a booking. Safe to call
 * many times: returns the existing document row if one already exists.
 */
export async function ensureRentalAgreement(bookingId: string): Promise<{ document_id: string; created: boolean } | { skipped: string }> {
  if (!isSignNowConfigured()) return { skipped: 'signnow_not_configured' };
  const templateId = Deno.env.get('SIGNNOW_TEMPLATE_RENTAL_AGREEMENT');
  if (!templateId) return { skipped: 'template_not_configured' };

  const supabase = svc();
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('document_type', 'rental_agreement')
    .maybeSingle();
  if (existing) return { document_id: existing.id, created: false };

  const { data: booking, error: bErr } = await supabase
    .from('booking_requests')
    .select(
      'id,host_id,shopper_id,listing_id,start_date,end_date,start_time,end_time,total_price,deposit_amount,' +
        'is_instant_book,is_hourly_booking,duration_hours,fulfillment_selected,delivery_address,delivery_instructions,' +
        'delivery_fee_snapshot,address_snapshot,tax_amount,host_platform_fee,slot_name',
    )
    .eq('id', bookingId)
    .maybeSingle();
  if (bErr || !booking) throw new Error(`booking not found: ${bErr?.message ?? bookingId}`);

  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id,title,category,mode,address,city,state,postal_code,fulfillment_type,pickup_instructions,' +
        'delivery_instructions,pickup_location_text,access_instructions,fuel_type,make,model,year_built,instant_book',
    )
    .eq('id', booking.listing_id)
    .maybeSingle();

  const { data: rentalTerms } = await supabase
    .from('listing_rental_terms')
    .select('terms')
    .eq('listing_id', booking.listing_id)
    .maybeSingle();

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
  if (!host?.email || !renter?.email) throw new Error('missing party email(s)');

  const requirementsSnapshot = buildRequirementsSnapshot((requirementRows ?? []) as any);
  const t = (rentalTerms?.terms ?? {}) as Record<string, any>;
  const money = (v: unknown) => (v == null ? '' : `$${Number(v).toFixed(2)}`);
  const cents = (v: unknown) => (v == null ? '' : `$${(Number(v) / 100).toFixed(2)}`);
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

  const docName = `Rental Agreement — ${listing?.title ?? 'Listing'} — ${booking.start_date}`;
  const signnowDocId = await createDocumentFromTemplate(templateId, docName);

  await prefillFields(signnowDocId, {
    // Parties
    host_name: partyName(host),
    host_email: host.email,
    renter_name: partyName(renter),
    renter_email: renter.email,
    // Asset identity + location
    listing_title: listing?.title ?? '',
    listing_category: listing?.category ?? '',
    listing_asset: [listing?.year_built, listing?.make, listing?.model].filter(Boolean).join(' '),
    listing_address: [listing?.address, listing?.city, listing?.state, listing?.postal_code].filter(Boolean).join(', '),
    // Booking window
    start_date: booking.start_date,
    end_date: booking.end_date,
    start_time: booking.start_time ?? '',
    end_time: booking.end_time ?? '',
    booking_cadence: booking.is_hourly_booking ? 'Hourly' : 'Daily / multi-day',
    duration_hours: booking.duration_hours != null ? String(booking.duration_hours) : '',
    slot_name: booking.slot_name ?? '',
    booking_type: booking.is_instant_book ? 'Instant Book' : 'Host-approved request',
    // Pricing (trusted booking / terms data only)
    subtotal: cents(terms?.subtotal_cents),
    renter_fee: cents(terms?.renter_fee_cents),
    tax_amount: money(booking.tax_amount),
    total_price: money(booking.total_price),
    deposit_amount: money(booking.deposit_amount),
    // Fulfillment
    fulfillment_method: booking.fulfillment_selected ?? listing?.fulfillment_type ?? '',
    pickup_details: str(listing?.pickup_location_text) || str(listing?.pickup_instructions),
    delivery_address: booking.delivery_address ?? '',
    delivery_instructions: booking.delivery_instructions ?? str(listing?.delivery_instructions),
    delivery_fee: money(booking.delivery_fee_snapshot),
    // Policies + responsibilities (host-authored only, never invented)
    cancellation_policy: str(t.cancellation_policy) || DEFAULT_CANCELLATION_POLICY,
    condition_and_use: str(t.condition_and_use) || DEFAULT_CONDITION_CLAUSE,
    cleaning_responsibility: str(t.cleaning_policy),
    fuel_policy: str(t.fuel_policy) || (listing?.fuel_type ? `Fuel type: ${listing.fuel_type}. Returned with the same fuel level as at pickup.` : ''),
    propane_policy: str(t.propane_policy),
    late_return_policy: str(t.late_return_policy),
    damage_policy: str(t.damage_policy) || DEFAULT_DAMAGE_CLAUSE,
    permitted_use: DEFAULT_PERMITTED_USE,
    incident_reporting: DEFAULT_INCIDENT_CLAUSE,
    licenses_and_permits: str(t.licenses_policy) || DEFAULT_LICENSES_CLAUSE,
    liability_and_indemnification: DEFAULT_LIABILITY_CLAUSE,
    // Configurable requirements
    insurance_requirements: describeInsuranceSection(requirementsSnapshot),
    required_documents: describeRequirements(requirementsSnapshot),
    // Consent + auditability
    electronic_signature_consent: DEFAULT_ESIGN_CONSENT,
    agreement_version: RENTAL_AGREEMENT_VERSION,
    requirements_version: REQUIREMENTS_SNAPSHOT_VERSION,
    terms_version: terms?.terms_version ?? '',
    booking_id: bookingId,
    terms_id: terms?.id ?? '',
    generated_at: new Date().toISOString(),
  });

  const signers = [
    { email: renter.email, role_name: 'Renter', order: 1, first_name: renter.first_name ?? undefined, last_name: renter.last_name ?? undefined },
    { email: host.email,   role_name: 'Host',   order: 2, first_name: host.first_name ?? undefined,   last_name: host.last_name ?? undefined },
  ];
  const invites = await createEmbeddedInvite(signnowDocId, signers);
  await safeRegisterWebhook(signnowDocId);

  const signerRecords: SignerRecord[] = [
    { role: 'renter', user_id: booking.shopper_id, email: renter.email, first_name: renter.first_name ?? undefined, last_name: renter.last_name ?? undefined, invite_id: inviteIdForEmail(invites, renter.email), signed_at: null },
    { role: 'host',   user_id: booking.host_id,    email: host.email,   first_name: host.first_name ?? undefined,   last_name: host.last_name ?? undefined,   invite_id: inviteIdForEmail(invites, host.email),   signed_at: null },
  ];


  const { data: row, error: insErr } = await supabase
    .from('documents')
    .insert({
      booking_id: bookingId,
      document_type: 'rental_agreement',
      signnow_document_id: signnowDocId,
      signnow_template_id: templateId,
      status: 'sent',
      signers: signerRecords,
      agreement_version: RENTAL_AGREEMENT_VERSION,
      requirements_snapshot: requirementsSnapshot,
      terms_id: terms?.id ?? null,
      metadata: {
        requirements_version: REQUIREMENTS_SNAPSHOT_VERSION,
        is_instant_book: !!booking.is_instant_book,
        snapshot_taken_at: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (insErr) {
    // Concurrent ensure call won the race — return the existing row.
    const { data: raced } = await supabase
      .from('documents')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('document_type', 'rental_agreement')
      .maybeSingle();
    if (raced) return { document_id: raced.id, created: false };
    throw new Error(`documents insert failed: ${insErr.message}`);
  }

  return { document_id: row.id, created: true };
}

/**
 * Idempotently create + send a Bill of Sale for a paid sale transaction.
 */
export async function ensureBillOfSale(transactionId: string): Promise<{ document_id: string; created: boolean } | { skipped: string }> {
  if (!isSignNowConfigured()) return { skipped: 'signnow_not_configured' };
  const templateId = Deno.env.get('SIGNNOW_TEMPLATE_BILL_OF_SALE');
  if (!templateId) return { skipped: 'template_not_configured' };

  const supabase = svc();
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('transaction_id', transactionId)
    .eq('document_type', 'bill_of_sale')
    .maybeSingle();
  if (existing) return { document_id: existing.id, created: false };

  const { data: tx, error: tErr } = await supabase
    .from('sale_transactions')
    .select('id,listing_id,buyer_id,seller_id,amount,status,terms_id')
    .eq('id', transactionId)
    .maybeSingle();
  if (tErr || !tx) throw new Error(`transaction not found: ${tErr?.message ?? transactionId}`);
  // Generate once payment is authorized OR captured — never for an
  // unapproved / unauthorized transaction.
  if (!BILL_OF_SALE_ELIGIBLE_STATUSES.has(String(tx.status))) return { skipped: 'not_payment_authorized' };

  const { data: listing } = await supabase
    .from('listings')
    .select('id,title,category,address,city,state,postal_code,make,model,year_built,mileage,condition,title_status,has_lien')
    .eq('id', tx.listing_id)
    .maybeSingle();

  const seller = await loadProfile(tx.seller_id);
  const buyer  = await loadProfile(tx.buyer_id);
  if (!seller?.email || !buyer?.email) throw new Error('missing party email(s)');

  const docName = `Bill of Sale — ${listing?.title ?? 'Listing'} — ${new Date().toISOString().slice(0, 10)}`;
  const signnowDocId = await createDocumentFromTemplate(templateId, docName);

  await prefillFields(signnowDocId, {
    seller_name: partyName(seller),
    seller_email: seller.email,
    buyer_name: partyName(buyer),
    buyer_email: buyer.email,
    listing_title: listing?.title ?? '',
    listing_address: [listing?.address, listing?.city, listing?.state, listing?.postal_code].filter(Boolean).join(', '),
    category: listing?.category ?? '',
    asset_description: [listing?.year_built, listing?.make, listing?.model].filter(Boolean).join(' '),
    odometer: listing?.mileage != null ? String(listing.mileage) : '',
    condition: listing?.condition ?? '',
    title_status: listing?.title_status ?? '',
    lien_disclosure: listing?.has_lien == null ? '' : listing.has_lien ? 'Seller has disclosed an existing lien on the asset.' : 'Seller has disclosed no existing lien on the asset.',
    price: `$${Number(tx.amount).toFixed(2)}`,
    sale_date: new Date().toISOString().slice(0, 10),
    as_is_clause: 'Sold as-is, where-is. No warranty expressed or implied.',
    electronic_signature_consent: DEFAULT_ESIGN_CONSENT,
    agreement_version: BILL_OF_SALE_VERSION,
    transaction_id: transactionId,
    generated_at: new Date().toISOString(),
  });


  const signers = [
    { email: buyer.email,  role_name: 'Buyer',  order: 1, first_name: buyer.first_name ?? undefined,  last_name: buyer.last_name ?? undefined },
    { email: seller.email, role_name: 'Seller', order: 2, first_name: seller.first_name ?? undefined, last_name: seller.last_name ?? undefined },
  ];
  const invites = await createEmbeddedInvite(signnowDocId, signers);
  await safeRegisterWebhook(signnowDocId);

  const signerRecords: SignerRecord[] = [
    { role: 'buyer',  user_id: tx.buyer_id,  email: buyer.email,  first_name: buyer.first_name ?? undefined,  last_name: buyer.last_name ?? undefined,  invite_id: inviteIdForEmail(invites, buyer.email),  signed_at: null },
    { role: 'seller', user_id: tx.seller_id, email: seller.email, first_name: seller.first_name ?? undefined, last_name: seller.last_name ?? undefined, invite_id: inviteIdForEmail(invites, seller.email), signed_at: null },
  ];


  const { data: row, error: insErr } = await supabase
    .from('documents')
    .insert({
      transaction_id: transactionId,
      document_type: 'bill_of_sale',
      signnow_document_id: signnowDocId,
      signnow_template_id: templateId,
      status: 'sent',
      signers: signerRecords,
      agreement_version: BILL_OF_SALE_VERSION,
      terms_id: (tx as any).terms_id ?? null,

    })
    .select('id')
    .single();
  if (insErr) {
    // Concurrent ensure call won the race — return the existing row.
    const { data: raced } = await supabase
      .from('documents')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('document_type', 'bill_of_sale')
      .maybeSingle();
    if (raced) return { document_id: raced.id, created: false };
    throw new Error(`documents insert failed: ${insErr.message}`);
  }

  return { document_id: row.id, created: true };
}
