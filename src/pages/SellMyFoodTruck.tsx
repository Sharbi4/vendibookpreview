import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Calculator,
  CheckCircle2,
  CreditCard,
  ImagePlus,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { TellVendibookButton } from '@/components/lead/TellVendibookButton';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { useRealSaleListingPhotos } from '@/hooks/useRealSaleListingPhotos';

import heroSelling from '@/assets/how-selling-hero.jpg';
import heroTruck from '@/assets/hero-food-truck.jpg';
import trailerGrill from '@/assets/trailer-orange-grill.jpg';
import trailerCafecito from '@/assets/trailer-cafecito.jpg';

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
      'Create a free Vendibook account and open the listing builder. You can chat through it with List with Vendi or fill out the step-by-step wizard yourself. Add exterior and interior photos, equipment specs, dimensions, and an honest asking price, save a draft at any point, then publish when you are ready. Buyers message you and submit offers, and you accept, decline, or counter from your dashboard.',
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
      'Equipment sales settled in person carry no Vendibook platform transaction fee. You and the buyer arrange payment and the handoff directly, and you can still use Vendibook messaging, offers, and your dashboard to keep everything in one place.',
  },
  {
    question: 'What is the fee if the buyer pays online?',
    answer:
      'Vendibook online checkout is optional. A completed equipment sale through online checkout carries a standard 12.9% seller fee, or 10.9% for active Vendibook Pro sellers, with Pro savings capped at $500 per completed transaction. Payment-processing costs charged by the payment provider are separate where applicable.',
  },
  {
    question: 'Can a buyer finance my food truck or trailer?',
    answer:
      'Eligible buyers can apply with third-party financing partners from a for-sale listing. Approval depends on the applicant and the equipment, and provider approval applies. Vendibook is not a lender: it does not approve applicants, set rates or terms, or guarantee funding, and you do not manage the buyer’s application.',
  },
  {
    question: 'Can I save my listing and finish it later?',
    answer:
      'Yes. Listings save as drafts while you build them, whether you use List with Vendi or the step-by-step wizard. Nothing goes public until you review it and confirm the publish step yourself.',
  },
  {
    question: 'Do I have to arrange shipping?',
    answer:
      'No. Many sales are local pickup. You can offer delivery yourself, and where freight coordination is available buyers can check delivery options from the listing before they commit. Availability depends on the listing, the route, and the equipment.',
  },
  {
    question: 'Do I need identity verification?',
    answer:
      'No. Identity verification is optional, powered by Plaid, and adds an Identity Verified badge to your profile when completed. It is not required to publish, sell, get paid, or use pay in person. It applies to the account that completes it — it is not a blanket guarantee about every other user.',
  },
  {
    question: 'Can Vendibook make the listing for me?',
    answer:
      'The self-service paths are free and most sellers use them. Concierge Listing is an optional one-time paid service where our team builds and polishes the listing from your photos and information.',
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
    'Build a free for-sale listing, review and publish it, then manage inquiries and complete the handoff.',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Build your listing',
      text: 'Chat it through with List with Vendi or use the step-by-step wizard. Add photos, specs, and your asking price.',
      url: 'https://vendibook.com/list/start',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Review, save, publish',
      text: 'Save a draft while you gather details, review the live preview, then publish when you are ready. Publishing a standard listing is free.',
      url: 'https://vendibook.com/list/start',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Manage inquiries and the handoff',
      text: 'Answer buyer questions and offers, choose pay in person or optional Vendibook online checkout, then coordinate pickup, delivery, or freight.',
      url: 'https://vendibook.com/how-it-works?role=sell',
    },
  ],
};

const assetPoints = [
  {
    title: 'It is equipment, not a used couch',
    body: 'Buyers want build year, kitchen equipment, power and water setup, towing details, and honest photos. Vendibook has fields for all of it, so you are not writing a paragraph and hoping.',
  },
  {
    title: 'The audience is already shopping',
    body: 'Your listing sits inside a marketplace people browse specifically for food trucks, trailers, and mobile kitchens — not a general classifieds feed where it competes with furniture.',
  },
  {
    title: 'The sale has moving parts',
    body: 'Questions, offers, documents, payment method, and getting the unit to the buyer. Vendibook keeps those in one place instead of scattered texts.',
  },
];

const wholeSale = [
  {
    icon: Banknote,
    title: 'Buyer financing options',
    body: 'Eligible buyers can apply with third-party financing partners straight from your listing. Approval depends on the applicant and the equipment, and provider approval applies. Vendibook is not a lender and does not set rates, terms, or guarantee funding.',
    href: '/financing',
    cta: 'How buyer financing works',
    image: trailerGrill,
    alt: 'Food trailer with an orange grill setup parked at an outdoor event',
  },
  {
    icon: CreditCard,
    title: 'Two ways to get paid',
    body: 'Settle in person with no Vendibook platform transaction fee, or turn on optional Vendibook online checkout for buyers who prefer to pay through the platform. You choose per sale.',
    href: '/payments',
    cta: 'See payment options',
    image: heroTruck,
    alt: 'Food truck serving customers on a warm evening street',
  },
  {
    icon: Truck,
    title: 'Pickup, delivery, or freight',
    body: 'Most sales are local pickup. You can deliver it yourself, and where freight coordination is available buyers can review delivery options from the listing before they commit. Availability depends on the listing, route, and equipment.',
    href: '/ship-your-food-truck',
    cta: 'Delivery and freight',
    image: trailerCafecito,
    alt: 'Compact coffee trailer ready for transport',
  },
  {
    icon: ShieldCheck,
    title: 'Trust and optional verification',
    body: 'Messaging, offers, and documents stay inside Vendibook, so you do not hand out your phone number to browse-only contacts. Identity verification powered by Plaid is optional and adds a badge to the account that completes it.',
    href: '/identity-verification',
    cta: 'About verification',
    image: heroSelling,
    alt: 'Seller handing over the keys to a food truck buyer',
  },
];

const steps = [
  {
    n: '01',
    title: 'Build your listing',
    body: 'Chat it through with List with Vendi, or take the step-by-step wizard yourself. Photos, specs, dimensions, and your asking price.',
  },
  {
    n: '02',
    title: 'Review, save, publish',
    body: 'Save a draft any time. Check the live preview, then publish when it reads the way you want. Publishing a standard listing is free.',
  },
  {
    n: '03',
    title: 'Manage inquiries and the handoff',
    body: 'Answer questions, weigh offers, pick pay in person or online checkout, then coordinate pickup, delivery, or freight and confirm the sale.',
  },
];

const chatMock = [
  { from: 'vendi', text: 'Hi! What are you selling — a food truck, a trailer, or a mobile kitchen?' },
  { from: 'seller', text: '2019 step van food truck, full kitchen, 20k miles on the build.' },
  { from: 'vendi', text: 'Got it. Add a few photos and I’ll start the listing preview on the right.' },
  { from: 'seller', text: '📷 6 photos added' },
  { from: 'vendi', text: 'Looking good. Asking price, and do you want to allow online checkout or keep it pay-in-person only?' },
];

const SellMyFoodTruck = () => {
  const reduced = useReducedMotion();
  const pro = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  const concierge = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.conciergeListing);
  const { data: realPhotos = [] } = useRealSaleListingPhotos(8);

  // Real marketplace photography first; bundled imagery only as a fallback.
  const fallbackCollage = [
    { src: heroTruck, alt: 'Food truck parked and serving customers at dusk' },
    { src: trailerCafecito, alt: 'Coffee trailer with a serving window open' },
    { src: trailerGrill, alt: 'Concession trailer set up for service at an outdoor event' },
    { src: heroSelling, alt: 'Seller handing over keys to a food truck buyer' },
  ];
  const collage = fallbackCollage.map((fallback, i) => {
    const real = realPhotos[i];
    return real
      ? {
          src: real.imageUrl,
          alt: `${real.title}${real.city ? ` in ${real.city}${real.state ? `, ${real.state}` : ''}` : ''} listed for sale on Vendibook`,
        }
      : fallback;
  });
  const featured = realPhotos[0];



  const fade = (delay = 0) =>
    reduced
      ? { initial: { opacity: 1 }, whileInView: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-80px' },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <>
      <SEO
        title="Sell My Food Truck | Sell Your Food Truck or Trailer | Vendibook"
        description="Sell your food truck or food trailer on Vendibook. List free, reach buyers already shopping for mobile food equipment, offer financing options to eligible buyers, and choose pay in person or optional online checkout."
        canonical="/sell-my-food-truck"
        type="website"
        ogTitle="Sell your food truck where buyers are already looking"
        ogDescription="List free, reach buyers shopping specifically for mobile food equipment, and choose the transaction path that works for you."
        twitterTitle="Sell your food truck where buyers are already looking"
        twitterDescription="List free and choose pay in person or optional online checkout."
        image="https://vendibook.com/images/social/vendibook-og-sell.jpg"
        imageAlt="Sell your food truck or trailer on Vendibook"
      />

      <JsonLd schema={[faqSchema, breadcrumbSchema, howToSchema]} />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 sale-light">
          {/* ── HERO ─────────────────────────────────────────────── */}
          <section className="pt-12 pb-16 md:pt-20 md:pb-24">
            <div className="container max-w-6xl">
              <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
                <motion.div
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
                    For sellers
                  </span>
                  <h1 className="mt-5 text-[2.1rem] leading-[1.08] md:text-[3.4rem] md:leading-[1.05] font-semibold tracking-[-0.02em] text-foreground">
                    Sell your food truck where buyers are already looking for one.
                  </h1>
                  <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                    Vendibook is a marketplace for food trucks, trailers, and mobile kitchens — so your
                    listing has real equipment fields, a guided builder, and buyers who came here for
                    exactly this. Not a classifieds post competing with used furniture.
                  </p>

                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Button size="lg" variant="cta" asChild>
                      <Link to={LIST_HREF}>
                        List my food truck free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="ghost" className="rounded-2xl text-foreground" asChild>
                      <a href="#how-selling-works">See how selling works</a>
                    </Button>
                  </div>

                  <p className="mt-5 text-sm text-muted-foreground">
                    Free to list · Pay in person with no Vendibook platform transaction fee · Online
                    checkout optional
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                    {[
                      { icon: Banknote, label: 'Financing options for eligible buyers' },
                      { icon: Truck, label: 'Pickup, delivery, or freight' },
                      { icon: ImagePlus, label: 'Guided listing with saved drafts' },
                    ].map((cue) => (
                      <span key={cue.label} className="inline-flex items-center gap-2">
                        <cue.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {cue.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6">
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
                </motion.div>

                {/* Asymmetric collage */}
                <motion.div
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4 pt-8">
                      <img
                        src={collage[0].src}
                        alt={collage[0].alt}
                        loading="eager"
                        className="w-full aspect-[3/4] object-cover rounded-[28px] shadow-[0_24px_60px_-32px_rgba(24,20,16,0.45)]"
                      />
                      <img
                        src={collage[1].src}
                        alt={collage[1].alt}
                        loading="lazy"
                        className="w-full aspect-square object-cover rounded-[24px] shadow-[0_18px_44px_-28px_rgba(24,20,16,0.4)]"
                      />
                    </div>
                    <div className="space-y-4">
                      <img
                        src={collage[2].src}
                        alt={collage[2].alt}
                        loading="lazy"
                        className="w-full aspect-square object-cover rounded-[24px] shadow-[0_18px_44px_-28px_rgba(24,20,16,0.4)]"
                      />
                      <img
                        src={collage[3].src}
                        alt={collage[3].alt}
                        loading="lazy"
                        className="w-full aspect-[3/4] object-cover rounded-[28px] shadow-[0_24px_60px_-32px_rgba(24,20,16,0.45)]"
                      />
                    </div>
                  </div>

                </motion.div>
              </div>
            </div>
          </section>

          {/* ── ASSET NARRATIVE ──────────────────────────────────── */}
          <section className="py-16 md:py-[100px] border-t border-border">
            <div className="container max-w-5xl">
              <motion.div {...fade()} className="max-w-2xl">
                <h2 className="text-2xl md:text-[2.1rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                  A food truck is a business asset. It deserves more than a classified post.
                </h2>
              </motion.div>
              <div className="mt-12 grid md:grid-cols-3 gap-x-10 gap-y-10">
                {assetPoints.map((point, i) => (
                  <motion.div key={point.title} {...fade(i * 0.06)}>
                    <div className="h-px w-10 bg-primary/60" aria-hidden="true" />
                    <h3 className="mt-5 text-lg font-medium text-foreground">{point.title}</h3>
                    <p className="mt-3 text-sm md:text-[0.95rem] text-muted-foreground leading-relaxed">
                      {point.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── LIST WITH VENDI ──────────────────────────────────── */}
          <section className="py-16 md:py-[100px] border-t border-border">
            <div className="container max-w-6xl">
              <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
                <motion.div {...fade()}>
                  <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
                    Free · Easiest way to list
                  </span>
                  <h2 className="mt-5 text-2xl md:text-[2.1rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                    List with Vendi — just describe your truck.
                  </h2>
                  <p className="mt-5 text-muted-foreground leading-relaxed max-w-lg">
                    Answer in plain language, drop in photos or video, and watch the listing build itself
                    in a live preview beside the chat. Save a draft whenever you like, review everything at
                    the end, and publish only when you say so.
                  </p>
                  <ul className="mt-7 space-y-3">
                    {[
                      'Chat naturally instead of filling out a long form',
                      'Upload photos and video as you go',
                      'Live preview of the real listing',
                      'Save a draft and come back later',
                      'Review, then publish when you are ready',
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-3 text-sm text-foreground/80">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button variant="cta" asChild>
                      <Link to={LIST_HREF}>
                        List my food truck free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" className="rounded-2xl text-foreground" asChild>
                      <Link to="/list/start?mode=sale&path=self">Prefer to build it myself</Link>
                    </Button>
                  </div>
                </motion.div>

                {/* Product mock: chat + live preview */}
                <motion.div {...fade(0.08)} aria-hidden="true">
                  <div className="rounded-[30px] border border-border/80 bg-white/70 backdrop-blur-sm p-4 md:p-5 shadow-[0_30px_80px_-46px_rgba(24,20,16,0.5)]">
                    <div className="grid sm:grid-cols-[1.15fr_1fr] gap-4">
                      {/* Chat */}
                      <div className="rounded-[22px] bg-[#fbfaf8] border border-border/70 p-4 space-y-3">
                        {chatMock.map((m, i) => (
                          <div
                            key={i}
                            className={
                              m.from === 'seller'
                                ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary/10 px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-foreground'
                                : 'max-w-[90%] rounded-2xl rounded-bl-md bg-white border border-border/70 px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-foreground/80'
                            }
                          >
                            {m.text}
                          </div>
                        ))}
                        <div className="mt-3 flex items-center gap-2 rounded-full border border-border/70 bg-white px-3.5 py-2.5">
                          <span className="text-[0.78rem] text-muted-foreground">Type your answer…</span>
                          <span className="ml-auto h-6 w-6 rounded-full bg-primary/90" />
                        </div>
                      </div>

                      {/* Live preview */}
                      <div className="rounded-[22px] bg-white border border-border/70 overflow-hidden">
                        <div className="px-4 pt-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Live preview
                        </div>
                        <img
                          src={featured?.imageUrl ?? heroTruck}
                          alt=""
                          loading="lazy"
                          className="w-full aspect-[4/3] object-cover"
                        />
                        <div className="p-4">
                          <div className="text-sm font-medium text-foreground line-clamp-1">
                            {featured?.title ?? '2019 Step Van Food Truck'}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {featured?.city
                              ? [featured.city, featured.state].filter(Boolean).join(', ')
                              : 'Full kitchen build'}
                          </div>
                          <div className="mt-3 text-base font-semibold text-foreground">
                            {featured?.priceSale
                              ? `$${featured.priceSale.toLocaleString()}`
                              : '$78,500'}
                          </div>
                          <div className="mt-3 h-8 rounded-full bg-primary/90" />
                        </div>

                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── BUILT AROUND THE WHOLE SALE ──────────────────────── */}
          <section className="py-16 md:py-[100px] border-t border-border">
            <div className="container max-w-5xl">
              <motion.div {...fade()} className="max-w-2xl">
                <h2 className="text-2xl md:text-[2.1rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                  Built around the whole sale — not just the listing.
                </h2>
              </motion.div>

              <div className="mt-14 space-y-14 md:space-y-20">
                {wholeSale.map((row, i) => (
                  <motion.div
                    key={row.title}
                    {...fade()}
                    className={`grid md:grid-cols-2 gap-8 md:gap-14 items-center ${
                      i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
                    }`}
                  >
                    <div>
                      <row.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h3 className="mt-4 text-xl md:text-2xl font-semibold tracking-[-0.01em] text-foreground">
                        {row.title}
                      </h3>
                      <p className="mt-4 text-sm md:text-[0.95rem] text-muted-foreground leading-relaxed">
                        {row.body}
                      </p>
                      <Link
                        to={row.href}
                        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        {row.cta}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                    <img
                      src={realPhotos[i + 4]?.imageUrl ?? realPhotos[i]?.imageUrl ?? row.image}
                      alt={realPhotos[i + 4] || realPhotos[i]
                        ? `${(realPhotos[i + 4] ?? realPhotos[i]).title} listed for sale on Vendibook`
                        : row.alt}
                      loading="lazy"
                      className="w-full aspect-[4/3] object-cover rounded-[26px] shadow-[0_22px_56px_-34px_rgba(24,20,16,0.45)]"
                    />

                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FEES ─────────────────────────────────────────────── */}
          <section className="py-16 md:py-[100px] border-t border-border">
            <div className="container max-w-5xl">
              <motion.div {...fade()} className="max-w-2xl">
                <h2 className="text-2xl md:text-[2.1rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                  What it costs, plainly.
                </h2>
              </motion.div>

              <div className="mt-12 grid md:grid-cols-3 gap-y-10 md:gap-y-0 md:divide-x md:divide-border">
                {[
                  {
                    value: 'Free',
                    label: 'To list',
                    body: 'Publishing a standard for-sale listing costs nothing, subject to current account and listing limits.',
                  },
                  {
                    value: '0%',
                    label: 'Vendibook platform transaction fee, in person',
                    body: 'When payment is handled directly between you and the buyer, Vendibook takes no platform transaction fee on the sale.',
                  },
                  {
                    value: '12.9%',
                    label: 'Online seller fee · 10.9% for Vendibook Pro',
                    body: `Applies only if the buyer pays through optional Vendibook online checkout. Pro (${pro.labelWithCadence}) saves 2 points, capped at $500 per completed transaction.`,
                  },
                ].map((col, i) => (
                  <motion.div
                    key={col.label}
                    {...fade(i * 0.06)}
                    className="md:px-8 first:md:pl-0 last:md:pr-0"
                  >
                    <div className="text-[2.25rem] leading-none font-semibold tracking-[-0.02em] text-foreground">
                      {col.value}
                    </div>
                    <div className="mt-3 text-sm font-medium text-foreground">{col.label}</div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{col.body}</p>
                  </motion.div>
                ))}
              </div>

              <p className="mt-10 text-xs text-muted-foreground leading-relaxed max-w-3xl">
                Payment-processing costs charged by the payment provider are separate where applicable.
                Payouts on completed online sales are reviewed and issued by Vendibook.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-2xl" asChild>
                  <Link to="/pricing">See pricing and Pro details</Link>
                </Button>
                <Button variant="ghost" className="rounded-2xl text-foreground" asChild>
                  <Link to="/list/concierge">Optional Concierge Listing · {concierge.label}</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ─────────────────────────────────────── */}
          <section id="how-selling-works" className="py-16 md:py-[100px] border-t border-border scroll-mt-24">
            <div className="container max-w-5xl">
              <motion.div {...fade()} className="max-w-2xl">
                <h2 className="text-2xl md:text-[2.1rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                  How selling works.
                </h2>
              </motion.div>
              <div className="mt-12 grid md:grid-cols-3 gap-x-10 gap-y-10">
                {steps.map((step, i) => (
                  <motion.div key={step.n} {...fade(i * 0.06)}>
                    <div className="text-sm font-semibold tracking-[0.16em] text-primary">{step.n}</div>
                    <h3 className="mt-4 text-lg font-medium text-foreground">{step.title}</h3>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-10">
                <Link
                  to="/how-it-works?role=sell"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  See the full seller journey →
                </Link>
              </div>
            </div>
          </section>

          {/* ── PRICEPILOT ───────────────────────────────────────── */}
          <section className="py-16 md:py-[100px] border-t border-border">
            <div className="container max-w-4xl">
              <motion.div {...fade()} className="md:flex md:items-start md:gap-12">
                <Calculator className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
                <div className="mt-5 md:mt-0">
                  <h2 className="text-2xl md:text-[1.9rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                    Not sure what to ask for it?
                  </h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    PricePilot gives you market-evidence pricing guidance: enter your equipment details and
                    it returns a suggested asking-range built from comparable listing data. Comparables are
                    asking prices and market signals, not confirmed closing prices — treat it as guidance,
                    not an appraisal or a guarantee of sale price.
                  </p>
                  <Link
                    to="/tools/pricepilot"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Open PricePilot
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <section className="py-16 md:py-[100px] border-t border-border">
            <div className="container max-w-3xl">
              <h2 className="text-2xl md:text-[2.1rem] leading-tight font-semibold tracking-[-0.015em] text-foreground">
                Seller questions
              </h2>
              <Accordion type="single" collapsible className="mt-8 w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`item-${index}`} className="border-border">
                    <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* ── INTERNAL LINKS ───────────────────────────────────── */}
          <section className="py-14 md:py-20 border-t border-border">
            <div className="container max-w-4xl">
              <h2 className="text-lg font-medium text-foreground">Part of the Vendibook marketplace</h2>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-10 gap-y-3 text-sm">
                <li><Link to="/food-trucks-for-sale" className="font-medium text-primary hover:underline">Food trucks for sale →</Link></li>
                <li><Link to="/food-trailers-for-sale" className="font-medium text-primary hover:underline">Food trailers for sale →</Link></li>
                <li><Link to="/sell-food-trailer" className="font-medium text-primary hover:underline">Sell your food trailer →</Link></li>
                <li><Link to="/sell-concession-trailer" className="font-medium text-primary hover:underline">Sell your concession trailer →</Link></li>
                <li><Link to="/financing" className="font-medium text-primary hover:underline">How buyer financing works →</Link></li>
                <li><Link to="/how-it-works?role=sell" className="font-medium text-primary hover:underline">The full seller journey →</Link></li>
                <li><Link to="/tools/pricepilot" className="font-medium text-primary hover:underline">Estimate your asking price with PricePilot →</Link></li>
                <li><Link to="/pricing" className="font-medium text-primary hover:underline">Pricing and Vendibook Pro →</Link></li>
              </ul>
            </div>
          </section>

          {/* ── FINAL CTA ────────────────────────────────────────── */}
          <section className="border-t border-border">
            <div className="container max-w-6xl py-16 md:py-24">
              <motion.div
                {...fade()}
                className="rounded-[34px] bg-[#f4efe7] px-7 py-14 md:px-16 md:py-20 text-center"
              >
                <h2 className="text-2xl md:text-[2.3rem] leading-tight font-semibold tracking-[-0.02em] text-foreground max-w-2xl mx-auto">
                  Ready to sell your food truck?
                </h2>
                <p className="mt-4 text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Listing is free, drafts save as you go, and you decide how you get paid.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" variant="cta" asChild>
                    <Link to={LIST_HREF}>
                      List my food truck free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="rounded-2xl text-foreground" asChild>
                    <Link to="/food-trucks-for-sale">Browse food trucks for sale</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

        </main>

        <Footer />

      </div>
    </>
  );
};

export default SellMyFoodTruck;
