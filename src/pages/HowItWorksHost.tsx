import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck,
  Calendar,
  Camera,
  ClipboardCheck,
  FileText,
  HandCoins,
  KeyRound,
  LifeBuoy,
  MapPin,
  Search,
  Wallet,
  type LucideIcon,
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
import imgHosting from '@/assets/how-hosting-hero.jpg';
import imgKitchen from '@/assets/concierge-kitchen.jpg';

/**
 * /how-it-works-host — the warm, editorial host/rental guide.
 *
 * Airbnb-style host education adapted to food trucks, trailers, commercial
 * kitchens, and vendor spaces.
 *
 * Copy guardrails (do not regress): no Stripe Identity, no universal
 * "all renters verified" claims, no guaranteed payout timing, no fabricated
 * earnings or time-to-first-booking metrics, no "AI price optimization"
 * overstatement (PricePilot offers data-backed guidance), and security
 * deposits are arranged directly with the renter — not collected through
 * Vendibook checkout. Fees match src/lib/commissions.ts and
 * src/lib/fees/proFee.ts.
 */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

/* ------------------------------------------------------------------ */
/* Hero visual — your listing, earning                                 */
/* ------------------------------------------------------------------ */

const HeroCollage = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative" aria-hidden="true">
      {/* Main listing card */}
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <img src={imgHosting} alt="" className="aspect-[16/9] w-full object-cover" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">Your truck, booked on its quiet days</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Your rates · your calendar · your rules
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:text-[11px]">
              <Calendar className="h-3 w-3" />
              You set availability
            </span>
          </div>
          <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Camera className="h-3.5 w-3.5" />
            Photos
            <span aria-hidden className="text-border">·</span>
            Amenities
            <span aria-hidden className="text-border">·</span>
            House rules
          </div>
        </div>
      </motion.div>

      {/* Floating booking card */}
      <motion.div
        className="absolute -left-2 bottom-40 w-44 rounded-2xl border border-border bg-card p-3.5 shadow-lg sm:left-2 sm:bottom-24 sm:w-56"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <CalendarCheck className="h-3 w-3 text-primary" />
          New booking request
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          “Saturday farmers market, 6am–2pm. Can we pick up Friday night?”
        </p>
      </motion.div>

      {/* Free-to-list cue */}
      <motion.div
        className="absolute right-2 top-6 rounded-full border border-border bg-card px-3.5 py-2 shadow-md sm:-right-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.5 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <KeyRound className="h-3 w-3 text-primary" />
          Free to list
        </p>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const CONTROL_BLOCKS: { title: string; body: string }[] = [
  {
    title: 'Your rates, your calendar',
    body: 'Set hourly, daily, weekly, or monthly rates. Block the days the truck is working for you, and open the ones it isn’t.',
  },
  {
    title: 'Approve every booking — or don’t',
    body: 'Review each request before you accept, or switch on Instant Book for renters who are ready to go. You can change your mind any time.',
  },
  {
    title: 'Your rules, in writing',
    body: 'Mileage limits, cleaning expectations, where it can go, what documents you need. Set them on the listing so there are no surprises at handoff.',
  },
];

const LISTING_BLOCKS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Camera,
    title: 'Photos that answer questions',
    body: 'The kitchen line, the storage, the hookups, the serving setup. Renters planning an event want to see exactly what they’re getting.',
  },
  {
    icon: FileText,
    title: 'The details renters plan around',
    body: 'What’s included, power and water requirements, dimensions, and anything that affects whether it works for their event or shift.',
  },
  {
    icon: MapPin,
    title: 'Clear pickup and access info',
    body: 'Where it lives, when it can be collected, and how handoff works. Exact location stays private until a booking is confirmed.',
  },
];

const RENTAL_STEPS: { title: string; body: string }[] = [
  {
    title: 'Get the request',
    body: 'A renter picks dates and sends a request — or books instantly where you’ve enabled Instant Book. You see their profile and the details up front.',
  },
  {
    title: 'They pay online',
    body: 'Confirmed bookings are paid through PayPal checkout and recorded to your dashboard. No invoices to chase, no cash apps to reconcile.',
  },
  {
    title: 'Hand it over',
    body: 'Meet the renter, walk the equipment, hand over the keys. Your listing’s rules and requirements travel with the booking.',
  },
  {
    title: 'Welcome it back',
    body: 'Check it in, confirm the return, and you’re done. The whole rental stays in one record if you ever need to look back.',
  },
];

const COST_ROWS: { label: string; value: string; note: string }[] = [
  {
    label: 'Publishing a listing',
    value: 'Free',
    note: 'No subscription, no upfront fee, no add-on required to go live.',
  },
  {
    label: 'A completed online booking',
    value: '12.9% host fee',
    note: 'Deducted from the booking total when a rental completes. Vendibook Pro members pay 10.9% instead, up to $500 saved per transaction.',
  },
  {
    label: 'Everything else',
    value: 'Nothing',
    note: 'Browsing, messaging, and calendar tools are included. You only share revenue when you actually earn it.',
  },
];

const HOST_TOOLS: { icon: LucideIcon; name: string; note: string; to: string }[] = [
  {
    icon: Search,
    name: 'PricePilot',
    note: 'Data-backed pricing suggestions based on comparable live listings in your market.',
    to: '/tools/pricepilot',
  },
  {
    icon: ClipboardCheck,
    name: 'PermitPath',
    note: 'The licenses, permits, and inspections for your address — helpful context for you and your renters.',
    to: '/tools/permitpath',
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How much does it cost to host?',
    a: 'Listing is free. A 12.9% host fee is deducted when a booking completes through online checkout — 10.9% for active Vendibook Pro members, up to $500 saved per transaction. No subscriptions required to list.',
  },
  {
    q: 'Do I have to accept every booking?',
    a: 'No. Unless you switch on Instant Book, you review every request and approve or decline it yourself. You also control your calendar — block any dates you don’t want booked.',
  },
  {
    q: 'What about a security deposit?',
    a: 'You can set a security deposit amount on your listing. It’s arranged directly with the renter — it isn’t collected through Vendibook’s checkout — and the refund terms are yours to set.',
  },
  {
    q: 'When and how do I get paid?',
    a: 'Save a payout destination in your dashboard — PayPal, Venmo, or ACH. For completed online bookings, payouts are typically released within 24 hours of the booking start, and we always strive for 24–48 hours.',
  },
  {
    q: 'Can I ask renters for documents?',
    a: 'Yes. Where your listing requires them — insurance, a business license, a health permit — you can ask renters to provide documents, and they stay attached to the booking so everything is in one place.',
  },
  {
    q: 'Can I list more than one asset?',
    a: 'Yes — list as many trucks, trailers, kitchens, or vendor spaces as you have, and manage them all from one dashboard. There’s no limit.',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const HowItWorksHost = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <SEO
        title="Rent Out Your Food Truck, Kitchen, or Space | Vendibook"
        description="List your truck, trailer, commercial kitchen, or vendor space for free. Set your rates and availability, review booking requests, and get paid through PayPal checkout."
        canonical="/how-it-works-host"
      />
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-14 pb-16 md:pt-20 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-xs font-medium text-foreground mb-4">
                  Hosting on Vendibook
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                  Put your equipment or space to work when you’re not using it.
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  List your truck, trailer, commercial kitchen, or vendor space,
                  set your availability and rates, review booking requests, and
                  keep every rental’s details together in one place.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/list/start?mode=rent">
                      List for rent <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/search?mode=rent">See what renters book</Link>
                  </Button>
                </div>
              </motion.div>

              <div className="pb-6 pl-2 sm:pl-6">
                <HeroCollage />
              </div>
            </div>
          </div>
        </section>

        {/* A — YOU STAY IN CONTROL */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Hosting, your way
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                You stay in control.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                It’s your truck, your kitchen, your space. Vendibook handles the
                discovery and the paperwork of booking — the decisions stay with you.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10">
              {CONTROL_BLOCKS.map((b, i) => (
                <motion.div
                  key={b.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span aria-hidden className="block h-px w-10 bg-primary/50 mb-5" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* B — A LISTING BUILT FOR SERIOUS RENTERS (featured editorial) */}
        <section className="py-12 md:py-20">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-14 md:mb-20">
              <motion.div {...(reduce ? {} : fadeUp)}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Your listing
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  A listing built for serious renters.
                </h2>
                <p className="text-base text-muted-foreground mt-4 leading-relaxed">
                  Someone booking a commissary kitchen for their catering season — or
                  a trailer for a festival weekend — is making a plan, not browsing
                  casually. The more your listing answers up front, the better the
                  requests you receive.
                </p>
              </motion.div>
              <motion.div {...(reduce ? {} : fadeUp)}>
                <div className="overflow-hidden rounded-3xl border border-border shadow-[0_24px_60px_-24px_rgba(0,0,0,0.15)]">
                  <img
                    src={imgKitchen}
                    alt="A commercial kitchen listed for rent on Vendibook"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              </motion.div>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10">
              {LISTING_BLOCKS.map((b, i) => (
                <motion.div
                  key={b.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm mb-5">
                    <b.icon className="w-5 h-5 text-foreground/70" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* C — FROM REQUEST TO RETURN */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                How a rental runs
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                From request to return.
              </h2>
            </motion.div>

            <ol className="space-y-0">
              {RENTAL_STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                  className="flex gap-5 sm:gap-8 py-6 border-b border-border last:border-b-0"
                >
                  <span
                    aria-hidden
                    className="shrink-0 text-sm font-semibold text-primary tabular-nums pt-0.5"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                      {s.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* D — WHAT IT COSTS */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                The numbers
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                What it costs to host.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Free to list, free to browse, free to message. You only share revenue
                when a booking actually completes.
              </p>
            </motion.div>

            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.15)]"
            >
              <dl>
                {COST_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 py-5 border-b border-border last:border-b-0 first:pt-0 last:pb-0"
                  >
                    <dt className="sm:w-56 shrink-0">
                      <span className="block text-base font-semibold text-foreground">{row.label}</span>
                    </dt>
                    <dd className="flex-1">
                      <span className="block text-base font-semibold text-primary">{row.value}</span>
                      <span className="block text-sm text-muted-foreground leading-relaxed mt-1">
                        {row.note}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 pt-5 border-t border-border text-xs text-muted-foreground leading-relaxed">
                Hosting regularly?{' '}
                <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground">
                  Vendibook Pro
                </Link>{' '}
                lowers the host-side fee on completed bookings, among other benefits.
              </p>
            </motion.div>
          </div>
        </section>

        {/* E — HELPFUL TOOLS */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Included tools
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Helpful tools for hosts.
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {HOST_TOOLS.map((t, i) => (
                <motion.div
                  key={t.name}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06, ease }}
                >
                  <Link
                    to={t.to}
                    className="group flex items-center gap-4 h-full rounded-3xl border border-border bg-card p-5 sm:p-6 hover:shadow-md hover:border-foreground/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <t.icon className="w-5 h-5 text-foreground/70" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-base font-semibold text-foreground">{t.name}</span>
                      <span className="block text-sm text-muted-foreground leading-relaxed mt-0.5">
                        {t.note}
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* F — FAQ */}
        <section className="py-12 md:py-20">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Questions hosts actually ask.
              </h2>
            </motion.div>
            <Accordion type="single" collapsible>
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`} className="border-border">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-20 border-t border-border bg-card/40">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Your quiet days could be booked days.
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Listing is free and takes a few minutes. Set your rates, open your
                calendar, and see who’s looking.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/list/start?mode=rent">
                    List for rent <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/how-it-works-seller">Selling instead?</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-6 inline-flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Questions? Visit the{' '}
                <Link to="/help" className="underline underline-offset-2 hover:text-foreground">
                  Help Center
                </Link>
                .
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorksHost;
