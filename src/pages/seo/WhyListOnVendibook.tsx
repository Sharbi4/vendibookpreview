import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';

const BENEFITS = [
  { h: 'Free to list', p: 'Create a full listing with photos, video, equipment, and price at no cost.' },
  { h: 'Built for food businesses', p: 'Every field is designed for trucks, trailers, carts, and mobile kitchens — not generic classifieds.' },
  { h: 'Reach buyers and renters', p: 'Your listing surfaces across search, category, city, and state pages — and to active inquiries.' },
  { h: 'Accept buyer offers', p: 'Receive offers in-platform. Accept, decline, or counter in a few taps.' },
  { h: 'Chat with prospects', p: 'Built-in messaging with document sharing keeps every conversation in one place.' },
  { h: 'Photos and video', p: 'High-quality images and short video walkthroughs drive far more serious inquiries.' },
  { h: 'Equipment details', p: 'Capture hood, fryer, grill, generator, refrigeration, water tanks, and inspection status.' },
  { h: 'Optional secure transactions', p: 'Use payment protection-style protection where available, including identity-verified parties.' },
  { h: 'Identity verification', p: 'Verified badges on profiles and listings raise buyer and renter confidence.' },
  { h: 'Reviews and trust signals', p: 'Build a trusted reputation through reviews after completed transactions.' },
  { h: 'Feature or boost a listing', p: 'Optional paid placement on category, city, and homepage discovery rows.' },
  { h: 'Rent while waiting to sell', p: 'Earn rental revenue from chefs, caterers, and food entrepreneurs in the meantime.' },
];

const FAQS = [
  {
    question: 'Why should I list my food truck on Vendibook?',
    answer:
      'Vendibook is designed for food truck and food trailer owners who want more than a generic classified listing. Sellers can create detailed listings, receive offers, chat with prospects, upload video, use optional secure transaction tools, and choose whether to sell, rent, or both.',
  },
  {
    question: 'Is it really free to list?',
    answer:
      'Yes. Creating a listing is free. Optional paid features include featured placement and boosts. Marketplace fees apply only when a transaction completes through Vendibook.',
  },
  {
    question: 'Can buyers make offers on Vendibook?',
    answer:
      'Yes — buyers can submit offers directly through your listing, and you can accept, decline, or counter inside Vendibook.',
  },
  {
    question: 'Can I upload video?',
    answer:
      'Yes. Video walkthroughs significantly improve buyer confidence and tend to drive faster, more serious inquiries.',
  },
  {
    question: 'Does Vendibook verify users?',
    answer:
      'Yes — buyers and sellers can verify their identity through Vendibook identity verification. Verified badges appear on profiles and listings where applicable.',
  },
  {
    question: 'Does Vendibook offer secure transactions?',
    answer:
      'Yes. Optional payment protection-style secure transaction tools are available where the transaction type supports it, including identity verification, offer tracking, supporting documents, and reviews after the sale.',
  },
  {
    question: 'Can I sell and rent at the same time?',
    answer:
      'Yes. Eligible owners can list for sale and rent simultaneously, generating rental income while waiting for the right buyer.',
  },
  {
    question: 'What about featured or boosted listings?',
    answer:
      'Optional paid boosts move strong listings to the top of relevant category, city, and homepage rows so they reach more buyers and renters.',
  },
];

const WhyListOnVendibook = () => (
  <AiContentLayout
    title="Why List Your Food Truck on Vendibook?"
    description="List your food truck or food trailer on Vendibook for free. Reach buyers, receive offers, chat with prospects, upload video, and use optional secure transaction tools."
    path="/why-list-on-vendibook"
    h1="Why List Your Food Truck or Trailer on Vendibook?"
    article
    quickAnswer={{
      question: 'Why list on Vendibook?',
      answer:
        'Vendibook is designed for food truck and food trailer owners who want more than a generic classified listing. Sellers can create free listings, receive buyer offers, chat with prospects, add photos and video, use optional secure transaction tools, and choose whether to sell, rent, or both.',
    }}
    faqSchema={FAQS}
  >
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">Built for food trucks and trailers</h2>
      <p className="text-muted-foreground leading-relaxed">
        Mobile food is a real industry. It deserves listing tools that understand hood and
        fire-suppression status, generator wattage, fryers and grills, refrigeration, water tanks,
        permits, dimensions, and the difference between a concession trailer and a coffee trailer.
        Vendibook is built around all of it.
      </p>
    </section>

    <section className="grid md:grid-cols-2 gap-4">
      {BENEFITS.map((b) => (
        <div key={b.h} className="rounded-2xl border border-border bg-card p-5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">{b.h}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{b.p}</p>
        </div>
      ))}
    </section>

    <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Sell, rent, or both</h2>
      <p className="text-muted-foreground leading-relaxed">
        Vendibook lets eligible owners list for sale and rent at the same time. You stay in control
        of the calendar — generate rental revenue from chefs, caterers, and food entrepreneurs
        while waiting for the right buyer.
      </p>
      <div className="flex flex-wrap gap-3 pt-1">
        <Button asChild variant="outline">
          <Link to="/rent-out-my-food-truck">Rent out your food truck</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/list-food-truck-for-sale">List your food truck for sale</Link>
        </Button>
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">Seller FAQ</h2>
      <FaqList items={FAQS} />
    </section>

    <section className="rounded-3xl border border-border bg-card p-8 text-center space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">List your truck or trailer free</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Create a free listing in minutes — photos, video, equipment, and offers all in one place.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg" variant="dark-shine">
          <Link to="/list">List Your Food Truck Free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/what-is-vendibook">What is Vendibook?</Link>
        </Button>
      </div>
    </section>
  </AiContentLayout>
);

export default WhyListOnVendibook;
