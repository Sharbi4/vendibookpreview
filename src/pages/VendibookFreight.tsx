import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Truck,
  MapPin,
  Route as RouteIcon,
  Calculator,
  CreditCard,
  MailCheck,
  CalendarClock,
  PackageCheck,
  ClipboardList,
  Ruler,
  DoorOpen,
  Wrench,
  Camera,
  MessageSquareWarning,
  ShieldCheck,
  ArrowRight,
  FileText,
  BadgeDollarSign,
  HelpCircle,
  LifeBuoy,
  Loader2,
  HandCoins,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO, { generateFAQSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import InlineLink from '@/components/education/InlineLink';
import { useFreightEstimate } from '@/hooks/useFreightEstimate';
import { cn } from '@/lib/utils';
import deliveryMapArt from '@/assets/education/delivery-map.svg.asset.json';
import movingArt from '@/assets/education/moving.svg.asset.json';

/**
 * /vendibook-freight — buyer education page for Vendibook Freight.
 *
 * Copy guardrails (do not regress): estimates come from the internal
 * geocoded-distance calculation ($4.50/mile base, $150 minimum base,
 * 8% fuel surcharge, $199 shipping preparation & coordination fee) —
 * they are NOT live broker quotes. Do not publish a tax rate; the
 * estimator adds no tax and jurisdiction-aware tax work is not finalized
 * ("applicable taxes, if any, are calculated in the transaction").
 * Service area is the contiguous 48 U.S. states. Pickup can often be
 * scheduled as soon as ~48 hours — always frame as availability-dependent,
 * never a guarantee. Do not claim insurance/cargo coverage, real-time
 * tracking, or guaranteed transit timing. Freight is optional, and is a
 * separate payment/coordination step after the seller confirms the sale
 * (see create-freight-checkout).
 */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45 },
};

/* ------------------------------------------------------------------ */
/* Hero visual — abstract route: Seller → In transit → Buyer           */
/* ------------------------------------------------------------------ */

const HeroRouteVisual = () => {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative rounded-3xl border border-border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)] p-5 sm:p-6"
      role="img"
      aria-label="Illustrative route showing a food truck moving from the seller to the buyer"
    >
      {/* Map-like canvas */}
      <div className="relative rounded-2xl border border-border bg-foreground/[0.03] overflow-hidden">
        {/* Faint grid to suggest a map */}
        <svg className="absolute inset-0 w-full h-full text-foreground/[0.06]" aria-hidden="true">
          <defs>
            <pattern id="freight-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#freight-grid)" />
        </svg>

        <div className="relative px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6">
          {/* Route path */}
          <div className="relative h-28 sm:h-32">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 300 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M12 78 C 90 10, 210 10, 288 66"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 5"
                className="text-border"
              />
              <motion.path
                d="M12 78 C 90 10, 210 10, 288 66"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-primary"
                initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={reduce ? { duration: 0 } : { duration: 2.6, ease: 'easeInOut', delay: 0.4 }}
              />
            </svg>

            {/* Truck moving along the route (subtle, not real-time tracking) */}
            <motion.div
              className="absolute"
              initial={reduce ? { left: '58%', top: '18%' } : { left: '4%', top: '66%' }}
              animate={{ left: '58%', top: '18%' }}
              transition={reduce ? { duration: 0 } : { duration: 2.6, ease: 'easeInOut', delay: 0.4 }}
              aria-hidden="true"
            >
              <span className="flex w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg shadow-primary/25">
                <Truck className="w-4 h-4" />
              </span>
            </motion.div>
          </div>

          {/* Route endpoints */}
          <ol className="relative grid grid-cols-3 gap-1 mt-1">
            {[
              { icon: MapPin, label: 'Seller', sub: 'Pickup is coordinated' },
              { icon: RouteIcon, label: 'In transit', sub: 'Carrier transports it' },
              { icon: PackageCheck, label: 'Buyer', sub: 'Inspect & confirm' },
            ].map((node, i) => (
              <motion.li
                key={node.label}
                className={cn(
                  'flex flex-col gap-1.5',
                  i === 1 ? 'items-center text-center' : i === 2 ? 'items-end text-right' : 'items-start',
                )}
                initial={reduce ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.3 }}
              >
                <span
                  className={cn(
                    'w-9 h-9 rounded-full border bg-background flex items-center justify-center shadow-sm',
                    i === 1 ? 'border-primary/40 text-primary' : 'border-border text-foreground/60',
                  )}
                >
                  <node.icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-foreground leading-tight">{node.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{node.sub}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        Illustrative route — actual pickup and transit timing vary by shipment.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* How it works timeline                                               */
/* ------------------------------------------------------------------ */

const TIMELINE: { icon: LucideIcon; title: string; body: React.ReactNode }[] = [
  {
    icon: Truck,
    title: 'Find the right equipment — wherever it is',
    body: 'Browse food trucks and trailers for sale across the marketplace. When a listing supports Vendibook Freight, you’ll see it as a delivery option during checkout.',
  },
  {
    icon: Calculator,
    title: 'Review your freight estimate',
    body: 'Enter your destination address in the delivery step and the estimate is calculated from the route between the pickup location and your address. You see the estimate before you commit — or try the estimator below anytime.',
  },
  {
    icon: CreditCard,
    title: 'Complete your purchase',
    body: (
      <>
        Pay for the equipment through the normal{' '}
        <InlineLink to="/how-purchasing-works">checkout flow</InlineLink>. Your purchase is recorded
        and the sale moves forward.
      </>
    ),
  },
  {
    icon: MailCheck,
    title: 'The seller confirms the sale',
    body: 'The seller reviews and confirms the purchase. Freight coordination is finalized after that confirmation.',
  },
  {
    icon: ClipboardList,
    title: 'Freight is finalized as its own step',
    body: 'Freight payment and scheduling are completed separately from the equipment payment. When the seller covers freight, the listing shows free shipping instead.',
  },
  {
    icon: CalendarClock,
    title: 'Pickup and delivery are coordinated',
    body: 'Pickup at the seller and delivery to your address are scheduled. Pickup can often be scheduled as soon as about 48 hours after coordination begins — timing depends on carrier availability and route. Typical transit is estimated at 7–10 business days.',
  },
  {
    icon: PackageCheck,
    title: 'Inspect on arrival and confirm',
    body: 'When the equipment arrives, inspect it before confirming receipt in your dashboard. Your confirmation wraps up the handoff and moves the seller’s payout forward.',
  },
];

/* ------------------------------------------------------------------ */
/* Pricing structure                                                   */
/* ------------------------------------------------------------------ */

const PRICING = [
  {
    label: 'Base freight rate',
    value: '$4.50 / mile',
    note: 'Calculated from the route distance between the pickup location and your delivery address.',
  },
  {
    label: 'Minimum base charge',
    value: '$150',
    note: 'Shorter routes are billed at a $150 minimum base instead of the per-mile amount.',
  },
  {
    label: 'Fuel surcharge',
    value: '8% of base',
    note: 'Currently 8% of the base freight charge, added to every estimate.',
  },
  {
    label: 'Shipping preparation & coordination',
    value: '$199',
    note: 'A flat fee that covers shipment preparation, scheduling, and coordination with the carrier.',
  },
];

/* Hypothetical 500-mile example using the current formula: */
/* base = 500 × $4.50 = $2,250; fuel = 8% × $2,250 = $180; prep & coordination = $199. */

/* ------------------------------------------------------------------ */
/* What affects the estimate                                           */
/* ------------------------------------------------------------------ */

const FACTORS = [
  {
    icon: RouteIcon,
    title: 'Route distance',
    body: 'Distance is the main driver of the estimate. The current estimate is calculated from the straight-line route between the pickup and delivery addresses.',
  },
  {
    icon: Ruler,
    title: 'Equipment size & weight',
    body: 'Dimensions and weight are collected as shipment details for the carrier, but they do not change the per-mile estimate formula today. Final freight details are confirmed during coordination.',
  },
  {
    icon: DoorOpen,
    title: 'Pickup & delivery access',
    body: 'Loading access, scheduling, and site considerations at either end are worked out when the shipment is coordinated — make sure both locations can receive a large vehicle.',
  },
  {
    icon: Wrench,
    title: 'Special handling',
    body: 'If the equipment needs anything out of the ordinary — non-running condition, unusual height, or extra prep — raise it with support before finalizing freight so it can be addressed during coordination.',
  },
];

/* ------------------------------------------------------------------ */
/* At delivery                                                         */
/* ------------------------------------------------------------------ */

const AT_DELIVERY: { icon: LucideIcon; title: string; body: React.ReactNode }[] = [
  {
    icon: CalendarClock,
    title: 'Be available for the delivery window',
    body: 'Plan to be at the delivery address — or have someone you trust there — for the coordinated window.',
  },
  {
    icon: PackageCheck,
    title: 'Inspect before you confirm',
    body: 'Walk the equipment carefully before confirming receipt in your dashboard. Compare it against the listing and any pre-shipment photos.',
  },
  {
    icon: Camera,
    title: 'Document anything that looks off',
    body: 'Take photos and note visible condition concerns on the spot — including on the driver’s delivery paperwork — before final confirmation.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Report problems before confirming',
    body: (
      <>
        If something isn’t right,{' '}
        <InlineLink to="/help/dispute-evidence">contact Vendibook support</InlineLink> through your
        order before confirming receipt so the concern is documented during the handoff.
      </>
    ),
  },
];

/* ------------------------------------------------------------------ */
/* Freight vs pickup vs seller delivery                                */
/* ------------------------------------------------------------------ */

const COMPARISON = [
  {
    icon: MapPin,
    title: 'Pickup',
    best: 'Best for local purchases',
    who: 'You and the seller coordinate the pickup time and location together.',
    cost: 'No delivery cost — you collect the equipment yourself.',
  },
  {
    icon: Truck,
    title: 'Seller delivery',
    best: 'Best when the seller offers it',
    who: 'The seller arranges delivery to your address within their offered area.',
    cost: 'Any delivery fee is set by the seller and shown during checkout.',
  },
  {
    icon: RouteIcon,
    title: 'Vendibook Freight',
    best: 'Best for longer-distance purchases',
    who: 'Vendibook coordinates carrier pickup at the seller and delivery to you.',
    cost: 'Estimated from route distance at checkout, then finalized as a separate step after the seller confirms the sale.',
  },
];

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    q: 'How much does Vendibook Freight cost?',
    a: 'Estimates use a $4.50-per-mile base rate (with a $150 minimum base charge), plus a fuel surcharge currently set at 8% of the base and a flat $199 shipping preparation and coordination fee. The final amount depends on the actual route, distance, and shipment details, so the estimate is not a guaranteed final quote. Applicable taxes, if any, are calculated in the transaction.',
  },
  {
    q: 'Where is Vendibook Freight available?',
    a: 'Vendibook Freight serves the contiguous 48 U.S. states. Availability on a specific purchase still depends on the listing and the route — look for the Vendibook Freight option in the delivery step of checkout.',
  },
  {
    q: 'When do I pay for Freight?',
    a: 'Freight is a separate step from paying for the equipment. After the seller confirms your purchase, freight payment and scheduling are finalized. Your freight estimate is shown during checkout so you can review it before you buy.',
  },
  {
    q: 'Who pays for Freight?',
    a: 'The buyer pays for freight in most transactions. Some sellers offer seller-paid freight — those listings show free shipping during checkout, and the seller covers the freight cost out of their sale proceeds.',
  },
  {
    q: 'How long can delivery take?',
    a: 'Pickup can often be scheduled as soon as about 48 hours after freight coordination begins, depending on carrier availability and route. Typical transit is estimated at 7–10 business days once the shipment is on the road. These are estimates, not guarantees — actual pickup scheduling and transit time vary by route and carrier availability.',
  },
  {
    q: 'Can freight be included in financing?',
    a: 'Freight may be included in eligible financing arrangements — confirm with the financing provider. Approval, rates, and terms are always determined by the financing partner.',
  },
  {
    q: 'Can I use Freight for a food truck or trailer?',
    a: 'Yes — Vendibook Freight is built around moving food trucks, trailers, and similar mobile-food equipment. Availability depends on the listing and route, so look for the Vendibook Freight option in the delivery step of checkout.',
  },
  {
    q: 'What should I do if there is a problem at delivery?',
    a: 'Inspect the equipment before confirming receipt. Document any visible condition concerns with photos and note them on the driver’s delivery paperwork, then report the issue to Vendibook support through your order before confirming everything is complete.',
  },
];

/* ------------------------------------------------------------------ */
/* Standalone estimator — reuses the shared estimate-freight engine     */
/* (same hook + edge function as checkout; no transaction is mutated)  */
/* ------------------------------------------------------------------ */

const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const FreightEstimator = () => {
  const reduce = useReducedMotion();
  const { estimate, isLoading, disclaimer, getEstimate } = useFreightEstimate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const canSubmit = origin.trim().length >= 5 && destination.trim().length >= 5 && !isLoading;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    void getEstimate({
      origin_address: origin.trim(),
      destination_address: destination.trim(),
    });
  };

  return (
    <motion.div
      {...(reduce ? {} : fadeUp)}
      className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.12)]"
    >
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="freight-origin"
            className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2"
          >
            Pickup location
          </label>
          <Input
            id="freight-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="City, state, or ZIP"
            autoComplete="address-level2"
            className="rounded-xl text-base"
          />
        </div>
        <div>
          <label
            htmlFor="freight-destination"
            className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2"
          >
            Delivery destination
          </label>
          <Input
            id="freight-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="City, state, or ZIP"
            autoComplete="address-level2"
            className="rounded-xl text-base"
          />
        </div>
        <Button
          type="submit"
          variant="cta"
          size="lg"
          disabled={!canSubmit}
          className="rounded-full sm:col-span-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Calculating…
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-1.5" /> Estimate freight
            </>
          )}
        </Button>
      </form>

      {estimate && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm font-semibold text-foreground">Your estimate</p>
            <span className="inline-flex items-center rounded-full bg-foreground/5 border border-border px-2.5 py-1 text-[10px] font-medium text-foreground/70">
              Estimate — not a final quote
            </span>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Route distance</dt>
              <dd className="font-medium text-foreground whitespace-nowrap">
                ~{estimate.distance_miles.toLocaleString()} miles
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Base freight (${estimate.rate_per_mile.toFixed(2)}/mile)</dt>
              <dd className="font-medium text-foreground whitespace-nowrap">
                {formatMoney(estimate.base_cost)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Fuel surcharge</dt>
              <dd className="font-medium text-foreground whitespace-nowrap">
                {formatMoney(estimate.fuel_surcharge)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Shipping preparation & coordination</dt>
              <dd className="font-medium text-foreground whitespace-nowrap">
                {formatMoney(estimate.handling_fee)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Typical transit</dt>
              <dd className="font-medium text-foreground whitespace-nowrap">
                {estimate.estimated_transit_days.min}–{estimate.estimated_transit_days.max} business days
              </dd>
            </div>
            <div className="flex justify-between gap-4 pt-3 border-t border-border">
              <dt className="font-semibold text-foreground">Estimated total</dt>
              <dd className="font-bold text-foreground whitespace-nowrap">
                {formatMoney(estimate.total_cost)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground leading-relaxed mt-4">
            {disclaimer ??
              'Estimate only. Final pricing and scheduling are confirmed during freight coordination.'}{' '}
            During checkout, the estimate is generated from the actual listing pickup location.
          </p>
        </div>
      )}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Related guides                                                      */
/* ------------------------------------------------------------------ */

const RESOURCES = [
  {
    icon: Truck,
    title: 'How purchasing works',
    body: 'The full buyer journey — offers, payment, delivery options, and confirmation.',
    cta: 'See how buying works',
    to: '/how-purchasing-works',
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

const VendibookFreight = () => {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Vendibook Freight — Food Truck Shipping & Trailer Transport"
        description="Food truck shipping and food trailer transport across the contiguous 48 states, coordinated through third-party carriers. See current rates and get an estimate."
        canonical="/vendibook-freight"
      />
      <JsonLd
        schema={[generateFAQSchema(FAQS.map((f) => ({ question: f.q, answer: f.a })))]}
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
                  <RouteIcon className="w-3.5 h-3.5 text-primary" />
                  Long-distance equipment transport
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.08]">
                  Vendibook Freight
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Found the right food truck or trailer in another state? Vendibook Freight is food
                  truck shipping and food trailer transport coordinated through third-party carriers
                  across the contiguous 48 states — so distance doesn’t decide what you can buy.
                  Here’s how it fits into{' '}
                  <InlineLink to="/how-purchasing-works">how purchasing works</InlineLink>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link to="/browse">Browse equipment</Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link to="/how-purchasing-works">How purchasing works</Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <HeroRouteVisual />
              </motion.div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS TIMELINE */}
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                How it works
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                From checkout to your curb
              </h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
                Freight fits into the normal purchase flow — here’s the full path, in order.
              </p>
            </motion.div>

            <ol className="relative space-y-4">
              <div
                className="absolute left-[27px] top-4 bottom-4 w-px bg-border hidden sm:block"
                aria-hidden="true"
              />
              {TIMELINE.map((stage, i) => (
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
                      0{i + 1}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground mb-1.5">{stage.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{stage.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* COVERAGE & FLEXIBILITY */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div {...(reduce ? {} : fadeUp)}>
                <img
                  src={deliveryMapArt.url}
                  alt="Map of arranged food truck freight routes across the contiguous United States"
                  loading="lazy"
                  className="w-full h-auto rounded-3xl border border-border bg-background object-contain shadow-sm"
                />
              </motion.div>
              <motion.div {...(reduce ? {} : fadeUp)}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Coverage & flexibility
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Freight across the contiguous 48 states
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-6">
                  Transport is coordinated through third-party transportation carriers. Once freight
                  coordination begins, pickup can often be scheduled as soon as about 48 hours out —
                  timing always depends on carrier availability and the route.
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3.5">
                    <span className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 text-foreground/70">
                      <MapPin className="w-4.5 h-4.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Freight is optional</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Pickup and seller delivery remain options wherever they’re offered. Freight is
                        there when distance would otherwise end the conversation.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3.5">
                    <span className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 text-foreground/70">
                      <HandCoins className="w-4.5 h-4.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        Free shipping when the seller covers it
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        On some listings, the seller chooses to cover the freight cost — you’ll see it
                        as free shipping at checkout, and the freight amount is accounted for against
                        the seller’s proceeds. Sellers can read more in the{' '}
                        <InlineLink to="/how-it-works-seller">seller guide</InlineLink>.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3.5">
                    <span className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 text-foreground/70">
                      <BadgeDollarSign className="w-4.5 h-4.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Financing can help</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Freight may be included in eligible{' '}
                        <InlineLink to="/financing">financing</InlineLink> arrangements — confirm with
                        the financing provider.
                      </p>
                    </div>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHAT DOES IT COST */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                What does it cost?
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                A straightforward estimate structure
              </h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
                Every freight estimate is built from the same four parts. You see the estimate during
                checkout before you commit — the final amount depends on the actual route and shipment
                details, so treat it as an estimate, not a guaranteed quote.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
              {PRICING.map((p, i) => (
                <motion.div
                  key={p.label}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                  className="rounded-2xl border border-border bg-background p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    {p.label}
                  </p>
                  <p className="text-xl font-bold text-foreground mb-1.5">{p.value}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.note}</p>
                </motion.div>
              ))}
            </div>

            {/* Illustrative example — explicitly hypothetical */}
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-3xl border border-border bg-background p-6 sm:p-8 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2 mb-5">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  A worked example — 500-mile route
                </h3>
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Base freight (500 miles × $4.50)</dt>
                  <dd className="font-medium text-foreground whitespace-nowrap">$2,250.00</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Fuel surcharge (8% of base)</dt>
                  <dd className="font-medium text-foreground whitespace-nowrap">$180.00</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Shipping preparation & coordination</dt>
                  <dd className="font-medium text-foreground whitespace-nowrap">$199.00</dd>
                </div>
                <div className="flex justify-between gap-4 pt-3 border-t border-border">
                  <dt className="font-semibold text-foreground">Example total</dt>
                  <dd className="font-bold text-foreground whitespace-nowrap">$2,629.00</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground leading-relaxed mt-5 rounded-xl bg-foreground/[0.04] border border-border px-3.5 py-3">
                Hypothetical example only, calculated from the formula above — not a quote. Your
                estimate is generated from the actual route at checkout, and applicable taxes, if
                any, are calculated in the transaction. The freight amount is finalized as a separate
                step after the seller confirms the sale.
              </p>
            </motion.div>
          </div>
        </section>

        {/* WHAT AFFECTS THE ESTIMATE */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                What affects the estimate?
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Mostly distance — and a few practical details
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {FACTORS.map((f, i) => (
                <motion.div
                  key={f.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <span className="w-10 h-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center shrink-0 text-foreground/70">
                    <f.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AT DELIVERY */}
        <section className="py-12 md:py-16 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                What happens at delivery?
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Receive it, inspect it, confirm it
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {AT_DELIVERY.map((d, i) => (
                <motion.div
                  key={d.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.05 }}
                  className="flex gap-4 rounded-2xl border border-border bg-background p-5 sm:p-6"
                >
                  <span className="w-10 h-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center shrink-0 text-foreground/70">
                    <d.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{d.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{d.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p
              {...(reduce ? {} : fadeUp)}
              className="text-sm text-muted-foreground text-center mt-8 inline-flex items-center gap-1.5 w-full justify-center"
            >
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              Inspect before you confirm — your confirmation wraps up the handoff and moves the
              seller’s payout forward.
            </motion.p>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Flexible delivery options
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Freight vs. pickup vs. seller delivery
              </h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
                The same three options you’ll see across Vendibook — pick what fits the purchase.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {COMPARISON.map((c, i) => (
                <motion.div
                  key={c.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06 }}
                  className="rounded-3xl border border-border bg-card p-6 flex flex-col hover:shadow-md transition-shadow"
                >
                  <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center mb-4 shadow-sm">
                    <c.icon className="w-5 h-5 text-foreground/70" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">{c.title}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mt-1 mb-2.5">
                    {c.best}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{c.who}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-auto pt-3 border-t border-border">
                    <span className="font-medium text-foreground/80">Cost: </span>
                    {c.cost}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-16 border-t border-border">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Freight questions, answered
              </h2>
            </motion.div>

            <motion.div {...(reduce ? {} : fadeUp)}>
              <Accordion type="single" collapsible className="space-y-3">
                {FAQS.map((f, i) => (
                  <AccordionItem
                    key={f.q}
                    value={`faq-${i}`}
                    className="rounded-2xl border border-border bg-card px-5 data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="text-left text-sm sm:text-base font-semibold text-foreground hover:no-underline py-4">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* RELATED GUIDES */}
        <section className="py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Keep exploring</h2>
              <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto">
                More guides to help you buy with confidence.
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
                Shop beyond your local market
              </h2>
              <p className="text-base text-muted-foreground mb-7">
                Browse food trucks and trailers for sale — and let Freight help with the distance.
              </p>
              <Button variant="cta" size="lg" className="rounded-full" asChild>
                <Link to="/browse">
                  Browse equipment <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-6 inline-flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Questions about a specific shipment? Visit the{' '}
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

export default VendibookFreight;
