import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  MapPin,
  MessageCircle,
  BadgeDollarSign,
  Truck,
  ShoppingBag,
  Tag,
  CalendarSearch,
  KeyRound,
  BadgeCheck,
  Wallet,
  FileText,
  LifeBuoy,
  HelpCircle,
  ClipboardCheck,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import imgBuying from '@/assets/how-buying-hero.jpg';
import imgCoffee from '@/assets/food-truck-coffee.jpg';
import imgPopcorn from '@/assets/food-truck-popcorn.jpg';

/**
 * /how-it-works — brand story + guide, not an operations manual.
 *
 * Answers, in order: why Vendibook exists → what it feels like → what you can
 * do here → where to go next.
 *
 * Copy guardrails (do not regress): no escrow or "payment protection" claims,
 * no guaranteed/instant payout timing, no universal identity-verification
 * claims (verification is "where completed"), no fabricated social-proof
 * metrics, financing stays third-party and never guaranteed, freight stays a
 * separately coordinated option.
 */

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

/* ------------------------------------------------------------------ */
/* Hero visual — editorial listing collage, not a process diagram      */
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
        <img
          src={imgBuying}
          alt=""
          className="aspect-[16/9] w-full object-cover"
        />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">Turn-key coffee truck</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Portland, OR
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary sm:text-[11px]">
              <BadgeDollarSign className="h-3 w-3" />
              Financing available
            </span>
          </div>
          <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            Message the seller
            <span aria-hidden className="text-border">·</span>
            Make an offer
          </div>
        </div>
      </motion.div>

      {/* Floating secondary card */}
      <motion.div
        className="absolute bottom-32 left-3 w-36 overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:bottom-28 sm:left-6 sm:w-52"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }}
      >
        <img src={imgPopcorn} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="p-3">
          <p className="truncate text-xs font-semibold text-foreground">Popcorn trailer</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Nashville, TN</p>
        </div>
      </motion.div>

      {/* Distance cue */}
      <motion.div
        className="absolute -right-3 top-6 rounded-full border border-border bg-card px-3.5 py-2 shadow-md sm:-right-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.5 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Truck className="h-3 w-3 text-primary" />
          Across the country? Freight can help.
        </p>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Why it feels different                                              */
/* ------------------------------------------------------------------ */

const DIFFERENCES: { title: string; body: string }[] = [
  {
    title: 'Shop with more context',
    body: 'Photos, video where sellers provide it, full specs, price, and location up front. Message the seller or make an offer where it’s supported — and keep every word attached to the listing.',
  },
  {
    title: 'Shop beyond local',
    body: 'Financing through third-party partners, pickup, seller delivery, and Vendibook Freight where available — so the right truck in another state is a real option, not just a saved tab.',
  },
  {
    title: 'Keep the purchase together',
    body: 'Pay through PayPal online checkout or in person where the listing allows it, confirm the handoff, and find the whole transaction in one record when you need it.',
  },
];

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

const TOOL_LINKS: { icon: LucideIcon; name: string; note: string; to: string }[] = [
  {
    icon: ClipboardCheck,
    name: 'PermitPath',
    note: 'Every license, permit, and inspection for your address — in one roadmap.',
    to: '/tools/permitpath',
  },
  {
    icon: BadgeDollarSign,
    name: 'Financing',
    note: 'Apply with third-party financing partners on eligible equipment.',
    to: '/financing',
  },
  {
    icon: Truck,
    name: 'Vendibook Freight',
    note: 'Professional transport, coordinated as part of the transaction where available.',
    to: '/help/shipping-freight',
  },
];

/* ------------------------------------------------------------------ */
/* Human pathways                                                      */
/* ------------------------------------------------------------------ */

interface Path {
  icon: LucideIcon;
  title: string;
  body: string;
  cta: { label: string; to: string };
  secondary?: { label: string; to: string };
}

const PATHS: Path[] = [
  {
    icon: ShoppingBag,
    title: 'I’m looking for a truck or trailer',
    body: 'Take your time. Compare listings, ask questions, and see how buying works before you commit to anything.',
    cta: { label: 'See how purchasing works', to: '/how-purchasing-works' },
    secondary: { label: 'Start browsing', to: '/browse' },
  },
  {
    icon: Tag,
    title: 'I’m ready to sell',
    body: 'Standard listings are free. Add your photos and your price, and hear from people actually shopping for what you have.',
    cta: { label: 'Read the seller guide', to: '/how-it-works-seller' },
    secondary: { label: 'List for free', to: '/list/start?mode=sale' },
  },
  {
    icon: CalendarSearch,
    title: 'I need something to rent',
    body: 'Trucks, kitchens, and vendor spaces with live availability. Request to book, or use Instant Book where the host offers it.',
    cta: { label: 'Browse rentals', to: '/search?mode=rent' },
  },
  {
    icon: KeyRound,
    title: 'I have equipment or space to rent out',
    body: 'Set your rates and availability, review requests or switch on Instant Book, and earn from what you already own.',
    cta: { label: 'Read the host guide', to: '/how-it-works-host' },
    secondary: { label: 'List for rent', to: '/list/start?mode=rent' },
  },
];

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

const CONFIDENCE_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeCheck,
    title: 'Know who you’re talking to',
    body: 'Seller profiles, listing history, and verification badges where the seller has completed verification.',
  },
  {
    icon: MessageCircle,
    title: 'Keep conversations and offers in one place',
    body: 'Every message and offer stays attached to the listing — no lost threads, no he-said-she-said.',
  },
  {
    icon: Wallet,
    title: 'Choose how you pay',
    body: 'Secure PayPal online checkout, or Pay in Person where the listing allows it. Either way, it’s recorded to the transaction.',
  },
  {
    icon: LifeBuoy,
    title: 'Get help when it matters',
    body: 'Support for financing questions, freight coordination, and transaction issues — before you confirm, not after.',
  },
];

/* ------------------------------------------------------------------ */
/* Related guides                                                      */
/* ------------------------------------------------------------------ */

const GUIDES: { icon: LucideIcon; title: string; body: string; cta: string; to: string }[] = [
  {
    icon: ShoppingBag,
    title: 'How purchasing works',
    body: 'The full buyer journey, from first look to confirmed handoff.',
    cta: 'Read the buyer guide',
    to: '/how-purchasing-works',
  },
  {
    icon: Truck,
    title: 'Vendibook Freight',
    body: 'How arranged freight works, when it applies, and what to expect.',
    cta: 'Read the freight guide',
    to: '/help/shipping-freight',
  },
  {
    icon: BadgeDollarSign,
    title: 'Financing',
    body: 'Buyer financing through third-party partners on eligible equipment.',
    cta: 'Explore financing',
    to: '/financing',
  },
  {
    icon: FileText,
    title: 'Disputes & buyer support',
    body: 'What to do if something goes wrong, and what helps resolve it.',
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
        title="How Vendibook Works — The Marketplace for Mobile Food"
        description="Discover, buy, sell, and rent food trucks, trailers, kitchens, and vendor spaces across the U.S. — with financing, freight, and tools that help you decide."
        canonical="/how-it-works"
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
                  The marketplace for the mobile-food world
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                  Built for people serious about mobile food.
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Vendibook brings food trucks, trailers, kitchens, and vendor spaces
                  into one place — along with the tools, financing options, and shipping
                  that help buyers discover more and sellers reach the people actually
                  looking.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">Browse the marketplace</Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/list">List for free</Link>
                  </Button>
                </div>
              </motion.div>

              <div className="pb-6 pl-2 sm:pl-6">
                <HeroCollage />
              </div>
            </div>
          </div>
        </section>

        {/* WHY VENDIBOOK FEELS DIFFERENT */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            {/* Featured editorial story — image + copy, varied composition */}
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mb-14 md:mb-20">
              <motion.div {...(reduce ? {} : fadeUp)} className="order-2 lg:order-1">
                <div className="overflow-hidden rounded-3xl border border-border shadow-[0_24px_60px_-24px_rgba(0,0,0,0.15)]">
                  <img
                    src={imgCoffee}
                    alt="A coffee trailer listed on Vendibook"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              </motion.div>
              <motion.div {...(reduce ? {} : fadeUp)} className="order-1 lg:order-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Why Vendibook feels different
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  A marketplace that only speaks food.
                </h2>
                <p className="text-base text-muted-foreground mt-4 leading-relaxed">
                  General classifieds bury a turn-key coffee trailer between a couch and
                  a carburetor. Vendibook exists for one category — food trucks, trailers,
                  kitchens, and vendor spaces — so the listings are richer, the buyers are
                  serious, and the sellers are actually in the business.
                </p>
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  When everyone here speaks the same language, everything moves faster.
                </p>
              </motion.div>
            </div>

            {/* Three editorial blocks — no boxes, generous breathing room */}
            <div className="grid sm:grid-cols-3 gap-8 md:gap-10">
              {DIFFERENCES.map((d, i) => (
                <motion.div
                  key={d.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span
                    aria-hidden
                    className="block h-px w-10 bg-primary/50 mb-5"
                  />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TOOLS FOR THE DECISION */}
        <section className="py-12 md:py-20">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                More than listings
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Tools for the decision, not just the listing.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Buying or selling a food truck is a business decision. Vendibook gives you
                the research tools to make it a good one.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
              {/* Featured tool — PricePilot */}
              <motion.div {...(reduce ? {} : fadeUp)}>
                <Link
                  to="/tools/pricepilot"
                  className="group flex flex-col h-full rounded-3xl border border-border bg-card p-7 sm:p-8 hover:shadow-md hover:border-foreground/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                    <Search className="w-5 h-5 text-primary" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1.5">
                    Featured tool
                  </p>
                  <h3 className="text-xl font-semibold text-foreground mb-2.5">PricePilot</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    Not sure what to charge — or whether the asking price is fair?
                    PricePilot compares rates against comparable live listings in your
                    market and suggests pricing that holds up. Built on real Vendibook
                    marketplace data.
                  </p>
                  <span className="inline-flex items-center text-sm font-semibold text-primary">
                    Try PricePilot
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>

              {/* Smaller tool links */}
              <div className="flex flex-col gap-4 md:gap-5">
                {TOOL_LINKS.map((t, i) => (
                  <motion.div
                    key={t.name}
                    {...(reduce ? {} : fadeUp)}
                    transition={{ duration: 0.4, delay: reduce ? 0 : 0.06 + i * 0.06, ease }}
                    className="flex-1"
                  >
                    <Link
                      to={t.to}
                      className="group flex items-center gap-4 h-full rounded-3xl border border-border bg-card p-5 sm:p-6 hover:shadow-md hover:border-foreground/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                        <t.icon className="w-5 h-5 text-foreground/70" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-base font-semibold text-foreground">
                          {t.name}
                        </span>
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
          </div>
        </section>

        {/* HUMAN PATHWAYS */}
        <section className="py-12 md:py-20 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Where do you fit in?
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Start wherever you are.
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {PATHS.map((p, i) => (
                <motion.article
                  key={p.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                  className="flex flex-col rounded-3xl border border-border bg-card p-6 sm:p-7 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                      <p.icon className="w-5 h-5 text-foreground/70" />
                    </span>
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

        {/* CONFIDENCE — warm, concise, one quiet disclosure */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                More confidence, fewer unknowns.
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
              {CONFIDENCE_POINTS.map((point, i) => (
                <motion.div
                  key={point.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                  className="flex gap-4"
                >
                  <span className="w-10 h-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center shrink-0 text-foreground/70">
                    <point.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{point.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p
              {...(reduce ? {} : fadeUp)}
              transition={{ duration: 0.4, delay: reduce ? 0 : 0.2, ease }}
              className="mt-10 text-center text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              Vendibook operates the marketplace — we don’t own the equipment and we’re
              not the seller, manufacturer, or lender. Financing is provided by
              third-party partners, subject to their approval and terms.
            </motion.p>
          </div>
        </section>

        {/* RELATED GUIDES */}
        <section className="py-12 md:py-16 border-t border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Keep reading
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Guides worth your coffee break.
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {GUIDES.map((g, i) => (
                <motion.div
                  key={g.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
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
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Your next move is probably already listed.
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Browse live listings, or put your own equipment in front of people
                already looking for it.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="cta" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">
                    Browse the marketplace <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/list">List for free</Link>
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
