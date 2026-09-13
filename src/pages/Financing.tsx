import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  Caravan,
  Clock,
  FileText,
  HandCoins,
  Hammer,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import SEO, { generateFAQSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import heroTruck from '@/assets/hero-food-truck.jpg';
import heroTrailer from '@/assets/trailer-orange-grill.jpg';
import heroCoffee from '@/assets/food-truck-coffee.jpg';
import cartImg from '@/assets/food-truck-popcorn.jpg';
import buildImg from '@/assets/trailer-interior-floor.jpg';
import trailerImg from '@/assets/trailer-white.jpg';
import {
  trackFinancingPageViewed,
  type FinancingSource,
} from '@/lib/analytics';

/**
 * /financing — buyer financing through third-party partners, presented in
 * Vendibook's warm editorial marketplace language (not a partner microsite).
 *
 * Copy guardrails (do not regress): Vendibook is not the lender; no
 * guaranteed approvals, rates, terms, or funding; exact program facts below
 * are partner-provided and must stay caveated; the user leaves Vendibook to
 * apply; financing availability on listings is marketplace-wide for eligible
 * published for-sale equipment — not a seller opt-in.
 */

/** Loads a publicly visible listing for the optional ?listing_id= context. */
const useFinancingListingContext = (listingId: string | null) =>
  useQuery({
    queryKey: ['financing-listing-context', listingId],
    enabled: !!listingId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, cover_image_url, price_sale, category, city, state, mode, status')
        .eq('id', listingId as string)
        .eq('status', 'published')
        .eq('mode', 'sale')
        .maybeSingle();
      if (error) return null;
      return data ?? null;
    },
  });

const EMERALD = 'text-emerald-700';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

const TRUST = [
  { icon: FileText, label: 'Quick online application' },
  { icon: Clock, label: 'Many decisions in 24–48 hours' },
  { icon: ShieldCheck, label: 'Startups & established businesses may qualify' },
  { icon: Truck, label: 'Trucks, trailers, carts & builds' },
];

const STEPS = [
  {
    title: 'Choose a truck or trailer',
    body: 'Browse eligible for-sale equipment on Vendibook and pick the one you want.',
  },
  {
    title: 'Submit a short online application',
    body: 'You apply with Equinox Funding — basic business, owner, and equipment details.',
  },
  {
    title: 'Review any options you qualify for',
    body: 'Qualified applicants review terms and sign electronically. Many decisions come back within 24–48 hours.',
  },
];

const OPTIONS = [
  {
    icon: Truck,
    image: heroTruck,
    title: 'Food trucks',
    body: 'Turn-key and fully built trucks — including the kitchen build already installed.',
  },
  {
    icon: Caravan,
    image: trailerImg,
    title: 'Food trailers',
    body: 'Concession and kitchen trailers, from compact units to full production trailers.',
  },
  {
    icon: ShoppingCart,
    image: cartImg,
    title: 'Food carts',
    body: 'Carts and small mobile units — a lower-cost way to start serving.',
  },
  {
    icon: Hammer,
    image: buildImg,
    title: 'Builds & conversions',
    body: 'Fully custom builds and conversions may be financed, subject to underwriting.',
  },
];

const PROCESS = [
  {
    title: 'Apply with Equinox',
    body: 'A straightforward online application — basic business, owner, and equipment information. You apply on Equinox Funding’s site, not here.',
  },
  {
    title: 'They review your application',
    body: 'Equinox reviews what you qualify for. A financing specialist may reach out if they need anything more from you.',
  },
  {
    title: 'See your options',
    body: 'Qualified applicants review their terms and sign electronically. Many decisions come back within 24–48 hours.',
  },
  {
    title: 'The seller gets paid',
    body: 'After approval and paperwork, the financing provider pays the seller directly. You make payments under your signed agreement — and the truck is yours to run.',
  },
];

const QUALIFY = [
  {
    title: 'Just getting started',
    body: 'First-time operators may qualify based on credit, experience, down payment, the equipment itself, and the overall picture.',
  },
  {
    title: 'Growing',
    body: 'Options may be available for businesses operating 6 months to 2 years, including low- or zero-down programs for qualified applicants.',
  },
  {
    title: 'Established',
    body: 'Options may include zero-down, multi-unit, and fleet financing for qualified businesses.',
  },
];

const SNAPSHOT = [
  'Financing from $2,500 – $25M',
  'Lease-to-own options',
  'General FICO benchmarks: 640 for startups, 575 for established businesses',
  'Low- or zero-down programs may be available',
  'Fully custom builds and conversions may be financed',
];

const FAQ = [
  {
    q: 'Can a fully custom food trailer build be financed?',
    a: 'Fully custom builds and conversions may be financed.',
  },
  {
    q: 'Can shipping or freight be financed too?',
    a: 'Vendibook Freight transportation may be included in eligible financing arrangements, depending on the financing provider and the transaction. Mention transportation when you apply.',
  },
  {
    q: 'How fast are decisions?',
    a: 'Many decisions are returned within 24–48 hours.',
  },
  {
    q: 'How much does credit matter?',
    a: 'Credit is one of several underwriting factors.',
  },
  {
    q: 'Can a first-time operator qualify?',
    a: 'First-time operators may qualify depending on the full profile and build.',
  },
  {
    q: 'What happens after I submit?',
    a: 'After submission, an Equinox financing specialist may contact the applicant for additional information.',
  },
];

const ApplyCta = ({
  className = '',
  label = 'Check financing options',
  size = 'lg',
  source,
  listingId,
  onApply,
}: {
  className?: string;
  label?: string;
  size?: 'lg' | 'default';
  source: FinancingSource;
  listingId?: string;
  onApply: (source: FinancingSource, listingId?: string) => void;
}) => (
  <Button
    variant="cta"
    size={size}
    className={`rounded-full font-semibold ${className}`}
    onClick={() => onApply(source, listingId)}
  >
    {label}
    <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden />
  </Button>
);

const Financing = () => {
  const { startFinancingApply, financingLeadDialog } = useFinancingHandoff();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const listingIdParam = params.get('listing_id');
  const { data: contextListing } = useFinancingListingContext(listingIdParam);
  const listingId = contextListing?.id;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackFinancingPageViewed(listingIdParam ?? undefined);
  }, [listingIdParam]);

  const title = 'Financing for Food Trucks, Trailers & Carts | Vendibook';
  const description =
    'Financing with Equinox Funding for food trucks, food trailers, and food carts listed on Vendibook. Apply online — subject to prequalification and underwriting.';
  const canonical = '/financing';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        type="website"
        image="https://vendibook.com/images/social/vendibook-og-financing.jpg"
        imageAlt="Equipment financing for mobile food businesses on Vendibook"
      />
      <JsonLd
        schema={[generateFAQSchema(FAQ.map((item) => ({ question: item.q, answer: item.a })))]}
      />

      <Header />

      <main className="flex-1 pb-24 md:pb-0">
        {/* HERO */}
        <section className="relative overflow-hidden pt-10 pb-12 md:pt-16 md:pb-16">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.035] via-background to-background" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'How Vendibook Works', to: '/how-it-works' },
                { label: 'Financing' },
              ]}
              className="mb-8"
              containerClassName="max-w-6xl"
            />

            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Food truck &amp; trailer financing
                </p>
                <h1 className="mt-3 text-[2.1rem] leading-[1.06] md:text-5xl font-bold tracking-tight text-foreground">
                  Found the right truck? Financing may help you make it yours.
                </h1>
                <p className="mt-5 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
                  A quick online application with our financing partner. Many
                  decisions come back within 24–48 hours, with options for
                  eligible food trucks, trailers, carts, and custom builds.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <ApplyCta
                    onApply={startFinancingApply}
                    source="financing_page_hero"
                    listingId={listingId}
                  />
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">Browse trucks &amp; trailers</Link>
                  </Button>
                </div>
                <p className="mt-3.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                  You apply with Equinox Funding, our third-party financing
                  partner. Approval, rates, and terms are subject to underwriting
                  and are not guaranteed.
                </p>

                <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
                  <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
                    Vendibook
                  </span>
                  <span className="text-border">×</span>
                  <EquinoxFundingLogo className="h-4 w-auto" />
                </span>
              </motion.div>

              {/* Premium marketplace photo collage */}
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: reduce ? 0 : 0.12 }}
                className="relative"
                aria-hidden
              >
                <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                  <img
                    src={heroTruck}
                    alt=""
                    loading="eager"
                    className="h-[260px] w-full object-cover md:h-[340px]"
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_-30px_rgba(0,0,0,0.3)]">
                    <img src={heroTrailer} alt="" loading="lazy" className="h-28 w-full object-cover md:h-32" />
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_-30px_rgba(0,0,0,0.3)]">
                    <img src={heroCoffee} alt="" loading="lazy" className="h-28 w-full object-cover md:h-32" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* TRUST STRIP */}
            <motion.ul
              initial={reduce ? undefined : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.2 }}
              className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {TRUST.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-[0_12px_40px_-32px_rgba(0,0,0,0.4)]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  <span className="text-sm font-medium leading-snug text-foreground">{label}</span>
                </li>
              ))}
            </motion.ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Timing and eligibility vary by applicant. Not all applicants qualify.
            </p>

            {/* LISTING CONTEXT */}
            {contextListing && (
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.24 }}
                className="mt-8 flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center"
              >
                <img
                  src={contextListing.cover_image_url || '/placeholder.svg'}
                  alt={contextListing.title}
                  loading="lazy"
                  className="h-28 w-full shrink-0 rounded-2xl object-cover ring-1 ring-border sm:h-20 sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${EMERALD}`}>
                    Financing this listing
                  </p>
                  <p className="truncate text-base font-semibold text-foreground">
                    {contextListing.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {contextListing.price_sale
                      ? `$${Number(contextListing.price_sale).toLocaleString()}`
                      : 'Price on request'}
                    {contextListing.city
                      ? ` · ${contextListing.city}${contextListing.state ? `, ${contextListing.state}` : ''}`
                      : ''}
                  </p>
                </div>
                <ApplyCta
                  className="shrink-0"
                  label="Check options for this listing"
                  onApply={startFinancingApply}
                  source="financing_page_context"
                  listingId={listingId}
                />
              </motion.div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-border bg-card/40 py-12 md:py-16" aria-labelledby="how-heading">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.h2
              {...(reduce ? {} : fadeUp)}
              id="how-heading"
              className="text-2xl md:text-3xl font-bold text-foreground"
            >
              How it works
            </motion.h2>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                  className="rounded-3xl border border-border bg-card p-5"
                >
                  <span className={`text-sm font-semibold tabular-nums ${EMERALD}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...(reduce ? {} : fadeUp)} className="mt-8">
              <ApplyCta
                onApply={startFinancingApply}
                source="financing_page_mid"
                listingId={listingId}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Applying is with Equinox Funding and subject to underwriting.
              </p>
            </motion.div>
          </div>
        </section>

        {/* WHAT YOU CAN FINANCE */}
        <section className="py-12 md:py-16" aria-labelledby="options-heading">
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 max-w-2xl">
              <h2 id="options-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                What you can finance
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Eligible equipment listed for sale on Vendibook. Terms vary by
                applicant and are subject to underwriting.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {OPTIONS.map(({ icon: Icon, image, title: t, body }, i) => (
                <motion.div
                  key={t}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06, ease }}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_-38px_rgba(0,0,0,0.45)]"
                >
                  <img src={image} alt="" aria-hidden loading="lazy" className="h-36 w-full object-cover" />
                  <div className="p-5">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                      <Icon className="h-4 w-4 text-foreground/70" aria-hidden />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{t}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-8 flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4"
            >
              <FinancingAvailableBadge asLink={false} />
              <p className="min-w-[240px] flex-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Already found a listing?</span>{' '}
                Look for this badge as you browse — financing can be used for eligible
                for-sale inventory across Vendibook.
              </p>
              <Button variant="cta-outline" size="sm" className="shrink-0 rounded-full" asChild>
                <Link to="/browse">
                  Browse inventory
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* WHO THIS MAY WORK FOR */}
        <section className="border-y border-border bg-card/40 py-12 md:py-16" aria-labelledby="qualify-heading">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 max-w-2xl">
              <h2 id="qualify-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                Who this may work for
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Approval is never guaranteed — but more profiles may qualify than
                most people expect.
              </p>
            </motion.div>

            <div className="grid gap-8 sm:grid-cols-3 md:gap-10">
              {QUALIFY.map((q, i) => (
                <motion.div
                  key={q.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span aria-hidden className="mb-5 block h-px w-10 bg-emerald-600/50" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{q.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{q.body}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...(reduce ? {} : fadeUp)} className="mt-9">
              <ApplyCta
                onApply={startFinancingApply}
                source="financing_page_mid"
                listingId={listingId}
              />
            </motion.div>
          </div>
        </section>

        {/* AFTER YOU APPLY */}
        <section className="py-12 md:py-16" aria-labelledby="process-heading">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.h2
              {...(reduce ? {} : fadeUp)}
              id="process-heading"
              className="text-2xl md:text-3xl font-bold text-foreground"
            >
              What happens after you apply
            </motion.h2>

            <ol className="mt-6">
              {PROCESS.map((step, i) => (
                <motion.li
                  key={step.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                  className="flex gap-5 border-b border-border py-6 last:border-b-0 sm:gap-8"
                >
                  <span
                    aria-hidden
                    className={`shrink-0 pt-0.5 text-sm font-semibold tabular-nums ${EMERALD}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="mb-1 text-base font-semibold text-foreground">{step.title}</h3>
                    <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>

            {/* Freight cross-link */}
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-8 flex flex-col gap-4 rounded-3xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
                <Truck className="h-4 w-4 text-foreground/70" aria-hidden />
              </span>
              <p className="min-w-[240px] flex-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Buying from out of state?</span>{' '}
                Vendibook Freight transportation may be included in eligible financing
                arrangements, depending on the financing provider and the transaction.
              </p>
              <Button variant="cta-outline" size="sm" className="shrink-0 rounded-full" asChild>
                <Link to="/vendibook-freight">
                  About Vendibook Freight
                  <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* PROGRAM SNAPSHOT + DISCLOSURES */}
        <section className="border-t border-border bg-card/40 py-12 md:py-16" aria-labelledby="snapshot-heading">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.h2
              {...(reduce ? {} : fadeUp)}
              id="snapshot-heading"
              className="text-2xl md:text-3xl font-bold text-foreground"
            >
              Program snapshot
            </motion.h2>

            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.15)] sm:p-8"
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {SNAPSHOT.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                Partner-provided information. Each point is subject to program
                availability and underwriting. These are not guarantees or universal
                minimums, and not all applicants qualify.
              </p>
            </motion.div>

            {/* Required disclosures */}
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-6 space-y-4 rounded-3xl border border-border bg-background/60 p-6 sm:p-8"
              aria-label="Disclosures"
            >
              <p className="text-xs leading-relaxed text-muted-foreground">
                Vendibook is not a lender, does not make credit decisions, and does
                not guarantee approval, rates, terms, or funding. Financing is for
                business purposes and is subject to application, prequalification
                and/or underwriting. When you apply, you leave Vendibook and submit
                information directly to Equinox Funding. Equinox Funding’s terms and
                privacy policy apply. Credit review may include personal and business
                credit inquiries as authorized in the application. Any potential
                Section 179 benefit depends on eligibility; consult a qualified tax
                professional.
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Equinox Funding provides business capital, including business loans
                and Revenue Based Financing, directly and through a network of
                unaffiliated third-party funding providers. All offers will depend on
                your business meeting at the time of submission our prequalification
                and/or underwriting criteria, which includes, but is not limited to,
                business &amp; personal credit history, time in business, cash flow,
                revenue consistency, industry-specific underwriting rules. Business
                loans are offered by Equinox Funding LLC.
              </p>
              <p className="text-xs text-muted-foreground">
                <a
                  href="https://equinox-funding.com/terms-of-service/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Equinox Funding terms
                </a>
                <span className="px-2 text-border">·</span>
                <a
                  href="https://equinox-funding.com/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  privacy policy
                </a>
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-y border-border py-12 md:py-16" aria-labelledby="faq-heading">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.h2
              {...(reduce ? {} : fadeUp)}
              id="faq-heading"
              className="mb-8 text-center text-2xl md:text-3xl font-bold text-foreground"
            >
              Financing questions, answered.
            </motion.h2>
            <dl>
              {FAQ.map((item, i) => (
                <motion.div
                  key={item.q}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.04, ease }}
                  className="border-b border-border py-5 last:border-b-0"
                >
                  <dt className="text-base font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="mb-3 text-2xl md:text-3xl font-bold text-foreground">
                Ready to see your options?
              </h2>
              <p className="mb-7 text-base text-muted-foreground">
                The application takes a few minutes and goes directly to Equinox
                Funding — approval is subject to underwriting.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <ApplyCta
                  onApply={startFinancingApply}
                  source="financing_page_footer"
                  listingId={listingId}
                />
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">Browse trucks &amp; trailers</Link>
                </Button>
              </div>
              <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <HandCoins className="h-3.5 w-3.5" aria-hidden />
                Prefer to pay another way? See{' '}
                <Link to="/payments" className="underline underline-offset-2 hover:text-foreground">
                  PayPal checkout and Pay in Person
                </Link>
                , or{' '}
                <Link
                  to="/how-purchasing-works"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  how purchasing works
                </Link>
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* STICKY MOBILE CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <Button
          variant="cta"
          size="lg"
          className="w-full rounded-full font-semibold"
          onClick={() => startFinancingApply('financing_page_sticky', listingId)}
        >
          Check financing options
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Button>
        <p className="mt-1.5 text-center text-[10px] leading-snug text-muted-foreground">
          Apply with Equinox Funding · subject to underwriting
        </p>
      </div>

      <Footer />
      {financingLeadDialog}
    </div>
  );
};

export default Financing;
