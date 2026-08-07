/**
 * Transaction Terms — pure resolver.
 *
 * Single source of truth for what a buyer sees and what we persist at
 * checkout. Every UI surface (summary card, details accordion, price modal,
 * final-review sheet) and the confirmation email render from the SAME
 * object returned here. The server also calls buildTerms with the same
 * inputs before it writes the immutable `transaction_terms` snapshot,
 * which guarantees the numbers in the browser match the row in the DB
 * match the Stripe metadata match the receipt email.
 *
 * All monetary values are cents (integers). Do NOT do float math here.
 */

import {
  calculateRentalFees,
  calculateSaleFees,
  formatCurrency,
} from './commissions';

export const TERMS_VERSION = 'v1';

// ---------- Inputs ----------

export interface TermsListing {
  id: string;
  title: string;
  host_id: string;
  cover_image_url?: string | null;
  mode?: 'rent' | 'sale' | string | null;
  category?: string | null;
  cancellation_policy?: string | null;
  rules?: string | null;
  city?: string | null;
  state?: string | null;
  price_sale?: number | null;
  price_hourly?: number | null;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  security_deposit?: number | null;
  accept_paypal_checkout?: boolean | null;
  accept_card_payment?: boolean | null; // Legacy Stripe flag retained for audit
  required_documents?: unknown; // jsonb list from listing_required_documents
}

export interface TermsSelection {
  mode: 'rent' | 'sale';
  paymentMethod: 'paypal_checkout' | 'pay_in_person' | 'offer' | 'other';
  basePriceDollars: number;      // rental subtotal or sale price (before fees, before deposit)
  depositDollars?: number;       // security deposit (rental)
  deliveryFeeDollars?: number;   // buyer-visible delivery / freight
  isSellerPaidFreight?: boolean; // sale only
  isCashSale?: boolean;          // pay-in-person sales are 100% free
  startDate?: string | null;     // ISO date
  endDate?: string | null;       // ISO date
  startTime?: string | null;
  endTime?: string | null;
  hourlySlots?: unknown;
  fulfillmentType?: string | null; // 'pickup' | 'delivery' | 'vendibook_freight' | 'both'
  slotNumber?: number | null;
}

export interface TermsBuyer {
  id?: string | null;   // null for guest
  email?: string | null;
  name?: string | null;
}

// ---------- Output ----------

export interface PriceLine {
  label: string;
  amountCents: number;
  kind: 'base' | 'fee' | 'deposit' | 'delivery' | 'discount' | 'total';
  hint?: string;
}

export interface TransactionTerms {
  termsVersion: string;
  mode: 'rent' | 'sale';
  paymentMethod: TermsSelection['paymentMethod'];
  listing: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    hostId: string;
    location: string | null;
  };
  buyer: { id: string | null; email: string | null; name: string | null };
  schedule: {
    startDate: string | null;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    hourlySlots: unknown;
    slotNumber: number | null;
  };
  fulfillment: {
    type: string | null;
  };
  pricing: {
    subtotalCents: number;
    deliveryCents: number;
    renterFeeCents: number;
    commissionCents: number;   // host/seller-side commission (info only for buyer)
    depositCents: number;
    totalCents: number;
    currency: 'usd';
    lines: PriceLine[];
  };
  policies: {
    cancellation: string;
    rules: string | null;
    requiredDocuments: string[];
    acknowledgements: string[]; // human-readable statements the buyer is agreeing to
  };
}

// ---------- Helpers ----------

const dollarsToCents = (n: number | null | undefined): number =>
  Math.round(Math.max(0, Number(n ?? 0)) * 100);

const defaultCancellationCopy = (mode: 'rent' | 'sale', isCash: boolean): string => {
  if (mode === 'sale') {
    if (isCash) {
      return 'Pay-in-Person sales are between buyer and seller. Vendibook does not hold funds or process refunds for cash transactions — inspect the item in person before you pay.';
    }
    return 'Sales are payment protection-protected. Funds are held by Vendibook and released to the seller 25 days after you confirm the item is as described. Open a dispute from your order page if something is wrong.';
  }
  return 'Free cancellation is not automatic. Contact the host to request a refund. Deposits are refunded within 24 hours after the rental ends if there is no damage or late return. Platform service fees are non-refundable once a booking is confirmed.';
};

// ---------- Main resolver ----------

export function buildTerms(input: {
  listing: TermsListing;
  selection: TermsSelection;
  buyer?: TermsBuyer;
}): TransactionTerms {
  const { listing, selection, buyer } = input;

  const base = Math.max(0, Number(selection.basePriceDollars || 0));
  const delivery = Math.max(0, Number(selection.deliveryFeeDollars || 0));
  const deposit = Math.max(0, Number(selection.depositDollars || 0));

  let subtotalCents = 0;
  let deliveryCents = dollarsToCents(delivery);
  let renterFeeCents = 0;
  let commissionCents = 0;
  let totalCents = 0;
  const lines: PriceLine[] = [];

  if (selection.mode === 'rent') {
    const fees = calculateRentalFees(base, delivery);
    subtotalCents = dollarsToCents(fees.subtotal - delivery);
    deliveryCents = dollarsToCents(delivery);
    renterFeeCents = dollarsToCents(fees.renterFee);
    commissionCents = dollarsToCents(fees.hostFee);
    totalCents = dollarsToCents(fees.customerTotal) + dollarsToCents(deposit);

    lines.push({ label: 'Rental', amountCents: subtotalCents, kind: 'base' });
    if (deliveryCents > 0) {
      lines.push({ label: 'Delivery', amountCents: deliveryCents, kind: 'delivery' });
    }
    lines.push({
      label: 'Service fee (12.9%)',
      amountCents: renterFeeCents,
      kind: 'fee',
      hint: 'Vendibook marketplace fee. Non-refundable once the booking is confirmed.',
    });
    if (deposit > 0) {
      lines.push({
        label: 'Refundable security deposit',
        amountCents: dollarsToCents(deposit),
        kind: 'deposit',
        hint: 'Held on your card and released within 24 hours after the rental ends if there is no damage or late return.',
      });
    }
    lines.push({ label: 'Total due today', amountCents: totalCents, kind: 'total' });
  } else {
    // sale
    const fees = calculateSaleFees(
      base,
      delivery,
      Boolean(selection.isSellerPaidFreight),
      Boolean(selection.isCashSale),
    );
    subtotalCents = dollarsToCents(base);
    deliveryCents = dollarsToCents(selection.isSellerPaidFreight ? 0 : delivery);
    renterFeeCents = 0;
    commissionCents = dollarsToCents(fees.sellerFee);
    totalCents = dollarsToCents(fees.customerTotal);

    lines.push({ label: 'Item price', amountCents: subtotalCents, kind: 'base' });
    if (deliveryCents > 0) {
      lines.push({
        label: 'Delivery / freight',
        amountCents: deliveryCents,
        kind: 'delivery',
      });
    }
    if (selection.isCashSale) {
      lines.push({
        label: 'Buyer fee',
        amountCents: 0,
        kind: 'fee',
        hint: 'Pay-in-Person sales are 100% free — no buyer fee, no commission.',
      });
    } else {
      lines.push({
        label: 'Buyer fee',
        amountCents: 0,
        kind: 'fee',
        hint: 'Vendibook does not charge buyers a fee on card sales.',
      });
    }
    lines.push({ label: 'Total due today', amountCents: totalCents, kind: 'total' });
  }

  const cancellation =
    (listing.cancellation_policy && listing.cancellation_policy.trim()) ||
    defaultCancellationCopy(selection.mode, Boolean(selection.isCashSale));

  const requiredDocuments: string[] = Array.isArray(listing.required_documents)
    ? (listing.required_documents as Array<{ label?: string; name?: string; type?: string }>)
        .map((d) => (d?.label || d?.name || d?.type || '').toString())
        .filter(Boolean)
    : [];

  const acknowledgements: string[] = [];
  acknowledgements.push(
    selection.mode === 'rent'
      ? `You are booking "${listing.title}" for the dates shown above.`
      : `You are buying "${listing.title}" from the seller.`,
  );
  if (selection.paymentMethod === 'paypal_checkout') {
    acknowledgements.push(
      selection.mode === 'rent'
        ? 'Your PayPal payment is authorized now; funds are held by Vendibook until 24 hours after the rental ends.'
        : 'Your PayPal payment is charged now; funds are held in payment protection and released to the seller 25 days after you confirm the item.',
    );
  } else if (selection.paymentMethod === 'pay_in_person') {
    acknowledgements.push(
      'Vendibook does not process or hold funds for Pay-in-Person transactions. Inspect the item and confirm terms in person before paying.',
    );
  }
  if (selection.mode === 'rent' && deposit > 0) {
    acknowledgements.push(
      `A refundable ${formatCurrency(deposit)} security deposit is included in your total.`,
    );
  }
  if (requiredDocuments.length) {
    acknowledgements.push(
      `You will need to provide: ${requiredDocuments.join(', ')}.`,
    );
  }

  const location = [listing.city, listing.state].filter(Boolean).join(', ') || null;

  return {
    termsVersion: TERMS_VERSION,
    mode: selection.mode,
    paymentMethod: selection.paymentMethod,
    listing: {
      id: listing.id,
      title: listing.title,
      coverImageUrl: listing.cover_image_url ?? null,
      hostId: listing.host_id,
      location,
    },
    buyer: {
      id: buyer?.id ?? null,
      email: buyer?.email ?? null,
      name: buyer?.name ?? null,
    },
    schedule: {
      startDate: selection.startDate ?? null,
      endDate: selection.endDate ?? null,
      startTime: selection.startTime ?? null,
      endTime: selection.endTime ?? null,
      hourlySlots: selection.hourlySlots ?? null,
      slotNumber: selection.slotNumber ?? null,
    },
    fulfillment: { type: selection.fulfillmentType ?? null },
    pricing: {
      subtotalCents,
      deliveryCents,
      renterFeeCents,
      commissionCents,
      depositCents: dollarsToCents(deposit),
      totalCents,
      currency: 'usd',
      lines,
    },
    policies: {
      cancellation,
      rules: listing.rules ?? null,
      requiredDocuments,
      acknowledgements,
    },
  };
}

/**
 * Compact HTML snippet suitable for embedding in a transactional email
 * ("What you agreed to" block). Uses only inline styles + escaped text.
 */
export function renderTermsEmailBlock(terms: TransactionTerms): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const money = (c: number) => formatCurrency(c / 100);
  const rows = terms.pricing.lines
    .map(
      (l) =>
        `<tr><td style="padding:4px 0;color:#374151;">${esc(l.label)}</td>` +
        `<td style="padding:4px 0;text-align:right;color:${l.kind === 'total' ? '#111827' : '#374151'};font-weight:${l.kind === 'total' ? 600 : 400};">${money(l.amountCents)}</td></tr>`,
    )
    .join('');
  const acks = terms.policies.acknowledgements
    .map((a) => `<li style="margin:4px 0;">${esc(a)}</li>`)
    .join('');
  return `
<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;background:#ffffff;">
  <div style="font-weight:600;color:#111827;margin-bottom:8px;">What you agreed to</div>
  <table style="width:100%;font-size:14px;border-collapse:collapse;">${rows}</table>
  <div style="font-size:13px;color:#374151;margin-top:12px;">
    <div style="font-weight:600;margin-bottom:4px;">Cancellation policy</div>
    <div>${esc(terms.policies.cancellation)}</div>
  </div>
  ${acks ? `<ul style="font-size:13px;color:#374151;margin-top:12px;padding-left:18px;">${acks}</ul>` : ''}
  <div style="font-size:12px;color:#6b7280;margin-top:12px;">Terms version ${esc(terms.termsVersion)}</div>
</div>`;
}

// ---------- Listing-page "Good to Know" bullets (spec §4) ----------

export interface HighlightsListing {
  title?: string | null;
  mode?: string | null;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  instant_book?: boolean | null;
  accept_paypal_checkout?: boolean | null;
  accept_card_payment?: boolean | null; // Legacy Stripe flag retained for audit
  accept_cash_payment?: boolean | null;
  deposit_amount?: number | null;
  security_deposit?: number | null;
  fulfillment_type?: string | null;
  delivery_fee?: number | null;
  cancellation_policy?: string | null;
  vendibook_freight_enabled?: boolean | null;
}

export interface ListingHighlights {
  heading: string;
  linkLabel: string;
  bullets: string[];
}

const CATEGORY_KIND = (
  category?: string | null,
): 'kitchen' | 'vendor' | 'default' => {
  const c = (category ?? '').toLowerCase();
  if (c === 'ghost_kitchen') return 'kitchen';
  if (c === 'vendor_lot' || c === 'vendor_space' || c === 'food_truck' || c === 'food_trailer') return 'vendor';
  return 'default';
};

const cityLine = (l: HighlightsListing): string | null => {
  const loc = [l.city, l.state].filter(Boolean).join(', ');
  return loc || null;
};

/**
 * Build the 2–4 short bullets shown on the listing detail page.
 * Emits ONLY items whose underlying data is present (spec §4 relevance rule).
 */
export function buildListingHighlights(listing: HighlightsListing): ListingHighlights {
  const isRent = (listing.mode ?? '').toLowerCase() === 'rent';
  const isSale = (listing.mode ?? '').toLowerCase() === 'sale';
  const kind = CATEGORY_KIND(listing.category);

  let heading: string;
  let linkLabel: string;
  if (isSale) {
    heading = 'Before You Buy';
    linkLabel = 'View Purchase Details';
  } else if (kind === 'kitchen' || kind === 'vendor') {
    heading = 'Booking Details';
    linkLabel = 'View Booking Details';
  } else {
    heading = 'Good to Know';
    linkLabel = 'View Rental Details';
  }

  const bullets: string[] = [];

  // 1. Approval vs Instant Book (rentals & bookings only — spec §11)
  if (isRent || kind !== 'default') {
    if (listing.instant_book) {
      bullets.push('Instant Book — confirmed after payment');
    } else {
      bullets.push('Host approval required before payment is charged');
    }
  }

  // 2. Payment posture (spec §7, §10)
  if (isSale) {
    if (listing.accept_cash_payment && !listing.accept_paypal_checkout) {
      bullets.push('Pay in Person — Vendibook records the transaction but does not hold funds');
    } else if (listing.accept_cash_payment && listing.accept_paypal_checkout) {
      bullets.push('Pay online via PayPal or in person');
    } else if (listing.accept_paypal_checkout) {
      bullets.push('Payment is completed securely via PayPal at checkout');
    } else {
      bullets.push('Payment is completed securely at checkout');
    }
  }

  // 3. Deposit (rentals only, only if configured — spec §12)
  const deposit = Number(listing.deposit_amount ?? listing.security_deposit ?? 0);
  if (isRent && deposit > 0) {
    bullets.push(`Refundable deposit: $${deposit.toLocaleString()}`);
  }

  // 4. Fulfillment / pickup / delivery (spec §13)
  const ft = (listing.fulfillment_type ?? '').toLowerCase();
  const loc = cityLine(listing);
  if (isSale && listing.vendibook_freight_enabled) {
    bullets.push('Vendibook Freight available for delivery');
  } else if (ft === 'delivery') {
    bullets.push(loc ? `Delivery available from ${loc}` : 'Delivery available');
  } else if (ft === 'both' && loc) {
    bullets.push(`Pickup or delivery in ${loc}`);
  } else if (loc && kind === 'default') {
    bullets.push(isSale ? `Located in ${loc}` : `Pickup in ${loc}`);
  } else if (loc && kind === 'kitchen') {
    bullets.push(`On-site use in ${loc}`);
  } else if (loc && kind === 'vendor') {
    bullets.push(`Vendor space in ${loc}`);
  }

  // Cap at 4 for spec §4
  return { heading, linkLabel, bullets: bullets.slice(0, 4) };
}
