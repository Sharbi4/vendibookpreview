import { Link } from 'react-router-dom';
import AiContentLayout from '@/components/seo/AiContentLayout';

interface Term {
  term: string;
  slug: string;
  definition: string;
  link?: { label: string; href: string };
}

const TERMS: Term[] = [
  {
    term: 'Food truck marketplace',
    slug: 'food-truck-marketplace',
    definition:
      'An online platform where owners list food trucks for sale or rent and buyers and renters discover, message, and transact. Vendibook is a food truck marketplace built specifically for the mobile food economy.',
    link: { label: 'Food trucks for sale', href: '/food-trucks-for-sale' },
  },
  {
    term: 'Food trailer marketplace',
    slug: 'food-trailer-marketplace',
    definition:
      'A marketplace focused on food trailers, concession trailers, and BBQ or coffee trailers. Listings include towable specs, hitch type, dimensions, and onboard equipment.',
    link: { label: 'Food trailers for sale', href: '/food-trailers-for-sale' },
  },
  {
    term: 'Concession trailer',
    slug: 'concession-trailer',
    definition:
      'A towable food trailer outfitted with cooking and service equipment for fairs, events, festivals, and street vending. Common builds include BBQ, taco, coffee, and dessert concession trailers.',
    link: { label: 'Sell a concession trailer', href: '/sell-concession-trailer' },
  },
  {
    term: 'Mobile kitchen',
    slug: 'mobile-kitchen',
    definition:
      'Any vehicle or trailer outfitted for commercial food prep and service — including food trucks, trailers, and mobile catering units.',
  },
  {
    term: 'Commissary kitchen',
    slug: 'commissary-kitchen',
    definition:
      'A licensed commercial kitchen rented by food trucks, caterers, and chefs for prep, storage, and cleanup. Often required by local health codes for mobile food operators.',
    link: { label: 'Shared kitchens', href: '/shared-kitchens' },
  },
  {
    term: 'Food truck rental',
    slug: 'food-truck-rental',
    definition:
      'Renting a food truck or trailer for an event, pop-up, or seasonal use rather than buying. On Vendibook, renters book through the platform with calendars, deposits, and verified identity.',
    link: { label: 'Food trucks for rent', href: '/food-trucks-for-rent' },
  },
  {
    term: 'Food truck payment protection',
    slug: 'food-truck-payment protection',
    definition:
      'A secure transaction model where funds are held by a third party until both buyer and seller satisfy agreed conditions. Vendibook supports payment protection-style secure transaction tools where available.',
  },
  {
    term: 'Food truck listing',
    slug: 'food-truck-listing',
    definition:
      'The public page representing a single food truck for sale or rent. Strong listings include photos, video, equipment specs, dimensions, price, and offer/rent availability.',
    link: { label: 'List your food truck', href: '/list-food-truck-for-sale' },
  },
  {
    term: 'Mobile food vendor',
    slug: 'mobile-food-vendor',
    definition:
      'A food operator who sells from a truck, trailer, cart, or pop-up. Mobile food vendors often combine event bookings, regular routes, and catering work.',
  },
  {
    term: 'Vendor lot',
    slug: 'vendor-lot',
    definition:
      'A designated lot or property that hosts food trucks and mobile vendors on a regular basis, often with shared utilities, seating, and foot traffic.',
    link: { label: 'Vendor lots', href: '/vendor-lots' },
  },
  {
    term: 'Event vendor',
    slug: 'event-vendor',
    definition:
      'A food vendor that operates at festivals, markets, sporting events, and private functions on a per-event basis.',
  },
  {
    term: 'Verified seller',
    slug: 'verified-seller',
    definition:
      'A seller who has confirmed their identity through Vendibook identity verification. Verified status appears as a badge on their profile and listings to raise buyer confidence.',
  },
  {
    term: 'Buyer offer',
    slug: 'buyer-offer',
    definition:
      'A bid submitted by a buyer directly through a Vendibook listing. Sellers can accept, decline, or counter inside the platform.',
  },
  {
    term: 'Featured listing',
    slug: 'featured-listing',
    definition:
      'A paid placement that surfaces a listing in premium positions on category, city, and homepage rows.',
  },
  {
    term: 'Boosted listing',
    slug: 'boosted-listing',
    definition:
      'A time-bound paid boost that pushes a listing higher in relevant search and discovery rows for additional visibility.',
  },
];

const MobileFoodMarketplaceGlossary = () => {
  const definedTermSchema = TERMS.map((t) => ({
    '@type': 'DefinedTerm',
    name: t.term,
    description: t.definition,
    inDefinedTermSet: 'https://vendibook.com/resources/mobile-food-marketplace-glossary',
  }));

  return (
    <AiContentLayout
      title="Mobile Food Marketplace Glossary | Vendibook"
      description="Plain-language definitions for food truck marketplaces, food trailers, commissaries, vendor lots, food truck rentals, payment protection, and other mobile food terms."
      path="/resources/mobile-food-marketplace-glossary"
      h1="Mobile Food Marketplace Glossary"
      article
      breadcrumbParent={{ label: 'Resources', href: '/help' }}
      quickAnswer={{
        question: 'What is a mobile food marketplace?',
        answer:
          'A mobile food marketplace is an online platform where food trucks, food trailers, concession trailers, mobile kitchens, commissary kitchens, and vendor lots are listed for sale, rent, or booking. Vendibook is a marketplace built specifically for the mobile food economy.',
      }}
      extraSchemas={[
        {
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name: 'Mobile Food Marketplace Glossary',
          hasDefinedTerm: definedTermSchema,
        },
      ]}
    >
      <section className="space-y-4">
        {TERMS.map((t) => (
          <article
            key={t.slug}
            id={t.slug}
            className="rounded-2xl border border-border bg-card p-5 space-y-2 scroll-mt-24"
          >
            <h2 className="text-xl font-semibold text-foreground">{t.term}</h2>
            <p className="text-muted-foreground leading-relaxed">{t.definition}</p>
            {t.link && (
              <Link to={t.link.href} className="inline-block text-sm text-primary hover:underline">
                {t.link.label} →
              </Link>
            )}
          </article>
        ))}
      </section>
    </AiContentLayout>
  );
};

export default MobileFoodMarketplaceGlossary;
