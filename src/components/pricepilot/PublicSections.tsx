import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CountUpMoney, Eyebrow, Pill, RangeBar, Reveal, fmt } from './ui';

/* ─── Hero ────────────────────────────────────────────────────────────────── */

export const Hero: React.FC<{ onStart: () => void; onSample: () => void }> = ({ onStart, onSample }) => (
  <section className="container max-w-3xl px-4 pt-14 text-center md:pt-24">
    <Reveal>
      <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-orange-700">PricePilot</p>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] text-foreground md:text-6xl">
        Price it with the market, not a hunch
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-lg">
        PricePilot weighs real comparable evidence against your equipment's condition, features, and location —
        then hands you a defensible range, a recommended position, and the moves that shift it.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto" onClick={onStart}>
          Start an appraisal <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
        <Button size="lg" variant="ghost" className="w-full text-foreground/80 hover:text-foreground sm:w-auto" onClick={onSample}>
          See a sample valuation
        </Button>
      </div>
      <p className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <BadgeCheck className="h-3.5 w-3.5 text-orange-600" />
        Included with Vendibook Pro
      </p>
    </Reveal>
  </section>
);

/* ─── Interactive valuation visual (illustrative) ─────────────────────────── */

export const ValuationVisual: React.FC = () => (
  <section className="container max-w-4xl px-4 pt-14 md:pt-20">
    <Reveal>
      <div className="bg-sale-card rounded-[28px] px-6 py-10 text-center md:px-12 md:py-14">
        <div className="flex items-center justify-center gap-2">
          <Eyebrow>Estimated market range</Eyebrow>
          <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ring-1 ring-black/10">
            Illustrative
          </span>
        </div>
        <p className="mt-6 font-display text-5xl font-semibold tabular-nums text-foreground md:text-7xl">
          <CountUpMoney value={69900} />
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Recommended position</p>
        <div className="mx-auto mt-6 max-w-2xl text-left">
          <RangeBar size="lg" low={61500} high={78000} estimate={69900} benchmark={68900} />
        </div>
        <p className="mt-8 text-[12px] leading-relaxed text-muted-foreground">
          Sample data for illustration. Your appraisal is computed from real evidence for your equipment and location.
        </p>
      </div>
    </Reveal>
  </section>
);

/* ─── What PricePilot looks at ────────────────────────────────────────────── */

const LOOKS_AT: { title: string; desc: string }[] = [
  { title: 'Equipment type', desc: 'Truck, trailer, cart, or mobile bar — each anchors a different market.' },
  { title: 'Year and dimensions', desc: 'Age and footprint calibrate which comparables actually count.' },
  { title: 'Condition', desc: 'Honest condition moves the estimate more than any other single answer.' },
  { title: 'Operational readiness', desc: 'Turnkey units and project units live in different price bands.' },
  { title: 'Installed equipment', desc: 'Hood and fire suppression, refrigeration, generators, plumbing.' },
  { title: 'Location', desc: 'Local evidence first, then regional, then national — always disclosed.' },
  { title: 'Available market evidence', desc: 'Observed listings, weighted by similarity and filtered for outliers.' },
];

export const WhatItLooksAt: React.FC = () => (
  <section className="container max-w-6xl px-4 pt-20 md:pt-28">
    <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
      <Reveal>
        <Eyebrow>The appraisal inputs</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground md:text-4xl">
          What PricePilot looks at
        </h2>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Seven things a serious buyer would ask about — because those are the things that move a price.
        </p>
      </Reveal>
      <div>
        {LOOKS_AT.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.05}>
            <div className={cn('grid gap-1 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8 sm:py-5', i > 0 && 'border-t border-black/[0.07]')}>
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
  { n: '01', title: 'Tell us about the equipment', desc: 'Six quick questions — what it is, where it is, and how it has been kept.' },
  { n: '02', title: 'PricePilot examines the evidence', desc: 'Relevant comparables are scored for similarity, weighted by quality, and filtered for outliers.' },
  { n: '03', title: 'Receive your pricing range', desc: 'A recommended position inside a defensible low-to-high range, with the reasoning behind it.' },
];

export const HowItWorks: React.FC = () => (
  <section className="container max-w-6xl px-4 pt-20 md:pt-28">
    <Reveal className="max-w-xl">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground md:text-4xl">
        Three steps to a number you can defend
      </h2>
    </Reveal>
    <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8 md:mt-14">
      {STEPS.map((s, i) => (
        <Reveal key={s.n} delay={i * 0.12}>
          <p className="font-display text-4xl font-semibold tabular-nums text-orange-600/80 md:text-5xl">{s.n}</p>
          <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ─── Sample valuation experience (illustrative) ──────────────────────────── */

const SAMPLE_COMPS = [
  { title: '2020 Freightliner MT45 food truck', meta: '16 ft · Houston, TX', price: 66500 },
  { title: '2021 Ford F59 step van kitchen', meta: '18 ft · Dallas, TX', price: 72000 },
  { title: '2019 Chevrolet P30 food truck', meta: '14 ft · San Antonio, TX', price: 59900 },
];

const SAMPLE_POSITIONS = [
  { label: 'Quick sale', value: 58900, note: 'Priced to move fast' },
  { label: 'Recommended', value: 69900, note: 'Balanced market position' },
  { label: 'Premium position', value: 76500, note: 'Test the top of the range' },
];

export const SampleValuation = React.forwardRef<HTMLElement>((_props, ref) => (
  <section ref={ref} id="sample" className="container max-w-4xl scroll-mt-24 px-4 pt-20 md:pt-28">
    <Reveal className="mx-auto max-w-xl text-center">
      <Eyebrow>A sample appraisal</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground md:text-4xl">
        What your report looks like
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Every report follows this shape — a recommended position, the range behind it, and the evidence it stands on.
      </p>
    </Reveal>

    <Reveal delay={0.1}>
      <div className="mt-10 rounded-[28px] bg-sale-card p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>2021 Food Truck · Austin, TX</Eyebrow>
          <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ring-1 ring-black/10">
            Sample · Illustrative data
          </span>
        </div>

        {/* Recommended figure */}
        <div className="mt-8 text-center">
          <p className="text-[12px] font-medium text-muted-foreground">Recommended list price</p>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-foreground md:text-6xl">
            <CountUpMoney value={69900} />
          </p>
        </div>

        <div className="mx-auto mt-4 max-w-xl text-left">
          <RangeBar size="lg" low={61500} high={78000} estimate={69900} benchmark={68900} />
        </div>

        {/* Positions */}
        <div className="mt-10 grid gap-4 border-t border-black/[0.07] pt-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-black/[0.07]">
          {SAMPLE_POSITIONS.map((p) => (
            <div key={p.label} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <p className={cn('text-[11px] font-semibold uppercase tracking-wider', p.label === 'Recommended' ? 'text-orange-700' : 'text-muted-foreground')}>
                {p.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{fmt(p.value)}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{p.note}</p>
            </div>
          ))}
        </div>

        {/* Evidence facts */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-black/[0.07] pt-8">
          <Pill tone="neutral">23 market observations</Pill>
          <Pill tone="neutral">8 close matches</Pill>
          <Pill tone="neutral">Texas market</Pill>
        </div>

        {/* Comparable evidence */}
        <div className="mt-8">
          <p className="text-sm font-semibold text-foreground">Market evidence</p>
          <ul className="mt-3 divide-y divide-black/[0.06]">
            {SAMPLE_COMPS.map((c) => (
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
        <div className="mt-8 border-t border-black/[0.07] pt-8">
          <p className="text-sm font-semibold text-foreground">Why this range</p>
          <p className="mt-2.5 text-sm leading-relaxed text-foreground/80">
            Well-kept 2021 trucks in the 16–18 ft class are trading in a tight band across Texas. Turnkey readiness and a
            documented fire-suppression system support the upper half of the range, while mileage keeps it below the premium ceiling.
          </p>
        </div>

        <p className="mt-8 border-t border-black/[0.07] pt-5 text-[11px] leading-relaxed text-muted-foreground">
          This is an illustrative sample. Your report is computed from real market evidence for your specific equipment and location.
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
      <h2 className="font-display text-3xl font-semibold leading-tight text-foreground md:text-4xl">
        Know the number. Then put it to work.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        PricePilot is part of Vendibook — the marketplace where mobile-food equipment actually changes hands.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px]">
        <Link to="/pricing" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-orange-700">
          Vendibook Pro <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/list" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-orange-700">
          List your equipment <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link to="/search" className="group inline-flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-orange-700">
          Browse the marketplace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Reveal>
  </section>
);
