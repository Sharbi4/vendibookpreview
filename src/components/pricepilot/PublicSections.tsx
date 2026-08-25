import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  LineChart,
  MapPin,
  ShieldCheck,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Chip, CountUpMoney, RangeBar, SectionCard } from './ui';
import { CATEGORY_LABELS, SAMPLE_DATA, type AppraisalResult } from './types';

/** Shared illustrative figures so the hero card and the full sample stay in sync. */
const SAMPLE_HERO = {
  recommended: 69900,
  low: 61500,
  high: 78000,
  quickSale: 65200,
  premium: 74900,
  unit: '2019 18 ft step van food truck',
  location: 'Dallas, TX',
  observations: 23,
  confidence: 'Medium',
  evidenceNote:
    'Illustrative only. A real appraisal is computed from observed listings for your equipment, condition, and location.',
};

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function Hero({
  signedOut,
  unlocked,
  onStart,
  onSample,
  signInHref,
}: {
  signedOut: boolean;
  unlocked: boolean;
  onStart: () => void;
  onSample: () => void;
  signInHref: string;
}) {
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
              <Chip>PricePilot</Chip>
            </motion.div>
            <motion.h1
              {...fade(0.06)}
              className="mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-foreground leading-[1.06]"
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
                <Button
                  asChild
                  variant="cta"
                  size="lg"
                  className="rounded-full px-8 w-full sm:w-auto"
                >
                  <Link to={signInHref}>
                    Sign in to use PricePilot
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="cta"
                  size="lg"
                  onClick={onStart}
                  className="rounded-full px-8 w-full sm:w-auto"
                >
                  {unlocked ? 'Start your appraisal' : 'Unlock PricePilot'}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              )}
              <Button
                variant="ghost"
                size="lg"
                onClick={onSample}
                className="rounded-full px-6 w-full sm:w-auto"
              >
                See a sample appraisal
              </Button>
            </motion.div>
            {!unlocked && (
              <motion.p
                {...fade(0.24)}
                className="mt-4 text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-1.5"
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
}

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
      <div className="rounded-[28px] bg-card border border-border shadow-[0_2px_4px_rgba(24,20,16,0.05),0_24px_48px_-24px_rgba(24,20,16,0.25)] p-6 sm:p-8">
        <motion.div {...item(0.25)} className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Sample
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Example data
          </span>
        </motion.div>

        <motion.p
          {...item(0.3)}
          className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground"
        >
          Recommended list price
        </motion.p>
        <motion.p
          {...item(0.35)}
          className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
        >
          $69,900
        </motion.p>
        <motion.p {...item(0.4)} className="mt-1.5 text-sm text-muted-foreground">
          {SAMPLE_HERO.unit} · {SAMPLE_HERO.location}
        </motion.p>

        <motion.div {...item(0.45)} className="mt-6">
          <RangeBar low={SAMPLE_HERO.low} mid={SAMPLE_HERO.recommended} high={SAMPLE_HERO.high} />
        </motion.div>

        <motion.div
          {...item(0.5)}
          className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-3"
        >
          {[
            { label: 'Quick sale', value: SAMPLE_HERO.quickSale },
            { label: 'Recommended', value: SAMPLE_HERO.recommended, strong: true },
            { label: 'Premium', value: SAMPLE_HERO.premium },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {p.label}
              </p>
              <p
                className={
                  p.strong
                    ? 'mt-0.5 text-sm font-bold text-foreground'
                    : 'mt-0.5 text-sm font-semibold text-muted-foreground'
                }
              >
                ${p.value.toLocaleString()}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div {...item(0.55)} className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary" aria-hidden />
            {SAMPLE_HERO.observations} market observations
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            {SAMPLE_HERO.confidence} confidence
          </span>
        </motion.div>

        <motion.p
          {...item(0.6)}
          className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground"
        >
          {SAMPLE_HERO.evidenceNote}
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Value points                                                        */
/* ------------------------------------------------------------------ */

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

export function ValuePoints() {
  const reduce = useReducedMotion();
  return (
    <section className="container max-w-6xl px-4 pb-16 sm:pb-20">
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        {VALUE_POINTS.map((v, i) => (
          <motion.div
            key={v.title}
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, y: 16 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: '-60px' },
                  transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
                })}
          >
            <SectionCard className="h-full p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <v.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                {v.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </SectionCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* What it looks at                                                    */
/* ------------------------------------------------------------------ */

const INPUTS: Array<{ title: string; body: string }> = [
  {
    title: 'Equipment type',
    body: 'Truck, trailer, cart, or mobile bar. Each anchors a different market.',
  },
  {
    title: 'Year and dimensions',
    body: 'Age and footprint calibrate which comparables actually count.',
  },
  {
    title: 'Condition',
    body: 'Honest condition moves the estimate more than any other single answer.',
  },
  {
    title: 'Operational readiness',
    body: 'Turnkey units and project units live in different price bands.',
  },
  {
    title: 'Installed equipment',
    body: 'Hood and fire suppression, refrigeration, generators, plumbing.',
  },
  {
    title: 'Location',
    body: 'Local evidence first, then regional, then national. Always disclosed.',
  },
  {
    title: 'Available market evidence',
    body: 'Observed listings, weighted by similarity and filtered for outliers.',
  },
];

export function WhatItLooksAt() {
  return (
    <section className="container max-w-6xl px-4 py-14 sm:py-16">
      <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-10">
        <div>
          <Chip>The appraisal inputs</Chip>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            What PricePilot looks at
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Seven things a serious buyer would ask about, because those are the things
            that move a price.
          </p>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          {INPUTS.map((i) => (
            <div key={i.title} className="border-t border-border pt-4">
              <dt className="font-semibold text-foreground">{i.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{i.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sample valuation                                                    */
/* ------------------------------------------------------------------ */

export function SampleValuation() {
  const sample = SAMPLE_DATA as AppraisalResult;
  const positionPct =
    ((sample.recommended - sample.low) / (sample.high - sample.low)) * 100;

  return (
    <section className="container max-w-6xl px-4 py-14 sm:py-16">
      <div className="max-w-3xl">
        <Chip>The report</Chip>
        <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          What a PricePilot appraisal looks like
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          The estimate never travels alone. It arrives with its evidence, its reasoning,
          and the moves that would shift it.
        </p>
      </div>

      <SectionCard className="mt-8 p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden /> Dallas, TX
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Illustrative sample
          </span>
        </div>

        <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Recommended list price
            </p>
            <p className="mt-2 text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
              <CountUpMoney value={sample.recommended} />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {sample.confidence} confidence, based on {sample.evidence.observations}{' '}
              market observations
            </p>

            <div className="mt-6">
              <RangeBar low={sample.low} mid={sample.recommended} high={sample.high} />
              <p className="mt-2 text-sm text-muted-foreground">
                Estimated market range: ${sample.low.toLocaleString()} to $
                {sample.high.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: TrendingDown,
                label: 'Quick sale',
                value: sample.quickSale,
                note: 'Priced to move fast',
              },
              {
                icon: Tag,
                label: 'Recommended',
                value: sample.recommended,
                note: 'Balanced market position',
              },
              {
                icon: TrendingUp,
                label: 'Premium',
                value: sample.premium,
                note: 'If condition and docs support it',
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <row.icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.note}</p>
                </div>
                <p className="font-bold text-foreground">${row.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground">
            Why it lands there (sample reasoning)
          </h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {sample.reasoning}
          </p>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {sample.features.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground/80">
            Every number above is illustrative sample data, shown so you can judge the
            format before you run your own appraisal.
          </p>
        </div>
      </SectionCard>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

export function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Answer seven questions',
      body: 'Type, year, size, condition, readiness, equipment, and location. A couple of minutes, no spreadsheets.',
    },
    {
      n: '2',
      title: 'The engine weighs the evidence',
      body: 'Observed comparable listings are filtered, weighted by similarity, and adjusted for condition and equipment.',
    },
    {
      n: '3',
      title: 'Read the report and decide',
      body: 'Recommended position, quick-sale and premium anchors, a range, and the reasoning. Yours to use.',
    },
  ];
  return (
    <section className="container max-w-6xl px-4 py-14 sm:py-20">
      <div className="max-w-3xl">
        <Chip>How it works</Chip>
        <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          From answers to estimate
        </h2>
      </div>
      <ol className="mt-8 grid md:grid-cols-3 gap-6">
        {steps.map((s) => (
          <li key={s.n}>
            <SectionCard className="h-full p-6">
              <span className="text-sm font-bold text-primary">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </SectionCard>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-muted-foreground max-w-2xl">
        Estimates are decision support, not a formal appraisal. The evidence is disclosed
        with every result.
      </p>
    </section>
  );
}
