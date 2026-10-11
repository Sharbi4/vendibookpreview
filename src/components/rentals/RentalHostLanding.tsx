import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { trackLeadEvent } from '@/lib/leadTracking';
import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';

/**
 * Premium host-acquisition landing for rentals (food trucks/trailers and
 * shared kitchens). Same warm ivory canvas, highlighter headline and pill
 * CTAs (`cta` / `cta-outline`) as the homepage hero and dashboard, so every
 * rental entry point feels like one product.
 *
 * Copy rule: only claims the product actually does. Money math uses the live
 * fee config, never a hardcoded rate.
 */

type Icon = ComponentType<{ className?: string }>;

export interface LandingCta {
  label: string;
  to: string;
}

export interface RentalHostLandingProps {
  seo: { title: string; description: string; canonical: string };
  /** Analytics source for CTA clicks, e.g. "rent_my_food_truck". */
  source: string;
  eyebrow: string;
  headline: { highlight: string; rest: string };
  subhead: string;
  primaryCta: LandingCta;
  secondaryCta: LandingCta;
  proofChips: string[];
  audience: { title: string; items: string[] };
  steps: Array<{ title: string; body: string }>;
  estimator: {
    title: string;
    unit: 'month' | 'day';
    rateLabel: string;
    rate: { min: number; max: number; step: number; initial: number };
    periods: { label: string; min: number; max: number; initial: number; suffix: string };
    note?: string;
  };
  features: Array<{ icon: Icon; title: string; body: string }>;
  spotlight?: { eyebrow: string; title: string; body: string; cta: LandingCta };
  faqs: Array<{ question: string; answer: string }>;
  finalCta: { title: string; body: string; primary: LandingCta; secondary: LandingCta };
  extraSchema?: Record<string, unknown>[];
  /** Optional block rendered after the features (e.g. signage tools). */
  children?: ReactNode;
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function CtaPair({ primary, secondary, source, placement, align = 'center' }: {
  primary: LandingCta; secondary: LandingCta; source: string; placement: string; align?: 'center' | 'start';
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${align === 'center' ? 'items-center justify-center' : 'items-start'}`}>
      <Button asChild size="lg" variant="cta" className="h-12 w-full rounded-full text-base font-semibold sm:w-auto sm:px-7">
        <Link
          to={primary.to}
          onClick={() => trackLeadEvent('rental_host_landing_cta', { source, placement, cta: 'primary', destination: primary.to })}
        >
          {primary.label}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="cta-outline" className="h-12 w-full rounded-full text-base font-medium sm:w-auto sm:px-6">
        <Link
          to={secondary.to}
          onClick={() => trackLeadEvent('rental_host_landing_cta', { source, placement, cta: 'secondary', destination: secondary.to })}
        >
          {secondary.label}
        </Link>
      </Button>
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {body ? <p className="mt-3 text-base leading-relaxed text-muted-foreground">{body}</p> : null}
    </div>
  );
}

function Estimator({ cfg }: { cfg: RentalHostLandingProps['estimator'] }) {
  const [rate, setRate] = useState(cfg.rate.initial);
  const [periods, setPeriods] = useState(cfg.periods.initial);
  const hostFee = FEE_CONFIG.rentalHostFeePct / 100;
  const gross = rate * periods;
  const keep = Math.round(gross * (1 - hostFee));
  const perYear = cfg.unit === 'day' ? keep * 12 : keep;
  const unitWord = cfg.unit === 'day' ? 'day' : 'month';

  return (
    <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(28,25,23,0.35)] sm:p-8">
      <div className="space-y-7">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium text-foreground">{cfg.rateLabel}</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{money(rate)}<span className="text-sm font-normal text-muted-foreground">/{unitWord}</span></span>
          </div>
          <Slider value={[rate]} min={cfg.rate.min} max={cfg.rate.max} step={cfg.rate.step}
            onValueChange={(v) => setRate(v[0])} aria-label={cfg.rateLabel} />
        </div>
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium text-foreground">{cfg.periods.label}</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{periods} {cfg.periods.suffix}</span>
          </div>
          <Slider value={[periods]} min={cfg.periods.min} max={cfg.periods.max} step={1}
            onValueChange={(v) => setPeriods(v[0])} aria-label={cfg.periods.label} />
        </div>
      </div>
      <div className="mt-8 rounded-2xl bg-foreground p-6 text-background">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-background/60">
          {cfg.unit === 'day' ? 'You keep each month' : 'You keep'}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">{money(keep)}</p>
        {cfg.unit === 'day' ? (
          <p className="mt-1 text-sm text-background/70">About {money(perYear)} a year at this pace</p>
        ) : null}
        <p className="mt-4 text-xs leading-relaxed text-background/60">
          After Vendibook's {FEE_CONFIG.rentalHostFeePct}% host fee. Renters pay a separate service fee at checkout.
          {cfg.note ? ` ${cfg.note}` : ''}
        </p>
      </div>
    </div>
  );
}

export default function RentalHostLanding(props: RentalHostLandingProps) {
  const reduced = useReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };
  const inView = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-60px' },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const faqSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: props.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }), [props.faqs]);

  return (
    <div className="sale-light flex min-h-screen flex-col bg-background">
      <SEO title={props.seo.title} description={props.seo.description} canonical={props.seo.canonical} />
      <JsonLd schema={[faqSchema, ...(props.extraSchema ?? [])]} />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden" aria-labelledby="rental-landing-heading">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(900px 480px at 85% -10%, rgba(255,106,26,0.12), transparent 65%), radial-gradient(700px 420px at 10% 0%, rgba(255,186,8,0.08), transparent 60%)',
            }}
            aria-hidden="true"
          />
          <div className="container relative z-10 mx-auto max-w-3xl px-5 pb-14 pt-14 text-center sm:pb-20 sm:pt-20">
            <motion.p
              {...rise(0)}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {props.eyebrow}
            </motion.p>
            <motion.h1
              id="rental-landing-heading"
              {...rise(0.05)}
              className="text-balance text-[2.1rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[3rem] md:text-[3.5rem]"
            >
              <span className="text-highlighter">{props.headline.highlight}</span> {props.headline.rest}
            </motion.h1>
            <motion.p {...rise(0.12)} className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {props.subhead}
            </motion.p>
            <motion.div {...rise(0.2)} className="mt-8">
              <CtaPair primary={props.primaryCta} secondary={props.secondaryCta} source={props.source} placement="hero" />
            </motion.div>
            <motion.ul {...rise(0.28)} className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {props.proofChips.map((chip) => (
                <li key={chip} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  {chip}
                </li>
              ))}
            </motion.ul>
          </div>
        </section>

        {/* Who rents */}
        <section className="border-y border-border/70 bg-card/60 py-10">
          <div className="container mx-auto max-w-5xl px-5">
            <p className="mb-5 text-center text-sm font-medium text-muted-foreground">{props.audience.title}</p>
            <ul className="flex flex-wrap justify-center gap-2.5">
              {props.audience.items.map((item) => (
                <li key={item} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto max-w-5xl px-5">
            <SectionHeading eyebrow="How it works" title="Listed in minutes. Booked on your terms." />
            <ol className="grid gap-5 md:grid-cols-3">
              {props.steps.map((step, i) => (
                <motion.li key={step.title} {...inView(i * 0.08)}
                  className="relative rounded-[24px] border border-border bg-card p-7 shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)]">
                  <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Earnings */}
        <section className="relative overflow-hidden bg-card/60 py-20 sm:py-24">
          <div className="container mx-auto grid max-w-5xl items-center gap-10 px-5 md:grid-cols-2">
            <motion.div {...inView()}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Earnings</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{props.estimator.title}</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Set your own {props.estimator.unit === 'day' ? 'daily' : 'monthly'} rate. Listing is free. Vendibook only
                earns when you do, with a flat {FEE_CONFIG.rentalHostFeePct}% host fee on completed bookings.
              </p>
              <div className="mt-8">
                <CtaPair primary={props.primaryCta} secondary={props.secondaryCta} source={props.source} placement="earnings" align="start" />
              </div>
            </motion.div>
            <motion.div {...inView(0.1)}>
              <Estimator cfg={props.estimator} />
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto max-w-6xl px-5">
            <SectionHeading
              eyebrow="Built for owners"
              title="Everything you need to rent with confidence"
              body="Bookings, payments, agreements and handoffs live in one place, so you're never chasing a renter for paperwork or money."
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {props.features.map((f, i) => (
                <motion.div key={f.title} {...inView((i % 3) * 0.06)}
                  className="group rounded-[24px] border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_22px_50px_-28px_rgba(255,106,26,0.45)]">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {props.children}

        {props.spotlight ? (
          <section className="px-5 pb-20 sm:pb-24">
            <motion.div {...inView()}
              className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-foreground px-7 py-12 text-background sm:px-12 sm:py-14">
              <div className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(600px 300px at 90% 0%, rgba(255,106,26,0.35), transparent 70%)' }} aria-hidden="true" />
              <div className="relative max-w-2xl">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{props.spotlight.eyebrow}</p>
                <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{props.spotlight.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-background/75">{props.spotlight.body}</p>
                <Button asChild size="lg" variant="cta" className="mt-8 h-12 rounded-full px-7 text-base font-semibold">
                  <Link to={props.spotlight.cta.to}
                    onClick={() => trackLeadEvent('rental_host_landing_cta', { source: props.source, placement: 'spotlight', cta: 'spotlight', destination: props.spotlight!.cta.to })}>
                    {props.spotlight.cta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </section>
        ) : null}

        {/* FAQ */}
        <section className="bg-card/60 py-20 sm:py-24">
          <div className="container mx-auto max-w-3xl px-5">
            <SectionHeading eyebrow="Questions" title="Good to know" />
            <Accordion type="single" collapsible className="space-y-3">
              {props.faqs.map((f, i) => (
                <AccordionItem key={f.question} value={`faq-${i}`} className="rounded-2xl border border-border bg-background px-5">
                  <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden py-20 sm:py-24">
          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(800px 400px at 50% 120%, rgba(255,106,26,0.14), transparent 70%)' }} aria-hidden="true" />
          <div className="container relative mx-auto max-w-2xl px-5 text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-[2.6rem]">{props.finalCta.title}</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">{props.finalCta.body}</p>
            <div className="mt-8">
              <CtaPair primary={props.finalCta.primary} secondary={props.finalCta.secondary} source={props.source} placement="final" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
