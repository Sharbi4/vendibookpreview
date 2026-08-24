import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeDollarSign,
  BadgeCheck,
  CalendarSearch,
  ClipboardCheck,
  Handshake,
  KeyRound,
  MapPin,
  MessageCircle,
  Search,
  ShoppingBag,
  Tag,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { FreightLink } from '@/components/shared/FreightLink';
import imgBuying from '@/assets/how-buying-hero.jpg';
import imgSelling from '@/assets/how-selling-hero.jpg';
import imgCoffee from '@/assets/food-truck-coffee.jpg';
import searchPageArt from '@/assets/education/search-page.svg';
import loanArt from '@/assets/education/loan.svg';
import documentsOkArt from '@/assets/education/documents-ok.svg';
import deliveryMapArt from '@/assets/education/delivery-map.svg';
import signArt from '@/assets/education/sign.svg';

/**
 * /how-it-works — flagship brand page, not an explainer.
 *
 * Positioning: Vendibook is not classifieds. The marketplace and the
 * transaction live in one place — discover, evaluate, connect, finance,
 * transport, complete.
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
/* Hero visual — live listing collage                                   */
/* ------------------------------------------------------------------ */

const HeroCollage = () => {
  const reduce = useReducedMotion();
  return (
    <div className="relative" aria-hidden="true">
      <motion.div
        className="relative overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_28px_64px_-28px_rgba(24,20,16,0.3)]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <img src={imgBuying} alt="" className="aspect-[16/9] w-full object-cover" />
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

      <motion.div
        className="absolute bottom-32 left-3 w-36 overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:bottom-28 sm:left-6 sm:w-52"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }}
      >
        <img src={imgCoffee} alt="" className="aspect-[4/3] w-full object-cover" />
        <div className="p-3">
          <p className="truncate text-xs font-semibold text-foreground">Coffee trailer</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Nashville, TN</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-3 top-6 rounded-full border border-border bg-card px-3.5 py-2 shadow-md sm:-right-6"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.5 }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Truck className="h-3 w-3 text-primary" />
          Found it in another state? Freight can move it.
        </p>
      </motion.div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Marketplace flow — five moves, editorial rows                        */
/* ------------------------------------------------------------------ */

interface FlowStep {
  step: string;
  title: string;
  body: React.ReactNode;
  art: string;
  artAlt: string;
}

const FLOW: FlowStep[] = [
  {
    step: '01',
    title: 'Find the right equipment',
    body: (
      <>
        Every listing is built for a business decision: full specs, real photos, transparent
        pricing, and location up front. Search{' '}
        <Link to="/browse" className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:text-primary/80">
          equipment for sale
        </Link>{' '}
        or{' '}
        <Link to="/search?mode=rent" className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:text-primary/80">
          rentals near you
        </Link>{' '}
        — and talk directly to the people behind them.
      </>
    ),
    art: searchPageArt.url,
    artAlt: 'Browsing Vendibook search results with rich listing details',
  },
  {
    step: '02',
    title: 'Understand the opportunity',
    body: (
      <>
        Run the numbers before you commit.{' '}
        <Link to="/tools/pricepilot" className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:text-primary/80">
          PricePilot
        </Link>{' '}
        benchmarks the asking price against comparable live listings,{' '}
        <Link to="/financing" className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:text-primary/80">
          financing partners
        </Link>{' '}
        show what monthly payments could look like, and{' '}
        <Link to="/tools/permitpath" className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:text-primary/80">
          PermitPath
        </Link>{' '}
        maps the licenses your city will ask for. You evaluate the whole deal — not just the truck.
      </>
    ),
    art: loanArt.url,
    artAlt: 'Evaluating equipment financing and pricing',
  },
  {
    step: '03',
    title: 'Make the purchase',
    body: (
      <>
        Negotiate in writing, make an offer, and check out through secure PayPal online
        payment — or Pay in Person where the listing allows it. Either way, the agreement,
        the messages, and the payment live on one transaction record.
      </>
    ),
    art: documentsOkArt.url,
    artAlt: 'Transaction documents checked and in order',
  },
  {
    step: '04',
    title: 'Get it where it needs to go',
    body: (
      <>
        The right truck is rarely next door. Arrange pickup, seller delivery, or{' '}
        <FreightLink /> where available — coordinated as part of the transaction, so
        distance stops being a reason to settle.
      </>
    ),
    art: deliveryMapArt.url,
    artAlt: 'Delivery route map for arranged freight',
  },
  {
    step: '05',
    title: 'Complete the handoff',
    body: (
      <>
        Confirm delivery, sign the paperwork online, and keep the entire record — messages,
        offers, agreements, payment — in one place. When you're ready for the next truck,
        everything you need is already here.
      </>
    ),
    art: signArt.url,
    artAlt: 'Purchase agreement signed and handoff confirmed',
  },
];

/* ------------------------------------------------------------------ */
/* Buying / selling cards                                               */
/* ------------------------------------------------------------------ */

interface SideCard {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: { label: string; to: string };
  secondary: { label: string; to: string };
  image: string;
  imageAlt: string;
}

const SIDES: SideCard[] = [
  {
    icon: ShoppingBag,
    eyebrow: 'For buyers',
    title: 'Buying on Vendibook',
    body: 'The market comes to you — with the context to act on it.',
    points: [
      'Rich listings with specs, photos, and seller history',
      'Direct messaging and written offers on the listing',
      'Financing and freight options built into the deal',
    ],
    cta: { label: 'Browse listings', to: '/browse' },
    secondary: { label: 'How purchasing works', to: '/how-purchasing-works' },
    image: imgBuying,
    imageAlt: 'A food truck listed for sale on Vendibook',
  },
  {
    icon: Tag,
    eyebrow: 'For sellers',
    title: 'Selling on Vendibook',
    body: 'Put your equipment in front of people already shopping for it.',
    points: [
      'Standard listings are free — publish in minutes',
      'Serious buyers message and offer through the platform',
      'Offers, agreements, and payment on one record',
    ],
    cta: { label: 'List your equipment', to: '/list' },
    secondary: { label: 'Read the seller guide', to: '/how-it-works-seller' },
    image: imgSelling,
    imageAlt: 'A seller preparing a food trailer listing on Vendibook',
  },
];

/* ------------------------------------------------------------------ */
/* Connected ecosystem                                                  */
/* ------------------------------------------------------------------ */

const ECOSYSTEM: { icon: LucideIcon; name: string; note: string; to: string }[] = [
  {
    icon: Search,
    name: 'PricePilot',
    note: 'Pricing guidance built on live Vendibook marketplace data.',
    to: '/tools/pricepilot',
  },
  {
    icon: BadgeDollarSign,
    name: 'Financing',
    note: 'Apply with third-party lending partners on eligible equipment.',
    to: '/financing',
  },
  {
    icon: Truck,
    name: 'Vendibook Freight',
    note: 'Professional transport, coordinated with your transaction.',
    to: '/vendibook-freight',
  },
  {
    icon: ClipboardCheck,
    name: 'PermitPath',
    note: 'Every license, permit, and inspection for your address — one roadmap.',
    to: '/tools/permitpath',
  },
  {
    icon: ShoppingBag,
    name: 'Equipment for sale',
    note: 'Food trucks, trailers, and carts listed by their owners.',
    to: '/browse',
  },
  {
    icon: CalendarSearch,
    name: 'Equipment for rent',
    note: 'Trucks, commercial kitchens, and vendor spaces with live availability.',
    to: '/search?mode=rent',
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const HowItWorks = () => {
  const reduce = useReducedMotion();

  return (
    <div className="sale-light min-h-screen bg-background flex flex-col">
      <SEO
        title="How Vendibook Works | Food Truck & Trailer Marketplace"
        description="Vendibook isn't classifieds. Discover, evaluate, finance, transport, and complete food truck and trailer transactions — all in one marketplace."
        canonical="/how-it-works"
      />
      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'How Vendibook Works',
          description:
            'How Vendibook brings the marketplace and the transaction together for buying, selling, and renting food trucks, trailers, kitchens, and vendor spaces.',
          url: 'https://vendibook.com/how-it-works',
          isPartOf: { '@type': 'WebSite', name: 'Vendibook', url: 'https://vendibook.com' },
        }}
      />

      <Header />

      <main className="flex-1">
        {/* ---------------------------------------------------------- */}
        {/* HERO                                                        */}
        {/* ---------------------------------------------------------- */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(900px 480px at 85% -5%, rgba(255,106,26,0.10), transparent 65%)',
            }}
            aria-hidden="true"
          />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'How Vendibook Works' },
              ]}
              className="mb-8"
            />
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground mb-6 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  How Vendibook Works
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-bold tracking-tight text-foreground mb-5 leading-[1.06]">
                  We don&rsquo;t do classifieds.
                </h1>
                <p className="text-lg text-muted-foreground mb-4 max-w-xl leading-relaxed">
                  Classifieds end at the listing. Vendibook starts there — and stays with
                  you through evaluation, financing, transport, and the final signature.
                </p>
                <p className="text-base text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  One marketplace for buying, selling, and renting food trucks, trailers,
                  kitchens, and vendor spaces — with the transaction built in, not bolted on.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">
                      Browse listings <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/list">List your equipment</Link>
                  </Button>
                </div>
              </motion.div>

              <div className="pb-6 pl-2 sm:pl-6">
                <HeroCollage />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* MARKETPLACE FLOW — editorial numbered rows                  */}
        {/* ---------------------------------------------------------- */}
        <section className="py-14 md:py-24 border-y border-border bg-card/50">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-12 md:mb-16 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-2">
                The Vendibook way
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                From first search to final signature — one connected process.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Five moves. No dead ends, no scattered paperwork, no starting over in
                someone else&rsquo;s inbox.
              </p>
            </motion.div>

            <div className="space-y-10 md:space-y-14">
              {FLOW.map((f, i) => (
                <motion.div
                  key={f.step}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.5, delay: reduce ? 0 : 0.05, ease }}
                  className={`grid md:grid-cols-2 gap-6 md:gap-12 items-center ${
                    i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
                  }`}
                >
                  <div className="overflow-hidden rounded-[24px] border border-border bg-background shadow-[0_20px_48px_-24px_rgba(24,20,16,0.25)]">
                    <img
                      src={f.art}
                      alt={f.artAlt}
                      loading="lazy"
                      className="aspect-[16/9] w-full object-contain p-5 sm:p-7"
                    />
                  </div>
                  <div>
                    <span
                      className="block text-5xl md:text-6xl font-bold text-primary/15 leading-none mb-3 select-none"
                      aria-hidden="true"
                    >
                      {f.step}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                      {f.title}
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                      {f.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* BUYING / SELLING CARDS                                      */}
        {/* ---------------------------------------------------------- */}
        <section className="py-14 md:py-24">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 md:mb-12 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-2">
                Two sides, one table
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                Built for the people on both ends of the deal.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              {SIDES.map((s, i) => (
                <motion.article
                  key={s.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.08, ease }}
                  className="group flex flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)] hover:shadow-[0_24px_56px_-24px_rgba(24,20,16,0.35)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={s.image}
                      alt={s.imageAlt}
                      loading="lazy"
                      className="aspect-[16/8] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent"
                      aria-hidden="true"
                    />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-sm">
                      <s.icon className="w-3.5 h-3.5 text-primary" />
                      {s.eyebrow}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 p-6 sm:p-8">
                    <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{s.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed mb-5">{s.body}</p>
                    <ul className="space-y-2.5 mb-7">
                      {s.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5 text-sm text-foreground/85">
                          <BadgeCheck className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-3">
                      <Button variant="cta" className="rounded-full w-full sm:w-auto" asChild>
                        <Link to={s.cta.to}>
                          {s.cta.label} <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Link>
                      </Button>
                      <Link
                        to={s.secondary.to}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                      >
                        {s.secondary.label}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* CONNECTED ECOSYSTEM                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="py-14 md:py-24 border-y border-border bg-card/50">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 md:mb-12 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-2">
                The connected ecosystem
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                The tools around the transaction, in the same place as the transaction.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Pricing, financing, transport, and permits aren&rsquo;t afterthoughts here.
                They&rsquo;re part of the platform.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {ECOSYSTEM.map((t, i) => (
                <motion.div
                  key={t.name}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                >
                  <Link
                    to={t.to}
                    className="group flex flex-col h-full rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(24,20,16,0.04)] hover:shadow-[0_16px_40px_-20px_rgba(24,20,16,0.3)] hover:border-foreground/25 hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <t.icon className="w-5 h-5 text-primary" />
                    </span>
                    <span className="block text-base font-semibold text-foreground mb-1.5">
                      {t.name}
                    </span>
                    <span className="block text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {t.note}
                    </span>
                    <span className="inline-flex items-center text-sm font-semibold text-primary">
                      Explore
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* RENT / HOST strip                                           */}
        {/* ---------------------------------------------------------- */}
        <section className="py-14 md:py-20">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-[28px] border border-border bg-card p-7 sm:p-10 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_10px_28px_-18px_rgba(24,20,16,0.28)]"
            >
              <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                <div className="flex gap-4">
                  <span className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarSearch className="w-5 h-5 text-primary" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-1.5">Need it short-term?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Rent trucks, commercial kitchens, and vendor spaces with live
                      availability. Request to book, or use Instant Book where the host
                      offers it.
                    </p>
                    <Link
                      to="/search?mode=rent"
                      className="group inline-flex items-center text-sm font-semibold text-primary"
                    >
                      Browse rentals
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-foreground mb-1.5">Own equipment or space?</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Set your rates and calendar, review requests or switch on Instant
                      Book, and earn from what you already own.
                    </p>
                    <Link
                      to="/how-it-works-host"
                      className="group inline-flex items-center text-sm font-semibold text-primary"
                    >
                      Read the host guide
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.p
              {...(reduce ? {} : fadeUp)}
              transition={{ duration: 0.4, delay: reduce ? 0 : 0.15, ease }}
              className="mt-8 text-center text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              Vendibook operates the marketplace — we don&rsquo;t own the equipment and
              we&rsquo;re not the seller, manufacturer, or lender. Financing is provided by
              third-party partners, subject to their approval and terms.
            </motion.p>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* FINAL CTA                                                   */}
        {/* ---------------------------------------------------------- */}
        <section className="py-16 md:py-24 border-t border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="relative overflow-hidden rounded-[32px] border border-border bg-card px-6 py-14 sm:px-12 md:py-16 text-center shadow-[0_28px_64px_-32px_rgba(24,20,16,0.35)]"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(600px 300px at 50% 0%, rgba(255,106,26,0.10), transparent 70%)',
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-5">
                  <Handshake className="w-3.5 h-3.5" />
                  The marketplace for mobile food
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
                  Serious about mobile food? So are we.
                </h2>
                <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                  Vendibook is where food truck and trailer buyers, sellers, and operators
                  get the whole deal done — not just the first step of it.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">
                      Browse listings <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/list">List your equipment</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-7 inline-flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  Questions first? Visit the{' '}
                  <Link to="/help" className="underline underline-offset-2 hover:text-foreground">
                    Help Center
                  </Link>
                  .
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
