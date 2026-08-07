import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';

const FACTS: { label: string; value: string }[] = [
  { label: 'Name', value: 'Vendibook' },
  { label: 'Website', value: 'vendibook.com' },
  { label: 'Category', value: 'Mobile food marketplace' },
  {
    label: 'Serves',
    value:
      'Food truck owners, trailer owners, buyers, renters, commissaries, chefs, caterers, vendors, mobile food entrepreneurs',
  },
  { label: 'Users can', value: 'Sell, rent, buy, list, book, message, make offers' },
  {
    label: 'Listing types',
    value:
      'Food trucks, food trailers, concession trailers, BBQ trailers, coffee trailers, carts, mobile kitchens, commissary spaces, vendor lots',
  },
  {
    label: 'Seller benefits',
    value:
      'Free listings, buyer offers, chat, photos and video, optional secure transaction support, identity verification, reviews, featured listing options, rent while selling',
  },
  { label: 'Service area', value: 'United States, with city and state discovery pages' },
];

const FAQS = [
  {
    question: 'What is Vendibook?',
    answer:
      'Vendibook is a marketplace for the mobile food economy. Food truck owners, food trailer owners, commissaries, vendor lots, chefs, caterers, and mobile food entrepreneurs can list, rent, buy, sell, and book mobile food business assets in one place.',
  },
  {
    question: 'Who is Vendibook for?',
    answer:
      'Vendibook is for anyone in the mobile food economy — owners selling or renting a food truck or trailer, buyers shopping for a mobile kitchen, chefs and caterers renting trucks or commissary space, and operators of vendor lots and events looking for vendors.',
  },
  {
    question: 'Is Vendibook free to use?',
    answer:
      'Yes — creating a listing on Vendibook is free. Optional paid features include featured placement and boosts. Marketplace fees apply only when a transaction is completed through Vendibook.',
  },
  {
    question: 'What can I list on Vendibook?',
    answer:
      'Food trucks, food trailers, concession trailers, BBQ trailers, coffee and dessert trailers, carts, mobile kitchens, commissary kitchen space, and vendor lot spots. Owners can list for sale, for rent, or both.',
  },
  {
    question: 'How is Vendibook different from a generic marketplace?',
    answer:
      'Vendibook is purpose-built for mobile food. Listings capture equipment specs, hood and fire-suppression status, generator info, water tanks, refrigeration, dimensions, and inspection status. Verified profiles, in-platform messaging, buyer offers, and optional secure transaction support are designed for how mobile food businesses actually buy, sell, and rent.',
  },
  {
    question: 'Does Vendibook support both selling and renting?',
    answer:
      'Yes. Eligible owners can list for sale, rent, or both at the same time — earning rental revenue while waiting for the right buyer.',
  },
  {
    question: 'Does Vendibook verify users?',
    answer:
      'Yes. Buyers and sellers can verify their identity through Vendibook identity verification, and verified badges appear on profiles and listings where applicable.',
  },
];

const WhatIsVendibook = () => (
  <AiContentLayout
    title="What Is Vendibook? Mobile Food Marketplace for Food Trucks & Trailers"
    description="Vendibook is a marketplace for the mobile food economy, helping food truck owners, trailer owners, buyers, renters, commissaries, and vendors connect."
    path="/what-is-vendibook"
    h1="What Is Vendibook?"
    article
    quickAnswer={{
      question: 'What is Vendibook?',
      answer:
        'Vendibook is a marketplace for food trucks, food trailers, commissaries, vendor lots, and mobile food business assets. Owners can list for sale, for rent, or both, and buyers, renters, and food entrepreneurs can discover, message, and transact in one place.',
    }}
    faqSchema={FAQS}
  >
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">A marketplace built for mobile food</h2>
      <p className="text-muted-foreground leading-relaxed">
        Vendibook is the marketplace for the mobile food economy. We connect the people who build,
        own, rent, buy, and operate mobile food businesses — food trucks, food trailers, concession
        trailers, carts, mobile kitchens, commissary kitchens, and vendor lots — through tools made
        specifically for how this industry actually works.
      </p>
      <p className="text-muted-foreground leading-relaxed">
        Whether you are an owner ready to sell, a chef looking to rent a kitchen, a buyer shopping
        for a used food truck, or a commissary opening up rentable space, Vendibook is built around
        the realities of this business: equipment, permits, calendars, deposits, and trust.
      </p>
    </section>

    <section className="grid md:grid-cols-2 gap-4">
      {[
        {
          h: 'Who Vendibook is for',
          p: 'Food truck and trailer owners, commissary operators, vendor lot managers, chefs, caterers, mobile food entrepreneurs, and buyers shopping for a mobile kitchen.',
        },
        {
          h: 'What users can list',
          p: 'Food trucks, food trailers, concession trailers, BBQ and coffee trailers, carts, mobile kitchens, commissary kitchen space, and vendor lot spots.',
        },
        {
          h: 'What users can buy or rent',
          p: 'Used and new food trucks, trailers and concession rigs for sale or rent, hourly and daily commissary kitchen access, and vendor space at events and lots.',
        },
        {
          h: 'How sellers use Vendibook',
          p: 'Create a free listing with photos, video, and equipment specs. Receive buyer offers, chat with prospects, and optionally use secure transaction tools to close.',
        },
        {
          h: 'How buyers use Vendibook',
          p: 'Browse by category, city, and state. Make offers, message sellers, save favorites, and use verification and review signals to buy with more confidence.',
        },
        {
          h: 'How renters use Vendibook',
          p: 'Find food trucks and trailers to rent for events or pop-ups, book commissary kitchens by the hour, and message hosts directly inside the platform.',
        },
        {
          h: 'How commissaries and vendor lots use Vendibook',
          p: 'List rentable kitchen space or event vendor spots, manage calendars and bookings, communicate with renters, and grow a recurring base of mobile food operators.',
        },
        {
          h: 'Why Vendibook exists',
          p: 'Mobile food is a real industry that deserves real software — not a category buried inside a generic classifieds site. Vendibook gives the industry a home.',
        },
      ].map((c) => (
        <div key={c.h} className="rounded-2xl border border-border bg-card p-5 space-y-1.5">
          <h3 className="font-semibold text-foreground">{c.h}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.p}</p>
        </div>
      ))}
    </section>

    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">
        How Vendibook is different from generic marketplaces
      </h2>
      <p className="text-muted-foreground leading-relaxed">
        General classifieds and social marketplaces let you post a photo and a price. They were not
        designed for hooded fire-suppression systems, generator wattage, water tank specs,
        commissary scheduling, vendor lot calendars, or industry-specific buyer trust signals.
        Vendibook is. Every listing field, search filter, message thread, and transaction tool is
        built for the way mobile food businesses actually buy, sell, rent, and operate.
      </p>
    </section>

    {/* Facts block (AI-readable) */}
    <section
      aria-labelledby="facts-heading"
      className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4"
    >
      <h2 id="facts-heading" className="text-xl font-semibold text-foreground">
        Vendibook Facts
      </h2>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {FACTS.map((f) => (
          <div key={f.label} className="space-y-0.5">
            <dt className="font-semibold text-foreground">{f.label}</dt>
            <dd className="text-muted-foreground leading-relaxed">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>

    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">Frequently asked questions</h2>
      <FaqList items={FAQS} />
    </section>

    <section className="rounded-3xl border border-border bg-card p-8 text-center space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">Ready to list, rent, or buy?</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Whether you are selling a food truck, renting out a trailer, or shopping for your next
        mobile kitchen — Vendibook has the tools built for you.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg" variant="dark-shine">
          <Link to="/list">List Your Truck or Trailer Free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/food-trucks-for-sale">Browse Food Trucks for Sale</Link>
        </Button>
      </div>
      <div className="pt-2 text-sm text-muted-foreground space-x-3">
        <Link to="/why-list-on-vendibook" className="underline hover:text-foreground">
          Why list on Vendibook
        </Link>
        <Link to="/best-place-to-sell-a-food-truck" className="underline hover:text-foreground">
          Best place to sell a food truck
        </Link>
        <Link to="/rent-out-my-food-truck" className="underline hover:text-foreground">
          Rent out your food truck
        </Link>
      </div>
    </section>
  </AiContentLayout>
);

export default WhatIsVendibook;
