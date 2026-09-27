import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AiContentLayout, { FaqList } from '@/components/seo/AiContentLayout';

export const HOW_TO_BUY_PATH = '/how-to-buy-a-food-truck';
export const HOW_TO_BUY_TITLE = 'How to Buy a Food Truck: Step-by-Step Buyer Guide | Vendibook';
export const HOW_TO_BUY_DESCRIPTION =
  'A practical, step-by-step guide to buying a food truck or trailer: set a budget, compare listings, check title and records, inspect, confirm local rules, pay with a record, and plan pickup or freight.';
export const HOW_TO_BUY_H1 = 'How to Buy a Food Truck';

interface Step {
  id: string;
  title: string;
  body: string[];
  checklist?: string[];
  links?: { href: string; label: string }[];
}

export const HOW_TO_BUY_STEPS: Step[] = [
  {
    id: 'budget-and-menu',
    title: 'Set your budget around your menu',
    body: [
      'Your menu decides the equipment, and the equipment decides the truck. Write down what you will cook, the appliances it needs, and roughly how many people will work inside at peak times. Then set a total budget — not just a purchase price.',
    ],
    checklist: [
      'Purchase price you can afford (cash or with financing)',
      'Sales tax, title, and registration',
      'Mechanical and kitchen inspection',
      'Pickup travel or freight transport',
      'Local permits, commissary, and insurance',
      'A repair and equipment reserve',
    ],
    links: [
      { href: '/food-truck-prices', label: 'Current asking-price data' },
      { href: '/financing', label: 'Financing options' },
    ],
  },
  {
    id: 'compare-listings',
    title: 'Compare listings side by side',
    body: [
      'Shortlist three to five trucks or trailers that fit your menu. Compare size, year, mileage or tow weight, the make and age of major equipment, generator capacity, water tank sizes, and location. Note what is missing from each listing so you can ask about it.',
    ],
    links: [
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/used-food-trucks-for-sale', label: 'Used food trucks for sale' },
    ],
  },
  {
    id: 'ownership-and-records',
    title: 'Check ownership, title, and records',
    body: [
      'Ask the seller for the title (or trailer registration) and confirm the name matches the person selling. Ask whether there is a loan or lien on the unit. Request maintenance records, generator hours, fire suppression service tags, and any past health or fire inspection reports.',
    ],
    checklist: [
      'Title in the seller\'s name, VIN matches the unit',
      'Any lien disclosed and a plan to clear it at sale',
      'Service and repair history',
      'Fire suppression and equipment service dates',
    ],
  },
  {
    id: 'inspection',
    title: 'Get an independent vehicle and kitchen inspection',
    body: [
      'Inspect in person when you can, or hire a local mechanic or inspector. For a truck, check the engine, transmission, brakes, tires, frame, and rust. For the kitchen, run the generator under load, confirm refrigeration holds temperature, and test every burner, fryer, and griddle. If you cannot travel, ask for a live video walkthrough and have the seller show each item working.',
    ],
    links: [
      { href: '/guides/meetup-inspection', label: 'Meetup & inspection checklist' },
    ],
  },
  {
    id: 'local-requirements',
    title: 'Confirm requirements with your local agencies',
    body: [
      'Rules for mobile food units are set locally. Before you buy, contact your city or county health department, fire marshal, and licensing office to ask what the unit must have to be approved — for example sink setup, water tank sizes, hood and fire suppression, and commissary requirements. A truck that passed somewhere else may still need changes in your area.',
    ],
    links: [
      { href: '/tools/permitpath', label: 'PermitPath permit checklist' },
      { href: '/tools/regulations-hub', label: 'Regulations hub' },
    ],
  },
  {
    id: 'offer-and-payment',
    title: 'Make a documented offer and pay with a record',
    body: [
      'Put the agreed price, what is included (equipment, spare parts, branding), the handoff date, and any conditions in writing. Avoid untraceable payment methods and be cautious of anyone who pushes you to pay off-platform. On Vendibook you can make an offer on eligible listings and pay through online checkout powered by PayPal, where offered by the listing; some sellers also accept payment in person.',
    ],
    links: [
      { href: '/how-it-works', label: 'How buying on Vendibook works' },
      { href: '/payments', label: 'Payment options' },
    ],
  },
  {
    id: 'pickup-and-handoff',
    title: 'Plan pickup, freight, and the handoff',
    body: [
      'Decide who moves the unit and when. You can drive or tow it home, or arrange freight transport for long distances. At handoff, walk through the unit again, confirm everything agreed is there, take photos, sign over the title, and keep a copy of every document.',
    ],
    links: [
      { href: '/vendibook-freight', label: 'Freight & delivery' },
    ],
  },
];

export const HOW_TO_BUY_FAQS = [
  {
    question: 'How do I buy a food truck?',
    answer:
      'Set a total budget around your menu, compare several listings, check the title and service records, get an independent vehicle and kitchen inspection, confirm what your local health and fire departments require, make a written offer and pay with a traceable method, then plan pickup or freight and complete the title transfer at handoff.',
  },
  {
    question: 'Where can I buy a food truck?',
    answer:
      'From an online marketplace, a dealer or custom builder, or directly from an owner. Marketplaces help you compare many options; builders offer new units to your spec; direct sales can be cheaper but leave more of the checking to you.',
  },
  {
    question: 'Should I buy a food truck or a food trailer?',
    answer:
      'Trailers skip the engine and drivetrain and can be unhitched at events, but need a capable tow vehicle. Trucks are self-contained and quicker to set up. Your menu, venues, and existing vehicle usually decide it.',
  },
  {
    question: 'Can I buy a food truck from another state?',
    answer:
      'Yes. Plan an in-person or hired inspection (or a live video walkthrough), agree on pickup or freight transport before paying, and check your own state\'s title, registration, and local health requirements.',
  },
  {
    question: 'Can I finance a food truck purchase?',
    answer:
      'Some buyers finance through third-party lenders. Approval, rates, and terms depend on the lender and your application; Vendibook does not guarantee approval or terms.',
  },
];

const HowToBuyAFoodTruck = () => (
  <AiContentLayout
    title={HOW_TO_BUY_TITLE}
    description={HOW_TO_BUY_DESCRIPTION}
    path={HOW_TO_BUY_PATH}
    h1={HOW_TO_BUY_H1}
    article
    breadcrumbParent={{ label: 'Food Trucks for Sale', href: '/food-trucks-for-sale' }}
    quickAnswer={{
      question: 'How do you buy a food truck?',
      answer:
        'Budget for the total cost around your menu, compare listings, confirm title and records, get an independent vehicle and kitchen inspection, check local health and fire requirements, pay with a documented method, and plan pickup or freight before handoff.',
    }}
    faqSchema={HOW_TO_BUY_FAQS}
    extraSchemas={[
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: HOW_TO_BUY_H1,
        description: HOW_TO_BUY_DESCRIPTION,
        step: HOW_TO_BUY_STEPS.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.title,
          text: s.body.join(' '),
          url: `https://vendibook.com${HOW_TO_BUY_PATH}#${s.id}`,
        })),
      },
    ]}
  >
    <nav aria-labelledby="contents-heading" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="contents-heading" className="text-lg font-semibold text-foreground mb-3">In this guide</h2>
      <ol className="grid gap-2 sm:grid-cols-2 text-sm">
        {HOW_TO_BUY_STEPS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-foreground hover:text-primary">
              <span className="text-muted-foreground mr-2">{i + 1}.</span>{s.title}
            </a>
          </li>
        ))}
        <li><a href="#faq" className="text-foreground hover:text-primary"><span className="text-muted-foreground mr-2">?</span>Common questions</a></li>
      </ol>
    </nav>

    <ol className="space-y-8">
      {HOW_TO_BUY_STEPS.map((s, i) => (
        <li key={s.id} id={s.id} className="scroll-mt-24">
          <section className="rounded-2xl border border-border bg-card p-5 md:p-7 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step {i + 1}</p>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="text-muted-foreground leading-relaxed">{p}</p>
            ))}
            {s.checklist && (
              <ul className="grid gap-1.5 sm:grid-cols-2 text-sm text-foreground">
                {s.checklist.map((c) => (
                  <li key={c} className="flex gap-2"><span aria-hidden="true" className="text-primary">✓</span>{c}</li>
                ))}
              </ul>
            )}
            {s.links && (
              <div className="flex flex-wrap gap-2 pt-1">
                {s.links.map((l) => (
                  <Link key={l.href} to={l.href} className="inline-block px-3 py-1.5 rounded-full border border-border bg-background text-sm text-foreground hover:border-primary hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </li>
      ))}
    </ol>

    <section className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ready to start comparing?</h2>
        <p className="text-sm text-muted-foreground">Browse live listings and message sellers with your questions.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default" className="v2-btn">
          <Link to="/food-trucks-for-sale">Food trucks for sale <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/food-trailers-for-sale">Food trailers for sale</Link>
        </Button>
      </div>
    </section>

    <section id="faq" className="space-y-3 scroll-mt-24">
      <h2 className="text-2xl font-semibold text-foreground">Common questions about buying a food truck</h2>
      <FaqList items={HOW_TO_BUY_FAQS} />
    </section>
  </AiContentLayout>
);

export default HowToBuyAFoodTruck;
