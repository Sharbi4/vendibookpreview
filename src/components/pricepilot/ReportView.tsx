import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, MapPin, RotateCcw, ShieldCheck } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CountUpMoney, Eyebrow, Pill, RangeBar, Reveal,
  confidenceText, confidenceTone, fmt,
} from './ui';
import type { PricingResponse } from '@/pages/tools/PricePilot';

/**
 * The finished PricePilot report — an editorial pricing document,
 * not a stack of dashboard cards. Valuation math untouched; presentation only.
 */
export const ReportView: React.FC<{
  result: PricingResponse;
  onAdjust: () => void;
  onStartOver: () => void;
}> = ({ result, onAdjust, onStartOver }) => {
  const isSale = result.mode === 'sale';
  const primary = isSale ? result.salePrice : result.dailyRate;
  const low = isSale ? result.saleLow : result.dailyLow;
  const high = isSale ? result.saleHigh : result.dailyHigh;
  const hasRange = typeof primary === 'number' && typeof low === 'number' && typeof high === 'number' && high > low;

  return (
    <div className="container max-w-3xl px-4 pb-24 pt-14 md:pt-20">
      {/* Report masthead */}
      <Reveal className="text-center">
        <Eyebrow>Your PricePilot report</Eyebrow>
        <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight leading-tight text-foreground">
          {result.subject.categoryLabel}
          {result.subject.year ? ` · ${result.subject.year}` : ''}
          {result.subject.city || result.subject.state
            ? ` · ${[result.subject.city, result.subject.state].filter(Boolean).join(', ')}`
            : ''}
        </h1>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Prepared {new Date(result.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </Reveal>

      {/* Opening valuation composition */}
      <Reveal delay={0.08}>
        <div className="mt-10 rounded-[24px] bg-sale-card px-6 py-10 text-center md:px-12 md:py-14">
          <Eyebrow>{isSale ? 'Recommended list price' : 'Recommended daily rate'}</Eyebrow>
          {typeof primary === 'number' && (
            <p className="mt-4 text-6xl md:text-7xl font-bold tracking-tight tabular-nums text-foreground">
              <CountUpMoney value={primary} suffix={isSale ? '' : '/day'} />
            </p>
          )}
          {hasRange && (
            <p className="mt-3 text-[15px] text-muted-foreground">
              Likely market range {fmt(low)} – {fmt(high)}{!isSale ? ' per day' : ''}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Pill tone="neutral" icon={<MapPin className="h-3 w-3" />}>{result.marketScopeLabel}</Pill>
            <Pill tone={confidenceTone(result.confidence)} icon={<ShieldCheck className="h-3 w-3" />}>
              {confidenceText(result.confidence)}
            </Pill>
          </div>

          {hasRange && (
            <div className="mx-auto mt-8 max-w-xl text-left">
              <RangeBar
                size="lg"
                low={low!} high={high!} estimate={primary!}
                benchmark={result.marketBenchmark}
                suffix={isSale ? '' : '/day'}
              />
              {result.marketBenchmark != null && (
                <p className="mt-4 text-center text-[13px] text-muted-foreground">
                  {result.benchmarkLabel}:{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {fmt(result.marketBenchmark)}{isSale ? '' : '/day'}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </Reveal>

      {/* Weekly benchmark (rental, secondary) */}
      {!isSale && typeof result.weeklyRate === 'number' && (
        <Reveal>
          <div className="mt-12 border-t border-border pt-10">
            <Eyebrow>Weekly benchmark</Eyebrow>
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
              <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {fmt(result.weeklyRate)}<span className="text-lg font-normal text-muted-foreground">/week</span>
              </p>
              {typeof result.weeklyLow === 'number' && typeof result.weeklyHigh === 'number' && result.weeklyHigh > result.weeklyLow && (
                <p className="pb-1 text-sm text-muted-foreground">
                  Typical range {fmt(result.weeklyLow)} – {fmt(result.weeklyHigh)}
                </p>
              )}
            </div>
            {typeof result.valuation.monthlyRate === 'number' && (
              <p className="mt-2 text-[13px] text-muted-foreground">Monthly benchmark: {fmt(result.valuation.monthlyRate)}</p>
            )}
          </div>
        </Reveal>
      )}

      {/* Sale strategies */}
      {isSale && (result.valuation.quickSalePrice || result.valuation.premiumPositionPrice) && (
        <Reveal>
          <div className="mt-12 border-t border-border pt-10">
            <Eyebrow>Three ways to position it</Eyebrow>
            <div className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
              {[
                { label: 'Quick sale', value: result.valuation.quickSalePrice, note: 'Priced to move fast' },
                { label: 'Recommended', value: result.salePrice, note: 'Balanced market position' },
                { label: 'Premium position', value: result.valuation.premiumPositionPrice, note: 'Test the top of the range' },
              ].filter((s) => typeof s.value === 'number').map((s) => (
                <div key={s.label} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
                  <p className={cn('text-[11px] font-semibold uppercase tracking-wider', s.label === 'Recommended' ? 'text-primary' : 'text-muted-foreground')}>
                    {s.label}
                  </p>
                  <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight tabular-nums text-foreground">{fmt(s.value)}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* Why this range */}
      <Reveal>
        <div className="mt-12 border-t border-border pt-10">
          <Eyebrow>Why this range</Eyebrow>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/85">{result.reasoning}</p>
          {result.priceDrivers.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {result.priceDrivers.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{d}
                </li>
              ))}
            </ul>
          )}
          {!!result.narrative?.drivers_negative?.length && (
            <div className="mt-6 rounded-2xl bg-muted p-4 ring-1 ring-border">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">Worth considering</p>
              <ul className="space-y-1">
                {result.narrative.drivers_negative.map((d) => (
                  <li key={d} className="text-[13px] text-foreground/75">· {d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Reveal>

      {/* Pricing moves */}
      {result.pricingMoves.length > 0 && (
        <Reveal>
          <div className="mt-12 border-t border-border pt-10">
            <Eyebrow>What could move the price</Eyebrow>
            <ol className="mt-5 space-y-3">
              {result.pricingMoves.map((m, i) => (
                <li key={m} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/25">
                    {i + 1}
                  </span>
                  {m}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      )}

      {/* Comparable evidence — real rows only, never invented */}
      {result.comparables.length > 0 && (
        <Reveal>
          <div className="mt-12 border-t border-border pt-10">
            <Eyebrow>Evidence behind the estimate</Eyebrow>
            <ul className="mt-4 divide-y divide-border">
              {result.comparables.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {[c.year, c.lengthFt ? `${c.lengthFt} ft` : null, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {c.observedStatus === 'sold' && <Pill tone="good">Sold-status observed</Pill>}
                  {c.observedStatus === 'pending' && <Pill tone="warn">Pending</Pill>}
                  <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(c.displayedPrice)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              "Sold-status observed" means a marketplace listing was marked sold — it signals market movement but is never treated as a verified closing price.
            </p>
          </div>
        </Reveal>
      )}

      {/* Sources — only when genuine */}
      {result.sources.length > 0 && (
        <Reveal>
          <div className="mt-12 border-t border-border pt-10">
            <Eyebrow>Sources</Eyebrow>
            <ul className="mt-4 space-y-2">
              {result.sources.map((s) => (
                <li key={s} className="flex items-start gap-2 text-[13px] text-foreground/75">
                  <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Evidence as of {new Date(result.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>
          </div>
        </Reveal>
      )}

      {/* Warnings */}
      {result.valuation.warnings.length > 0 && (
        <Reveal>
          <div className="mt-12 rounded-2xl bg-amber-500/[0.07] p-5 ring-1 ring-amber-600/20">
            {result.valuation.warnings.map((w) => (
              <p key={w} className="text-[12px] leading-relaxed text-amber-800">· {w}</p>
            ))}
          </div>
        </Reveal>
      )}

      {/* Methodology */}
      <Reveal>
        <div className="mt-12 border-t border-border pt-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="method" className="border-none">
              <AccordionTrigger className="py-3 text-sm">How this was calculated</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-1.5 pl-5 pt-2 text-[13px] leading-relaxed text-foreground/75">
                  {result.valuation.methodology.map((m) => <li key={m}>{m}</li>)}
                </ol>
                <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  PricePilot is a pricing aid, not a certified appraisal. Confirm local demand and condition before a major transaction.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Reveal>

      {/* CTAs */}
      <Reveal>
        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="cta" size="cta" className="w-full sm:w-auto" asChild>
            <Link to="/list">List it on Vendibook <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
          <Button variant="cta-outline" size="cta" className="w-full sm:w-auto" onClick={onAdjust}>Adjust my answers</Button>
          <Button variant="ghost" size="cta" className="w-full sm:w-auto" onClick={onStartOver}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Start over
          </Button>
        </div>
      </Reveal>
    </div>
  );
};
