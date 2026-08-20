/**
 * Loads an order and sends its buyer receipt exactly once.
 * Called from the capture endpoint, the webhook, and the recovery endpoint —
 * whichever confirms the capture first wins.
 */

import { buildOrderDetail } from './buildOrderDetail.ts';
import { ensureReceiptSent } from './orderReceipts.ts';

const SITE_URL = 'https://vendibook.com';

function money(cents?: number | null, currency = 'USD') {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export async function deliverOrderReceipt(supabase: any, paymentRecordId: string) {
  const { data: record } = await supabase
    .from('payment_records')
    .select('*')
    .eq('id', paymentRecordId)
    .maybeSingle();
  if (!record || record.payment_status !== 'completed') return { sent: false, reason: 'not_captured' };

  let email: string | null = record.buyer_email ?? null;
  let buyerName: string | null = null;
  if (record.buyer_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', record.buyer_id)
      .maybeSingle();
    buyerName = profile?.full_name?.split(' ')?.[0] ?? null;
    email = email ?? profile?.email ?? null;
  }
  if (!email) return { sent: false, reason: 'no_recipient' };

  const detail = await buildOrderDetail(supabase, record, 'buyer');
  const currency = detail.amounts.currency;
  const override = (await buildBookingOverride(supabase, record, detail, buyerName, currency))
    ?? (await buildFeaturedBoostOverride(supabase, record, detail, buyerName, currency));


  return await ensureReceiptSent(supabase, record.id, email, {
    orderNumber: detail.order_number,
    buyerName,
    itemTitle: detail.listing?.title ?? null,
    sellerName: detail.counterparty_name,
    transactionTypeLabel: detail.transaction_type_label,
    orderDate: new Date(record.captured_at ?? record.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
    paypalTransactionId: record.paypal_order_id ?? null,
    paypalCaptureId: record.paypal_capture_id ?? null,
    amountPaid: money(detail.amounts.total_paid_cents, currency) ?? '—',
    taxes: detail.amounts.tax_cents ? money(detail.amounts.tax_cents, currency) : null,
    fees: detail.amounts.fee_cents ? money(detail.amounts.fee_cents, currency) : null,
    refundAmount: detail.amounts.refunded_cents ? money(detail.amounts.refunded_cents, currency) : null,
    fulfillmentLabel: detail.fulfillment.label,
    fulfillmentNextStep: detail.next_action.next_action_title,
    nextActionTitle: detail.next_action.next_action_title,
    nextActionDescription: detail.next_action.next_action_description,
    orderUrl: `${SITE_URL}/orders/${record.id}`,
    coverImageUrl: detail.listing?.image_url ?? null,
  }, override);
}

const FEATURED_TEMPLATE = 'featured-payment-receipt';
const BOOKING_TEMPLATE = 'booking-confirmation';

/**
 * Rental bookings get the branded booking confirmation (dates, times, host,
 * fulfillment, agreed terms) instead of the generic order receipt — sent
 * exactly once, only after PayPal capture is verified.
 */
async function buildBookingOverride(
  supabase: any,
  record: any,
  detail: any,
  buyerName: string | null,
  currency: string,
) {
  if (!record.booking_request_id) return undefined;

  const { data: booking } = await supabase
    .from('booking_requests')
    .select(
      'id, status, is_instant_book, listing_id, host_id, start_date, end_date, start_time, end_time, is_hourly_booking, hourly_slots, slot_name, duration_hours, total_price, deposit_amount, fulfillment_selected, delivery_address, delivery_instructions, address_snapshot',
    )
    .eq('id', record.booking_request_id)
    .maybeSingle();
  if (!booking) return undefined;

  let hostName: string | null = null;
  if (booking.host_id) {
    const { data: host } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.host_id)
      .maybeSingle();
    hostName = host?.full_name ?? null;
  }

  let listingTitle = detail.listing?.title ?? null;
  let coverImageUrl = detail.listing?.image_url ?? null;
  let cityState: string | null = null;
  if (booking.listing_id) {
    const { data: listing } = await supabase
      .from('listings')
      .select('title, cover_image_url, city, state')
      .eq('id', booking.listing_id)
      .maybeSingle();
    listingTitle = listingTitle ?? listing?.title ?? null;
    coverImageUrl = coverImageUrl ?? listing?.cover_image_url ?? null;
    cityState = [listing?.city, listing?.state].filter(Boolean).join(', ') || null;
  }

  // The exact numbers/policies the guest agreed to at checkout.
  let termsSnapshot: unknown = null;
  let termsVersion = 'v1';
  try {
    const { data: termsRow } = await supabase
      .from('transaction_terms')
      .select('snapshot, terms_version')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (termsRow) {
      termsSnapshot = termsRow.snapshot ?? null;
      termsVersion = termsRow.terms_version || 'v1';
    }
  } catch (_) {
    // Terms are a nice-to-have; never block the confirmation email.
  }

  const timeRange = booking.start_time && booking.end_time
    ? `${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)}`
    : null;

  return {
    templateName: BOOKING_TEMPLATE,
    templateData: {
      guestName: buyerName,
      listingTitle,
      coverImageUrl,
      cityState,
      hostName,
      bookingId: booking.id,
      bookingStatus: booking.status ?? null,
      isInstantBook: booking.is_instant_book ?? false,
      orderNumber: detail.order_number,
      startDate: longDate(booking.start_date),
      endDate: longDate(booking.end_date),
      timeRange,
      slotName: booking.slot_name ?? null,
      durationHours: booking.duration_hours ?? null,
      fulfillmentType: booking.fulfillment_selected ?? null,
      address: booking.address_snapshot ?? null,
      deliveryAddress: booking.delivery_address ?? null,
      deliveryInstructions: booking.delivery_instructions ?? null,
      depositAmount: booking.deposit_amount
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(booking.deposit_amount))
        : undefined,
      totalPrice: money(detail.amounts.total_paid_cents, currency)
        ?? (booking.total_price != null
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(booking.total_price))
          : '—'),
      paypalTransactionId: record.paypal_order_id ?? null,
      paypalCaptureId: record.paypal_capture_id ?? null,
      orderUrl: `${SITE_URL}/orders/${record.id}`,
      termsSnapshot,
      termsVersion,
    },
  };
}


function longDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Featured-boost purchases get their own branded receipt (listing photo, boost
 * window, PayPal transaction ids) instead of the generic order receipt.
 */
async function buildFeaturedBoostOverride(
  supabase: any,
  record: any,
  detail: any,
  buyerName: string | null,
  currency: string,
) {
  if (!record.monetization_purchase_id) return undefined;

  const { data: purchase } = await supabase
    .from('monetization_purchases')
    .select('id, listing_id, amount_cents, access_starts_at, access_ends_at, paid_at, created_at, product:monetization_products(slug, name)')
    .eq('id', record.monetization_purchase_id)
    .maybeSingle();

  const slug: string = purchase?.product?.slug ?? '';
  if (!slug.includes('featured')) return undefined;

  // Fall back to the promotion row when the purchase window isn't stamped yet.
  let startsIso: string | null = purchase?.access_starts_at ?? null;
  let endsIso: string | null = purchase?.access_ends_at ?? null;
  if (!endsIso && (purchase?.listing_id ?? record.listing_id)) {
    const { data: promo } = await supabase
      .from('listing_promotions')
      .select('starts_at, ends_at')
      .eq('listing_id', purchase?.listing_id ?? record.listing_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    startsIso = startsIso ?? promo?.starts_at ?? null;
    endsIso = endsIso ?? promo?.ends_at ?? null;
  }
  const durationDays = startsIso && endsIso
    ? Math.max(1, Math.round((new Date(endsIso).getTime() - new Date(startsIso).getTime()) / 86_400_000))
    : null;

  let listingTitle = detail.listing?.title ?? null;
  let coverImageUrl = detail.listing?.image_url ?? null;
  const listingId = purchase?.listing_id ?? record.listing_id ?? null;
  if (listingId && (!listingTitle || !coverImageUrl)) {
    const { data: listing } = await supabase
      .from('listings')
      .select('title, cover_image_url')
      .eq('id', listingId)
      .maybeSingle();
    listingTitle = listingTitle ?? listing?.title ?? null;
    coverImageUrl = coverImageUrl ?? listing?.cover_image_url ?? null;
  }

  return {
    templateName: FEATURED_TEMPLATE,
    templateData: {
      firstName: buyerName,
      listingTitle,
      listingId,
      coverImageUrl,
      packageName: purchase?.product?.name ?? 'Featured boost',
      amount: money(detail.amounts.total_paid_cents ?? purchase?.amount_cents, currency) ?? '—',
      orderDate: longDate(record.captured_at ?? purchase?.paid_at ?? record.created_at),
      startsAt: longDate(startsIso),
      expiresAt: longDate(endsIso),
      durationLabel: durationDays ? `${durationDays} day${durationDays === 1 ? '' : 's'}` : null,
      orderNumber: detail.order_number,
      paypalTransactionId: record.paypal_order_id ?? null,
      paypalCaptureId: record.paypal_capture_id ?? null,
      paymentMethod: record.payment_source ? String(record.payment_source).replace(/_/g, ' ') : 'PayPal',
      receiptId: record.id,
      orderUrl: `${SITE_URL}/orders/${record.id}`,
    },
  };
}
