import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

// Copy follows the owner's AI Support Agent Master Guide v5.0 (2026-10-14):
// Pro does not discount commissions; equipment sales remain 8.7%
// equipment-sale commission. Pay in person / cash sales are retired.

const buildFaq = (proPrice: string, annualPrice: string, featuredPrice: string) => [
  { q: 'What does Vendibook Pro cost?', a: `Vendibook Pro is ${proPrice} per month or ${annualPrice} per year, billed annually. At current pricing, annual billing saves $158 (16.7%), equivalent to two months free. Confirm your renewal details and consent on the subscription screen before you subscribe.` },
  { q: 'How does the Featured subscription work?', a: `Featured is ${featuredPrice} per month for one selected listing. It has no annual option. Cancel anytime; renewal automatically stops when the listing is marked sold. Rental listings renew until cancelled. This subscription is separate from Pro’s included 30-day Boost credit. Applicable tax is shown at checkout.` },
  { q: 'What does Pro include?', a: 'Unlimited eligible active listings, one Featured Boost credit each billing period (credits don\'t roll over or convert to cash), Premium Tools and applicable analytics, PermitPath Plus, priority visibility and support, and eligible BuyerMatch AI buyer-discovery support. Pro does not discount commissions.' },
  { q: 'Does Pro lower my fees?', a: 'No. Pro does not discount commissions. Rental hosts pay 12.9%, renters pay a separate 12.9%, and new online equipment sales have an 8.7% seller commission on both plans.' },
  { q: 'How do the fees work?', a: 'New eligible online equipment sales carry an 8.7% seller commission and no Vendibook buyer platform fee. Rentals are paid by card through Square, with a 12.9% host commission and a separate 12.9% renter service fee. Your final transaction screen shows the actual charges.' },
  { q: 'Does BuyerMatch guarantee a buyer?', a: 'No. BuyerMatch helps research relevant buyer demand and, where activated, supports reviewed outreach for eligible sale listings. Your membership can be active before a campaign starts — the dashboard shows Awaiting Activation until then. Reports show actual recorded activity only; matches, replies, leads and sales are not guaranteed.' },
  { q: 'Is basic listing still free?', a: 'Yes. Creating and publishing a basic listing is free on the Free plan, which supports two active listings (founding-member accounts may have more). Drafts are free and don\'t count toward the limit.' },
  { q: 'What happens when Pro ends?', a: 'New BuyerMatch activity stops when Pro access ends. Historical reports and existing customer conversations remain available. Previously activated boosts complete their purchased duration.' },
  { q: 'What happens to my listings if I downgrade?', a: 'Your listings stay live up to the Free plan\'s active-listing limit. If you have more, the extras are paused and you can choose which to keep active. Nothing is deleted.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel through Account → Subscription. Future renewals stop and access generally continues through the period you already paid for, subject to your billing provider and plan terms.' },
  { q: 'Do you offer refunds?', a: 'Subscription charges are generally nonrefundable unless an approved exception applies, and cancelling doesn\'t automatically refund the current paid period. One-time add-ons like Featured Boost follow the refund terms shown at purchase.' },
];

export function PlansFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const proPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  const annualPrice = useCatalogPrice('vendibook_pro_annual');
  const featuredPrice = useCatalogPrice('featured_listing_monthly');
  const FAQ = buildFaq(proPrice.label, annualPrice.label, featuredPrice.label);
  return (
    <div className="space-y-2">
      <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight mb-8">Questions people ask before subscribing</h3>
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="rounded-[14px] border-[1.5px] border-white/12 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-sm text-foreground/75 leading-relaxed border-t border-white/[0.06]">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PlansFAQ;
