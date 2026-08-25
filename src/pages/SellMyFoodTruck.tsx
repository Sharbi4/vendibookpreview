import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Camera,
  CheckCircle2,
  CreditCard,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

const LIST_HREF = '/list/start?mode=sale';

const faqs = [
  {
    question: 'Where can I sell my food truck?',
    answer:
      'Vendibook is a marketplace built specifically for mobile food equipment. Create a free listing with photos, specs, and your asking price, and it becomes discoverable to buyers searching for food trucks, food trailers, and concession trailers nationwide. You communicate with interested buyers directly through Vendibook messaging and offers.',
  },
  {
    question: 'How do I sell a food truck online?',
    answer:
      'Create a free Vendibook account, open the listing builder, and add exterior and interior photos, equipment specs, dimensions, and an honest asking price. Once published, buyers can message you and submit offers, and you can accept, decline, or counter from your dashboard. You choose how to complete the sale — in person or through Vendibook online checkout.',
  },
  {
    question: 'Can I sell a food trailer or concession trailer on Vendibook?',
    answer:
      'Yes. Vendibook supports food trailers, concession trailers, mobile kitchens, and specialty trailers alongside food trucks, with equipment-specific fields for towing, dimensions, power, and water setup. List your trailer the same way you would a truck — publishing is free.',
  },
  {
    question: 'Is it really free to list?',
    answer:
      'Yes. Publishing a standard for-sale listing is free, subject to current account and listing limits. You do not need identity verification, a membership, or any paid add-on to publish.',
  },
  {
    question: 'What happens if I sell and get paid in person?',
    answer:
      'Equipment sales settled in person carry no Vendibook commission. You and the buyer arrange payment and the handoff directly, and you can still use Vendibook messaging, offers, and your dashboard to keep everything in one place.',
  },
  {
    question: 'What is the fee if the buyer pays online?',
    answer:
      'A completed equipment sale through Vendibook online checkout carries a standard 12.9% seller fee. Payment-processing costs charged by the payment provider are separate where applicable.',
  },
  {
    question: 'How does Vendibook Pro reduce my fee?',
    answer:
      'Active Vendibook Pro sellers save 2 percentage points on eligible seller transaction fees — 10.9% instead of 12.9% — with savings capped at $500 per completed transaction. Pro also includes one Featured Boost credit each paid billing period, premium seller tools, and PermitPath Plus.',
  },
  {
    question: 'Can I sell directly to a buyer?',
    answer:
      'Yes. You can settle the sale in person with no Vendibook commission — you and the buyer arrange payment and the handoff directly. Vendibook online checkout is an optional alternative for buyers who want to pay through the platform, at a standard 12.9% seller fee.',
  },
  {
    question: 'Can a buyer finance my food truck or trailer?',
    answer:
      'Eligible buyers can apply with third-party financing partners from a for-sale listing. Vendibook is not a lender: it does not approve applicants, set rates or terms, or guarantee funding, and you do not manage the buyer’s application.',
  },
  {
    question: 'Do I have to arrange shipping?',
    answer:
      'No. Many sales are local pickup. You can offer delivery yourself, and where freight coordination is available buyers can check delivery options from the listing before they commit.',
  },
  {
    question: 'Do I need identity verification?',
    answer:
      'No. Identity verification is optional, powered by Plaid, and adds an Identity Verified badge to your profile when completed. It is not required to publish, sell, get paid, or use pay in person.',
  },
  {
    question: 'Can Vendibook make the listing for me?',
    answer:
      'The normal self-service listing path is free and most sellers use it. Concierge Listing is an optional one-time service where our team builds and polishes the listing from your photos and information.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com' },
    { '@type': 'ListItem', position: 2, name: 'Sell My Food Truck', item: 'https://vendibook.com/sell-my-food-truck' },
  ],
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to sell your food truck or trailer on Vendibook',
  description:
    'Publish a free for-sale listing, connect with buyers, choose pay in person or Vendibook online checkout, and complete the handoff.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'List free', text: 'Add photos, specs, and your asking price, then publish. Standard listings are free to publish.', url: 'https://vendibook.com/list/start' },
    { '@type': 'HowToStep', position: 2, name: 'Connect with buyers', text: 'Answer questions, arrange inspections, and review offers inside Vendibook.', url: 'https://vendibook.com/dashboard' },
    { '@type': 'HowToStep', position: 3, name: 'Choose your transaction path', text: 'Settle in person with no Vendibook commission, or use Vendibook online checkout at a 12.9% seller fee.', url: 'https://vendibook.com/how-it-works?role=sell' },
    { '@type': 'HowToStep', position: 4, name: 'Complete the handoff', text: 'Coordinate pickup, seller delivery, or freight where available and confirm the transaction.', url: 'https://vendibook.com/dashboard' },
  ],
};

const trustRow = [
  'Free to publish',
  '$0 Vendibook commission when the sale is settled in person',
  'Optional Vendibook online checkout',
  'Financing options for eligible buyers',
];

const sellerValue = [
  { icon: Camera, title: 'Equipment-specific listings', description: 'Photos, dimensions, kitchen equipment, power and water details — fields built for trucks, trailers, and carts.' },
  { icon: MessageSquare, title: 'Messaging and offers', description: 'Answer buyer questions, share documents, and review offers without handing out your phone number.' },
  { icon: CreditCard, title: 'Two ways to get paid', description: 'Settle in person, or turn on Vendibook online checkout for buyers who want to pay through the platform.' },
  { icon: Handshake, title: 'Buyer financing options', description: 'Eligible buyers can apply with third-party financing partners directly from your listing.' },
  { icon: Truck, title: 'Pickup, delivery, or freight', description: 'Offer local pickup, deliver it yourself, or let buyers check freight/delivery options where available.' },
  { icon: LayoutDashboard, title: 'Transaction tracking', description: 'Follow inquiries, offers, documents, and handoff confirmation from your dashboard.' },
];

const steps = [
  { n: '1', title: 'List free', body: 'Add photos, specs, and your asking price. Publishing a standard listing is free, subject to current account and listing limits.' },
  { n: '2', title: 'Connect with buyers', body: 'Answer questions, schedule inspections, and negotiate offers inside Vendibook.' },
  { n: '3', title: 'Choose your transaction path', body: 'Pay in person, or optional Vendibook online checkout. Financing can give eligible buyers another way to purchase.' },
  { n: '4', title: 'Complete the handoff', body: 'Coordinate pickup, seller delivery, or freight where applicable and confirm the transaction. Payout on online sales is reviewed and issued by Vendibook.' },
];

const SellMyFoodTruck = () => {
  const boost = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);
  const concierge = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.conciergeListing);
  const pro = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);

  const addOns = [
    { key: 'boost', name: 'Featured Boost', price: boost.detailLabel, body: 'Move your listing into featured placement on relevant marketplace pages.', href: '/dashboard?tab=upgrades', cta: 'See boost options' },
    { key: 'concierge', name: 'Concierge Listing', price: concierge.detailLabel, body: 'Our team builds and polishes the listing from your photos and information.', href: '/list/concierge', cta: 'Start concierge' },
  ];

  return (
    <>
      <SEO
        title="Sell My Food Truck | List Your Food Truck or Trailer | Vendibook"
        description="Sell your food truck or food trailer on Vendibook. Create your listing, connect directly with buyers, offer financing options, and reach serious food-business buyers nationwide."
        canonical="/sell-my-food-truck"
        type="website"
        ogTitle="Sell your food truck or trailer on Vendibook"
        ogDescription="List free, reach buyers shopping specifically for mobile food equipment, and choose the transaction path that works for you."
        twitterTitle="Sell your food truck or trailer on Vendibook"
        twitterDescription="List free and choose pay in person or optional online checkout."
        image="https://vendibook.com/images/social/vendibook-og-sell.jpg"
        imageAlt="Sell your food truck or trailer on Vendibook"
      />


      <JsonLd schema={[faqSchema, breadcrumbSchema, howToSchema]} />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 sale-light">
          {/* HERO */}
          <section className="pt-14 pb-12 md:pt-20 md:pb-16">
            <div className="container max-w-5xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl"
              >
                <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
                  For sellers
                </span>
                <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.08]">
                  Sell Your Food Truck or Food Trailer
                </h1>
                <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  List free, reach buyers nationwide who are shopping specifically for mobile food equipment,
                  message them directly, offer financing options to eligible buyers, and choose how you want
                  to get paid.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Button size="lg" variant="cta" asChild>
                    <Link to={LIST_HREF}>
                      List My Food Truck
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-2xl" asChild>
                    <a href="#how-selling-works">See How Selling Works</a>
                  </Button>
                </div>

                <div className="mt-4">
                  <TellVendibookButton
                    variant="ghost"
                    size="sm"
                    defaultIntent="sell"
                    defaultCategory="food_truck"
                    sourcePage="sell_my_food_truck"
                  >
                    Just exploring? Tell Vendibook about your truck →
                  </TellVendibookButton>
                </div>

                <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                  {trustRow.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </section>

          {/* SELLER VALUE */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-5xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Built around mobile food equipment.
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Everything a truck, trailer, or cart sale actually needs — in one place.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellerValue.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-sale-card p-5">
                    <item.icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-medium text-foreground">{item.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FOOD TRAILER COVERAGE */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Selling a food trailer?</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                Vendibook isn&apos;t only for trucks. Sellers list food trailers, concession trailers, mobile
                kitchens, and specialty trailers every day — with equipment-specific fields for towing setup,
                dimensions, power, and water that general classifieds don&apos;t have. Publishing is free, and
                the same messaging, offers, and payment options apply.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-2xl" asChild>
                  <Link to="/sell-food-trailer">Sell your food trailer</Link>
                </Button>
                <Button variant="outline" className="rounded-2xl" asChild>
                  <Link to="/sell-concession-trailer">Sell your concession trailer</Link>
                </Button>
                <Button variant="outline" className="rounded-2xl" asChild>
                  <Link to="/food-trailers-for-sale">Browse food trailers for sale</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* MARKETPLACE COMPARISON */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-5xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                A marketplace built for food trucks — not a general classifieds feed.
              </h2>
              <div className="mt-8 grid md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-sale-card p-6 md:p-7">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Vendibook</div>
                  <ul className="mt-4 space-y-2.5 text-sm text-foreground/85">
                    {[
                      'A specialized audience shopping for mobile food equipment',
                      'Structured truck, trailer, and cart fields with real specs',
                      'A financing path for eligible buyers',
                      'Optional online checkout in addition to pay in person',
                      'Delivery and freight coordination options where available',
                      'Seller tools and optional visibility upgrades',
                    ].map((line) => (
                      <li key={line} className="flex gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-border bg-transparent p-6 md:p-7">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    General marketplaces
                  </div>
                  <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                    <li>Broad, general-purpose audience</li>
                    <li>Generic listing format with no equipment-specific fields</li>
                    <li>Seller typically coordinates financing, payment, and delivery independently</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* HOW SELLING WORKS */}
          <section id="how-selling-works" className="py-12 md:py-16 border-t border-border scroll-mt-24">
            <div className="container max-w-5xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">How selling works</h2>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {steps.map((step) => (
                  <div key={step.n} className="rounded-2xl bg-sale-card p-6">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {step.n}
                    </div>
                    <h3 className="mt-3 font-medium text-foreground">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link to="/how-it-works?role=sell" className="text-sm font-medium text-primary hover:underline">
                  See the full seller journey →
                </Link>
              </div>
            </div>
          </section>

          {/* COSTS */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">What does it cost?</h2>
              <div className="mt-7 rounded-3xl bg-sale-card divide-y divide-border">
                {[
                  { label: 'Publish a standard listing', value: '$0' },
                  { label: 'Equipment sale settled in person', value: 'No Vendibook commission' },
                  { label: 'Completed sale through Vendibook online checkout', value: '12.9% seller fee' },
                  { label: 'Active Vendibook Pro seller', value: '10.9% on eligible transactions' },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-6 p-5">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Vendibook Pro saves 2 percentage points on eligible seller transaction fees, capped at $500 of
                savings per completed transaction. Payment-processing costs charged by the payment provider are
                separate where applicable. Payouts on completed online sales are reviewed and issued by Vendibook.
              </p>
              <div className="mt-5">
                <Button variant="outline" className="rounded-2xl" asChild>
                  <Link to="/pricing">See pricing and Pro details</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* FINANCING */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Give qualified buyers another way to say yes.
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                Vendibook connects eligible buyers to third-party financing partners from for-sale marketplace
                equipment. You don’t manage the buyer’s application or make any lending decision.
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Vendibook is not a lender. It does not approve applicants, set interest rates or terms, or
                guarantee funding.
              </p>
              <div className="mt-6">
                <Button variant="outline" className="rounded-2xl" asChild>
                  <Link to="/financing">How buyer financing works</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* PICKUP / DELIVERY */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Sell locally or make delivery part of the deal.
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                Most sales are local pickup. You can offer delivery yourself, and where freight coordination is
                available buyers can check delivery options and pricing from the listing before they commit.
                Delivery availability depends on the listing, the route, and the equipment.
              </p>
            </div>
          </section>

          {/* PRICEPILOT */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-4xl">
              <div className="rounded-3xl bg-sale-card p-7 md:p-9">
                <Calculator className="h-5 w-5 text-primary" />
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-foreground">
                  Not sure what to ask for it?
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                  PricePilot is a pricing guidance tool. Enter your equipment details and it suggests a
                  competitive asking-price range you can use before or while you build the listing. It’s
                  guidance — not an appraisal, and not a guarantee of market or sale price.
                </p>
                <div className="mt-6">
                  <Button variant="cta" asChild>
                    <Link to="/tools/pricepilot">
                      Open PricePilot
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* OPTIONAL ADD-ONS */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-5xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Optional ways to sell faster</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                None of these are required. Publishing and selling work without them.
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {addOns.map((addOn) => (
                  <div key={addOn.key} className="rounded-2xl bg-sale-card p-6 flex flex-col">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-medium text-foreground">{addOn.name}</h3>
                      <span className="text-sm font-semibold text-foreground">{addOn.price}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{addOn.body}</p>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                        <Link to={addOn.href}>{addOn.cta}</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl bg-sale-card p-6 md:p-7">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-medium text-foreground">Sell regularly? Vendibook Pro</h3>
                  <span className="text-sm font-semibold text-foreground">{pro.labelWithCadence}</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {[
                    '10.9% eligible seller fee instead of 12.9% (max $500 saved per completed transaction)',
                    'One Featured Boost credit each paid billing period',
                    'Premium seller tools',
                    'PermitPath Plus included',
                    'Cancel anytime — access continues through the current period',
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Button variant="outline" className="rounded-2xl" asChild>
                    <Link to="/pricing">Compare Free and Pro</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* CONCIERGE + VERIFICATION */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-5xl grid md:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-sale-card p-6 md:p-7">
                <h2 className="text-xl font-semibold text-foreground">Want us to build the listing?</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  You don’t need Concierge — the self-service listing path is free and works for most sellers.
                  If you’d rather hand it off, our team creates and polishes the listing from your photos and
                  information for {concierge.label} one-time.
                </p>
                <div className="mt-5">
                  <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                    <Link to="/list/concierge">Start Concierge Listing</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-3xl bg-sale-card p-6 md:p-7">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <h2 className="mt-3 text-xl font-semibold text-foreground">Optional identity verification</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  An optional identity check powered by Plaid adds an Identity Verified badge to your profile
                  when completed. It is not required to publish, sell, get paid, or settle in person.
                </p>
                <div className="mt-5">
                  <Button variant="outline" size="sm" className="rounded-2xl" asChild>
                    <Link to="/identity-verification">Learn about verification</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Seller questions</h2>
              <Accordion type="single" collapsible className="mt-6 w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`item-${index}`} className="border-border">
                    <AccordionTrigger className="text-left text-foreground hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* EXPLORE THE MARKETPLACE */}
          <section className="py-12 md:py-16 border-t border-border">
            <div className="container max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Part of the Vendibook marketplace</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl">
                Your listing sits inside the same marketplace buyers already use to find equipment.
              </p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                <li><Link to="/food-trucks-for-sale" className="font-medium text-primary hover:underline">Food trucks for sale →</Link></li>
                <li><Link to="/food-trailers-for-sale" className="font-medium text-primary hover:underline">Food trailers for sale →</Link></li>
                <li><Link to="/financing" className="font-medium text-primary hover:underline">How buyer financing works →</Link></li>
                <li><Link to="/how-it-works?role=sell" className="font-medium text-primary hover:underline">The full seller journey →</Link></li>
                <li><Link to="/tools/pricepilot" className="font-medium text-primary hover:underline">Estimate your asking price with PricePilot →</Link></li>
              </ul>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="py-14 md:py-20 border-t border-border">
            <div className="container max-w-3xl text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Ready to list your truck or trailer?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Publishing is free. You decide how you get paid.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="cta" asChild>
                  <Link to={LIST_HREF}>
                    List my equipment free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl" asChild>
                  <Link to="/food-trucks-for-sale">See food trucks for sale</Link>
                </Button>
              </div>
            </div>
          </section>

          <div className="h-16 md:hidden" aria-hidden="true" />
        </main>

        <Footer />

        {/* Sticky mobile CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-sm p-3">
          <Button variant="cta" className="w-full" asChild>
            <Link to={LIST_HREF}>List free</Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default SellMyFoodTruck;
