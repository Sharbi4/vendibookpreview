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
  prefillFields,
  isSignNowConfigured,
} from './signnow.ts';

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
    .select('id,host_id,shopper_id,listing_id,start_date,end_date,start_time,end_time,total_price,deposit_amount')
    .eq('id', bookingId)
    .maybeSingle();
  if (bErr || !booking) throw new Error(`booking not found: ${bErr?.message ?? bookingId}`);

  const { data: listing } = await supabase
    .from('listings')
    .select('id,title,category,address,city,state,cancellation_policy')
    .eq('id', booking.listing_id)
    .maybeSingle();

  const host = await loadProfile(booking.host_id);
  const renter = await loadProfile(booking.shopper_id);
  if (!host?.email || !renter?.email) throw new Error('missing party email(s)');

  const docName = `Rental Agreement — ${listing?.title ?? 'Listing'} — ${booking.start_date}`;
  const signnowDocId = await createDocumentFromTemplate(templateId, docName);

  await prefillFields(signnowDocId, {
    host_name: partyName(host),
    renter_name: partyName(renter),
    listing_title: listing?.title ?? '',
    listing_address: [listing?.address, listing?.city, listing?.state].filter(Boolean).join(', '),
    start_date: booking.start_date,
    end_date: booking.end_date,
    start_time: booking.start_time ?? '',
    end_time: booking.end_time ?? '',
    total_price: booking.total_price != null ? `$${Number(booking.total_price).toFixed(2)}` : '',
    deposit_amount: booking.deposit_amount != null ? `$${Number(booking.deposit_amount).toFixed(2)}` : '',
    cancellation_policy: (listing as any)?.cancellation_policy ?? '',
  });

  const signers = [
    { email: renter.email, role_name: 'Renter', order: 1, first_name: renter.first_name ?? undefined, last_name: renter.last_name ?? undefined },
    { email: host.email,   role_name: 'Host',   order: 2, first_name: host.first_name ?? undefined,   last_name: host.last_name ?? undefined },
  ];
  const invites = await createEmbeddedInvite(signnowDocId, signers);

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
    })
    .select('id')
    .single();
  if (insErr) throw new Error(`documents insert failed: ${insErr.message}`);

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
    .select('id,listing_id,buyer_id,seller_id,amount,status')
    .eq('id', transactionId)
    .maybeSingle();
  if (tErr || !tx) throw new Error(`transaction not found: ${tErr?.message ?? transactionId}`);
  if (tx.status !== 'paid') return { skipped: 'not_paid' };

  const { data: listing } = await supabase
    .from('listings')
    .select('id,title,category,address,city,state')
    .eq('id', tx.listing_id)
    .maybeSingle();

  const seller = await loadProfile(tx.seller_id);
  const buyer  = await loadProfile(tx.buyer_id);
  if (!seller?.email || !buyer?.email) throw new Error('missing party email(s)');

  const docName = `Bill of Sale — ${listing?.title ?? 'Listing'} — ${new Date().toISOString().slice(0, 10)}`;
  const signnowDocId = await createDocumentFromTemplate(templateId, docName);

  await prefillFields(signnowDocId, {
    seller_name: partyName(seller),
    buyer_name: partyName(buyer),
    listing_title: listing?.title ?? '',
    listing_address: [listing?.address, listing?.city, listing?.state].filter(Boolean).join(', '),
    category: listing?.category ?? '',
    price: `$${Number(tx.amount).toFixed(2)}`,
    sale_date: new Date().toISOString().slice(0, 10),
    as_is_clause: 'Sold as-is, where-is. No warranty expressed or implied.',
  });

  const signers = [
    { email: buyer.email,  role_name: 'Buyer',  order: 1, first_name: buyer.first_name ?? undefined,  last_name: buyer.last_name ?? undefined },
    { email: seller.email, role_name: 'Seller', order: 2, first_name: seller.first_name ?? undefined, last_name: seller.last_name ?? undefined },
  ];
  await createEmbeddedInvite(signnowDocId, signers);

  const signerRecords: SignerRecord[] = [
    { role: 'buyer',  user_id: tx.buyer_id,  email: buyer.email,  first_name: buyer.first_name ?? undefined,  last_name: buyer.last_name ?? undefined,  signed_at: null },
    { role: 'seller', user_id: tx.seller_id, email: seller.email, first_name: seller.first_name ?? undefined, last_name: seller.last_name ?? undefined, signed_at: null },
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
    })
    .select('id')
    .single();
  if (insErr) throw new Error(`documents insert failed: ${insErr.message}`);

  return { document_id: row.id, created: true };
}
