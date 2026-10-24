/**
 * Canonical, audience-scoped pricing answers.
 *
 * One source of truth for every "what does this cost?" surface:
 *   /faq, /help, /how-it-works, /how-it-works-seller, /how-it-works-host.
 *
 * Copy follows the owner's AI Support Agent Master Guide v5.0 (2026-10-14,
 * docs/support/vendibook-ai-support-master-guide-v5.txt) and numbers must
 * match FEE_CONFIG (supabase/functions/_shared/feeConfig.ts):
 *   New eligible online equipment sales — 8.7% seller commission, $0 buyer
 *     platform fee, for Free and Pro sellers alike (Pro does not lower it).
 *     Older committed orders keep their snapshotted terms.
 *   Rentals — 12.9% host commission + 12.9% renter service fee; active
 *     Vendibook Pro hosts pay the same 12.9% host commission
 *     per completed transaction.
 *   Pay in person / cash sales are retired (owner override 2026-10-15) —
 *     never describe in-person settlement or a $0 in-person commission.
 *
 * Payment rails: equipment sales use the PayPal-supported checkout / invoice
 * flow; rentals use Square card checkout (never PayPal).
 *
 * Payout language rule (owner override 2026-10-15, wins over the guide):
 * every payout answer, sales and rentals, says "We pay out within 24 hours
 * after the rental or sale is complete and confirmed — signatures and the
 * other handoff steps done." Vendibook is not an escrow service — never say
 * funds are held.
 */

export type PricingAudience = 'seller' | 'host' | 'buyer' | 'renter' | 'all';

export interface PricingFaqEntry {
  id: string;
  question: string;
  answer: string;
  audiences: PricingAudience[];
  cta?: { label: string; href: string };
}

export const PRICING_FAQ: PricingFaqEntry[] = [
  {
    id: 'cost-to-list',
    question: 'Does it cost money to publish a listing?',
    answer:
      'Creating and publishing a basic listing is free, subject to the listing limit on your account: the standard Free account supports two active listings (founding-member accounts may have grandfathered unlimited listings), and drafts do not count. Paid promotion and Pro membership are optional, and the optional Identity Verified badge is not required to publish.',
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Create a free listing', href: '/list' },
  },
  {
    id: 'seller-commission',
    question: 'What is the fee for selling online?',
    answer:
      'For new eligible online equipment sales, the Vendibook seller fee is 8.7% of the agreed equipment amount — the same for Free and Pro sellers. Separately priced shipping and tax are not part of the commission base, and buyers pay no Vendibook platform fee. For example, on a $20,000 sale the 8.7% fee is $1,740, before any shipping obligations, refunds or other separately disclosed costs. Confirm the exact fee in your transaction quote; older committed orders keep their agreed terms.',
    audiences: ['seller', 'all'],
    cta: { label: 'See the full fee breakdown', href: '/pricing' },
  },
  {
    id: 'buyer-fees',
    question: 'Does a buyer pay a Vendibook platform fee for an equipment purchase?',
    answer:
      'No, the buyer platform fee for equipment sales is $0. Your invoice or checkout may separately show tax, freight or other expressly agreed amounts.',
    audiences: ['buyer', 'all'],
    cta: { label: 'Browse trucks & trailers', href: '/search?mode=sale' },
  },
  {
    id: 'rental-fees',
    question: 'What are the rental fees?',
    answer:
      'Rentals are paid by card through Square. Standard rentals have a 12.9% host commission and a separate 12.9% renter service fee. Pro does not discount commissions; both rental fees remain 12.9%. Checkout displays the actual calculation and any other applicable charges.',
    audiences: ['host', 'renter', 'all'],
    cta: { label: 'See rental pricing', href: '/pricing' },
  },
  {
    id: 'host-earnings',
    question: 'What will I actually take home as a host?',
    answer:
      'Your rental subtotal minus the host commission. On a $1,000 rental subtotal, the standard host fee is $129 and the renter pays a separate $129 service fee, before any separately disclosed tax, security deposit, delivery or adjustments. Pro hosts pay the same $129 host commission in this example. Renters pay by card through Square. We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done.',
    audiences: ['host', 'all'],
  },
  {
    id: 'pro-sale-commission',
    question: 'Does Pro reduce my equipment-sale commission?',
    answer:
      'No. The 8.7% online equipment-sale commission applies equally to Free and Pro sellers. Pro does not discount rental commissions either.',
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Compare plans', href: '/pricing' },
  },
  {
    id: 'paypal-payments',
    question: 'How do payments actually move — who processes them?',
    answer:
      'It depends on the transaction. Eligible equipment sales use Vendibook\'s PayPal-powered checkout or invoice flow. Rentals are paid by card through Square checkout, never PayPal. Vendibook is not an escrow service. We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done. Available payment options are shown on the actual payment screen, and Vendibook never sees or stores your full card number.',
    audiences: ['seller', 'host', 'buyer', 'renter', 'all'],
    cta: { label: 'How payments work', href: '/payments' },
  },
  {
    id: 'payout-timing',
    question: 'When does the seller or host actually get paid?',
    answer:
      'We pay out within 24 hours after the rental or sale is complete and confirmed — signatures and the other handoff steps done. This applies to equipment sales (paid through Vendibook\'s PayPal-powered checkout or invoice) and rentals (paid by card through Square). Your transaction shows which steps are still open and its payout status.',
    audiences: ['seller', 'host', 'all'],
  },
  {
    id: 'equinox-financing',
    question: 'Does Vendibook offer financing?',
    answer:
      'Eligible equipment listings may offer third-party financing referrals — currently led by Equinox Funding. The buyer applies directly with the lender; the seller does not manage the application. Vendibook is not the lender and does not decide approval, rates, payments or funding dates. Buyers can download a pro forma purchase summary from the listing for an application — it is not a payable invoice or proof of a sale.',
    audiences: ['seller', 'buyer', 'all'],
    cta: { label: 'See current financing options', href: '/financing' },
  },
  {
    id: 'subscriptions-optional',
    question: 'Do I need Pro to sell or rent?',
    answer:
      'No. You can publish standard listings without Pro. Vendibook Pro adds tools, visibility, a monthly Featured Boost credit, eligible BuyerMatch AI buyer-discovery support. BuyerMatch does not guarantee buyers or sales.',
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Compare plans', href: '/pricing' },
  },
  {
    id: 'identity-optional',
    question: 'Is identity verification required?',
    answer:
      'Not to publish. The Identity Verified badge is an optional paid add-on, and it does not guarantee equipment condition, title or seller honesty. Specific contact, purchase or payment actions may require separate phone or identity checks.',
    audiences: ['seller', 'host', 'buyer', 'renter', 'all'],
    cta: { label: 'About verification', href: '/identity-verification' },
  },
];

export function getPricingFaq(audience: PricingAudience): PricingFaqEntry[] {
  if (audience === 'all') return PRICING_FAQ;
  return PRICING_FAQ.filter((e) => e.audiences.includes(audience));
}
