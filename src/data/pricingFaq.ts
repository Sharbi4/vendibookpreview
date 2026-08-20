/**
 * Canonical, audience-scoped pricing answers.
 *
 * One source of truth for every "what does this cost?" surface:
 *   /faq, /help, /how-it-works, /how-it-works-seller, /how-it-works-host.
 *
 * Numbers must match src/lib/commissions.ts:
 *   Sales  — 12.9% seller commission, $0 buyer fee.
 *   Rentals— 12.9% host commission + 12.9% renter service fee.
 *   Pay in Person (cash) SALES — 100% free, no commission, no fee.
 *   Rentals paid in person still owe host commission.
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
      "No. Creating your account, building the listing, and publishing it are free — forever. There is no listing fee, no monthly minimum, and no card required to go live. Vendibook only earns when you do.",
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Create a free listing', href: '/list' },
  },
  {
    id: 'seller-commission',
    question: 'What does it cost to sell if the sale runs through Vendibook?',
    answer:
      "A flat 12.9% platform commission comes out of the sale — nothing up front, nothing if it doesn't sell. That single number covers secure PayPal checkout, buyer payment protection, the e-signed bill of sale, dispute mediation, and your payout. Buyers pay $0 in platform fees, which keeps your asking price competitive.",
    audiences: ['seller', 'all'],
    cta: { label: 'See the full fee breakdown', href: '/pricing' },
  },
  {
    id: 'pay-in-person-free',
    question: 'What if the buyer pays me in person?',
    answer:
      "Then it is 100% free. Pay-in-Person cash sales carry no commission and no buyer fee — we are not processing the money, so we do not take a cut. You still get the listing, the messaging, and the paperwork. (Rentals settled in person still owe the standard host commission, because the booking, calendar, and agreement run on Vendibook.)",
    audiences: ['seller', 'buyer', 'all'],
  },
  {
    id: 'buyer-fees',
    question: 'What do buyers pay in fees?',
    answer:
      "Nothing. $0 platform fee on purchases. You pay the agreed price (plus delivery or freight if you choose it) and your money is held through PayPal until you confirm you received exactly what was listed.",
    audiences: ['buyer', 'all'],
    cta: { label: 'Browse trucks & trailers', href: '/search?mode=sale' },
  },
  {
    id: 'rental-fees',
    question: 'How do rental fees work?',
    answer:
      "Rentals are dual-sided: the host pays 12.9% commission out of the payout, and the renter pays a 12.9% service fee on top of the booking subtotal. You see both numbers before anything is confirmed — the host sees exact net earnings, the renter sees the exact total. No cleaning-fee games, no surprise line items at checkout.",
    audiences: ['host', 'renter', 'all'],
    cta: { label: 'See rental pricing', href: '/pricing' },
  },
  {
    id: 'host-earnings',
    question: 'What will I actually take home as a host?',
    answer:
      "Your booking subtotal minus 12.9%. A $1,000 kitchen booking nets you $871, and the renter is charged $1,129 — both sides are shown the math before the booking is accepted. Rental payouts release 24 hours after the booking start; sale payouts are typically released within 24 hours of delivery confirmation, and we always strive to release within 24 to 48 hours.",
    audiences: ['host', 'all'],
  },
  {
    id: 'paypal-payments',
    question: 'How do payments actually move — who processes them?',
    answer:
      "Vendibook checkout runs on PayPal Business. Buyers and renters can pay with a PayPal balance, a linked bank account, or a debit/credit card through PayPal — no PayPal account needed to use a card. Funds are held after payment, not handed straight to the seller, and Vendibook records the seller's proceeds and releases the payout to the method you saved (PayPal, Venmo, Cash App, or bank transfer). We never see or store your card number.",
    audiences: ['seller', 'host', 'buyer', 'renter', 'all'],
    cta: { label: 'How payments work', href: '/payments' },
  },
  {
    id: 'equinox-financing',
    question: 'Can buyers finance a truck instead of paying cash?',
    answer:
      "Yes — Vendibook partners with Equinox Funding for equipment financing on eligible for-sale listings. Buyers apply in minutes, and sellers get paid the full amount at closing; the buyer repays Equinox. Sellers can switch financing on for a listing during the wizard, and buyers can download a Pro Forma Invoice straight from the listing to submit with an application. Rates and terms come from Equinox, not Vendibook.",
    audiences: ['seller', 'buyer', 'all'],
    cta: { label: 'Explore financing', href: '/financing' },
  },
  {
    id: 'subscriptions-optional',
    question: 'Do I need a paid plan to sell or host?',
    answer:
      "No. The free plan covers listing, messaging, checkout, and payouts. Paid plans (and one-time upgrades like Featured Boost) exist for people who want more active listings, AI listing tools, analytics, and placement — they change how fast you sell, not whether you can.",
    audiences: ['seller', 'host', 'all'],
    cta: { label: 'Compare plans', href: '/pricing' },
  },
  {
    id: 'identity-optional',
    question: 'Is identity verification required?',
    answer:
      "No. The Identity Verified badge is an optional paid add-on powered by Plaid. It is never required to buy, sell, rent, publish, or get paid — verified sellers simply tend to get more replies and faster offers.",
    audiences: ['seller', 'host', 'buyer', 'renter', 'all'],
    cta: { label: 'About verification', href: '/identity-verification' },
  },
];

export function getPricingFaq(audience: PricingAudience): PricingFaqEntry[] {
  if (audience === 'all') return PRICING_FAQ;
  return PRICING_FAQ.filter((e) => e.audiences.includes(audience));
}
