/**
 * Assembles the buyer/seller/admin-facing view of an order from persistent
 * backend records only. The browser never computes status, fees, or the
 * next action — it renders what this returns.
 */

import {
  computeNextAction,
  deriveOrderStatus,
  FULFILLMENT_LABEL,
  inferFulfillmentType,
  normalizeTransactionType,
  presentPaymentStatus,
  TRANSACTION_TYPE_LABEL,
  type FulfillmentType,
  type NextAction,
  type OrderTransactionType,
  type PaymentPresentation,
} from './orderStatus.ts';

export type ViewerRole = 'buyer' | 'seller' | 'admin';

export interface OrderDetail {
  id: string;
  order_number: string;
  created_at: string;
  viewer_role: ViewerRole;

  listing: { id: string | null; title: string | null; image_url: string | null } | null;
  counterparty_name: string | null;

  transaction_type: OrderTransactionType;
  transaction_type_label: string;

  payment: PaymentPresentation & {
    provider: string;
    paypal_order_id: string | null;
    paypal_capture_id: string | null;
    payment_method_label: string | null;
    is_payable: boolean;
  };

  order_status: { code: string; label: string };

  amounts: {
    currency: string;
    gross_cents: number;
    tax_cents: number;
    fee_cents: number;
    discount_cents: number;
    refunded_cents: number;
    total_paid_cents: number;
  };

  fulfillment: {
    type: FulfillmentType;
    label: string;
    status: string | null;
    details: Record<string, unknown>;
  };

  next_action: NextAction;
  seller_next_action: NextAction | null;

  timeline: Array<{
    id: string;
    event_code: string;
    title: string;
    description: string | null;
    created_at: string;
  }>;

  attempts?: Array<Record<string, unknown>>;
  receipt?: Record<string, unknown> | null;
  support: { email: string; phone: string; dispute_url: string };
}

const PAYMENT_SOURCE_LABEL: Record<string, string> = {
  paypal: 'PayPal balance or linked funding source',
  card: 'Card via PayPal',
  venmo: 'Venmo',
  paylater: 'PayPal Pay Later',
  bancontact: 'Bancontact via PayPal',
};

export async function buildOrderDetail(
  supabase: any,
  record: Record<string, any>,
  viewerRole: ViewerRole,
): Promise<OrderDetail> {
  const transactionType = normalizeTransactionType(record.transaction_type);

  const [listing, counterpartyName, domain, timeline] = await Promise.all([
    loadListing(supabase, record.listing_id),
    loadCounterpartyName(supabase, viewerRole === 'seller' ? record.buyer_id : record.seller_id),
    loadDomainRecord(supabase, record, transactionType),
    loadTimeline(supabase, record.id, viewerRole),
  ]);

  const fulfillmentType = inferFulfillmentType(transactionType, domain.fulfillmentRaw);
  const payment = presentPaymentStatus({
    paymentStatus: record.payment_status,
    internalStatus: record.internal_status,
    disputeStatus: record.dispute_status,
    refundedCents: record.refunded_cents,
    grossAmountCents: record.gross_amount_cents,
  });

  const orderStatus = deriveOrderStatus(payment.code, domain.fulfillmentStatus);

  const nextAction = computeNextAction({
    orderId: record.id,
    paymentStatus: payment.code,
    transactionType,
    fulfillmentType,
    fulfillmentStatus: domain.fulfillmentStatus,
    agreementRequired: domain.agreementRequired,
    agreementSigned: domain.agreementSigned,
    documentsOutstanding: domain.documentsOutstanding,
    pickupScheduled: domain.pickupScheduled,
    deliveryConfirmed: domain.deliveryConfirmed,
    subscriptionActive: domain.subscriptionActive,
    orderCompleted: orderStatus.code === 'completed',
  });

  const detail: OrderDetail = {
    id: record.id,
    order_number: record.reference,
    created_at: record.created_at,
    viewer_role: viewerRole,
    listing,
    counterparty_name: counterpartyName,
    transaction_type: transactionType,
    transaction_type_label: TRANSACTION_TYPE_LABEL[transactionType],
    payment: {
      ...payment,
      provider: record.provider ?? 'paypal',
      paypal_order_id: record.paypal_order_id ?? null,
      paypal_capture_id: record.paypal_capture_id ?? null,
      payment_method_label: record.payment_source
        ? (PAYMENT_SOURCE_LABEL[record.payment_source] ?? 'PayPal')
        : null,
      is_payable: isPayable(payment.code),
    },
    order_status: orderStatus,
    amounts: {
      currency: record.currency ?? 'USD',
      gross_cents: record.gross_amount_cents ?? 0,
      tax_cents: record.tax_cents ?? 0,
      fee_cents: record.platform_fee_cents ?? 0,
      discount_cents: record.discount_cents ?? 0,
      refunded_cents: record.refunded_cents ?? 0,
      total_paid_cents: Math.max(0, (record.gross_amount_cents ?? 0) - (record.refunded_cents ?? 0)),
    },
    fulfillment: {
      type: fulfillmentType,
      label: FULFILLMENT_LABEL[fulfillmentType],
      status: domain.fulfillmentStatus ?? null,
      details: viewerRole === 'seller' ? domain.sellerDetails : domain.details,
    },
    next_action: nextAction,
    seller_next_action: domain.sellerNextAction ?? null,
    timeline,
    support: {
      email: 'support@vendibook.com',
      phone: '(725) 755-9598',
      dispute_url: '/help',
    },
  };

  // Sellers get a deliberately reduced view — no buyer financial breakdown.
  if (viewerRole === 'seller') {
    detail.amounts = {
      ...detail.amounts,
      fee_cents: 0,
      discount_cents: 0,
    };
    detail.payment.paypal_capture_id = null;
    detail.payment.payment_method_label = null;
  }

  return detail;
}

function isPayable(code: string) {
  return ['payment_failed', 'payment_pending'].includes(code);
}

async function loadListing(supabase: any, listingId?: string | null) {
  if (!listingId) return null;
  const { data } = await supabase
    .from('listings')
    .select('id, title, cover_image_url')
    .eq('id', listingId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, title: data.title, image_url: data.cover_image_url ?? null };
}

async function loadCounterpartyName(supabase: any, userId?: string | null) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', userId)
    .maybeSingle();
  return data?.business_name || data?.full_name || null;
}

async function loadTimeline(supabase: any, paymentRecordId: string, viewerRole: ViewerRole) {
  const visibilities = viewerRole === 'admin'
    ? ['buyer', 'seller', 'both', 'admin']
    : viewerRole === 'seller'
      ? ['seller', 'both']
      : ['buyer', 'both'];

  const { data } = await supabase
    .from('order_timeline_events')
    .select('id, event_code, title, description, created_at')
    .eq('payment_record_id', paymentRecordId)
    .in('visibility', visibilities)
    .order('created_at', { ascending: true });
  return data ?? [];
}

interface DomainSummary {
  fulfillmentRaw: string | null;
  fulfillmentStatus: string | null;
  details: Record<string, unknown>;
  sellerDetails: Record<string, unknown>;
  agreementRequired?: boolean;
  agreementSigned?: boolean;
  documentsOutstanding?: number;
  pickupScheduled?: boolean;
  deliveryConfirmed?: boolean;
  subscriptionActive?: boolean;
  sellerNextAction?: NextAction | null;
}

async function loadDomainRecord(
  supabase: any,
  record: Record<string, any>,
  transactionType: OrderTransactionType,
): Promise<DomainSummary> {
  const empty: DomainSummary = {
    fulfillmentRaw: null,
    fulfillmentStatus: null,
    details: {},
    sellerDetails: {},
  };

  if (record.booking_request_id) {
    const { data: b } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', record.booking_request_id)
      .maybeSingle();
    if (!b) return empty;

    const documentsOutstanding = b.document_review_status && b.document_review_status !== 'approved' ? 1 : 0;
    const isDelivery = !!b.delivery_address;
    const details: Record<string, unknown> = {
      start_date: b.start_date,
      end_date: b.end_date,
      start_time: b.start_time,
      end_time: b.end_time,
      pickup_instructions: b.status === 'approved' ? (b.address_snapshot ?? null) : null,
      location_visibility: b.status === 'approved' ? 'exact' : 'approximate',
      delivery_address: isDelivery ? b.delivery_address : null,
      delivery_instructions: b.delivery_instructions ?? null,
      delivery_fee_cents: b.delivery_fee_snapshot ?? null,
      document_review_status: b.document_review_status ?? null,
      agreement_status: b.deposit_status ?? null,
      verification_status: b.documents_approved_at ? 'verified' : 'pending',
    };
    return {
      fulfillmentRaw: isDelivery ? 'rental_delivery' : 'rental_pickup',
      fulfillmentStatus: b.status ?? null,
      details,
      sellerDetails: {
        start_date: b.start_date,
        end_date: b.end_date,
        status: b.status,
        document_review_status: b.document_review_status ?? null,
      },
      agreementRequired: true,
      agreementSigned: !!b.documents_approved_at,
      documentsOutstanding,
      pickupScheduled: !!b.start_date,
      deliveryConfirmed: b.status === 'completed',
      sellerNextAction: b.status === 'pending'
        ? {
          next_action_code: 'review_order_details',
          next_action_title: 'Review this booking request',
          next_action_description: 'Approve or decline the request so the renter knows where they stand.',
          next_action_url: '/host/bookings',
          next_action_priority: 1,
        }
        : null,
    };
  }

  if (record.sale_transaction_id) {
    const { data: t } = await supabase
      .from('sale_transactions')
      .select('*')
      .eq('id', record.sale_transaction_id)
      .maybeSingle();
    if (!t) return empty;

    const raw = t.delivery_address ? 'delivery' : (t.shipping_status ? 'shipping' : 'pickup');
    return {
      fulfillmentRaw: raw,
      fulfillmentStatus: t.shipping_status ?? t.status ?? null,
      details: {
        method: raw,
        delivery_address: t.delivery_address ?? null,
        delivery_instructions: t.delivery_instructions ?? null,
        delivery_fee_cents: t.delivery_fee != null ? Math.round(Number(t.delivery_fee) * 100) : null,
        tracking_number: t.tracking_number ?? null,
        tracking_url: t.tracking_url ?? null,
        estimated_delivery_date: t.estimated_delivery_date ?? null,
        delivered_at: t.delivered_at ?? null,
        transfer_documentation_status: t.bill_of_sale_completed_at ? 'complete' : 'pending',
        seller_coordination_status: t.status ?? null,
      },
      sellerDetails: {
        method: raw,
        status: t.status ?? null,
        shipping_status: t.shipping_status ?? null,
        tracking_number: t.tracking_number ?? null,
      },
      agreementRequired: false,
      documentsOutstanding: 0,
      pickupScheduled: raw !== 'pickup' || !!t.delivered_at || t.status === 'completed',
      deliveryConfirmed: !!t.delivered_at || t.status === 'completed',
      sellerNextAction: t.status === 'paid'
        ? {
          next_action_code: 'contact_seller',
          next_action_title: 'Coordinate handoff with the buyer',
          next_action_description: 'Reach out to arrange pickup or delivery and complete the transfer paperwork.',
          next_action_url: '/messages',
          next_action_priority: 2,
        }
        : null,
    };
  }

  if (record.monetization_purchase_id) {
    const { data: p } = await supabase
      .from('monetization_purchases')
      .select('*')
      .eq('id', record.monetization_purchase_id)
      .maybeSingle();
    if (!p) return empty;

    const isSub = transactionType === 'subscription' || transactionType === 'membership';
    return {
      fulfillmentRaw: isSub ? 'subscription_activation' : 'digital_delivery',
      fulfillmentStatus: p.fulfillment_status ?? p.status ?? null,
      details: {
        plan_name: p.metadata?.plan_name ?? p.metadata?.product_name ?? null,
        billing_interval: p.metadata?.interval ?? null,
        activation_date: p.access_starts_at ?? p.paid_at ?? null,
        renewal_date: p.access_ends_at ?? null,
        subscription_status: p.status ?? null,
        entitlement_status: p.fulfillment_status ?? null,
      },
      sellerDetails: {},
      subscriptionActive: p.status === 'paid' || p.status === 'fulfilled',
      documentsOutstanding: 0,
    };
  }

  return empty;
}
