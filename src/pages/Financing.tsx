import { useEffect, type ReactNode } from 'react';
import { FINANCING_STEPS, FINANCING_FAQ, FINANCING_TITLE, FINANCING_DESCRIPTION, FINANCING_INTRO, FINANCING_SECTIONS, FINANCING_RESOURCES } from '../../supabase/functions/_shared/financingContent';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowDown,
  ArrowRight,
  Briefcase,
  CalendarClock,
  Caravan,
  FileText,
  HandCoins,
  Hammer,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import { FinancingCalculator } from '@/components/financing/FinancingCalculator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBuyerSeoTracking } from '@/hooks/useBuyerSeoTracking';
import { trackBuyerSeoFinancing } from '@/lib/buyerSeoTracking';
import { financingInventoryUrl } from '@/lib/financing/calculator';
import { FINANCING_FOOTNOTE, FINANCING_HEADLINE } from '@/lib/financing/copy';
import heroTruck from '@/assets/hero-food-truck.jpg';
import bandTruck from '@/assets/food-truck-grilled-cheese.jpg';
import truckImg from '@/assets/food-truck-coffee.jpg';
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
 * Layout (few, strong sections): photo hero + program highlights → how it
 * works → apply band → calculator → what you can finance → before/after you
 * apply → guide & FAQ → photo CTA band + disclosures.
 *
 * Copy guardrails (do not regress): Vendibook is not the lender, bank,
 * broker, agent or a party to the financing; no guaranteed approvals, rates,
 * terms, or funding; the 24–48 hour headline is "typical" and always shown
 * with FINANCING_FOOTNOTE; calculator rates are illustrative, not provider
 * quotes; the user leaves Vendibook to apply; financing availability on
 * listings is marketplace-wide for eligible published for-sale equipment —
 * not a seller opt-in.
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

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease },
};

/* Terms Equinox Funding publishes on its own site (checked 2026-10-08). No
   APR range is published, so none is shown. Decision timing lives in
   FINANCING_HEADLINE (with its footnote) rather than repeating here. */
const HIGHLIGHTS = [
  { value: '$5K–$10M', label: 'Financing amounts' },
  { value: '0–10%', label: 'Typical down payment' },
  { value: 'Considered', label: 'Startups' },
  { value: 'Eligible', label: 'Section 179' },
];

const OPTIONS = [
  {
    icon: Truck,
    image: truckImg,
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
    body: 'If approved, compare the payment schedule, total repayment, fees, and any ownership or end-of-term conditions before signing. Timing varies.',
  },
  {
    title: 'The seller gets paid',
    body: 'Confirm the provider’s payment process with the seller and arrange pickup or delivery. Ownership and repayment obligations follow your signed agreement.',
  },
];

const QUALIFY = [
  {
    title: 'Just getting started',
    body: 'First-time operators may qualify based on credit, experience, down payment, the equipment itself, and the overall picture.',
  },
  {
    title: 'Growing',
    body: 'An operating history can help a provider understand your sales and cash flow. Prepare recent business records and an equipment quote.',
  },
  {
    title: 'Established',
    body: 'Planning another unit or replacing equipment? Consider how the payment fits your existing commitments and seasonal cash flow.',
  },
];

const SNAPSHOT = [
  { icon: Truck, text: 'Equipment details and seller quote' },
  { icon: Briefcase, text: 'Business and owner information' },
  { icon: FileText, text: 'Financial records requested by the provider' },
  { icon: Wallet, text: 'Cash available for a down payment and reserves' },
  { icon: CalendarClock, text: 'A full repayment schedule, including fees and final payments' },
  { icon: ShieldCheck, text: 'Ownership, insurance, and early repayment terms' },
];

const CARD = 'rounded-3xl border border-border bg-card shadow-[0_24px_60px_-44px_rgba(0,0,0,0.55)]';
const SECTION = 'scroll-mt-24 py-16 md:py-24';
const WRAP = 'container max-w-6xl mx-auto px-4';
/** Number badge used by both step lists. */
const STEP_NUMBER = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary ring-1 ring-primary/25';
/** Light button for use on dark photo overlays (both themes). */
const ON_PHOTO_BUTTON = 'h-12 rounded-full border-0 bg-white px-7 font-semibold text-[#1d1d1f] shadow-none hover:bg-white/90';

const SectionHeader = ({
  id,
  eyebrow,
  title,
  lead,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
}) => (
  <div className="max-w-2xl">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
    <h2 id={id} className="mt-3 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground md:text-4xl">
      {title}
    </h2>
    {lead && <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{lead}</p>}
  </div>
);

const ApplyCta = ({
  className = '',
  label = 'Apply for Financing',
  size = 'lg',
  tone = 'cta',
  source,
  listingId,
  onApply,
}: {
  className?: string;
  label?: string;
  size?: 'lg' | 'default';
  /** 'charcoal' is for the orange apply band, where an orange button would vanish. */
  tone?: 'cta' | 'charcoal';
  source: FinancingSource;
  listingId?: string;
  onApply: (source: FinancingSource, listingId?: string) => void;
}) => (
  <Button
    variant={tone === 'cta' ? 'cta' : 'default'}
    size={size}
    className={[
      'rounded-full font-semibold',
      size === 'lg' ? 'h-12 px-7' : '',
      tone === 'charcoal' ? 'border-0 bg-[#1d1d1f] text-white shadow-[0_14px_30px_-14px_rgba(0,0,0,0.7)] hover:bg-black' : '',
      className,
    ].join(' ')}
    onClick={() => onApply(source, listingId)}
  >
    {label}
    <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden />
  </Button>
);

const Financing = () => {
  const { startFinancingApply: handoff, financingLeadDialog } = useFinancingHandoff();
  const onTrackedClick = useBuyerSeoTracking('/financing');
  const startFinancingApply = (source: FinancingSource, listingId?: string) => {
    trackBuyerSeoFinancing('apply_clicked', { cta_location: source, listing_id: listingId ?? null });
    handoff(source, listingId);
  };
  const reduce = useReducedMotion();
  const reveal = reduce ? {} : fadeUp;
  const [params] = useSearchParams();
  const listingIdParam = params.get('listing_id');
  const { data: contextListing } = useFinancingListingContext(listingIdParam);
  const listingId = contextListing?.id;
  const inventoryHref = financingInventoryUrl(undefined, undefined, params.toString());

  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: 'instant' });
    trackFinancingPageViewed(listingIdParam ?? undefined);
  }, [listingIdParam]);

  const title = FINANCING_TITLE;
  const description = FINANCING_DESCRIPTION;
  const canonical = '/financing';

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-clip">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        type="website"
        image="https://vendibook.com/images/social/vendibook-og-financing.jpg"
        imageAlt="Equipment financing for mobile food businesses on Vendibook"
      />
      <JsonLd
        schema={[
          { '@context': 'https://schema.org', '@type': 'WebPage', '@id': 'https://vendibook.com/financing#webpage', url: 'https://vendibook.com/financing', name: title, description, breadcrumb: { '@id': 'https://vendibook.com/financing#breadcrumb' } },
          { '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': 'https://vendibook.com/financing#breadcrumb', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
            { '@type': 'ListItem', position: 2, name: 'How Vendibook Works', item: 'https://vendibook.com/how-it-works' },
            { '@type': 'ListItem', position: 3, name: 'Financing', item: 'https://vendibook.com/financing' },
          ] },
        ]}
      />

      <Header />

      <main className="flex-1 pb-44 md:pb-0" onClickCapture={onTrackedClick}>
        {/* 1 · HERO — photo with dark overlay, two big CTAs, highlights strip */}
        <section data-cta-location="hero" aria-labelledby="financing-hero-title">
          <GuideBreadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: 'How Vendibook Works', to: '/how-it-works' },
              { label: 'Financing' },
            ]}
            className="py-4"
            containerClassName="max-w-6xl"
          />

          <div className="relative isolate overflow-hidden bg-[#141416]">
            <img
              src={heroTruck}
              alt="Equipped food truck with an open serving window"
              loading="eager"
              className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(12,12,14,0.94)_0%,rgba(12,12,14,0.82)_45%,rgba(12,12,14,0.45)_100%)]"
            />
            <div className={`${WRAP} py-16 md:py-24`}>
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className="max-w-2xl text-white"
              >
                <span className="inline-flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Equipment financing with
                  <EquinoxFundingLogo className="h-4 w-auto" />
                </span>
                <h1
                  id="financing-hero-title"
                  className="mt-5 text-[2.35rem] font-bold leading-[1.04] tracking-tight md:text-6xl"
                >
                  Food Truck &amp; Food Trailer Financing
                </h1>
                <p className="mt-5 text-balance text-lg font-semibold leading-snug text-white md:text-2xl">
                  {FINANCING_HEADLINE}
                </p>
                <p className="mt-4 text-base leading-relaxed text-white/75">
                  {FINANCING_INTRO}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ApplyCta
                    onApply={startFinancingApply}
                    source="financing_page_hero"
                    listingId={listingId}
                  />
                  <Button size="lg" className={ON_PHOTO_BUTTON} asChild>
                    <Link to={inventoryHref}>Browse Food Trucks &amp; Trailers</Link>
                  </Button>
                </div>
                <a
                  href="#calculator"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
                >
                  Estimate your monthly payment
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                </a>
                <p className="mt-8 border-t border-white/15 pt-4 text-xs leading-relaxed text-white/65">
                  {FINANCING_FOOTNOTE}
                </p>
              </motion.div>
            </div>
          </div>

          {/* Program highlights strip */}
          <div className="border-b border-border bg-card/60">
            <div className={`${WRAP} py-6 md:py-7`}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                {HIGHLIGHTS.map(item => (
                  <div key={item.label} className="flex flex-col-reverse border-l-2 border-primary/70 pl-4">
                    <dt className="mt-0.5 text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Program highlights published by Equinox Funding; actual terms depend on approval. Not all applicants qualify.
              </p>
            </div>
          </div>

          {/* LISTING CONTEXT (?listing_id=) */}
          {contextListing && (
            <div className={`${WRAP} pt-10`}>
              <motion.div
                initial={reduce ? undefined : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.2, ease }}
                className={`${CARD} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5`}
              >
                <img
                  src={contextListing.cover_image_url || '/placeholder.svg'}
                  alt={contextListing.title}
                  loading="lazy"
                  className="h-36 w-full shrink-0 rounded-2xl object-cover ring-1 ring-border sm:h-20 sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Financing this listing
                  </p>
                  <Link to={`/listing/${contextListing.id}`} data-cta-id="financing_context_listing" className="mt-1 block truncate text-base font-semibold text-foreground underline underline-offset-4">
                    {contextListing.title}
                  </Link>
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
            </div>
          )}
        </section>

        {/* 2 · HOW IT WORKS — equal-height step cards */}
        <section data-cta-location="how_it_works" aria-labelledby="how-heading" className={SECTION}>
          <div className={WRAP}>
            <motion.div {...reveal}>
              <SectionHeader
                id="how-heading"
                eyebrow="How it works"
                title="How food truck financing works"
                lead="Compare equipment on Vendibook, estimate a payment, then apply directly with Equinox Funding."
              />
            </motion.div>

            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {FINANCING_STEPS.map((step, i) => (
                <motion.li
                  key={step.title}
                  {...reveal}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06, ease }}
                  className={`${CARD} flex h-full gap-4 p-5 sm:block sm:p-6`}
                >
                  <span aria-hidden className={STEP_NUMBER}>{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-snug text-foreground sm:mt-5">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">{step.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3 · APPLY BAND — full-width brand color */}
        <section data-cta-location="apply_band" aria-label="Apply for financing" className="bg-primary text-white">
          <div className={`${WRAP} flex flex-col items-start gap-5 py-10 md:flex-row md:items-center md:justify-between md:py-12`}>
            <div>
              <p className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                Check your financing options with Equinox Funding
              </p>
              <p className="mt-2 text-sm text-white/85">
                Applying is with Equinox Funding and subject to underwriting.
              </p>
            </div>
            <ApplyCta
              tone="charcoal"
              className="w-full shrink-0 sm:w-auto"
              onApply={startFinancingApply}
              source="financing_page_mid"
              listingId={listingId}
            />
          </div>
        </section>

        {/* 4 · CALCULATOR (#calculator) */}
        <FinancingCalculator />

        {/* 5 · WHAT YOU CAN FINANCE — equal-height image cards */}
        <section data-cta-location="options" className={SECTION} aria-labelledby="options-heading">
          <div className={WRAP}>
            <motion.div {...reveal}>
              <SectionHeader
                id="options-heading"
                eyebrow="Equipment"
                title="What you can finance"
                lead="Eligible equipment listed for sale on Vendibook. Terms vary by applicant and are subject to underwriting."
              />
            </motion.div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {OPTIONS.map(({ icon: Icon, image, title: t, body }, i) => (
                <motion.article
                  key={t}
                  {...reveal}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06, ease }}
                  className={`${CARD} flex h-full overflow-hidden sm:flex-col`}
                >
                  <img src={image} alt="" aria-hidden loading="lazy" className="w-28 shrink-0 object-cover sm:h-44 sm:w-full" />
                  <div className="min-w-0 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {t}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:gap-5">
              <motion.div {...reveal} className={`${CARD} flex h-full flex-col gap-4 p-6`}>
                <FinancingAvailableBadge asLink={false} className="self-start" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Already found a listing?</span>{' '}
                  Look for this badge as you browse — financing can be used for eligible
                  for-sale inventory across Vendibook, including{' '}
                  <Link to="/coffee-trucks-trailers-for-sale" className="font-medium text-foreground underline underline-offset-4">coffee trucks and trailers for sale</Link>.
                </p>
                <Button variant="cta-outline" size="sm" className="mt-auto self-start rounded-full" asChild>
                  <Link to={inventoryHref}>
                    Browse inventory
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </motion.div>

              <motion.div {...reveal} className={`${CARD} flex h-full flex-col gap-4 p-6`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                  <Truck className="h-4 w-4 text-primary" aria-hidden />
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Buying from out of state?</span>{' '}
                  Vendibook Freight transportation may be included in eligible financing
                  arrangements, depending on the financing provider and the transaction.
                </p>
                <Button variant="cta-outline" size="sm" className="mt-auto self-start rounded-full" asChild>
                  <Link to="/vendibook-freight">
                    About Vendibook Freight
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 6 · BEFORE & AFTER YOU APPLY — text column + icon list, then the review steps */}
        <section
          data-cta-location="before_you_apply"
          className={`${SECTION} border-y border-border bg-card/40`}
          aria-labelledby="qualify-heading"
        >
          <div className={WRAP}>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
              <motion.div {...reveal} className="min-w-0 lg:order-2">
                <SectionHeader
                  id="qualify-heading"
                  eyebrow="Before you apply"
                  title="Who this may work for"
                  lead="The provider reviews each application. Prepare the records that explain your business and the equipment you plan to buy."
                />
                <dl className="mt-8 space-y-5">
                  {QUALIFY.map(q => (
                    <div key={q.title} className="border-l-2 border-primary/70 pl-4">
                      <dt className="text-base font-semibold text-foreground">{q.title}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{q.body}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-8">
                  <ApplyCta
                    onApply={startFinancingApply}
                    source="financing_page_mid"
                    listingId={listingId}
                  />
                </div>
              </motion.div>

              <motion.div {...reveal} className="min-w-0 lg:order-1 lg:pt-7">
                <h3 id="snapshot-heading" className="text-xl font-semibold tracking-tight text-foreground">
                  What to prepare and review
                </h3>
                <ul className="mt-4 divide-y divide-border border-y border-border" aria-labelledby="snapshot-heading">
                  {SNAPSHOT.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-4 py-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                        <Icon className="h-[18px] w-[18px] text-primary" aria-hidden />
                      </span>
                      <span className="text-[15px] font-medium leading-snug text-foreground">{text}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                  This is a planning checklist. Confirm the current application requirements
                  and any offer directly with the provider. Not all applicants qualify.
                </p>
              </motion.div>
            </div>

            <div className="mt-20 md:mt-24">
              <motion.h3
                {...reveal}
                id="process-heading"
                className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              >
                What happens after you apply
              </motion.h3>
              <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5" aria-labelledby="process-heading">
                {PROCESS.map((step, i) => (
                  <motion.li
                    key={step.title}
                    {...reveal}
                    transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06, ease }}
                    className={`${CARD} flex h-full gap-4 p-5 sm:block sm:p-6`}
                  >
                    <span aria-hidden className={STEP_NUMBER}>{i + 1}</span>
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold leading-snug text-foreground sm:mt-5">{step.title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">{step.body}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 7 · BUYER GUIDE + FAQ */}
        <section className={SECTION} aria-labelledby="guide-heading">
          <div className={WRAP}>
            <motion.div {...reveal}>
              <SectionHeader
                id="guide-heading"
                eyebrow="Buyer guide"
                title="Plan beyond the payment"
              />
            </motion.div>
            <div aria-label="Financing essentials" data-cta-location="buyer_guidance" className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-5">
              {FINANCING_SECTIONS.map(section => (
                <motion.article key={section.heading} {...reveal} className={`${CARD} h-full p-6 sm:p-7`}>
                  <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">{section.heading}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.text}</p>
                </motion.article>
              ))}
            </div>

            <div data-cta-location="faq" className="mt-20 grid gap-10 md:mt-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
              <motion.div {...reveal} className="min-w-0">
                <SectionHeader
                  id="faq-heading"
                  eyebrow="FAQ"
                  title="Financing questions, answered."
                />
              </motion.div>
              <motion.div {...reveal} className="min-w-0 lg:col-start-1 lg:row-start-2">
                <div className="border-t border-border pt-6">
                  <h3 className="text-base font-semibold text-foreground">Compare equipment before you apply</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Review asking prices, photos, and seller-provided details. Financing eligibility is confirmed separately by the provider.
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {FINANCING_RESOURCES.map(resource => (
                      <li key={resource.href}>
                        <Link
                          to={resource.href}
                          className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          {resource.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              <motion.div {...reveal} className={`${CARD} min-w-0 self-start px-5 sm:px-7 lg:col-start-2 lg:row-span-2 lg:row-start-1`}>
                <Accordion type="single" collapsible onValueChange={value => { if (value) trackBuyerSeoFinancing('faq_opened', { faq_id: value }); }}>
                  {FINANCING_FAQ.map((item, i) => (
                    <AccordionItem key={item.q} value={`financing-faq-${i + 1}`} className="border-border last:border-b-0">
                      <AccordionTrigger className="py-5 text-left text-[15px] font-semibold leading-snug hover:no-underline md:text-base">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 8 · FINAL CTA — full-bleed photo band */}
        <section
          data-cta-location="final_cta"
          aria-labelledby="final-cta-heading"
          className="relative isolate overflow-hidden bg-[#141416] text-white"
        >
          <img
            src={bandTruck}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[rgba(12,12,14,0.86)] md:bg-[radial-gradient(65%_75%_at_50%_50%,rgba(12,12,14,0.93),rgba(12,12,14,0.74))]" />
          <motion.div {...reveal} className={`${WRAP} py-20 text-center md:py-28`}>
            <div className="mx-auto max-w-2xl">
              <h2 id="final-cta-heading" className="text-[2rem] font-bold leading-tight tracking-tight md:text-5xl">
                Ready to see your options?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">
                The application takes a few minutes and goes directly to Equinox
                Funding — approval is subject to underwriting.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                <ApplyCta
                  onApply={startFinancingApply}
                  source="financing_page_footer"
                  listingId={listingId}
                />
                <Button size="lg" className={ON_PHOTO_BUTTON} asChild>
                  <Link to={inventoryHref}>Browse Food Trucks &amp; Trailers</Link>
                </Button>
              </div>
              <p className="mt-8 text-xs leading-relaxed text-white/70">
                <HandCoins className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                Prefer to pay another way? See{' '}
                <Link to="/payments" className="underline underline-offset-2 hover:text-white">
                  PayPal checkout and Pay in Person
                </Link>
                , or{' '}
                <Link
                  to="/how-purchasing-works"
                  className="underline underline-offset-2 hover:text-white"
                >
                  how purchasing works
                </Link>
              </p>
            </div>
          </motion.div>
        </section>

        {/* Required disclosures */}
        <section aria-label="Disclosures" className="py-12 md:py-14">
          <div className={`${WRAP} space-y-4`}>
            <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
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
            <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
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
          </div>
        </section>
      </main>

      {/* STICKY MOBILE CTA */}
      <div
        className="fixed inset-x-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="cta"
          size="lg"
          className="w-full rounded-full font-semibold"
          onClick={() => startFinancingApply('financing_page_sticky', listingId)}
        >
          Apply for Financing
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
