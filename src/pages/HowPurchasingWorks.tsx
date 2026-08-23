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
  { icon: CreditCard, label: 'Secure payment' },
  { icon: Truck, label: 'Fulfillment' },
  { icon: PackageCheck, label: 'Confirmation' },
  { icon: HandCoins, label: 'Seller payout' },
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
            <ShieldCheck className="w-3 h-3 text-primary" /> Structured purchase flow
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
    title: 'Find the right equipment',
    body: 'Browse listings with photos, specs, price, and location up front. Message the seller with questions, send an offer where the seller accepts them, and look for financing options on eligible for-sale listings.',
    tags: ['Photos & specs', 'Messaging', 'Offers where supported'],
  },
  {
    icon: ReceiptText,
    title: 'Review your purchase',
    body: 'Checkout shows the price, your fulfillment choice, your buyer details, and the terms and costs that apply — before you commit to anything.',
    tags: ['Price & terms shown up front'],
  },
  {
    icon: CreditCard,
    title: 'Complete secure payment or a purchase request',
    body: 'Where the seller enables it, you check out online through Vendibook’s secure PayPal checkout. If the listing allows Pay in Person, you arrange payment directly with the seller at handoff instead.',
    tags: ['PayPal online checkout', 'Pay in Person'],
  },
  {
    icon: MailCheck,
    title: 'Seller confirmation & coordination',
    body: 'The seller reviews the transaction in their dashboard and confirms it. From there, you coordinate the fulfillment details together in Vendibook Messages.',
    tags: ['Seller review', 'In-app coordination'],
  },
  {
    icon: Truck,
    title: 'Pickup, seller delivery, or Vendibook Freight',
    body: 'Take possession the way the listing supports: pick the equipment up yourself, have the seller deliver it, or request Vendibook-arranged freight — quoted and scheduled separately from the equipment payment.',
    tags: ['3 fulfillment paths'],
  },
  {
    icon: PackageCheck,
    title: 'Confirm the handoff',
    body: 'When the equipment changes hands, both sides confirm in the transaction record. Confirmation moves the transaction toward completion, and Vendibook then reviews and initiates the seller’s payout under the applicable transaction terms.',
    tags: ['Two-sided confirmation'],
  },
];

/* ------------------------------------------------------------------ */
/* Money & trust                                                       */
/* ------------------------------------------------------------------ */

const TRUST_POINTS = [
  {
    icon: 'paypal',
    title: 'Online payments run through PayPal checkout',
    body: 'When a seller enables online checkout, you pay through Vendibook’s secure PayPal-powered checkout. Your payment is recorded to the transaction — it is not treated as paid out to the seller the moment you click Pay.',
  },
  {
    icon: 'banknote',
    title: 'Pay in Person, when the listing allows it',
    body: 'Some sellers accept payment in person. In that case you and the seller arrange payment directly at pickup or delivery, and Vendibook’s online-sale commission does not apply to that pay-in-person transaction.',
  },
  {
    icon: 'clock',
    title: 'Seller payout follows completion — not the click',
    body: 'A purchase isn’t finished at the payment button. Vendibook reviews and initiates the seller’s payout after the required transaction steps — including handoff confirmation — are complete.',
  },
  {
    icon: 'shield',
    title: 'Your confirmation matters',
    body: 'Confirm receipt only when you actually have the equipment and it matches what you agreed to. Your confirmation is a key step that moves the transaction toward completion.',
  },
  {
    icon: 'warning',
    title: 'Report a problem before you confirm',
    body: 'If something is wrong, report it through Vendibook before confirming receipt, while the transaction is still open. That keeps the issue on record and gives support a clear starting point.',
  },
  {
    icon: 'building',
    title: 'Vendibook is the marketplace',
    body: 'Vendibook operates the marketplace — we are not the equipment manufacturer, the seller, or a lender. Sellers are responsible for their listings, and financing decisions belong to the financing partners.',
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
    who: 'Coordinated by you and the seller',
    body: 'You travel to the seller at an agreed time and take the equipment yourself. The most common path for local purchases — agree on the details in Messages before you set out.',
  },
  {
    icon: MapPin,
    title: 'Seller delivery',
    who: 'Coordinated by the seller',
    body: 'Where the seller offers it, they bring the equipment to your address. Timing and any delivery fee are agreed with the seller directly in Messages.',
  },
  {
    icon: RouteIcon,
    title: 'Vendibook Freight',
    who: 'Coordinated by Vendibook with freight partners',
    body: 'For long-distance purchases where freight is available, Vendibook arranges professional transport. Freight is quoted and scheduled separately — it is not automatically included in the equipment payment.',
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
    body: 'How Vendibook-arranged freight works, when it applies, and what to expect.',
    cta: 'Read the freight guide',
    to: '/help/shipping-freight',
  },
  {
    icon: FileText,
    title: 'Disputes & buyer support',
    body: 'What to do if something goes wrong, and what evidence helps resolve it.',
    cta: 'See how disputes work',
    to: '/help/dispute-evidence',
  },
  {
    icon: BadgeDollarSign,
    title: 'Financing',
    body: 'Buyers on eligible for-sale listings can apply with third-party financing partners.',
    cta: 'Explore financing',
    to: '/financing',
  },
  {
    icon: HelpCircle,
    title: 'Help Center',
    body: 'Guides for buying, selling, payments, documents, and account questions.',
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
