/**
 * Canonical, audience-scoped pricing answers.
 *
 * One source of truth for every "what does this cost?" surface:
 *   /faq, /help, /how-it-works, /how-it-works-seller, /how-it-works-host.
 *
 * Numbers must match src/lib/commissions.ts and src/lib/fees/proFee.ts:
 *   Sales  — 12.9% seller commission, $0 buyer fee.
 *   Rentals— 12.9% host commission + 12.9% renter service fee.
 *   Pay in Person (cash) SALES — 100% free, no commission, no fee.
 *   Rentals paid in person still owe host commission.
 *   Vendibook Pro — 10.9% on the eligible seller/host side, savings capped
 *   at $500 per completed transaction.
 *
 * Payout language rule: do NOT describe general online payouts as instant,
 * automatic, or 24-hour. Vendibook reviews and issues the payout after the
 * transaction completes. The 24-hour promise applies ONLY to successfully
 * completed financed purchases (see `financing-payout`).
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
    question: 'Does it cost anything to list on Vendibook?',
    answer:
      'No. Creating your account, building a standard listing, and publishing it are free, subject to the active-listing limit on your plan. There is no listing fee and no card required to go live. Identity verification is optional and is not required to publish. Concierge listing creation is an optional paid service — self-service listing stays free.',
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Create a free listing', href: '/list' },
  },
  {
    id: 'seller-commission',
    question: 'What does it cost to sell if the sale runs through Vendibook?',
    answer:
      "A 12.9% platform commission comes out of a completed sale — nothing up front, nothing if it doesn't sell. That covers PayPal checkout, the e-signed bill of sale, dispute mediation, and your payout. Buyers pay $0 in platform fees. Active Vendibook Pro members pay 10.9% instead of 12.9% on the seller side, with the savings capped at $500 per completed transaction.",
    audiences: ['seller', 'all'],
    cta: { label: 'See the full fee breakdown', href: '/pricing' },
  },
  {
    id: 'pay-in-person-free',
    question: 'What if the buyer pays me in person?',
    answer:
      'Then the equipment sale is 100% free. Pay-in-Person sales carry no Vendibook commission and no buyer fee — we are not processing the money, so we do not take a cut. You still get the listing, the messaging, and the paperwork. Rentals settled in person still owe the standard host commission, because the booking, calendar, and agreement run on Vendibook.',
    audiences: ['seller', 'buyer', 'all'],
  },
  {
    id: 'buyer-fees',
    question: 'What do buyers pay in fees?',
    answer:
      'Nothing. $0 platform fee on purchases. You pay the agreed price, plus delivery or freight if you choose it. When you pay through Vendibook checkout, funds are held by PayPal and are not released to the seller until the sale is completed and confirmed.',
    audiences: ['buyer', 'all'],
    cta: { label: 'Browse trucks & trailers', href: '/search?mode=sale' },
  },
  {
    id: 'rental-fees',
    question: 'How do rental fees work?',
    answer:
      'Rentals are dual-sided: the host pays 12.9% commission out of the payout, and the renter pays a 12.9% service fee on top of the booking subtotal. Both numbers are shown before anything is confirmed. The Vendibook Pro discount (10.9%) applies to the host side only — the renter service fee stays 12.9%.',
    audiences: ['host', 'renter', 'all'],
    cta: { label: 'See rental pricing', href: '/pricing' },
  },
  {
    id: 'host-earnings',
    question: 'What will I actually take home as a host?',
    answer:
      'Your booking subtotal minus 12.9% (or 10.9% with active Vendibook Pro). A $1,000 kitchen booking nets a free-plan host $871, and the renter is charged $1,129 — both sides see the math before the booking is accepted. Vendibook reviews and issues host payouts after the booking is completed, to the payout destination you have on file.',
    audiences: ['host', 'all'],
  },
  {
    id: 'paypal-payments',
    question: 'How do payments actually move — who processes them?',
    answer:
      'Vendibook checkout runs on PayPal Business. Buyers and renters can pay with a PayPal balance, a linked bank account, or a debit/credit card through PayPal — no PayPal account needed to use a card. Funds are held after payment rather than handed straight to the seller. Vendibook records the seller proceeds and issues the payout to the method you saved (PayPal, Venmo, Cash App, or bank transfer). We never see or store your card number.',
    audiences: ['seller', 'host', 'buyer', 'renter', 'all'],
    cta: { label: 'How payments work', href: '/payments' },
  },
  {
    id: 'payout-timing',
    question: 'When does the seller or host actually get paid?',
    answer:
      'Vendibook reviews and issues the payout after the transaction is complete — for a sale that means after delivery or handoff is confirmed, and for a rental after the booking has started and completed as agreed. Payouts are not automatic or instant. One exception: on a successfully completed financed purchase, seller payment is released within 24 hours after successful delivery and confirmation.',
    audiences: ['seller', 'host', 'all'],
  },
  {
    id: 'equinox-financing',
    question: 'Can buyers finance a truck instead of paying cash?',
    answer:
      'Yes. Buyer financing is available on eligible published for-sale listings through third-party financing partners surfaced by Vendibook, including Equinox Funding. The buyer applies directly with the partner; the seller does not manage the application. Vendibook is not a lender, does not approve applicants, and does not set rates, terms, or guarantee funding. Buyers can download a Pro Forma Invoice from the listing to submit with an application.',
    audiences: ['seller', 'buyer', 'all'],
    cta: { label: 'See current financing options', href: '/financing' },
  },
  {
    id: 'financing-payout',
    question: 'How fast does a seller get paid on a financed purchase?',
    answer:
      'On a successfully completed financed Vendibook purchase, seller payment is released within 24 hours after successful delivery and confirmation. This applies to financed purchases specifically — other online transactions follow the standard review-and-release schedule.',
    audiences: ['seller', 'all'],
    cta: { label: 'Financing details', href: '/financing' },
  },
  {
    id: 'subscriptions-optional',
    question: 'Do I need a paid plan to sell or host?',
    answer:
      'No. The free plan covers listing, messaging, checkout, and payouts. Vendibook Pro and one-time upgrades such as Featured Boost add reach, tooling, and a reduced seller/host fee — they change how fast you sell, not whether you can.',
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Compare plans', href: '/pricing' },
  },
  {
    id: 'identity-optional',
    question: 'Is identity verification required?',
    answer:
      'No. The Identity Verified badge is an optional paid add-on powered by Plaid. It is never required to buy, sell, rent, publish, get paid, or use pay-in-person. Not every buyer or seller on Vendibook is verified — the badge only tells you that the person completed the check.',
    audiences: ['seller', 'host', 'buyer', 'renter', 'all'],
    cta: { label: 'About verification', href: '/identity-verification' },
  },
];

export function getPricingFaq(audience: PricingAudience): PricingFaqEntry[] {
  if (audience === 'all') return PRICING_FAQ;
  return PRICING_FAQ.filter((e) => e.audiences.includes(audience));
}
