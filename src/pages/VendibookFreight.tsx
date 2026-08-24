import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Truck,
  MapPin,
  PackageCheck,
  Compass,
  Receipt,
  Link2,
  Landmark,
  Eye,
  Camera,
  ClipboardCheck,
  ArrowRight,
  Route as RouteIcon,
  Navigation,
  Box,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { trackCTAClick } from '@/lib/analytics';
import { GuideBreadcrumb } from '@/components/education/GuideBreadcrumb';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import deliveryMapArt from '@/assets/education/delivery-map.svg.asset.json';
import movingArt from '@/assets/education/moving.svg.asset.json';

/**
 * /vendibook-freight — product landing page for Vendibook Freight.
 *
 * Copy guardrails (do not regress): never publish a fixed per-mile rate,
 * the stale $75 handling fee, a universal tax rate, or worked mileage
 * examples. Transportation charges are variable and provider dependent.
 * The only fixed figure allowed on this page is the $150 Vendibook Freight
 * Coordination Fee. Do not call the legacy estimate-freight endpoint here.
 * Provider-dependent claims carry an asterisk resolved in the bottom
 * disclosure. No insurance, tracking, or guaranteed transit claims.
 */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45 },
};

const HERO_PROOF = [
  'Lower 48 states*',
  'Food trucks & trailers',
  'Current transportation pricing*',
  'Pickup coordination*',
];

const BENEFITS = [
  {
    icon: Compass,
    title: 'Find better inventory',
    body: 'Don’t limit the search to whatever happens to be nearby.',
  },
  {
    icon: Receipt,
    title: 'Know the cost before you commit',
    body: 'Review transportation pricing as part of the purchase decision.',
  },
  {
    icon: Link2,
    title: 'One connected purchase',
    body: 'When Freight is used with a Vendibook transaction, the listing, purchase, transportation details, and delivery confirmation stay connected.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Tell us what’s moving',
    body: 'For a Vendibook purchase, choose Freight when available and confirm where the equipment needs to go. For a standalone shipment, submit the pickup, destination, and equipment details.',
  },
  {
    num: '02',
    title: 'We coordinate the move',
    body: 'Transportation is coordinated around the shipment details, seller or pickup contact, buyer, and transportation provider.*',
  },
  {
    num: '03',
    title: 'It arrives. You inspect it.',
    body: 'Receive the equipment, review its condition, document anything that needs attention, and confirm the handoff where applicable.',
  },
];

const PRICING_FACTORS = [
  'Origin and destination',
  'The actual route',
  'Equipment dimensions, weight, and type',
  'Running condition',
  'Current transportation availability',
  'Fuel and travel costs',
  'Pickup and delivery access',
  'Special handling requirements',
];

const HANDOFF = [
  {
    icon: Eye,
    title: 'Inspect',
    body: 'Walk the equipment at delivery and compare its condition against the listing and any pre-shipment photos.',
  },
  {
    icon: Camera,
    title: 'Document',
    body: 'Photograph anything that needs attention and note it before the handoff is wrapped up.',
  },
  {
    icon: ClipboardCheck,
    title: 'Confirm',
    body: 'Confirm the delivery where applicable so the handoff is recorded and the transaction can move forward.',
  },
];

const FAQS = [
  {
    q: 'Can Vendibook ship a food truck or food trailer?',
    a: 'Yes. Vendibook Freight is built around moving food trucks, food trailers, and similar mobile food equipment across the lower 48 states.* Availability depends on the route, the equipment, and the shipment details, so start with a transportation pricing request.',
  },
  {
    q: 'How is Vendibook Freight pricing determined?',
    a: 'Transportation pricing reflects the actual move: origin and destination, route, equipment size and weight, running condition, current transportation availability, fuel and travel costs, pickup and delivery access, and any special handling.* Vendibook charges a separate $150 Freight Coordination Fee. Transportation charges are variable and confirmed around your shipment details.',
  },
  {
    q: 'Do I have to buy through Vendibook to use Freight?',
    a: 'No. Freight is available for Vendibook purchases, where it stays connected to your transaction, and as a standalone service for equipment you found somewhere else. Either way, you tell us what is moving and where it needs to go.',
  },
  {
    q: 'Where does Vendibook Freight operate?',
    a: 'Vendibook Freight helps move food trucks and food trailers across the lower 48 states.* Route availability can vary by shipment and transportation provider.',
  },
  {
    q: 'What details are needed for transportation pricing?',
    a: 'The pickup location, the delivery location, and the equipment type are the starting point. Dimensions, weight, and running condition help make the pricing more accurate for your specific shipment.',
  },
  {
    q: 'What happens after I request transportation?',
    a: 'Your request is reviewed against the shipment details, and transportation is coordinated around the pickup contact, the destination, and the transportation provider.* When the equipment arrives, you inspect it and confirm the handoff where applicable.',
  },
];

const VendibookFreight = () => {
  const reduce = useReducedMotion();

  useEffect(() => {
    // FAQ structured data so the freight FAQs can surface in search.
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="sale-light min-h-screen bg-background flex flex-col">
      <SEO
        title="Vendibook Freight | Food Truck & Food Trailer Transport"
        description="Move food trucks and food trailers across the lower 48 with Vendibook Freight. Get transportation pricing, coordinate pickup, and ship equipment whether you found it on Vendibook or elsewhere."
        canonical="/vendibook-freight"
      />

      <Header />

      <main className="flex-1">
        {/* 1. HERO */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(70% 55% at 85% 0%, rgba(255,106,26,0.07) 0%, transparent 70%), linear-gradient(180deg, rgba(255,248,240,0.9) 0%, transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <GuideBreadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'How Vendibook Works', to: '/how-it-works' },
                { label: 'Vendibook Freight' },
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
                  Vendibook Freight
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-bold tracking-tight text-foreground mb-5 leading-[1.06]">
                  The right truck doesn’t have to be local.
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                  Whether you found it on Vendibook or somewhere else, Vendibook Freight helps move
                  food trucks and food trailers across the lower 48 states.* Get transportation
                  pricing, coordinate pickup, and get your equipment where it needs to go.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Button variant="cta" size="cta" className="rounded-full" asChild>
                    <Link
                      to="/ship-your-food-truck"
                      onClick={() => trackCTAClick('get_freight_estimate', 'vendibook_freight_hero')}
                    >
                      Get a Freight Estimate <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button variant="cta-outline" size="lg" className="rounded-full h-14" asChild>
                    <Link
                      to="/browse"
                      onClick={() => trackCTAClick('browse_food_trucks', 'vendibook_freight_hero')}
                    >
                      Browse Food Trucks &amp; Trailers
                    </Link>
                  </Button>
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2">
                  {HERO_PROOF.map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <span className="w-1 h-1 rounded-full bg-primary/70" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-30px_rgba(18,18,18,0.25)] p-6 sm:p-10">
                  <img
                    src={deliveryMapArt.url}
                    alt="Illustrated map showing food truck transport routes across the country"
                    className="w-full h-auto"
                    loading="eager"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 2. QUOTE / ESTIMATE TEASER */}
        <section className="pb-16 md:pb-24">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-[2rem] border border-border bg-card shadow-[0_24px_60px_-30px_rgba(18,18,18,0.18)] p-6 sm:p-10"
            >
              <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
                    See what it could cost to bring it home.
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mb-6">
                    Transportation pricing reflects the actual route and shipment details.* Three
                    answers get you started.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { icon: MapPin, label: 'Pickup location', hint: 'City, state, or ZIP' },
                      { icon: Navigation, label: 'Delivery location', hint: 'Where it needs to go' },
                      { icon: Box, label: 'Equipment type', hint: 'Truck, trailer, or cart' },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="rounded-2xl border border-border bg-background px-4 py-3.5"
                      >
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground mb-0.5">
                          <field.icon className="w-3.5 h-3.5 text-primary" />
                          {field.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{field.hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:pl-4">
                  <Button variant="cta" size="cta" className="rounded-full w-full lg:w-auto" asChild>
                    <Link
                      to="/ship-your-food-truck"
                      onClick={() => trackCTAClick('get_freight_estimate', 'vendibook_freight_pricing_factors')}
                    >
                      Get a Freight Estimate <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. BENEFITS */}
        <section className="py-16 md:py-24 border-y border-border bg-card/40">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div {...(reduce ? {} : fadeUp)}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                  Why it matters
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-5 leading-[1.1]">
                  Shop beyond your ZIP code.
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  The truck that fits your business may not be sitting twenty miles away. Vendibook
                  gives buyers access to equipment across the country, then helps solve one of the
                  biggest problems in buying it: getting it home.
                </p>
                <div className="space-y-5">
                  {BENEFITS.map((b) => (
                    <div key={b.title} className="flex gap-4">
                      <span className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                        <b.icon className="w-5 h-5 text-foreground/70" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">{b.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                          {b.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                {...(reduce ? {} : fadeUp)}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.1 }}
                className="rounded-[2rem] border border-border bg-background shadow-[0_24px_60px_-30px_rgba(18,18,18,0.18)] p-8 sm:p-12"
              >
                <img
                  src={movingArt.url}
                  alt="Illustration of a food truck being relocated to a new owner"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 4. TWO USE CASES */}
        <section className="py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              <motion.div
                {...(reduce ? {} : fadeUp)}
                className="rounded-[2rem] border border-border bg-card p-7 sm:p-10 flex flex-col shadow-[0_20px_50px_-30px_rgba(18,18,18,0.15)]"
              >
                <span className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <Truck className="w-5 h-5 text-primary" />
                </span>
                <h2 className="text-2xl font-bold text-foreground tracking-tight mb-3">
                  Found it on Vendibook?
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
                  Freight can stay connected to your marketplace purchase. Listing, purchase, and
                  pickup information can flow into the transportation process, so the move starts
                  from what is already on file.
                </p>
                <div className="mt-auto">
                  <Button variant="cta-outline" size="lg" className="rounded-full" asChild>
                    <Link
                      to="/browse"
                      onClick={() => trackCTAClick('browse_equipment', 'vendibook_freight_paths_card')}
                    >
                      Browse equipment <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                {...(reduce ? {} : fadeUp)}
                transition={{ duration: 0.45, delay: reduce ? 0 : 0.08 }}
                className="rounded-[2rem] p-7 sm:p-10 flex flex-col text-white shadow-[0_20px_50px_-30px_rgba(18,18,18,0.4)]"
                style={{ background: 'linear-gradient(150deg, #1a1a1c 0%, #0c0c0e 100%)' }}
              >
                <span
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <RouteIcon className="w-5 h-5 text-white" />
                </span>
                <h2 className="text-2xl font-bold tracking-tight mb-3">
                  Already have a truck to move?
                </h2>
                <p className="text-sm md:text-base text-white/70 leading-relaxed mb-8">
                  You don’t need to buy it on Vendibook to use Vendibook Freight. Tell us what
                  you’re shipping and where it needs to go. We’ll help coordinate the move.*
                </p>
                <div className="mt-auto">
                  <Button variant="cta" size="lg" className="rounded-full" asChild>
                    <Link
                      to="/ship-your-food-truck"
                      onClick={() => trackCTAClick('get_freight_estimate', 'vendibook_freight_paths_card')}
                    >
                      Ship a truck or trailer <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 5. THREE STEP PROCESS (charcoal contrast) */}
        <section
          className="py-16 md:py-24 text-white"
          style={{ background: 'linear-gradient(160deg, #17171a 0%, #0a0a0c 100%)' }}
        >
          <div className="container max-w-6xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-12 md:mb-16">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50 mb-3">
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                From their lot to yours.
              </h2>
            </motion.div>

            <ol className="grid md:grid-cols-3 gap-5 md:gap-6">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.num}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.45, delay: reduce ? 0 : i * 0.08 }}
                  className="rounded-[2rem] p-7 sm:p-8 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255,255,255,0.045)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <p className="text-sm font-bold tracking-[0.2em] text-primary mb-5">{s.num}</p>
                  <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{s.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6. PRICING / QUOTE POSITIONING */}
        <section className="py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                Pricing
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Transportation pricing built around the actual move.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
                No flat per-mile guesswork. Pricing reflects what it really takes to move your
                equipment on your route.*
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-5 md:gap-6 items-stretch">
              <motion.div
                {...(reduce ? {} : fadeUp)}
                className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"
              >
                <h3 className="text-lg font-semibold text-foreground mb-5">
                  What shapes your transportation pricing*
                </h3>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
                  {PRICING_FACTORS.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                {...(reduce ? {} : fadeUp)}
                transition={{ duration: 0.45, delay: reduce ? 0 : 0.08 }}
                className="rounded-[2rem] border border-primary/25 bg-card p-7 sm:p-10 flex flex-col shadow-[0_20px_50px_-25px_rgba(255,106,26,0.25)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Vendibook Freight
                </p>
                <p className="text-sm text-muted-foreground mb-1">Coordination Fee</p>
                <p className="text-5xl font-bold text-foreground tracking-tight mb-4">$150</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                  Covers coordination of your shipment. Transportation charges are separate and
                  vary based on the actual move and current transportation pricing.*
                </p>
                <div className="mt-auto">
                  <Button variant="cta" size="lg" className="rounded-full w-full" asChild>
                    <Link
                      to="/ship-your-food-truck"
                      onClick={() => trackCTAClick('request_transportation_pricing', 'vendibook_freight_fee_card')}
                    >
                      Request Transportation Pricing <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 7. FINANCING CONNECTION */}
        <section className="pb-16 md:pb-24">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="rounded-[2rem] border border-border bg-card/60 p-7 sm:p-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-10"
            >
              <span className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                <Landmark className="w-5 h-5 text-foreground/70" />
              </span>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-2">
                  Buying with financing? Bring Freight into the conversation.
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Freight may be included in eligible financing arrangements depending on the
                  financing provider and transaction.*
                </p>
              </div>
              <Button variant="cta-outline" size="lg" className="rounded-full shrink-0" asChild>
                <Link to="/financing">
                  Explore financing <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* 8. DELIVERY / HANDOFF */}
        <section className="py-16 md:py-24 border-y border-border bg-card/40">
          <div className="container max-w-5xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                See it before you sign off on it.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
                When your equipment arrives, take a few minutes with it before the handoff is done.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-5 md:gap-6">
              {HANDOFF.map((h, i) => (
                <motion.div
                  key={h.title}
                  {...(reduce ? {} : fadeUp)}
                  transition={{ duration: 0.45, delay: reduce ? 0 : i * 0.07 }}
                  className="rounded-[2rem] border border-border bg-background p-7 text-center shadow-sm"
                >
                  <span className="inline-flex w-12 h-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center mb-5">
                    <h.icon className="w-5 h-5 text-primary" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{h.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="py-16 md:py-24">
          <div className="container max-w-3xl mx-auto px-4">
            <motion.div {...(reduce ? {} : fadeUp)} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
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

        {/* 10. FINAL CTA */}
        <section className="pb-16 md:pb-24">
          <div className="container max-w-4xl mx-auto px-4">
            <motion.div
              {...(reduce ? {} : fadeUp)}
              className="relative overflow-hidden rounded-[2.5rem] text-center px-6 py-14 sm:px-12 sm:py-20 text-white"
              style={{ background: 'linear-gradient(150deg, #1c1c1f 0%, #0b0b0d 100%)' }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 60% at 50% 0%, rgba(255,106,26,0.16) 0%, transparent 70%)',
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                  Don’t settle for the closest truck.
                </h2>
                <p className="text-xl md:text-2xl font-semibold text-primary mb-5">
                  Buy the right one.
                </p>
                <p className="text-sm md:text-base text-white/65 leading-relaxed max-w-xl mx-auto mb-9">
                  Browse food trucks and trailers for sale across the country, and let Vendibook
                  Freight help with the distance.*
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="cta" size="cta" className="rounded-full" asChild>
                    <Link
                      to="/browse"
                      onClick={() => trackCTAClick('browse_food_trucks', 'vendibook_freight_final_cta')}
                    >
                      Browse trucks &amp; trailers <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Link
                    to="/ship-your-food-truck"
                    onClick={() => trackCTAClick('get_freight_estimate', 'vendibook_freight_final_cta')}
                    className="inline-flex items-center justify-center rounded-full h-14 px-8 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
                    style={{ border: '1px solid rgba(255,255,255,0.22)' }}
                  >
                    Get a Freight Estimate
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* BOTTOM DISCLOSURE */}
        <section className="pb-12">
          <div className="container max-w-4xl mx-auto px-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground/80 border-t border-border pt-6">
              *Vendibook Freight transportation may be coordinated through Vendibook and independent
              third party transportation and logistics providers. Availability, pricing, pickup
              timing, delivery timing, routes, equipment eligibility, and transportation
              requirements vary by shipment and provider. Estimates are provided for planning
              purposes and may change when final transportation details are confirmed.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default VendibookFreight;
