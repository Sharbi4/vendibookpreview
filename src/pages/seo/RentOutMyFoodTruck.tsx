import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';

const FAQS = [
  {
    question: 'Can I rent out my food truck on Vendibook?',
    answer:
      'Yes. Eligible owners can list a food truck or trailer for rent, accept booking requests, communicate with renters, and use verification and trust tools to rent with confidence.',
  },
  {
    question: 'Can I rent it out while trying to sell it?',
    answer:
      'Yes — Vendibook supports listing for sale, rent, or both. Many owners earn rental income from chefs, caterers, and pop-ups while waiting for the right buyer.',
  },
  {
    question: 'How do booking requests work?',
    answer:
      'Renters submit booking requests with dates and use case. You review, message, and approve or decline directly from your dashboard. Calendars stay in sync automatically.',
  },
  {
    question: 'Can I set renter rules?',
    answer:
      'Yes — add renter instructions, equipment rules, maintenance notes, and usage policies that renters must acknowledge before booking.',
  },
  {
    question: 'How do payments work?',
    answer:
      'Rentals are paid through Vendibook with platform-managed payouts. Marketplace fees apply, and payouts are released on a defined schedule after the booking.',
  },
  {
    question: 'Are renters verified?',
    answer:
      'Renters can verify their identity through Vendibook identity verification, and verified badges appear on their profile. You can also require business information for commercial bookings.',
  },
];

const RentOutMyFoodTruck = () => (
  <AiContentLayout
    title="Rent Out Your Food Truck or Trailer | Vendibook"
    description="List your food truck or food trailer for rent on Vendibook. Accept booking requests, communicate with renters, and rent while waiting to sell."
    path="/rent-out-my-food-truck"
    h1="Rent Out Your Food Truck or Trailer"
    article
    quickAnswer={{
      question: 'How do I rent out my food truck?',
      answer:
        'List your food truck or trailer for rent on Vendibook. Set your rates, add renter instructions and equipment rules, accept booking requests, communicate inside the platform, and use verification and trust tools to rent with confidence. You can rent while waiting to sell.',
    }}
    faqSchema={FAQS}
  >
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">Rent your food truck or trailer</h2>
      <p className="text-muted-foreground leading-relaxed">
        Turn downtime into income. Vendibook handles bookings, payments, and document review — you
        decide who steps into your kitchen and when. Chefs, caterers, pop-ups, and mobile food
        entrepreneurs are actively renting trucks and trailers across the country.
      </p>
    </section>

    <section className="grid md:grid-cols-2 gap-4">
      {[
        { h: 'Rent while waiting to sell', p: 'Eligible owners can list for sale and rent at the same time. Earn rental revenue while you wait for the right buyer.' },
        { h: 'Manage booking requests', p: 'Review every request before it’s confirmed. Approve, decline, or message renters in seconds.' },
        { h: 'Add renter instructions', p: 'Capture pickup procedures, propane handling, generator startup, and shutdown checklists.' },
        { h: 'Add equipment rules', p: 'Specify what renters can and can’t use, how to handle fryer oil, hood cleaning, and water tanks.' },
        { h: 'Add maintenance notes', p: 'Document required cleaning, inspection cadence, and any care quirks your truck or trailer has.' },
        { h: 'Communicate with renters', p: 'In-platform messaging keeps every conversation, document, and detail in one place.' },
        { h: 'Verification and trust', p: 'Renters can verify identity through Vendibook identity verification. Require business info for commercial bookings.' },
        { h: 'Calendar control', p: 'Block dates, set lead times, and toggle availability anytime.' },
      ].map((c) => (
        <div key={c.h} className="rounded-2xl border border-border bg-card p-5 space-y-1.5">
          <h3 className="font-semibold text-foreground">{c.h}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.p}</p>
        </div>
      ))}
    </section>

    <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Already trying to sell? List for rent too.</h2>
      <p className="text-muted-foreground leading-relaxed">
        Owners who list both for sale and rent often close their sale faster while generating income
        in the meantime. You stay in control of the calendar and can pause rentals anytime.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/list-food-truck-for-sale">List your food truck for sale</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/best-place-to-sell-a-food-truck">Compare ways to sell</Link>
        </Button>
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-foreground">FAQ</h2>
      <FaqList items={FAQS} />
    </section>

    <section className="rounded-3xl border border-border bg-card p-8 text-center space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">List your food truck for rent</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Create a free rental listing in minutes — calendars, renter rules, and payments handled.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild size="lg" variant="dark-shine">
          <Link to="/list">List Your Truck for Rent</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/food-trucks-for-rent">Browse food trucks for rent</Link>
        </Button>
      </div>
    </section>
  </AiContentLayout>
);

export default RentOutMyFoodTruck;
