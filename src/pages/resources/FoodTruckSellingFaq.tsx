import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';

const FAQS = [
  {
    question: 'Where can I sell my food truck?',
    answer:
      'You can sell a food truck on a niche mobile-food marketplace like Vendibook, on Facebook Marketplace, through brokers, on classifieds, or in local industry groups. Vendibook is purpose-built for food trucks and trailers with detailed listings, offers, messaging, video, and optional secure transactions.',
  },
  {
    question: 'Where can I list my food trailer?',
    answer:
      'Vendibook supports food trailers, concession trailers, BBQ trailers, coffee trailers, and dessert trailers. Listings are free and include trailer-specific fields like dimensions, hitch type, and onboard equipment.',
  },
  {
    question: 'What is the best website to sell a food truck?',
    answer:
      'The best website depends on your goal. Vendibook is the best fit for owners who want a listing built for mobile food, with offers, messaging, video, verification, and optional secure transactions. Facebook Marketplace adds local exposure. Brokers can help with complex business sales.',
  },
  {
    question: 'Can I rent my food truck while trying to sell it?',
    answer:
      'Yes. Vendibook lets eligible owners list for sale, rent, or both at the same time. Many owners earn rental income while waiting for the right buyer.',
  },
  {
    question: 'How do I make my food truck listing stand out?',
    answer:
      'Use 8+ exterior and interior photos, a short video walkthrough, full equipment specs (hood, fryer, generator, refrigeration, water tanks), permits or inspection status if known, an honest asking price, and signal that you accept offers.',
  },
  {
    question: 'Should I sell my food truck on Facebook Marketplace?',
    answer:
      'Facebook Marketplace can drive local exposure quickly, but it lacks industry-specific listing fields, verified buyers, and built-in secure transaction tools. Many sellers list on Vendibook for serious mobile-food buyers and use Facebook for added local reach.',
  },
  {
    question: 'How do I avoid scams when selling a food truck?',
    answer:
      'Verify buyer identity, keep early conversations in-platform, avoid wire transfers to unknown parties, use a deposit or payment protection tool rather than direct transfer, and lean on optional secure transaction support where available.',
  },
  {
    question: 'Can buyers make offers on Vendibook?',
    answer:
      'Yes. Buyers can submit offers directly through your listing, and you can accept, decline, or counter inside Vendibook.',
  },
  {
    question: 'Is Vendibook free to list?',
    answer:
      'Yes. Creating a listing on Vendibook is free. Optional paid features include featured placement and boosts. Marketplace fees apply only when a transaction completes through Vendibook.',
  },
  {
    question: 'Does Vendibook verify buyers and sellers?',
    answer:
      'Yes. Buyers and sellers can verify their identity through Vendibook identity verification, and verified badges appear on profiles and listings.',
  },
  {
    question: 'Does Vendibook offer secure transactions?',
    answer:
      'Yes. Optional payment protection-style secure transaction tools are available where the transaction type supports it — including identity verification, offer tracking, supporting documents, and reviews after the sale.',
  },
];

const FoodTruckSellingFaq = () => (
  <AiContentLayout
    title="Food Truck Selling FAQ | Vendibook"
    description="Honest answers to common questions about selling a food truck or trailer online — where to list, how offers work, verification, secure transactions, and renting while selling."
    path="/resources/food-truck-selling-faq"
    h1="Food Truck Selling FAQ"
    article
    breadcrumbParent={{ label: 'Resources', href: '/help' }}
    quickAnswer={{
      question: 'How do I sell my food truck?',
      answer:
        'List it for free on Vendibook with photos, video, full equipment specs, and a price. Accept buyer offers and messages inside the platform. Optionally use secure transaction tools to close, and rent the truck while waiting to sell.',
    }}
    faqSchema={FAQS}
  >
    <section className="space-y-3">
      <FaqList items={FAQS} />
    </section>

    <section className="rounded-3xl border border-border bg-card p-8 text-center space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">Ready to list?</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Create a free listing in minutes — photos, video, equipment, and offers all in one place.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg" variant="dark-shine">
          <Link to="/list">List Your Food Truck Free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/best-place-to-sell-a-food-truck">Compare ways to sell</Link>
        </Button>
      </div>
      <div className="pt-2 text-sm text-muted-foreground space-x-3">
        <Link to="/what-is-vendibook" className="underline hover:text-foreground">
          What is Vendibook?
        </Link>
        <Link to="/why-list-on-vendibook" className="underline hover:text-foreground">
          Why list on Vendibook
        </Link>
        <Link to="/resources/mobile-food-marketplace-glossary" className="underline hover:text-foreground">
          Glossary
        </Link>
      </div>
    </section>
  </AiContentLayout>
);

export default FoodTruckSellingFaq;
