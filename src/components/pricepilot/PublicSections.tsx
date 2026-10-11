import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  LineChart,
  ShieldCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CountUpMoney, Eyebrow, Pill, RangeBar, Reveal, SectionCard, fmt } from './ui';

/** Shared illustrative figures so the hero card and the full sample stay in sync. */
const SAMPLE = {
  recommended: 69900,
  low: 61500,
  high: 78000,
  benchmark: 68900,
  quickSale: 58900,
  premium: 76500,
  unit: '2021 18 ft food truck',
  location: 'Austin, TX',
  observations: 23,
  closeMatches: 8,
  comps: [
    { title: '2020 Freightliner MT45 food truck', meta: '16 ft · Houston, TX', price: 66500 },
    { title: '2021 Ford F59 step van kitchen', meta: '18 ft · Dallas, TX', price: 72000 },
    { title: '2019 Chevrolet P30 food truck', meta: '14 ft · San Antonio, TX', price: 59900 },
  ],
  reasoning:
    'Well-kept 2021 trucks in the 16 to 18 ft class are trading in a tight band across Texas. Turnkey readiness and a documented fire-suppression system support the upper half of the range, while mileage keeps it below the premium ceiling.',
};

/* ─── Hero ────────────────────────────────────────────────────────────────── */

export const Hero: React.FC<{
  signedOut: boolean;
  unlocked: boolean;
  onStart: () => void;
  onSample: () => void;
  signInHref: string;
}> = ({ signedOut, unlocked, onStart, onSample, signInHref }) => {
  const reduce = useReducedMotion();
  const fade = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative overflow-hidden">
      <div className="container max-w-6xl px-4 pt-14 pb-12 sm:pt-20 sm:pb-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="text-center lg:text-left">
            <motion.div {...fade(0)}>
              <Eyebrow>PricePilot</Eyebrow>
            </motion.div>
            <motion.h1
              {...fade(0.06)}
              className="mt-4 text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-foreground leading-[1.08]"
            >
              {unlocked
                ? 'Price with evidence, not instinct.'
                : 'Know what your food truck or trailer is worth.'}
            </motion.h1>
            <motion.p
              {...fade(0.12)}
              className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              {unlocked
                ? 'Get a market-backed pricing recommendation for a food truck or food trailer using the details that actually affect value.'
                : 'PricePilot turns market evidence and your equipment details into a defensible pricing recommendation for selling or renting.'}
            </motion.p>
            <motion.div
              {...fade(0.18)}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              {signedOut ? (
                <Button variant="cta" size="cta" className="w-full sm:w-auto" asChild>
                  <Link to={signInHref}>
                    Sign in to use PricePilot
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button variant="cta" size="cta" className="w-full sm:w-auto" onClick={onStart}>
                  {unlocked ? 'Start your appraisal' : 'Unlock PricePilot'}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Button>
              )}
              <Button variant="cta-outline" size="cta" className="w-full sm:w-auto" onClick={onSample}>
                See a sample appraisal
              </Button>
            </motion.div>
            {!unlocked && (
              <motion.p
                {...fade(0.24)}
                className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                Included with Vendibook Pro, or unlock once.
              </motion.p>
            )}
          </div>

          <HeroSampleCard reduce={!!reduce} />
        </div>
      </div>
    </section>
  );
};

function HeroSampleCard({ reduce }: { reduce: boolean }) {
  const item = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <motion.div
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 24 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] },
          })}
      className="relative"
    >
      <div className="rounded-[28px] bg-sale-card p-6 sm:p-8">
        <motion.div {...item(0.25)} className="flex items-center justify-between gap-3">
          <Pill tone="accent">Sample</Pill>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Example data
          </span>
        </motion.div>

        <motion.p {...item(0.3)} className="mt-6 text-[12px] font-medium text-muted-foreground">
          Recommended list price
        </motion.p>
        <motion.p
          {...item(0.35)}
          className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-foreground"
        >
          {fmt(SAMPLE.recommended)}
        </motion.p>
        <motion.p {...item(0.4)} className="mt-1.5 text-sm text-muted-foreground">
          {SAMPLE.unit} · {SAMPLE.location}
        </motion.p>

        <motion.div {...item(0.45)} className="mt-5">
          <RangeBar low={SAMPLE.low} high={SAMPLE.high} estimate={SAMPLE.recommended} benchmark={SAMPLE.benchmark} />
        </motion.div>

        <motion.div
          {...item(0.5)}
          className="mt-7 grid grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-3.5 ring-1 ring-border"
        >
          {[
            { label: 'Quick sale', value: SAMPLE.quickSale, strong: false },
            { label: 'Recommended', value: SAMPLE.recommended, strong: true },
            { label: 'Premium', value: SAMPLE.premium, strong: false },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.12em]', p.strong ? 'text-primary' : 'text-muted-foreground')}>
                {p.label}
              </p>
              <p className={cn('mt-1 text-sm tabular-nums', p.strong ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground')}>
                {fmt(p.value)}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div {...item(0.55)} className="mt-5 flex flex-wrap items-center gap-2">
          <Pill tone="neutral" icon={<BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden />}>
            {SAMPLE.observations} market observations
          </Pill>
          <Pill tone="neutral" icon={<BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden />}>
            Medium confidence
          </Pill>
        </motion.div>

        <motion.p {...item(0.6)} className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
          Sample only. A real appraisal is computed from observed listings for your
          equipment, condition, and location, and every figure is labeled with its
          evidence.
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ─── Value points ────────────────────────────────────────────────────────── */

const VALUE_POINTS = [
  {
    icon: LineChart,
    title: 'Price from evidence, not guesswork',
    body: 'Every estimate is computed from observed comparable listings, similarity-weighted and filtered for outliers.',
  },
  {
    icon: BarChart3,
    title: 'See the range, not just one number',
    body: 'A defensible low and high, a recommended position, and the confidence behind it. No single magic number.',
  },
  {
    icon: BadgeCheck,
    title: 'Make a stronger listing decision',
    body: 'Walk into your listing knowing where to anchor, what justifies a premium, and what a quick sale costs you.',
  },
];

export const ValuePoints: React.FC = () => (
  <section className="container max-w-6xl px-4 pb-4 sm:pb-6">
    <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
      {VALUE_POINTS.map((v, i) => (
        <Reveal key={v.title} delay={i * 0.08}>
          <SectionCard className="h-full p-6 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
              <v.icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{v.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
          </SectionCard>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ─── What PricePilot looks at ────────────────────────────────────────────── */

const LOOKS_AT: { title: string; desc: string }[] = [
  { title: 'Equipment type', desc: 'Truck, trailer, cart, or mobile bar. Each anchors a different market.' },
  { title: 'Year and dimensions', desc: 'Age and footprint calibrate which comparables actually count.' },
  { title: 'Condition', desc: 'Honest condition moves the estimate more than any other single answer.' },
  { title: 'Operational readiness', desc: 'Turnkey units and project units live in different price bands.' },
  { title: 'Installed equipment', desc: 'Hood and fire suppression, refrigeration, generators, plumbing.' },
  { title: 'Location', desc: 'Local evidence first, then regional, then national. Always disclosed.' },
  { title: 'Available market evidence', desc: 'Observed listings, weighted by similarity and filtered for outliers.' },
];

export const WhatItLooksAt: React.FC = () => (
  <section className="container max-w-6xl px-4 pt-20 md:pt-28">
    <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
      <Reveal>
        <Eyebrow>The appraisal inputs</Eyebrow>
        <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight text-foreground">
          What PricePilot looks at
        </h2>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Seven things a serious buyer would ask about, because those are the things
          that move a price.
        </p>
      </Reveal>
      <div>
        {LOOKS_AT.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.05}>
            <div className={cn('grid gap-1 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8 sm:py-5', i > 0 && 'border-t border-border')}>
              <p className="text-[15px] font-semibold text-foreground">{item.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ─── How it works ────────────────────────────────────────────────────────── */

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: '01', title: 'Tell us about the equipment', desc: 'Six quick questions: what it is, where it is, and how it has been kept.' },
  { n: '02', title: 'PricePilot examines the evidence', desc: 'Relevant comparables are scored for similarity, weighted by quality, and filtered for outliers.' },
  { n: '03', title: 'Receive your pricing range', desc: 'A recommended position inside a defensible low-to-high range, with the reasoning behind it.' },
];

export const HowItWorks: React.FC = () => (
  <section className="container max-w-6xl px-4 pt-20 md:pt-28">
    <Reveal className="max-w-xl">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight text-foreground">
        Three steps to a number you can defend
      </h2>
    </Reveal>
    <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8 md:mt-14">
      {STEPS.map((s, i) => (
        <Reveal key={s.n} delay={i * 0.12}>
          <span className="block text-5xl md:text-6xl font-bold text-primary/15 leading-none mb-3 select-none">{s.n}</span>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{s.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
        </Reveal>
      ))}
    </div>
    <Reveal delay={0.2}>
      <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground max-w-2xl">
        Estimates are decision support, not a formal appraisal. The evidence is disclosed
        with every result.
      </p>
    </Reveal>
  </section>
);

/* ─── Sample valuation experience (illustrative) ──────────────────────────── */

export const SampleValuation = React.forwardRef<HTMLElement>((_props, ref) => (
  <section ref={ref} id="sample" className="container max-w-4xl scroll-mt-24 px-4 pt-20 md:pt-28">
    <Reveal className="mx-auto max-w-xl text-center">
      <Eyebrow>A sample appraisal</Eyebrow>
      <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight text-foreground">
        What your report looks like
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Every report follows this shape: a recommended position, the range behind it,
        and the evidence it stands on.
      </p>
    </Reveal>

    <Reveal delay={0.1}>
      <div className="mt-10 rounded-[24px] bg-sale-card p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>{SAMPLE.unit} · {SAMPLE.location}</Eyebrow>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ring-1 ring-border">
            Sample · Example data
          </span>
        </div>

        {/* Recommended figure */}
        <div className="mt-8 text-center">
          <p className="text-[12px] font-medium text-muted-foreground">Recommended list price</p>
          <p className="mt-2 text-5xl font-bold tracking-tight tabular-nums text-foreground md:text-6xl">
            <CountUpMoney value={SAMPLE.recommended} />
          </p>
        </div>

        <div className="mx-auto mt-4 max-w-xl text-left">
          <RangeBar size="lg" low={SAMPLE.low} high={SAMPLE.high} estimate={SAMPLE.recommended} benchmark={SAMPLE.benchmark} />
        </div>

        {/* Positions */}
        <div className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
          {[
            { label: 'Quick sale', value: SAMPLE.quickSale, note: 'Priced to move fast' },
            { label: 'Recommended', value: SAMPLE.recommended, note: 'Balanced market position' },
            { label: 'Premium position', value: SAMPLE.premium, note: 'Test the top of the range' },
          ].map((p) => (
            <div key={p.label} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <p className={cn('text-[11px] font-semibold uppercase tracking-wider', p.label === 'Recommended' ? 'text-primary' : 'text-muted-foreground')}>
                {p.label}
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{fmt(p.value)}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{p.note}</p>
            </div>
          ))}
        </div>

        {/* Evidence facts */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-8">
          <Pill tone="neutral">{SAMPLE.observations} market observations</Pill>
          <Pill tone="neutral">{SAMPLE.closeMatches} close matches</Pill>
          <Pill tone="neutral">Texas market</Pill>
        </div>

        {/* Comparable evidence */}
        <div className="mt-8">
          <p className="text-sm font-semibold text-foreground">Market evidence</p>
          <ul className="mt-3 divide-y divide-border">
            {SAMPLE.comps.map((c) => (
              <li key={c.title} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                  <p className="text-[12px] text-muted-foreground">{c.meta}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(c.price)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reasoning */}
        <div className="mt-8 border-t border-border pt-8">
          <p className="text-sm font-semibold text-foreground">Why this range</p>
          <p className="mt-2.5 text-sm leading-relaxed text-foreground/80">{SAMPLE.reasoning}</p>
        </div>

        <p className="mt-8 border-t border-border pt-5 text-[11px] leading-relaxed text-muted-foreground">
          This is an illustrative sample. Your report is computed from real market
          evidence for your specific equipment and location.
        </p>
      </div>
    </Reveal>
  </section>
));
SampleValuation.displayName = 'SampleValuation';

/* ─── Final product connection ────────────────────────────────────────────── */

export const FinalConnections: React.FC = () => (
  <section className="container max-w-3xl px-4 pb-24 pt-20 text-center md:pt-28">
    <Reveal>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-foreground">
        Know the number. Then put it to work.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        PricePilot is part of Vendibook, the marketplace where mobile-food equipment
        actually changes hands.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px]">
        <Link to="/pricing" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary">
          Vendibook Pro <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/list" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary">
          List your equipment <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/search" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary">
          Browse the marketplace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/food-truck-prices" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary">
          Food truck prices &amp; cost data <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Reveal>
  </section>
);
