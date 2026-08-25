import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import {
  AlertCircle, ArrowRight, ArrowLeft, BadgeCheck, CalendarDays, Check, ClipboardList,
  DollarSign, LineChart, MapPin, RotateCcw, ShieldCheck, Truck, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types (mirror pricepilot-appraisal response) ────────────────────────────

type MarketScope = 'local' | 'regional' | 'national' | 'modeled';
type Confidence = 'high' | 'medium' | 'directional';

interface CompRow {
  id: string; title: string; city: string | null; state: string | null;
  year: number | null; lengthFt: number | null; displayedPrice: number | null;
  previousDisplayedPrice: number | null; observedStatus: string;
  evidenceType: 'facebook_observed' | 'vendibook_asking' | 'vendibook_verified';
  similarity: number; qualityFlags: string[];
}
interface Narrative {
  headline?: string; summary?: string;
  drivers_positive?: string[]; drivers_negative?: string[];
  caveats?: string[];
}
interface PricingResponse {
  ok: true;
  mode: 'sale' | 'rental';
  // Unified pricing contract
  salePrice?: number; saleLow?: number; saleHigh?: number;
  dailyRate?: number; dailyLow?: number; dailyHigh?: number;
  weeklyRate?: number; weeklyLow?: number; weeklyHigh?: number;
  marketBenchmark: number | null;
  benchmarkLabel: string;
  marketScope: MarketScope;
  marketScopeLabel: string;
  confidence: Confidence;
  reasoning: string;
  priceDrivers: string[];
  pricingMoves: string[];
  sources: string[];
  lastUpdated: string;
  // Legacy / supporting shape
  subject: {
    assetCategory: string; categoryLabel: string;
    city: string | null; state: string | null; zip?: string | null;
    year: number | null; lengthFt: number | null;
  };
  valuation: {
    monthlyRate?: number;
    quickSalePrice?: number; premiumPositionPrice?: number;
    warnings: string[]; methodology: string[];
    comparableCount: number;
  };
  comparables: CompRow[];
  narrative: Narrative | null;
  generatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'food_truck', label: 'Food truck', desc: 'Self-propelled kitchen on a chassis' },
  { value: 'food_trailer', label: 'Food trailer', desc: 'Towed concession or kitchen trailer' },
  { value: 'food_cart', label: 'Food cart', desc: 'Compact push or tow cart' },
  { value: 'mobile_bar', label: 'Mobile bar', desc: 'Bar or beverage service unit' },
] as const;

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent', desc: 'Like new, well documented' },
  { value: 'good', label: 'Good', desc: 'Normal wear, well kept' },
  { value: 'fair', label: 'Fair', desc: 'Visible wear, some TLC' },
  { value: 'project', label: 'Project', desc: 'Needs real work' },
] as const;

const OPERATIONAL = [
  { value: 'turnkey', label: 'Turnkey — ready to operate today' },
  { value: 'running', label: 'Running, some work needed' },
  { value: 'needs_work', label: 'Needs mechanical work' },
  { value: 'not_running', label: 'Not currently running' },
] as const;

const FEATURES = [
  { key: 'hood_fire_suppression', label: 'Hood & fire suppression' },
  { key: 'generator', label: 'Onboard generator' },
  { key: 'refrigeration', label: 'Refrigeration package' },
  { key: 'plumbing', label: 'Fresh / grey water plumbing' },
  { key: 'inspection_ready', label: 'Recently inspected' },
] as const;

const STEP_LABELS = ['Equipment', 'Sale or rent', 'Location', 'Year & size', 'Condition', 'Details'];

const ANALYSIS_FACTORS = [
  { icon: Truck, label: 'Equipment profile' },
  { icon: Wrench, label: 'Condition & features' },
  { icon: MapPin, label: 'Regional evidence' },
  { icon: LineChart, label: 'Market range' },
];

const fmt = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${Math.round(n).toLocaleString('en-US')}` : '—';

// ─── Small UI atoms ──────────────────────────────────────────────────────────

const SectionCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={cn('bg-sale-card rounded-2xl p-5 md:p-7', className)}>{children}</div>
);

const Eyebrow: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</p>
);

const Pill: React.FC<React.PropsWithChildren<{ tone?: 'neutral' | 'good' | 'warn' | 'accent'; icon?: React.ReactNode }>> =
  ({ children, tone = 'neutral', icon }) => (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1',
      tone === 'good' && 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/25',
      tone === 'warn' && 'bg-amber-500/10 text-amber-700 ring-amber-600/25',
      tone === 'accent' && 'chip-accent',
      tone === 'neutral' && 'bg-black/[0.04] text-muted-foreground ring-black/10',
    )}>
      {icon}{children}
    </span>
  );

const confidenceTone = (c: Confidence): 'good' | 'accent' | 'warn' => (c === 'high' ? 'good' : c === 'medium' ? 'accent' : 'warn');
const confidenceText = (c: Confidence) => (c === 'high' ? 'High confidence' : c === 'medium' ? 'Medium confidence' : 'Directional estimate');

/** Animated low → estimate → high range bar. Understandable with no legend. */
const RangeBar: React.FC<{
  low: number; high: number; estimate: number; benchmark?: number | null;
  suffix?: string;
}> = ({ low, high, estimate, benchmark, suffix }) => {
  const reduce = useReducedMotion();
  const pad = Math.max((high - low) * 0.12, high * 0.04, 1);
  const min = Math.max(0, low - pad);
  const max = high + pad;
  const span = Math.max(1, max - min);
  const pct = (n: number) => Math.min(96, Math.max(4, ((n - min) / span) * 100));

  return (
    <div className="pt-9">
      <div className="relative h-2.5 rounded-full bg-black/[0.06]">
        {/* Market range band */}
        <motion.div
          className="absolute inset-y-0 rounded-full bg-orange-500/25"
          initial={reduce ? false : { left: `${pct(estimate)}%`, right: `${100 - pct(estimate)}%` }}
          animate={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
        {/* Benchmark tick */}
        {typeof benchmark === 'number' && benchmark > min && benchmark < max && (
          <motion.div
            className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded bg-black/40"
            style={{ left: `${pct(benchmark)}%` }}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          />
        )}
        {/* Estimate marker */}
        <motion.div
          className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-orange-500 shadow-md ring-4 ring-white"
          initial={reduce ? false : { left: `${pct(low)}%`, scale: 0.6, opacity: 0 }}
          animate={{ left: `${pct(estimate)}%`, scale: 1, opacity: 1, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.45 }}
        />
        {/* Floating estimate label */}
        <motion.div
          className="absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-[12px] font-semibold tabular-nums text-background shadow"
          initial={reduce ? false : { left: `${pct(low)}%`, opacity: 0 }}
          animate={{ left: `${pct(estimate)}%`, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.45 }}
        >
          {fmt(estimate)}{suffix ?? ''}
        </motion.div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[12px] tabular-nums text-muted-foreground">
        <span>Low · {fmt(low)}{suffix ?? ''}</span>
        {typeof benchmark === 'number' && <span className="hidden sm:inline">{fmt(benchmark)} benchmark</span>}
        <span>High · {fmt(high)}{suffix ?? ''}</span>
      </div>
    </div>
  );
};

/** Static, clearly-labeled example of what a report produces. */
const ExamplePreview: React.FC = () => (
  <SectionCard className="relative overflow-hidden">
    <span className="absolute right-4 top-4 rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ring-1 ring-black/10">
      Example
    </span>
    <Eyebrow>What you get</Eyebrow>
    <p className="mt-2 text-sm font-semibold text-foreground">2019 food trailer · Austin, TX · good condition</p>
    <div className="mt-2">
      <RangeBar low={18500} high={27400} estimate={22600} benchmark={21900} />
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Pill tone="neutral" icon={<MapPin className="h-3 w-3" />}>Regional market</Pill>
      <Pill tone="good" icon={<ShieldCheck className="h-3 w-3" />}>High confidence</Pill>
    </div>
    <p className="mt-4 border-t border-black/[0.06] pt-3 text-[11px] leading-relaxed text-muted-foreground">
      Illustrative example only. Your report is computed from real evidence for your equipment and location.
    </p>
  </SectionCard>
);

/** Staged analysis state shown while the appraisal runs. */
const AnalysisState: React.FC = () => {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduce) { setActive(ANALYSIS_FACTORS.length); return; }
    const t = setInterval(() => setActive((s) => Math.min(s + 1, ANALYSIS_FACTORS.length)), 1100);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <SectionCard className="py-12 md:py-16">
      <div className="mx-auto max-w-sm">
        <p className="text-center font-display text-xl font-semibold text-foreground">Building your pricing report</p>
        <p className="mt-1.5 text-center text-[13px] text-muted-foreground">Weighing your equipment against real market evidence.</p>

        <div className="mt-8 space-y-3">
          {ANALYSIS_FACTORS.map((f, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <motion.div
                key={f.label}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: i <= active ? 1 : 0.35, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-3"
              >
                <span className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 transition-colors',
                  done ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-600/25'
                    : current ? 'bg-orange-500/10 text-orange-600 ring-orange-600/30'
                    : 'bg-black/[0.03] text-muted-foreground ring-black/10',
                )}>
                  {done ? <Check className="h-4 w-4" /> : <f.icon className={cn('h-4 w-4', current && !reduce && 'animate-pulse')} />}
                </span>
                <span className={cn('text-sm', done || current ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {f.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Drawing range line */}
        <div className="mt-9">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-orange-500/60"
              initial={reduce ? false : { width: '6%' }}
              animate={{ width: reduce ? '100%' : ['12%', '58%', '86%', '94%'] }}
              transition={reduce ? { duration: 0 } : { duration: 6.5, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            <span>Low</span><span>Estimate</span><span>High</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PricePilot — Food Truck & Food Trailer Pricing',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Market-informed pricing guidance for food trucks, food trailers, carts, and mobile bars. Recommended ranges, benchmarks, and rental rates computed from real comparable evidence. Included with Vendibook Pro.',
  featureList: [
    'Comparable-based market range with low, recommended, and high positions',
    'Local, regional, national, and modeled market scope disclosure',
    'Daily and weekly rental rate benchmarks',
    'Confidence rating, price drivers, and actionable pricing moves',
  ],
};

export default function PricePilot() {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  // Intake state (preserved across steps and after errors)
  const [step, setStep] = useState(0);
  const [assetCategory, setAssetCategory] = useState<string>('');
  const [mode, setMode] = useState<'sale' | 'rental'>('sale');
  const [city, setCity] = useState(''); const [state, setState] = useState(''); const [zip, setZip] = useState('');
  const [year, setYear] = useState(''); const [lengthFt, setLengthFt] = useState(''); const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState(''); const [operationalStatus, setOperationalStatus] = useState('');
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');

  // Run state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastStep = STEP_LABELS.length - 1;
  const canContinue = useMemo(() => {
    switch (step) {
      case 0: return !!assetCategory;
      case 1: return !!mode;
      case 2: return state.trim().length === 2 || zip.trim().length === 5;
      case 3: return true; // year/size optional but encouraged
      case 4: return !!condition && !!operationalStatus;
      default: return true;
    }
  }, [step, assetCategory, mode, state, zip, condition, operationalStatus]);

  const goNext = () => {
    if (!canContinue) return;
    if (step < lastStep) { setStep((s) => s + 1); return; }
    void runAppraisal();
  };

  const runAppraisal = async () => {
    setLoading(true); setError(null); setResult(null);
    const { data, error: err } = await invokeEdge<PricingResponse>('pricepilot-appraisal', {
      body: {
        mode, assetCategory,
        year: year || undefined, lengthFt: lengthFt || undefined, mileage: mileage || undefined,
        city: city || undefined, state: state || undefined, zip: zip || undefined,
        condition: condition || undefined, operationalStatus: operationalStatus || undefined,
        features, notes: notes || undefined,
      },
    });
    setLoading(false);
    if (err || !data?.ok) {
      setError(err ?? 'The pricing service could not complete your appraisal. Your answers are saved — try again.');
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    setResult(data);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  const startOver = () => { setResult(null); setError(null); setStep(0); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); };
  const editAnswers = () => { setResult(null); setError(null); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); };

  const stepMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    e.preventDefault();
    goNext();
  };

  const isSale = result?.mode === 'sale';
  const primary = result ? (isSale ? result.salePrice : result.dailyRate) : undefined;
  const low = result ? (isSale ? result.saleLow : result.dailyLow) : undefined;
  const high = result ? (isSale ? result.saleHigh : result.dailyHigh) : undefined;
  const hasRange = typeof primary === 'number' && typeof low === 'number' && typeof high === 'number' && high > low;

  return (
    <>
      <SEO
        title="PricePilot | Food Truck & Food Trailer Pricing | Vendibook"
        description="Market-informed pricing guidance for food trucks, food trailers, carts, and mobile bars. Get a defensible market range, rental rate benchmarks, and practical pricing moves — included with Vendibook Pro."
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="sale-light">

            {/* ─── HERO ─── */}
            {!result && (
              <div className="container max-w-3xl px-4 pt-12 md:pt-20 text-center">
                <Pill tone="accent" icon={<BadgeCheck className="h-3 w-3" />}>Included with Vendibook Pro</Pill>
                <h1 className="mt-4 font-display text-3xl md:text-5xl leading-tight font-semibold text-foreground">
                  Price it with the market, not a hunch
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground">
                  PricePilot weighs real comparable evidence against your equipment's condition, features, and location —
                  then hands you a defensible range, a recommended position, and the moves that shift it.
                </p>
              </div>
            )}

            {/* ─── MAIN PANEL ─── */}
            <div className={cn('container px-4', result ? 'max-w-3xl pt-10 md:pt-14' : 'max-w-2xl py-8 md:py-12')}>
              <AnimatePresence mode="wait">

                {/* LOADING */}
                {loading && (
                  <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <AnalysisState />
                  </motion.div>
                )}

                {/* ERROR RECOVERY — answers preserved */}
                {!loading && error && (
                  <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <SectionCard className="py-10 text-center">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 ring-1 ring-amber-600/25">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </span>
                      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">We couldn't finish that appraisal</h2>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{error}</p>
                      <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => void runAppraisal()}>
                          <RotateCcw className="mr-1.5 h-4 w-4" /> Try again
                        </Button>
                        <Button variant="outline" onClick={editAnswers}>Review my answers</Button>
                      </div>
                      <p className="mt-4 text-[11px] text-muted-foreground">Everything you entered is still here — nothing was lost.</p>
                    </SectionCard>
                  </motion.div>
                )}

                {/* REPORT */}
                {!loading && !error && result && (
                  <motion.div key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div className="text-center">
                      <Eyebrow>Your PricePilot report</Eyebrow>
                      <h1 className="mt-2 font-display text-2xl md:text-4xl font-semibold text-foreground">
                        {result.subject.categoryLabel}
                        {result.subject.year ? ` · ${result.subject.year}` : ''}
                        {result.subject.city || result.subject.state ? ` · ${[result.subject.city, result.subject.state].filter(Boolean).join(', ')}` : ''}
                      </h1>
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Prepared {new Date(result.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Headline figure + range */}
                    <SectionCard className="text-center">
                      <Eyebrow>{isSale ? 'Recommended list price' : 'Recommended daily rate'}</Eyebrow>
                      <p className="mt-2 font-display text-5xl md:text-6xl font-semibold tabular-nums text-foreground">
                        {fmt(primary)}
                      </p>
                      {hasRange && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Likely market range {fmt(low)} – {fmt(high)}{!isSale ? ' per day' : ''}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Pill tone="neutral" icon={<MapPin className="h-3 w-3" />}>{result.marketScopeLabel}</Pill>
                        <Pill tone={confidenceTone(result.confidence)} icon={<ShieldCheck className="h-3 w-3" />}>
                          {confidenceText(result.confidence)}
                        </Pill>
                      </div>

                      {hasRange && (
                        <div className="mx-auto mt-6 max-w-xl text-left">
                          <RangeBar
                            low={low!} high={high!} estimate={primary!}
                            benchmark={result.marketBenchmark}
                            suffix={isSale ? '' : '/day'}
                          />
                          {result.marketBenchmark != null && (
                            <p className="mt-3 text-center text-[12px] text-muted-foreground">
                              {result.benchmarkLabel}: <span className="font-semibold tabular-nums text-foreground">{fmt(result.marketBenchmark)}{isSale ? '' : '/day'}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </SectionCard>

                    {/* Weekly recommendation (rental, secondary) */}
                    {!isSale && typeof result.weeklyRate === 'number' && (
                      <SectionCard>
                        <Eyebrow>Weekly benchmark</Eyebrow>
                        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                          <p className="font-display text-3xl font-semibold tabular-nums text-foreground">{fmt(result.weeklyRate)}<span className="text-base font-normal text-muted-foreground">/week</span></p>
                          {typeof result.weeklyLow === 'number' && typeof result.weeklyHigh === 'number' && result.weeklyHigh > result.weeklyLow && (
                            <p className="pb-1 text-sm text-muted-foreground">Typical range {fmt(result.weeklyLow)} – {fmt(result.weeklyHigh)}</p>
                          )}
                        </div>
                        {typeof result.valuation.monthlyRate === 'number' && (
                          <p className="mt-2 text-[12px] text-muted-foreground">Monthly benchmark: {fmt(result.valuation.monthlyRate)}</p>
                        )}
                      </SectionCard>
                    )}

                    {/* Sale strategies */}
                    {isSale && (result.valuation.quickSalePrice || result.valuation.premiumPositionPrice) && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                          { label: 'Quick sale', value: result.valuation.quickSalePrice, note: 'Priced to move fast' },
                          { label: 'Recommended', value: result.salePrice, note: 'Balanced market position' },
                          { label: 'Premium position', value: result.valuation.premiumPositionPrice, note: 'Test the top of the range' },
                        ].filter((s) => typeof s.value === 'number').map((s) => (
                          <div key={s.label} className={cn('rounded-2xl p-4 ring-1', s.label === 'Recommended' ? 'bg-orange-500/[0.07] ring-orange-600/30' : 'bg-sale-card ring-black/[0.08]')}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{fmt(s.value)}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.note}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Why this range */}
                    <SectionCard>
                      <Eyebrow>Why this range</Eyebrow>
                      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{result.reasoning}</p>
                      {result.priceDrivers.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {result.priceDrivers.map((d) => (
                            <li key={d} className="flex items-start gap-2.5 text-[13px] text-foreground/80">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{d}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!!result.narrative?.drivers_negative?.length && (
                        <div className="mt-4 rounded-xl bg-black/[0.02] p-3.5 ring-1 ring-black/10">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">Worth considering</p>
                          <ul className="space-y-1">
                            {result.narrative.drivers_negative.map((d) => (
                              <li key={d} className="text-[13px] text-foreground/75">· {d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </SectionCard>

                    {/* Pricing moves */}
                    {result.pricingMoves.length > 0 && (
                      <SectionCard>
                        <Eyebrow>What could move the price</Eyebrow>
                        <ol className="mt-3 space-y-2.5">
                          {result.pricingMoves.map((m, i) => (
                            <li key={m} className="flex items-start gap-3 text-sm text-foreground/85">
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500/10 text-[11px] font-bold text-orange-700 ring-1 ring-orange-600/25">{i + 1}</span>
                              {m}
                            </li>
                          ))}
                        </ol>
                      </SectionCard>
                    )}

                    {/* Comparable evidence — real rows only, never invented */}
                    {result.comparables.length > 0 && (
                      <SectionCard>
                        <Eyebrow>Evidence behind the estimate</Eyebrow>
                        <ul className="mt-3 divide-y divide-black/[0.06]">
                          {result.comparables.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {[c.year, c.lengthFt ? `${c.lengthFt} ft` : null, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {c.observedStatus === 'sold' && <Pill tone="good">Sold-status observed</Pill>}
                              {c.observedStatus === 'pending' && <Pill tone="warn">Pending</Pill>}
                              <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(c.displayedPrice)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                          "Sold-status observed" means a marketplace listing was marked sold — it signals market movement but is never treated as a verified closing price.
                        </p>
                      </SectionCard>
                    )}

                    {/* Sources — only when genuine */}
                    {result.sources.length > 0 && (
                      <SectionCard>
                        <Eyebrow>Sources</Eyebrow>
                        <ul className="mt-3 space-y-1.5">
                          {result.sources.map((s) => (
                            <li key={s} className="flex items-start gap-2 text-[13px] text-foreground/75">
                              <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{s}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          Evidence as of {new Date(result.lastUpdated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                        </p>
                      </SectionCard>
                    )}

                    {/* Warnings */}
                    {result.valuation.warnings.length > 0 && (
                      <div className="rounded-2xl bg-amber-500/[0.07] p-4 ring-1 ring-amber-600/20">
                        {result.valuation.warnings.map((w) => <p key={w} className="text-[12px] leading-relaxed text-amber-800">· {w}</p>)}
                      </div>
                    )}

                    {/* Methodology */}
                    <SectionCard>
                      <Accordion type="single" collapsible>
                        <AccordionItem value="method" className="border-none">
                          <AccordionTrigger className="py-0 text-sm">How this was calculated</AccordionTrigger>
                          <AccordionContent>
                            <ol className="list-decimal space-y-1.5 pl-5 pt-2 text-[13px] leading-relaxed text-foreground/75">
                              {result.valuation.methodology.map((m) => <li key={m}>{m}</li>)}
                            </ol>
                            <p className="mt-4 border-t border-black/[0.06] pt-3 text-[11px] text-muted-foreground">
                              PricePilot is a pricing aid, not a certified appraisal. Confirm local demand and condition before a major transaction.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </SectionCard>

                    {/* CTAs */}
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600" asChild>
                        <Link to="/list">List it on Vendibook <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                      </Button>
                      <Button size="lg" variant="outline" onClick={editAnswers}>Adjust my answers</Button>
                      <Button size="lg" variant="ghost" onClick={startOver}>
                        <RotateCcw className="mr-1.5 h-4 w-4" /> Start over
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* INTAKE */}
                {!loading && !error && !result && (
                  <motion.div key="intake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

                    {/* Example preview */}
                    <ExamplePreview />

                    {/* Guided panel */}
                    <SectionCard className="p-5 md:p-8">
                      <div ref={panelRef} onKeyDown={onPanelKeyDown}>
                        {/* Progress */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span>{STEP_LABELS[step]}</span>
                            <span className="tabular-nums">Step {step + 1} of {STEP_LABELS.length}</span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06]">
                            <motion.div
                              className="h-full rounded-full bg-orange-500"
                              initial={false}
                              animate={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
                              transition={reduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        <AnimatePresence mode="wait">
                          {/* 1 — What are you pricing */}
                          {step === 0 && (
                            <motion.div key="s0" {...stepMotion} transition={{ duration: 0.25 }}>
                              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">What are you pricing?</h2>
                              <p className="mt-1 text-sm text-muted-foreground">Choose the closest match — it anchors the market evidence.</p>
                              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {CATEGORIES.map((c) => (
                                  <button key={c.value} type="button" onClick={() => setAssetCategory(c.value)}
                                    aria-pressed={assetCategory === c.value}
                                    className={cn('flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                                      assetCategory === c.value ? 'bg-orange-500/[0.07] ring-orange-600/40' : 'bg-black/[0.02] ring-black/10 hover:ring-black/20')}>
                                    <Truck className={cn('mt-0.5 h-4 w-4 shrink-0', assetCategory === c.value ? 'text-orange-600' : 'text-muted-foreground')} />
                                    <span>
                                      <span className="block text-sm font-semibold text-foreground">{c.label}</span>
                                      <span className="block text-[11px] text-muted-foreground">{c.desc}</span>
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* 2 — Sale or rent */}
                          {step === 1 && (
                            <motion.div key="s1" {...stepMotion} transition={{ duration: 0.25 }}>
                              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">Selling it, or renting it out?</h2>
                              <p className="mt-1 text-sm text-muted-foreground">Sale pricing and rental rates come from different evidence.</p>
                              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {([
                                  { value: 'sale', icon: DollarSign, label: 'For sale', desc: 'Market value, range & list strategies' },
                                  { value: 'rental', icon: CalendarDays, label: 'For rent', desc: 'Daily & weekly rate benchmarks' },
                                ] as const).map((m) => (
                                  <button key={m.value} type="button" onClick={() => setMode(m.value)}
                                    aria-pressed={mode === m.value}
                                    className={cn('rounded-xl p-5 text-left ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                                      mode === m.value ? 'bg-orange-500/[0.07] ring-orange-600/40' : 'bg-black/[0.02] ring-black/10 hover:ring-black/20')}>
                                    <m.icon className={cn('h-5 w-5', mode === m.value ? 'text-orange-600' : 'text-muted-foreground')} />
                                    <p className="mt-2.5 text-sm font-semibold text-foreground">{m.label}</p>
                                    <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* 3 — Location */}
                          {step === 2 && (
                            <motion.div key="s2" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-4">
                              <div>
                                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">Where is it?</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Prices move by market. A state or ZIP anchors your report locally first.</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 sm:col-span-1">
                                  <Label htmlFor="pp-city">City</Label>
                                  <Input id="pp-city" placeholder="Austin" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 text-base" />
                                </div>
                                <div>
                                  <Label htmlFor="pp-state">State</Label>
                                  <div className="relative mt-1">
                                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input id="pp-state" placeholder="TX" maxLength={2} value={state}
                                      onChange={(e) => setState(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                      className="pl-9 text-base uppercase" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <span className="h-px flex-1 bg-black/[0.08]" />or<span className="h-px flex-1 bg-black/[0.08]" />
                              </div>
                              <div>
                                <Label htmlFor="pp-zip">ZIP code</Label>
                                <Input id="pp-zip" inputMode="numeric" placeholder="78704" maxLength={5} value={zip}
                                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} className="mt-1 text-base" />
                              </div>
                              {!canContinue && <p className="text-[12px] text-amber-700">Enter a two-letter state or a ZIP code to continue.</p>}
                            </motion.div>
                          )}

                          {/* 4 — Year & size */}
                          {step === 3 && (
                            <motion.div key="s3" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-4">
                              <div>
                                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">Year and approximate size</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Both optional — but each one tightens your range.</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="pp-year">Year</Label>
                                  <Input id="pp-year" inputMode="numeric" placeholder="2019" value={year}
                                    onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 text-base" />
                                </div>
                                <div>
                                  <Label htmlFor="pp-len">Length (ft)</Label>
                                  <Input id="pp-len" inputMode="decimal" placeholder="18" value={lengthFt}
                                    onChange={(e) => setLengthFt(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} className="mt-1 text-base" />
                                </div>
                              </div>
                              {mode === 'sale' && assetCategory === 'food_truck' && (
                                <div>
                                  <Label htmlFor="pp-miles">Mileage</Label>
                                  <Input id="pp-miles" inputMode="numeric" placeholder="85,000" value={mileage}
                                    onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))} className="mt-1 text-base" />
                                </div>
                              )}
                            </motion.div>
                          )}

                          {/* 5 — Condition */}
                          {step === 4 && (
                            <motion.div key="s4" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-5">
                              <div>
                                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">How's it holding up?</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Honest answers price better than optimistic ones.</p>
                              </div>
                              <div>
                                <Label>Overall condition</Label>
                                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  {CONDITIONS.map((c) => (
                                    <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                                      aria-pressed={condition === c.value}
                                      className={cn('rounded-xl px-3 py-3 text-left ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                                        condition === c.value ? 'bg-orange-500/[0.08] ring-orange-600/40' : 'bg-black/[0.02] ring-black/10 hover:ring-black/20')}>
                                      <span className={cn('block text-sm font-semibold', condition === c.value ? 'text-orange-700' : 'text-foreground')}>{c.label}</span>
                                      <span className="block text-[10px] text-muted-foreground">{c.desc}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label>Operational status</Label>
                                <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                  {OPERATIONAL.map((o) => (
                                    <button key={o.value} type="button" onClick={() => setOperationalStatus(o.value)}
                                      aria-pressed={operationalStatus === o.value}
                                      className={cn('rounded-xl px-3 py-2.5 text-left text-xs font-semibold ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                                        operationalStatus === o.value ? 'bg-orange-500/[0.08] text-orange-700 ring-orange-600/40' : 'bg-black/[0.02] text-muted-foreground ring-black/10 hover:ring-black/20')}>
                                      {o.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* 6 — Features + optional detail */}
                          {step === 5 && (
                            <motion.div key="s5" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-5">
                              <div>
                                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">Equipment & anything else</h2>
                                <p className="mt-1 text-sm text-muted-foreground">Tap what's on board. Everything here is optional.</p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {FEATURES.map((f) => (
                                  <button key={f.key} type="button"
                                    onClick={() => setFeatures((p) => ({ ...p, [f.key]: !p[f.key] }))}
                                    aria-pressed={!!features[f.key]}
                                    className={cn('rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                                      features[f.key] ? 'bg-orange-500/[0.08] text-orange-700 ring-orange-600/40' : 'bg-black/[0.02] text-muted-foreground ring-black/10 hover:ring-black/20')}>
                                    {features[f.key] && <Check className="mr-1 inline h-3 w-3" />}{f.label}
                                  </button>
                                ))}
                              </div>
                              <div>
                                <Label htmlFor="pp-notes">Anything worth noting <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                <Textarea id="pp-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                                  placeholder="New tires, rebuilt engine, fresh wrap, a known issue a buyer would find on inspection…"
                                  className="mt-1 text-base" />
                                <p className="mt-1 text-[11px] text-muted-foreground">One line is plenty. Skip it if nothing comes to mind.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Nav */}
                        <div className="mt-7 flex items-center justify-between border-t border-black/[0.06] pt-5">
                          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                          </Button>
                          {step < lastStep ? (
                            <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={goNext} disabled={!canContinue}>
                              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600" onClick={goNext} disabled={!canContinue}>
                              Get my pricing <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </SectionCard>

                    {/* How it works — compact */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { icon: Truck, t: 'Describe it', d: 'Six quick questions about your equipment, condition, and location.' },
                        { icon: LineChart, t: 'We weigh evidence', d: 'Comparable market evidence is scored, weighted, and filtered for outliers.' },
                        { icon: BadgeCheck, t: 'Get a defensible range', d: 'Low, recommended, and high positions with the reasoning behind them.' },
                      ].map((c) => (
                        <div key={c.t} className="rounded-xl bg-black/[0.02] p-4 ring-1 ring-black/[0.08]">
                          <c.icon className="h-4 w-4 text-orange-600" />
                          <p className="mt-2 text-sm font-semibold text-foreground">{c.t}</p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{c.d}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── FAQ ─── */}
            <section className="container max-w-2xl px-4 pb-14">
              <h2 className="mb-4 text-center font-display text-2xl font-semibold text-foreground">Questions, answered</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1">
                  <AccordionTrigger>How does PricePilot set the range?</AccordionTrigger>
                  <AccordionContent>It scores real comparable evidence for similarity to your equipment, weights it by evidence quality, filters statistical outliers, and computes a weighted market range. Documented adjustments for condition, operational status, and equipment package refine the result. AI writes the interpretation — it never invents the numbers.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>What does PricePilot cost?</AccordionTrigger>
                  <AccordionContent>PricePilot is a premium tool, included with Vendibook Pro memberships and the lifetime tools unlock. There is no per-report fee once you have access.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>What if there isn't much data near me?</AccordionTrigger>
                  <AccordionContent>Your report says so. PricePilot starts with your local market, broadens to your region, then to the broader U.S. market, and falls back to a clearly-labeled modeled estimate only when real evidence is sparse. The scope and confidence are always shown on the report.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4">
                  <AccordionTrigger>Can it estimate rental rates?</AccordionTrigger>
                  <AccordionContent>Yes. Rental mode benchmarks daily and weekly rates from published rental asking rates. Equipment sale prices are never used to estimate rental rates.</AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Quiet sibling links */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]">
                <Link to="/tools/permitpath" className="font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-orange-600 hover:underline">
                  Map your permits with PermitPath
                </Link>
                <Link to="/tools/startup-guide" className="font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-orange-600 hover:underline">
                  Read the free Startup Guide
                </Link>
              </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            {!result && (
              <section className="container max-w-2xl px-4 pb-20 text-center">
                <h2 className="font-display text-2xl font-semibold text-foreground">Know the number before you list</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Six questions. One defensible range. Then list it where buyers already are.
                </p>
                <Button size="lg" className="mt-5 bg-orange-500 text-white hover:bg-orange-600"
                  onClick={() => panelRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })}>
                  Start my appraisal <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </section>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
