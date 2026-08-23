import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  Handshake,
  BadgeDollarSign,
  Truck,
  ShoppingBag,
  Tag,
  CalendarSearch,
  KeyRound,
  Building2,
  CreditCard,
  Banknote,
  PackageCheck,
  MessageSquareWarning,
  Route as RouteIcon,
  FileText,
  HelpCircle,
  ArrowRight,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';

/**
 * /how-it-works — clean editorial guide hub.
 *
 * Purpose: within ~30 seconds a visitor understands what Vendibook is and
 * chooses the correct path. Copy guardrails (do not regress): no escrow or
 * "payment protection" claims, no guaranteed/instant payout timing, no
 * universal identity-verification claims, no fabricated social-proof metrics,
 * financing stays third-party, freight stays a separate coordination path.
 */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45 },
};

/* ------------------------------------------------------------------ */
/* Hero visual — one restrained structured-marketplace flow            */
/* ------------------------------------------------------------------ */

const HERO_FLOW: { icon: LucideIcon; label: string }[] = [
  { icon: Search, label: 'Discover & list' },
  { icon: Handshake, label: 'Transact' },
  { icon: Truck, label: 'Fulfill' },
  { icon: PackageCheck, label: 'Confirm' },
];

const HeroFlowVisual = () => {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)] p-6 sm:p-8"
      aria-hidden="true"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-6">
        One structured marketplace
      </p>
      <ol className="relative space-y-4">
        <div
          className="absolute left-[21px] top-3 bottom-3 w-px bg-border"
          aria-hidden="true"
        />
        {HERO_FLOW.map((node, i) => (
          <motion.li
            key={node.label}
            className="relative flex items-center gap-4"
            initial={reduce ? undefined : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.2 + i * 0.12 }}
          >
            <span
              className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm ${
                i === 0 ? 'border-primary/40 text-primary' : 'border-border text-foreground/60'
              }`}
            >
              <node.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-foreground">{node.label}</span>
          </motion.li>
        ))}
      </ol>
      <p className="mt-6 rounded-2xl border border-border bg-background px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Listings, messaging, payments, financing options, and fulfillment —
        organized in one record instead of a classifieds thread.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* What Vendibook actually does                                        */
/* ------------------------------------------------------------------ */

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Search,
    title: 'Marketplace',
    body: 'Discover, browse, and list food trucks, food trailers, commercial and shared kitchens, vendor spaces, and related mobile-food assets across the U.S.',
  },
  {
    icon: Handshake,
    title: 'Transactions',
    body: 'Messaging and offers where supported, secure PayPal online checkout or Pay in Person where the listing allows it, and a transaction record with confirmations.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Financing',
    body: 'Buyer financing through third-party partners on eligible for-sale equipment. Vendibook is not the lender — approval, rates, and terms belong to the financing partner.',
  },
  {
    icon: Truck,
    title: 'Fulfillment',
    body: 'Take possession by pickup, seller delivery, or Vendibook Freight where available — coordinated as part of the transaction instead of arranged over the phone.',
  },
];

/* ------------------------------------------------------------------ */
/* Choose your path                                                    */
/* ------------------------------------------------------------------ */

interface Path {
  icon: LucideIcon;
  audience: string;
  title: string;
  body: string;
  cta: { label: string; to: string };
  secondary?: { label: string; to: string };
}

const PATHS: Path[] = [
  {
    icon: ShoppingBag,
    audience: 'For buyers',
    title: 'Buy equipment',
    body: 'Review listings with photos and specs, message the seller or make an offer where supported, pay online or in person, and confirm the handoff.',
    cta: { label: 'How purchasing works', to: '/how-purchasing-works' },
    secondary: { label: 'Browse equipment', to: '/browse' },
  },
  {
    icon: Tag,
    audience: 'For sellers',
    title: 'Sell equipment',
    body: 'Publish a standard listing free, add photos and your price, choose how you get paid, and complete the sale through the transaction record.',
    cta: { label: 'Read the seller guide', to: '/how-it-works-seller' },
    secondary: { label: 'List equipment for sale', to: '/list/start?mode=sale' },
  },
  {
    icon: CalendarSearch,
    audience: 'For renters',
    title: 'Rent equipment or space',
    body: 'Browse trucks, kitchens, and vendor spaces with live availability. Request to book or use Instant Book where the host offers it.',
    cta: { label: 'Browse rentals', to: '/search?mode=rent' },
  },
  {
    icon: KeyRound,
    audience: 'For hosts',
    title: 'List equipment or space for rent',
    body: 'Set your rates and availability, review requests or enable Instant Book, and decide whether renters pay online or in person.',
    cta: { label: 'Read the host guide', to: '/how-it-works-host' },
    secondary: { label: 'List for rent', to: '/list/start?mode=rent' },
  },
];

/* ------------------------------------------------------------------ */
/* Trust / money / roles                                               */
/* ------------------------------------------------------------------ */

const TRUST_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Building2,
    title: 'Vendibook is the marketplace',
    body: 'Vendibook operates the marketplace — we do not own the inventory, and we are not the equipment seller, manufacturer, or lender.',
  },
  {
    icon: CreditCard,
    title: 'Online payments run through PayPal checkout',
    body: 'When a seller or host enables online checkout, you pay through Vendibook’s secure PayPal-powered checkout, recorded to the transaction.',
  },
  {
    icon: Banknote,
    title: 'Pay in Person, when the listing allows it',
    body: 'Some listings accept payment in person. In that case buyer and seller arrange payment directly at pickup, delivery, or access.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Financing is provided by third-party partners',
    body: 'On eligible for-sale equipment, buyers can apply with financing partners. Approval, rates, and terms are the partner’s decision — never guaranteed.',
  },
  {
    icon: RouteIcon,
    title: 'Freight is a separate coordination path',
    body: 'Where available, Vendibook Freight arranges professional transport, quoted and scheduled separately from the equipment payment.',
  },
  {
    icon: PackageCheck,
    title: 'Confirmation matters before payout',
    body: 'A transaction is not finished at the payment button. Handoff and receipt confirmation move it toward completion, and Vendibook reviews and initiates seller payout after the applicable steps.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Report issues before you confirm',
    body: 'If something is wrong, report it through Vendibook before confirming receipt or completion, while the transaction is still open.',
  },
];

/* ------------------------------------------------------------------ */
/* Related guides                                                      */
/* ------------------------------------------------------------------ */

const GUIDES: { icon: LucideIcon; title: string; body: string; cta: string; to: string }[] = [
  {
    icon: ShoppingBag,
    title: 'How purchasing works',
    body: 'The six-stage buyer journey, from listing review to confirmed handoff.',
    cta: 'Read the buyer guide',
    to: '/how-purchasing-works',
  },
  {
    icon: Truck,
    title: 'Vendibook Freight',
    body: 'How Vendibook-arranged freight works, when it applies, and what to expect.',
    cta: 'Read the freight guide',
    to: '/help/shipping-freight',
  },
  {
    icon: BadgeDollarSign,
    title: 'Financing',
    body: 'Buyer financing through third-party partners on eligible for-sale equipment.',
    cta: 'Explore financing',
    to: '/financing',
  },
  {
    icon: FileText,
    title: 'Disputes & buyer support',
    body: 'What to do if something goes wrong, and what evidence helps resolve it.',
    cta: 'See how disputes work',
    to: '/help/dispute-evidence',
  },
  {
    icon: HelpCircle,
    title: 'Help Center',
    body: 'Guides for buying, selling, renting, hosting, payments, and your account.',
    cta: 'Visit the Help Center',
    to: '/help',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const HowItWorks = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="How Vendibook Works — Buy, Sell & Rent Food Trucks, Trailers & Kitchens"
        description="Vendibook is the U.S. marketplace for the mobile-food economy: buy, sell, and rent food trucks, food trailers, commercial kitchens, and vendor spaces with structured payment, financing, and fulfillment workflows."
        canonical="/how-it-works"
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
                  The marketplace for the mobile-food economy
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                  One marketplace for the equipment and spaces that power mobile food businesses.
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Vendibook connects buyers, sellers, renters, and hosts of food trucks, trailers,
                  commercial kitchens, and vendor spaces — and supports each transaction with
                  structured listings, payments, financing options, and fulfillment workflows
                  where applicable.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">Browse marketplace</Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/list">List an asset</Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <HeroFlowVisual />
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHAT VENDIBOOK ACTUALLY DOES */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                More than classifieds
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                What Vendibook actually does
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Four capabilities wrapped around every listing — so high-value equipment and
                commercial space can change hands with structure.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {CAPABILITIES.map((c, i) => (
                <motion.div
                  key={c.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06 }}
                  className="rounded-3xl border border-border bg-background p-6 hover:shadow-md transition-shadow"
                >
                  <span className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center mb-4 shadow-sm">
                    <c.icon className="w-5 h-5 text-foreground/70" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1.5">
                    {c.title}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CHOOSE YOUR PATH */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Four ways in
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Choose your path</h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {PATHS.map((p, i) => (
                <motion.article
                  key={p.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                  className="flex flex-col rounded-3xl border border-border bg-card p-6 sm:p-7 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <p.icon className="w-5 h-5 text-foreground/70" />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      {p.audience}
                    </p>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                    {p.body}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Link
                      to={p.cta.to}
                      className="group inline-flex items-center text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                    >
                      {p.cta.label}
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    {p.secondary && (
                      <Link
                        to={p.secondary.to}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                      >
                        {p.secondary.label}
                      </Link>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST / MONEY / ROLES */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Money, roles &amp; responsibility
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Know who does what — and when money moves
              </h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
                No fine-print surprises. Here is how payments, financing, freight, and payouts
                actually work on Vendibook.
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
                    <point.icon className="w-5 h-5" />
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

        {/* RELATED GUIDES */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Related guides</h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto">
                Deeper reading for each part of the marketplace.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {GUIDES.map((g, i) => (
                <motion.div
                  key={g.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                >
                  <Link
                    to={g.to}
                    className="group flex gap-4 rounded-3xl border border-border bg-card p-6 h-full hover:shadow-md hover:border-foreground/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <g.icon className="w-5 h-5 text-foreground/70" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-foreground mb-1">
                        {g.title}
                      </span>
                      <span className="block text-sm text-muted-foreground leading-relaxed mb-2.5">
                        {g.body}
                      </span>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        {g.cta}
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
                Ready to get moving?
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Browse live listings, or publish your own equipment or space for free.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">
                    Browse marketplace <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/list">List an asset</Link>
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

export default HowItWorks;
