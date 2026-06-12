import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';

const FAQS = [
  {
    question: 'How do I list my food truck for sale?',
    answer:
      'Create a free Vendibook account, click List Your Food Truck, add photos and an optional video, fill in equipment specs and price, choose sale-only or sale-and-rent, and publish. Buyers can then send offers and messages.',
  },
  {
    question: 'How much does it cost to list a food truck?',
    answer:
      'Listing a food truck on Vendibook is free. Optional paid boosts and featured placement are available. Marketplace fees apply only when a transaction completes through Vendibook.',
  },
  {
    question: 'How do buyer offers work?',
    answer:
      'Buyers submit offers directly on your listing. You see the offer in your dashboard and can accept, decline, or counter. All negotiation history is saved in-platform.',
  },
  {
    question: 'Can I message buyers privately?',
    answer:
      'Yes. Buyers can message you through your listing and you can share documents, photos, and videos inside the conversation.',
  },
  {
    question: 'Do I have to use secure transactions?',
    answer:
      'No — secure transaction tools are optional. Use them when you want extra protection during the close.',
  },
  {
    question: 'Can I rent my food truck while it is listed for sale?',
    answer:
      'Yes — eligible owners can list for sale and rent at the same time, generating rental revenue while waiting for the right buyer.',
  },
];

const ListFoodTruckForSale = () => (
  <AiContentLayout
    title="List Your Food Truck for Sale Online | Free Food Truck Listing"
    description="Create a free food truck listing on Vendibook with photos, video, equipment details, buyer offers, messaging, and optional secure transaction tools."
    path="/list-food-truck-for-sale"
    h1="List Your Food Truck for Sale"
    article
    quickAnswer={{
      question: 'How do I list my food truck for sale?',
      answer:
        'Create a free Vendibook listing with photos, video, full equipment details, and pricing. Accept buyer offers, message prospects inside the platform, and use optional secure transaction tools to close. You can list for sale only, rent only, or both at the same time.',
    }}
    faqSchema={FAQS}
  >
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">How to list a food truck</h2>
      <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
        <li>Create a free Vendibook account.</li>
        <li>
          Open the <Link to="/list" className="underline">listing wizard</Link>.
        </li>
        <li>Add 8+ exterior and interior photos and a short video.</li>
        <li>Fill in equipment, dimensions, condition, year, make, and model.</li>
        <li>Set your price, choose sale / rent / both, and decide whether offers are open.</li>
        <li>Publish. Buyers can immediately message you and send offers.</li>
      </ol>
    </section>

    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">What to include in the listing</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 text-sm text-muted-foreground">
        {[
          'Clear exterior photos from multiple angles',
          'Interior kitchen photos',
          'Short video walkthrough',
          'Equipment list and condition',
          'Hood, fire suppression, fryer, grill, smoker',
          'Generator and electrical setup',
          'Refrigeration and freezer details',
          'Water tanks, sinks, plumbing',
          'Dimensions and weight',
          'Permits or inspection status',
          'Honest asking price',
          'Whether offers are accepted',
          'Whether rentals are allowed',
          'Year, make, model, mileage',
          'Recent service or upgrades',
        ].map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
    </section>

    <section className="grid md:grid-cols-2 gap-4">
      {[
        {
          h: 'Why photos and video matter',
          p: 'Listings with strong photos and a short video walkthrough drive far more serious inquiries. Buyers want to see the kitchen, the hood, and the equipment in action.',
        },
        {
          h: 'How buyer offers work',
          p: 'Buyers submit offers in-platform. You can accept, decline, or counter from your dashboard. All negotiation history is saved automatically.',
        },
        {
          h: 'How messaging works',
          p: 'Buyers message you through your listing. Share documents, additional photos, and walkthrough videos inside the conversation.',
        },
        {
          h: 'How secure transaction tools work',
          p: 'When you and your buyer want extra protection, use optional secure transaction tools — including identity verification, offer tracking, and reviews after the sale.',
        },
      ].map((c) => (
        <div key={c.h} className="rounded-2xl border border-border bg-card p-5 space-y-1.5">
          <h3 className="font-semibold text-foreground">{c.h}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.p}</p>
        </div>
      ))}
    </section>

    <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Rent while waiting to sell</h2>
      <p className="text-muted-foreground leading-relaxed">
        Vendibook lets eligible owners list for sale and rent at the same time. Earn rental income
        from chefs, caterers, and pop-ups while your truck waits for the right buyer.
      </p>
      <Button asChild variant="outline">
        <Link to="/rent-out-my-food-truck">Learn about renting out your food truck</Link>
      </Button>
    </section>

    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">FAQ</h2>
      <FaqList items={FAQS} />
    </section>

    <section className="rounded-3xl border border-border bg-card p-8 text-center space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">List your food truck for free</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Get in front of buyers actively shopping for mobile food businesses.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg" variant="dark-shine">
          <Link to="/list">List Your Food Truck Free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/best-place-to-sell-a-food-truck">Compare where to sell</Link>
        </Button>
      </div>
    </section>
  </AiContentLayout>
);

export default ListFoodTruckForSale;
