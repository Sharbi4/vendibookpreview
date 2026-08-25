import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  Caravan,
  ExternalLink,
  HandCoins,
  MapPin,
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
import loanArt from '@/assets/education/loan.svg.asset.json';
import {
  trackFinancingApplyClick,
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

const APPLY_URL = 'https://equinox-funding.com/efapplication/';
const EMERALD = 'text-emerald-700';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

const OPTIONS = [
  {
    icon: Truck,
    title: 'Food trucks',
    body: 'Turn-key and fully built trucks listed on Vendibook — including the kitchen build already installed.',
  },
  {
    icon: Caravan,
    title: 'Food trailers',
    body: 'Concession and kitchen trailers, from compact units to full production trailers.',
  },
  {
    icon: ShoppingCart,
    title: 'Food carts',
    body: 'Carts and small mobile units — a lower-cost way to start serving.',
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
  source,
  listingId,
}: {
  className?: string;
  source: FinancingSource;
  listingId?: string;
}) => (
  <Button variant="cta" size="lg" className={`rounded-full ${className}`} asChild>
    <a
      href={APPLY_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackFinancingApplyClick(source, listingId)}
    >
      Apply with Equinox Funding
      <ExternalLink className="w-4 h-4 ml-1.5" aria-hidden />
    </a>
  </Button>
);

const Financing = () => {
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
        image="/images/social/vendibook-og-financing.jpg"
        imageAlt="Equipment financing for mobile food businesses on Vendibook"
      />
      <JsonLd
        schema={[generateFAQSchema(FAQ.map((item) => ({ question: item.q, answer: item.a })))]}
      />

      <Header />

      <main className="flex-1">
        {/* HERO — Vendibook first, Equinox as partner accent */}
        <section className="relative pt-14 pb-14 md:pt-20 md:pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] via-background to-background" />
          <div className="container max-w-4xl mx-auto px-4 relative z-10">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'How Vendibook Works', to: '/how-it-works' },
                { label: 'Financing' },
              ]}
              className="mb-6 flex justify-center"
              containerClassName="max-w-4xl"
            />
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-5">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-xs font-medium text-foreground">
                  Financing for eligible equipment
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
                  <span className="text-[11px] font-medium tracking-tight text-muted-foreground">Vendibook</span>
                  <span className="text-border">×</span>
                  <EquinoxFundingLogo className="h-4 w-auto" />
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                Found the right truck? See what financing could make possible.
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Vendibook connects eligible buyers with third-party financing
                partners for food trucks, trailers, carts, and qualifying
                equipment. Apply with the financing provider, review the options
                you qualify for, and decide what works for your business.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <ApplyCta source="financing_page_hero" listingId={listingId} />
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/browse">Keep browsing</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                You’ll leave Vendibook to apply on Equinox Funding’s site.
              </p>
            </motion.div>

            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.15 }}
              className="mt-10 mx-auto max-w-xl overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.15)]"
            >
              <img
                src={loanArt.url}
                alt="Financing a food truck purchase"
                loading="lazy"
                className="mx-auto h-auto w-full max-w-sm object-contain"
              />
            </motion.div>

            {/* Listing context — only for a publicly visible for-sale listing */}
            {contextListing && (
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.2 }}
                className="mt-10 mx-auto max-w-xl flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.15)]"
              >
                <img
                  src={contextListing.cover_image_url || '/placeholder.svg'}
                  alt={contextListing.title}
                  loading="lazy"
                  className="h-16 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-border"
                />
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${EMERALD}`}>
                    Financing this listing
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{contextListing.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {contextListing.price_sale
                      ? `$${Number(contextListing.price_sale).toLocaleString()}`
                      : 'Price on request'}
                    {contextListing.category ? ` · ${String(contextListing.category).replace(/_/g, ' ')}` : ''}
                    {contextListing.city ? ` · ${contextListing.city}${contextListing.state ? `, ${contextListing.state}` : ''}` : ''}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* A — WHAT CAN BE FINANCED */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40" aria-labelledby="options-heading">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Eligible equipment
              </p>
              <h2 id="options-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                What can be financed?
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Financing applies to eligible food trucks, food trailers, and food
                carts listed for sale on Vendibook. Terms vary by applicant and are
                subject to underwriting.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10">
              {OPTIONS.map(({ icon: Icon, title: t, body }, i) => (
                <motion.div
                  key={t}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm mb-5">
                    <Icon className="w-5 h-5 text-foreground/70" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-10 flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4"
            >
              <FinancingAvailableBadge asLink={false} />
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 min-w-[240px]">
                Look for this badge as you browse — financing is available on eligible
                for-sale listings across Vendibook.
              </p>
            </motion.div>

            {/* Freight cross-link — transportation can ride along on financing */}
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border border-border bg-card px-5 py-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
                <Truck className="h-4 w-4 text-foreground/70" aria-hidden />
              </span>
              <p className="flex-1 min-w-[240px] text-sm text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Buying from out of state?</span>{' '}
                Vendibook Freight can be financed too — transportation may be included in
                eligible financing arrangements, depending on the financing provider and
                the transaction.
              </p>
              <Button variant="cta-outline" size="sm" className="rounded-full shrink-0" asChild>
                <Link to="/vendibook-freight">
                  About Vendibook Freight
                  <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* B — WHAT HAPPENS AFTER YOU APPLY */}
        <section className="py-12 md:py-16" aria-labelledby="process-heading">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                The application
              </p>
              <h2 id="process-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                What happens after you apply?
              </h2>
            </motion.div>

            <ol className="space-y-0">
              {PROCESS.map((step, i) => (
                <motion.li
                  key={step.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05, ease }}
                  className="flex gap-5 sm:gap-8 py-6 border-b border-border last:border-b-0"
                >
                  <span
                    aria-hidden
                    className={`shrink-0 text-sm font-semibold tabular-nums pt-0.5 ${EMERALD}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                      {step.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <motion.div {...(reduce ? {} : fadeUp)} className="mt-8">
              <ApplyCta source="financing_page_mid" listingId={listingId} />
            </motion.div>
          </div>
        </section>

        {/* C — WHO FINANCING MAY WORK FOR */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40" aria-labelledby="qualify-heading">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-10 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Fit
              </p>
              <h2 id="qualify-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                Who financing may work for.
              </h2>
              <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                Approval is never guaranteed — but more profiles qualify than most
                people expect.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-8 md:gap-10">
              {QUALIFY.map((q, i) => (
                <motion.div
                  key={q.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.07, ease }}
                >
                  <span aria-hidden className="block h-px w-10 bg-emerald-600/50 mb-5" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{q.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{q.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* D — KNOW BEFORE YOU APPLY */}
        <section className="py-12 md:py-16" aria-labelledby="snapshot-heading">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                The fine print, up front
              </p>
              <h2 id="snapshot-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                Know before you apply.
              </h2>
            </motion.div>

            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.15)]"
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

            {/* Required disclosures — visually separated from persuasive content */}
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="mt-6 space-y-4 rounded-3xl border border-border bg-card/40 p-6 sm:p-8"
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

        {/* E — FAQ */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40" aria-labelledby="faq-heading">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="mb-8 text-center">
              <h2 id="faq-heading" className="text-2xl md:text-3xl font-bold text-foreground">
                Financing questions, answered.
              </h2>
            </motion.div>
            <dl className="space-y-0">
              {FAQ.map((item, i) => (
                <motion.div
                  key={item.q}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.04, ease }}
                  className="py-5 border-b border-border last:border-b-0"
                >
                  <dt className="text-base font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </section>

        {/* FINAL CTA + related */}
        <section className="py-16 md:py-20">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <motion.div {...(reduce ? {} : fadeUp)}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Ready to see your options?
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Applying takes a few minutes, and you’ll submit directly to Equinox
                Funding — not to Vendibook.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <ApplyCta source="financing_page_footer" listingId={listingId} />
                <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                  <Link to="/how-purchasing-works">How purchasing works</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-6 inline-flex items-center gap-1.5">
                <HandCoins className="w-3.5 h-3.5" />
                Prefer to pay another way? See{' '}
                <Link to="/how-purchasing-works" className="underline underline-offset-2 hover:text-foreground">
                  PayPal checkout and Pay in Person
                </Link>
                , or{' '}
                <Link to="/browse" className="underline underline-offset-2 hover:text-foreground">
                  keep browsing
                  <ArrowRight className="w-3 h-3 inline ml-0.5 -mt-0.5" />
                </Link>
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Financing;
