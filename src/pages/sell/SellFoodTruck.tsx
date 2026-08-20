import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const PATH = '/sell-food-truck';
const LIST_HREF = '/list/start?mode=sale';

const faqs = [
  {
    q: 'Is it free to list a food truck on Vendibook?',
    a: 'Yes. Publishing a standard for-sale listing is free, subject to current account and listing limits. Identity verification, a membership, and paid add-ons are all optional.',
  },
  {
    q: 'How much does Vendibook take when I sell?',
    a: 'Equipment sales settled in person carry no Vendibook commission. A completed sale through Vendibook online checkout carries a standard 12.9% seller fee. Active Vendibook Pro sellers pay 10.9% on eligible transactions, capped at $500 of savings per completed transaction.',
  },
  {
    q: 'How do I get paid for an online sale?',
    a: 'Vendibook records your proceeds after the sale completes, and payouts are reviewed and issued by our team. There is no automatic split settlement or instant bank transfer.',
  },
  {
    q: 'What paperwork do I need to sell a food truck?',
    a: 'For a titled truck or trailer you generally need the title in your name (or a lien release), a bill of sale, and any state-required transfer forms. Buyers also commonly ask for maintenance records, generator hours, and current or expired health-permit and fire-suppression inspection details.',
  },
  {
    q: 'Can a buyer finance my food truck?',
    a: 'Eligible buyers can apply with third-party financing partners from a for-sale listing. Vendibook is not a lender and does not approve applicants, set rates or terms, or guarantee funding.',
  },
  {
    q: 'Do I have to ship it?',
    a: 'No. Local pickup is the most common handoff. You can offer delivery yourself, and where freight coordination is available buyers can check delivery options from the listing.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
    { '@type': 'ListItem', position: 2, name: 'How to Sell a Food Truck Online', item: `https://vendibook.com${PATH}` },
  ],
};

interface Section {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
}

const sections: Section[] = [
  {
    id: 'prepare',
    title: '1. Prepare the truck or trailer before you photograph it',
    body: [
      'Buyers of mobile food equipment are buying a working kitchen, not just a vehicle. Deep clean the interior, degrease the hood and cook line, clear personal items, and make any small repair that would otherwise become a negotiating point — a loose handle, a dead light, a slow drain.',
      'Write down what you know while you are in there: generator hours, appliance brands and ages, tank sizes, propane setup, electrical service, and anything that was recently replaced.',
    ],
    bullets: [
      'Clean exterior, interior, and cook line',
      'Note generator hours and recent service',
      'Confirm what conveys with the sale and what does not',
      'Photograph any known damage honestly',
    ],
  },
  {
    id: 'photos',
    title: '2. Take photos that answer questions',
    body: [
      'The listings that get serious inquiries look the same: a clean exterior shot from both sides, a straight-on service window, a wide interior shot from the door, close-ups of every major appliance, the electrical panel, the tanks, and the tires and undercarriage for trailers.',
      'A short walkthrough video does more than any description paragraph. It removes the “can you send more pictures?” round trip entirely.',
    ],
  },
  {
    id: 'specs',
    title: '3. Fill in specs and dimensions completely',
    body: [
      'Vendibook listings use equipment-specific fields rather than a generic classifieds box. Year, make, model, mileage, length, width, height, power setup, water capacity, and the equipment list all matter — and dimensions in particular determine whether a buyer can quote delivery or fit it in a commissary lot.',
      'Incomplete specs are the most common reason a listing gets views without messages.',
    ],
  },
  {
    id: 'documents',
    title: '4. Get your title and documents in order',
    body: [
      'For a titled truck or trailer, the sale moves fastest when the title is already in your name and any lien is released. Prepare a bill of sale, check your state’s transfer requirements, and gather maintenance records.',
      'Health permits and fire-suppression certifications are usually jurisdiction-specific and do not transfer to the buyer, but knowing the current status and inspection date is a real trust signal. Describe it accurately rather than implying the buyer inherits a permit.',
    ],
  },
  {
    id: 'pricing',
    title: '5. Price it against real comparables',
    body: [
      'Price is the single biggest driver of inquiry volume. Look at what similar year, size, and equipment packages are listed at, and be honest about condition and hours.',
      'PricePilot can suggest a competitive asking-price range from the details you enter. Treat it as guidance rather than an appraisal or a guarantee of what the equipment will sell for.',
    ],
  },
  {
    id: 'publish',
    title: '6. Publish your listing free',
    body: [
      'Publishing a standard for-sale listing on Vendibook is free, subject to current account and listing limits. You do not need identity verification, a membership, or a paid add-on to go live.',
      'Optional visibility upgrades exist if you want them, and an optional Concierge service can build the listing from your photos and information — but the free self-service path is the normal one.',
    ],
  },
  {
    id: 'buyers',
    title: '7. Respond to buyers and handle offers',
    body: [
      'Keep the conversation inside Vendibook so questions, documents, and offers stay attached to the listing. Answer quickly, be direct about condition, and expect the first real question to be about why you are selling.',
      'Buyers can send offers, and you can accept, decline, or counter. Serious buyers will want an in-person or video inspection before committing — that is a good sign, not a red flag.',
    ],
  },
  {
    id: 'payment',
    title: '8. Choose how you get paid',
    body: [
      'You have two paths. Settling in person carries no Vendibook commission: you and the buyer arrange payment directly at the handoff. Or you can use Vendibook online checkout, which carries a standard 12.9% seller fee on the completed sale — 10.9% for active Vendibook Pro sellers, capped at $500 of savings per completed transaction.',
      'Payouts on completed online sales are reviewed and issued by Vendibook rather than routed automatically. Payment-processing costs charged by the payment provider are separate where applicable.',
    ],
  },
  {
    id: 'financing',
    title: '9. Let eligible buyers explore financing',
    body: [
      'Some buyers have the intent but not the cash on hand. Vendibook connects eligible buyers to third-party financing partners from for-sale marketplace equipment, so a “not right now” can become a real offer.',
      'You do not manage the application. Vendibook is not a lender, does not approve applicants, does not set rates or terms, and does not guarantee funding.',
    ],
  },
  {
    id: 'handoff',
    title: '10. Close the inspection, delivery, and handoff',
    body: [
      'Agree in writing on what is included, when payment happens, and who handles transport. Most sales end in local pickup. You can deliver it yourself, and where freight coordination is available the buyer can check delivery options and pricing from the listing.',
      'At the handoff, complete the bill of sale, sign over the title, hand off keys and manuals, and confirm the transaction so your records stay accurate.',
    ],
  },
];

const SellFoodTruck = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <SEO
      title="How to Sell a Food Truck Online | Vendibook"
      description="A step-by-step guide to selling a food truck or trailer online: prep, photos, specs, title and documents, pricing, buyer offers, payment options, financing, and delivery."
      canonical={PATH}
      image="/images/social/vendibook-og-sell.jpg"
      imageAlt="Sell your food truck or trailer on Vendibook"
    />
    <JsonLd schema={[breadcrumbSchema, faqSchema]} />
    <Header />

    <main className="flex-1 sale-light">
      <div className="container max-w-3xl py-8 md:py-12">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>How to sell a food truck online</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="mt-8">
          <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
            Seller guide
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">
            How to sell a food truck online
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            A practical walkthrough for owners selling a food truck, food trailer, concession trailer, or
            mobile kitchen — from prepping the equipment to the title handoff.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button variant="cta" asChild>
              <Link to={LIST_HREF}>
                List your equipment free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="rounded-2xl" asChild>
              <Link to="/sell-my-food-truck">Selling on Vendibook</Link>
            </Button>
          </div>
        </header>

        <nav aria-label="Guide contents" className="mt-10 rounded-2xl bg-sale-card p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            In this guide
          </div>
          <ol className="mt-3 space-y-1.5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-foreground/80 hover:text-primary transition-colors">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">{section.title}</h2>
              {section.body.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 text-muted-foreground leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.id === 'pricing' && (
                <div className="mt-5">
                  <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                    <Link to="/tools/pricepilot">Estimate a price with PricePilot</Link>
                  </Button>
                </div>
              )}
              {section.id === 'publish' && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button variant="cta" size="sm" asChild>
                    <Link to={LIST_HREF}>Start a free listing</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                    <Link to="/list/concierge">Have Vendibook build it</Link>
                  </Button>
                </div>
              )}
              {section.id === 'payment' && (
                <div className="mt-5">
                  <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                    <Link to="/how-it-works?role=sell">See the full seller journey</Link>
                  </Button>
                </div>
              )}
              {section.id === 'financing' && (
                <div className="mt-5">
                  <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                    <Link to="/financing">How buyer financing works</Link>
                  </Button>
                </div>
              )}
            </section>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">Common questions</h2>
          <Accordion type="single" collapsible className="mt-5 w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mt-14 rounded-3xl bg-sale-card p-7 md:p-9 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Ready when you are</h2>
          <p className="mt-3 text-muted-foreground">
            Publishing a standard listing is free, and you choose how you get paid.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="cta" asChild>
              <Link to={LIST_HREF}>List your equipment free</Link>
            </Button>
            <Button variant="outline" className="rounded-2xl" asChild>
              <Link to="/food-trucks-for-sale">Browse food trucks for sale</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>

    <Footer />
  </div>
);

export default SellFoodTruck;
