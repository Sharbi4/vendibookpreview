import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  ReceiptText,
  CreditCard,
  MailCheck,
  Truck,
  PackageCheck,
  ShieldCheck,
  Banknote,
  Clock,
  MessageSquareWarning,
  Building2,
  MapPin,
  ArrowRight,
  FileText,
  LifeBuoy,
  HandCoins,
  HelpCircle,
  BadgeDollarSign,
  KeyRound,
  Route as RouteIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { PayPalMonogram, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { cn } from '@/lib/utils';

/**
 * /how-purchasing-works — buyer education page for for-sale equipment.
 *
 * Copy guardrails (do not regress): no escrow language, no guaranteed
 * approvals or payout timing, no 72h/7-day processing claims, no automatic
 * tax-calculation claims, and Plaid identity verification stays optional.
 * Everything below reflects the current live PayPal + Pay in Person model.
 */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45 },
};

/* ------------------------------------------------------------------ */
/* Hero visual — listing card flowing through the purchase journey     */
/* ------------------------------------------------------------------ */

const HERO_FLOW = [
  { icon: CreditCard, label: 'Choose how to pay' },
  { icon: Truck, label: 'Plan pickup or delivery' },
  { icon: PackageCheck, label: 'Confirm receipt' },
  { icon: HandCoins, label: 'Purchase complete' },
];

const HeroJourneyVisual = () => {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)] p-5 sm:p-6"
      aria-hidden="true"
    >
      {/* Mini listing card */}
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <div className="h-28 bg-foreground/[0.04] flex items-center justify-center">
          <Truck className="w-10 h-10 text-foreground/25" />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">2021 Concession Food Truck</p>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Austin, TX area
              </p>
            </div>
            <p className="text-sm font-bold text-foreground whitespace-nowrap">$68,500</p>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-border px-2.5 py-1 text-[10px] font-medium text-foreground/70">
            <ShieldCheck className="w-3 h-3 text-primary" /> Built for serious buyers
          </div>
        </div>
      </div>

      {/* Journey rail */}
      <div className="relative mt-6 px-1">
        <svg
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-2 text-border"
          viewBox="0 0 100 2"
          preserveAspectRatio="none"
        >
          <line x1="0" y1="1" x2="100" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
        <motion.svg
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-2 text-primary"
          viewBox="0 0 100 2"
          preserveAspectRatio="none"
          initial={reduce ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 2.4, ease: 'easeInOut', delay: 0.4 }}
          />
        </motion.svg>
        <ol className="relative grid grid-cols-4 gap-1">
          {HERO_FLOW.map((node, i) => (
            <motion.li
              key={node.label}
              className="flex flex-col items-center text-center gap-2"
              initial={reduce ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.35 }}
            >
              <span
                className={cn(
                  'w-10 h-10 rounded-full border bg-background flex items-center justify-center shadow-sm',
                  i === 0 ? 'border-primary/40 text-primary' : 'border-border text-foreground/60',
                )}
              >
                <node.icon className="w-4 h-4" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-foreground/70 leading-tight">
                {node.label}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Six-stage journey                                                   */
/* ------------------------------------------------------------------ */

const JOURNEY = [
  {
    icon: Search,
    title: 'Find a truck that fits your business',
    body: 'Explore detailed listings with photos, specs, pricing, and location information so you can quickly narrow in on the equipment that makes sense for your concept and budget.',
    tags: ['Photos, specs & pricing', 'Browse nationwide'],
  },
  {
    icon: ReceiptText,
    title: 'Ask questions. Compare. Make an offer.',
    body: 'Message the seller directly, clarify the details that matter, and submit an offer where the listing supports it. You can take your time before deciding to move forward.',
    tags: ['Message the seller', 'Offers where available'],
  },
  {
    icon: CreditCard,
    title: 'Choose how you want to pay',
    body: 'When online checkout is offered, you can pay through Vendibook’s PayPal checkout. If the seller allows Pay in Person, you can arrange payment directly at pickup or delivery instead.',
    tags: ['PayPal checkout', 'Pay in Person'],
  },
  {
    icon: MailCheck,
    title: 'Seller confirms the sale',
    body: 'The seller reviews the purchase and confirms the next steps. From there, you’ll coordinate the details you need for pickup, delivery, or freight.',
    tags: ['Seller confirmation', 'Stay connected'],
  },
  {
    icon: Truck,
    title: 'Choose the delivery option that works for you',
    body: 'Pick up locally, use seller delivery when offered, or explore Vendibook Freight for longer-distance purchases. Freight is quoted and arranged separately when available.',
    tags: ['Pickup', 'Seller delivery', 'Vendibook Freight'],
  },
  {
    icon: PackageCheck,
    title: 'Receive it and close out the purchase',
    body: 'Once the truck or trailer is in your hands, inspect it and confirm receipt when everything is in order. That confirmation helps move the purchase to completion and the seller’s payout process forward.',
    tags: ['Inspect before confirming', 'Complete the purchase'],
  },
];

/* ------------------------------------------------------------------ */
/* Money & trust                                                       */
/* ------------------------------------------------------------------ */

const TRUST_POINTS = [
  {
    icon: 'paypal',
    title: 'Pay online with PayPal when it’s available',
    body: 'For listings with online checkout, payment is completed through Vendibook’s PayPal-powered checkout and recorded with the purchase.',
  },
  {
    icon: 'banknote',
    title: 'Prefer to pay in person? Some sellers offer that too.',
    body: 'When Pay in Person is available, you and the seller arrange payment directly at pickup or delivery.',
  },
  {
    icon: 'clock',
    title: 'The sale isn’t complete the moment you pay',
    body: 'Payment is only one part of a high-value equipment purchase. Delivery or pickup and the required confirmations still need to happen before the transaction is treated as complete.',
  },
  {
    icon: 'shield',
    title: 'Confirm only after you’ve received and inspected it',
    body: 'Take a moment to inspect the equipment before confirming receipt. Your confirmation tells Vendibook the handoff has been completed.',
  },
  {
    icon: 'warning',
    title: 'Something not right? Tell us before you confirm.',
    body: 'If there’s an issue with the equipment or delivery, report it through Vendibook before confirming receipt so the concern is documented while the purchase is still open.',
  },
  {
    icon: 'building',
    title: 'Vendibook brings the marketplace together',
    body: 'Vendibook connects buyers and sellers and provides the marketplace tools around the purchase. The seller owns the equipment, and financing decisions are made by third-party financing partners.',
  },
];

const TrustIcon = ({ kind }: { kind: string }) => {
  const cls = 'w-5 h-5';
  switch (kind) {
    case 'paypal':
      return <PayPalMonogram className="w-5 h-5" />;
    case 'banknote':
      return <Banknote className={cls} />;
    case 'clock':
      return <Clock className={cls} />;
    case 'shield':
      return <ShieldCheck className={cls} />;
    case 'warning':
      return <MessageSquareWarning className={cls} />;
    default:
      return <Building2 className={cls} />;
  }
};

/* ------------------------------------------------------------------ */
/* Fulfillment comparison                                              */
/* ------------------------------------------------------------------ */

const FreightRouteAnimation = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-12 mt-4" aria-hidden="true">
      <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
        <path
          d="M8 30 C 60 8, 140 8, 192 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="text-border"
        />
        <motion.path
          d="M8 30 C 60 8, 140 8, 192 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-primary"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={reduce ? { duration: 0 } : { duration: 1.8, ease: 'easeInOut' }}
        />
      </svg>
      <motion.div
        className="absolute top-0 left-0"
        initial={reduce ? { left: 'calc(96% - 12px)', top: '18px' } : { left: '0%', top: '18px' }}
        whileInView={reduce ? undefined : { left: 'calc(96% - 12px)' }}
        viewport={{ once: true }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      >
        <span className="flex w-7 h-7 rounded-full bg-primary/10 border border-primary/30 items-center justify-center">
          <Truck className="w-3.5 h-3.5 text-primary" />
        </span>
      </motion.div>
    </div>
  );
};

const FULFILLMENT = [
  {
    icon: KeyRound,
    title: 'Pickup',
    who: 'A simple option for local purchases',
    body: 'Coordinate a pickup time with the seller and collect the truck or trailer directly. Final pickup details are arranged with the seller.',
  },
  {
    icon: MapPin,
    title: 'Seller delivery',
    who: 'When delivery is offered by the seller',
    body: 'Some sellers can bring the equipment to you. Availability, timing, and any delivery cost depend on the listing and are arranged with the seller.',
  },
  {
    icon: RouteIcon,
    title: 'Vendibook Freight',
    who: 'For longer-distance purchases',
    body: 'Found the right truck in another city or state? When Freight is available, Vendibook can help coordinate transport so you can consider equipment beyond your local market. Freight is quoted and arranged separately.',
    freight: true,
  },
];

/* ------------------------------------------------------------------ */
/* Related resources                                                   */
/* ------------------------------------------------------------------ */

const RESOURCES = [
  {
    icon: Truck,
    title: 'Vendibook Freight',
    body: 'See how long-distance transport works and what to expect when Freight is available.',
    cta: 'Explore Vendibook Freight',
    to: '/help/shipping-freight',
  },
  {
    icon: FileText,
    title: 'Disputes & buyer support',
    body: 'Know what to do if there’s a problem before, during, or after the handoff.',
    cta: 'Learn about buyer support',
    to: '/help/dispute-evidence',
  },
  {
    icon: BadgeDollarSign,
    title: 'Financing',
    body: 'Explore financing options available through third-party partners on eligible equipment.',
    cta: 'See financing options',
    to: '/financing',
  },
  {
    icon: HelpCircle,
    title: 'Help Center',
    body: 'Find answers about buying, payments, delivery, your account, and more.',
    cta: 'Visit the Help Center',
    to: '/help',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const HowPurchasingWorks = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="How Purchasing Works on Vendibook"
        description="Buy a food truck or trailer with structure: review the listing, pay online through PayPal checkout or in person, coordinate pickup, delivery, or freight, and confirm the handoff."
        canonical="/how-purchasing-works"
      />

      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-14 pb-12 md:pt-20 md:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-xs font-medium text-foreground mb-4">
                  Buyer guide
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                  How purchasing works on Vendibook
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Buying a food truck or trailer is a high-value decision. Vendibook guides you from
                  listing review through secure payment and a confirmed handoff — with every step
                  recorded in one structured transaction, not a classifieds thread.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">Browse equipment</Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/financing">Explore financing</Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <HeroJourneyVisual />
              </motion.div>
            </div>
          </div>
        </section>

        {/* SIX-STAGE JOURNEY */}
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                The buyer journey
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Six stages, start to keys-in-hand
              </h2>
            </motion.div>

            <ol className="relative space-y-4">
              <div
                className="absolute left-[27px] top-4 bottom-4 w-px bg-border hidden sm:block"
                aria-hidden="true"
              />
              {JOURNEY.map((stage, i) => (
                <motion.li
                  key={stage.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                  className="relative flex gap-4 sm:gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6 hover:shadow-md transition-shadow"
                >
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm shrink-0">
                      <stage.icon className="w-5 h-5 text-foreground/70" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1">
                      Stage {i + 1}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground mb-1.5">{stage.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{stage.body}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {stage.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-foreground/5 border border-border px-2.5 py-1 text-[10px] font-medium text-foreground/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* MONEY / TRUST */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Money &amp; trust
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Know what happens at every step
              </h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
                No fine-print surprises. Here is how money, confirmation, and responsibility actually
                work on a Vendibook purchase.
              </p>
            </motion.div>

            <ul className="space-y-3">
              {TRUST_POINTS.map((point, i) => (
                <motion.li
                  key={point.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.04 }}
                  className="flex gap-4 rounded-2xl border border-border bg-background p-5"
                >
                  <span className="w-10 h-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center shrink-0 text-foreground/70">
                    <TrustIcon kind={point.icon} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{point.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* FULFILLMENT COMPARISON */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Getting the equipment
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Three ways to take possession
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {FULFILLMENT.map((f, i) => (
                <motion.div
                  key={f.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06 }}
                  className="rounded-3xl border border-border bg-card p-6 flex flex-col hover:shadow-md transition-shadow"
                >
                  <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center mb-4 shadow-sm">
                    <f.icon className="w-5 h-5 text-foreground/70" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mt-1 mb-2.5">
                    {f.who}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  {f.freight && <FreightRouteAnimation />}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FINANCING */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-3xl border border-border bg-background p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10"
            >
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-xs font-medium text-foreground mb-4">
                  Optional · Eligible for-sale listings
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Financing, without the guesswork
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5 max-w-xl">
                  Eligible for-sale equipment supports buyer financing through third-party partners.
                  Vendibook is not a lender — approval, rates, and terms are decided by the financing
                  partner, and applying never obligates you to buy.
                </p>
                <Button variant="cta-outline" className="rounded-full" asChild>
                  <Link to="/financing">
                    Explore financing options <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
              <div className="shrink-0 flex items-center justify-center rounded-2xl border border-border bg-card px-8 py-6">
                <EquinoxFundingLogo className="h-8 w-auto" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* RELATED RESOURCES */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Keep exploring</h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto">
                Deeper guides for each part of the purchase.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {RESOURCES.map((r, i) => (
                <motion.div
                  key={r.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                >
                  <Link
                    to={r.to}
                    className="group flex gap-4 rounded-3xl border border-border bg-card p-6 h-full hover:shadow-md hover:border-foreground/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <r.icon className="w-5 h-5 text-foreground/70" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-foreground mb-1">
                        {r.title}
                      </span>
                      <span className="block text-sm text-muted-foreground leading-relaxed mb-2.5">
                        {r.body}
                      </span>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        {r.cta}
                        <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="pb-16 md:pb-20">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Ready to find your equipment?
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Every for-sale listing shows its payment and fulfillment options before you commit.
              </p>
              <Button variant="cta" size="lg" className="rounded-full" asChild>
                <Link to="/browse">
                  Browse equipment for sale <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-6 inline-flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Questions before you buy? Visit the{' '}
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

export default HowPurchasingWorks;
