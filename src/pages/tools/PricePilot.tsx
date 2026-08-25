import { useEffect, useRef, useState } from 'react';
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
  AlertCircle, ArrowRight, ArrowLeft, BadgeCheck, CalendarDays, Check,
  DollarSign, LineChart, Loader2, MapPin, RotateCcw, Truck, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToolAccess } from '@/hooks/useToolAccess';
import { trackLeadEvent } from '@/lib/leadTracking';
import { SectionCard } from '@/components/pricepilot/ui';
import { Hero, ValuationVisual, WhatItLooksAt, HowItWorks, SampleValuation, FinalConnections } from '@/components/pricepilot/PublicSections';
import { ReportView } from '@/components/pricepilot/ReportView';

// ─── Types (mirror pricepilot-appraisal response) ────────────────────────────

export type MarketScope = 'local' | 'regional' | 'national' | 'modeled';
export type Confidence = 'high' | 'medium' | 'directional';

export interface CompRow {
  id: string; title: string; city: string | null; state: string | null;
  year: number | null; lengthFt: number | null; displayedPrice: number | null;
  previousDisplayedPrice: number | null; observedStatus: string;
  evidenceType: 'facebook_observed' | 'vendibook_asking' | 'vendibook_verified';
  similarity: number; qualityFlags: string[];
}
interface Narrative {
  headline?: string; summary?: string;
  drivers_positive?: string[]; drivers_negative?: string[];
  what_could_change?: string[];
  caveats?: string[];
}
export interface PricingResponse {
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

/** Understated required-field marker, paired with the "* Required" legend. */
const Req: React.FC = () => (
  <span className="ml-0.5 align-super text-[0.72em] font-semibold text-primary" aria-hidden="true">*</span>
);

/** Inline field-level validation message. */
const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{message}
    </p>
  ) : null;

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
    <SectionCard className="rounded-[24px] py-12 md:py-16">
      <div className="mx-auto max-w-sm">
        <p className="text-center text-xl font-bold tracking-tight text-foreground">Building your pricing report</p>
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
                    : current ? 'bg-primary/10 text-primary ring-primary/30'
                    : 'bg-muted text-muted-foreground ring-border',
                )}>
                  {done ? <Check className="h-4 w-4" /> : <f.icon className="h-4 w-4" />}
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
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
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
  const sampleRef = useRef<HTMLElement>(null);

  const { user, isLoading: authLoading } = useAuth();
  const { bySlug, isLoading: accessLoading } = useToolAccess();
  const access = bySlug['pricepilot'];
  const unlocked = !!access?.unlocked;

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

  // Validation state — inline per-field messages plus one summary banner
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSummary, setFormSummary] = useState<string | null>(null);

  // Preview analytics (replaces the old route-level gate tracking)
  useEffect(() => {
    if (!authLoading && !accessLoading && !unlocked) {
      trackLeadEvent('tool_preview_viewed', { tool_slug: 'pricepilot', surface: 'public_page' });
    }
  }, [authLoading, accessLoading, unlocked]);

  const lastStep = STEP_LABELS.length - 1;
  const currentYear = new Date().getFullYear();

  const yearValid = (v: string) => {
    const n = Number(v);
    return /^\d{4}$/.test(v.trim()) && n >= 1950 && n <= currentYear + 2;
  };

  /**
   * Required fields per step — only what a defensible appraisal genuinely
   * needs: equipment identity, market location, age, and honest condition.
   * Size, mileage, features and notes stay optional on purpose.
   */
  const validateStep = (s: number): { errors: Record<string, string>; missing: string[] } => {
    const errs: Record<string, string> = {};
    const missing: string[] = [];
    if (s === 0 && !assetCategory) {
      errs.assetCategory = 'Choose the equipment type closest to yours.';
      missing.push('equipment type');
    }
    if (s === 2 && !(state.trim().length === 2 || zip.trim().length === 5)) {
      errs.location = 'Enter a two-letter state or a 5-digit ZIP code.';
      missing.push('location');
    }
    if (s === 3 && !yearValid(year)) {
      errs.year = `Enter the 4-digit year (1950–${currentYear + 2}). Age is core to a defensible value.`;
      missing.push('year');
    }
    if (s === 4) {
      if (!condition) { errs.condition = 'Select the overall condition.'; missing.push('condition'); }
      if (!operationalStatus) { errs.operationalStatus = 'Select the operational status.'; missing.push('operational status'); }
    }
    return { errors: errs, missing };
  };

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      if (!Object.keys(next).length) setFormSummary(null);
      return next;
    });

  // Where focus lands when a field fails validation (inputs, or the group
  // wrapper for choice grids).
  const FOCUS_TARGET: Record<string, string> = {
    assetCategory: '[data-pp-field="assetCategory"]',
    location: '#pp-state',
    year: '#pp-year',
    condition: '[data-pp-field="condition"]',
    operationalStatus: '[data-pp-field="operationalStatus"]',
  };

  const failValidation = (v: { errors: Record<string, string>; missing: string[] }) => {
    setErrors(v.errors);
    setFormSummary(
      v.missing.length > 1
        ? `Complete the required fields to continue: ${v.missing.join(', ')}.`
        : `Add the ${v.missing[0]} to continue.`,
    );
    const firstKey = Object.keys(FOCUS_TARGET).find((k) => v.errors[k]);
    requestAnimationFrame(() => {
      const el = firstKey ? document.querySelector<HTMLElement>(FOCUS_TARGET[firstKey]) : null;
      el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    });
  };

  const goNext = () => {
    const v = validateStep(step);
    if (Object.keys(v.errors).length) { failValidation(v); return; }
    setErrors({});
    setFormSummary(null);
    if (step < lastStep) { setStep((s) => s + 1); return; }
    // Final submit: re-verify every earlier step before spending an appraisal.
    for (let s = 0; s < lastStep; s++) {
      const earlier = validateStep(s);
      if (Object.keys(earlier.errors).length) {
        setStep(s);
        // Wait for the step transition before focusing.
        setTimeout(() => failValidation(earlier), 350);
        return;
      }
    }
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
      scrollToStart();
      return;
    }
    setResult(data);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  const startOver = () => { setResult(null); setError(null); setStep(0); scrollToStart(); };
  const editAnswers = () => { setResult(null); setError(null); scrollToStart(); };

  const scrollToStart = () =>
    panelRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const scrollToSample = () =>
    sampleRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

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

  const signInHref = `/auth?returnTo=${encodeURIComponent('/tools/pricepilot')}`;

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
            {result ? (
              /* ─── RESULT EXPERIENCE ─── */
              <ReportView result={result} onAdjust={editAnswers} onStartOver={startOver} />
            ) : (
              /* ─── PUBLIC PRODUCT EXPERIENCE ─── */
              <>
                <Hero onStart={scrollToStart} onSample={scrollToSample} />
                <ValuationVisual />
                <WhatItLooksAt />
                <HowItWorks />
                <SampleValuation ref={sampleRef} />

                {/* ─── APPRAISAL ENTRY POINT — the only access wall ─── */}
                <section id="start" className="container max-w-3xl scroll-mt-24 px-4 pt-20 md:pt-28">
                  <div className="mx-auto max-w-xl text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your turn</p>
                    <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight leading-tight text-foreground">
                      Start your PricePilot appraisal
                    </h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                      Six questions. One defensible range.
                    </p>
                  </div>

                  <div ref={panelRef} className="mt-10">
                    <AnimatePresence mode="wait">
                      {/* Resolving access */}
                      {(authLoading || accessLoading) && (
                        <motion.div key="resolving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center justify-center rounded-[24px] bg-sale-card py-16">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </motion.div>
                      )}

                      {/* Signed out — polished inline sign-in */}
                      {!authLoading && !accessLoading && !user && (
                        <motion.div key="signed-out" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="rounded-[24px] bg-sale-card px-6 py-12 text-center md:px-12">
                          <h3 className="text-2xl font-bold tracking-tight text-foreground">Sign in to begin</h3>
                          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                            Your appraisal saves to your account so you can revisit it whenever you're ready to list.
                          </p>
                          <Button variant="cta" size="cta" className="mt-6" asChild>
                            <Link to={signInHref}>Sign in to continue <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                          </Button>
                          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                            PricePilot is included with Vendibook Pro
                          </p>
                        </motion.div>
                      )}

                      {/* Signed in, not entitled — polished Pro access state */}
                      {!authLoading && !accessLoading && user && !unlocked && (
                        <motion.div key="locked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="rounded-[24px] bg-sale-card px-6 py-12 text-center md:px-12">
                          <h3 className="text-2xl font-bold tracking-tight text-foreground">
                            PricePilot is included with Vendibook Pro
                          </h3>
                          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                            One membership unlocks every appraisal — sale ranges, rental benchmarks, and the evidence behind
                            both — along with the rest of the Pro seller toolkit.
                          </p>
                          <Button variant="cta" size="cta" className="mt-6" asChild>
                            <Link to="/pricing">Explore Vendibook Pro <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                          </Button>
                          <p className="mt-4 text-[12px] text-muted-foreground">
                            A one-time unlock is also available on the pricing page.
                          </p>
                        </motion.div>
                      )}

                      {/* Entitled — the guided appraisal workflow */}
                      {!authLoading && !accessLoading && user && unlocked && (
                        <motion.div key="wizard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          {loading ? (
                            <AnalysisState />
                          ) : error ? (
                            <SectionCard className="rounded-[24px] py-10 text-center">
                              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 ring-1 ring-amber-600/25">
                                <AlertCircle className="h-5 w-5 text-amber-600" />
                              </span>
                              <h3 className="mt-4 text-xl font-bold tracking-tight text-foreground">We couldn't finish that appraisal</h3>
                              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{error}</p>
                              <div className="mt-6 flex flex-wrap justify-center gap-3">
                                <Button variant="cta" onClick={() => void runAppraisal()}>
                                  <RotateCcw className="mr-1.5 h-4 w-4" /> Try again
                                </Button>
                                <Button variant="cta-outline" onClick={() => setError(null)}>Review my answers</Button>
                              </div>
                              <p className="mt-4 text-[11px] text-muted-foreground">Everything you entered is still here — nothing was lost.</p>
                            </SectionCard>
                          ) : (
                            <SectionCard className="rounded-[24px] p-5 md:p-8">
                              <div onKeyDown={onPanelKeyDown}>
                                {/* Progress */}
                                <div className="mb-6">
                                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    <span>{STEP_LABELS[step]}</span>
                                    <span className="tabular-nums">Step {step + 1} of {STEP_LABELS.length}</span>
                                  </div>
                                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                                    <motion.div
                                      className="h-full rounded-full bg-primary"
                                      initial={false}
                                      animate={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
                                      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
                                    />
                                  </div>
                                  <p className="mt-2 text-right text-[11px] text-muted-foreground">
                                    <span aria-hidden="true" className="font-semibold text-primary">*</span> Required
                                  </p>
                                </div>

                                {/* Validation summary — names what's missing */}
                                <AnimatePresence>
                                  {formSummary && (
                                    <motion.div
                                      key="form-summary"
                                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      role="alert"
                                      className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-500/[0.08] px-4 py-3 ring-1 ring-amber-600/25"
                                    >
                                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                                      <p className="text-[13px] font-medium leading-snug text-amber-800">{formSummary}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <AnimatePresence mode="wait">
                                  {/* 1 — What are you pricing */}
                                  {step === 0 && (
                                    <motion.div key="s0" {...stepMotion} transition={{ duration: 0.25 }}>
                                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">What are you pricing?<Req /></h3>
                                      <p className="mt-1 text-sm text-muted-foreground">Choose the closest match — it anchors the market evidence.</p>
                                      <div
                                        data-pp-field="assetCategory"
                                        role="group"
                                        aria-label="Equipment type"
                                        aria-invalid={!!errors.assetCategory}
                                        aria-describedby={errors.assetCategory ? 'pp-err-assetCategory' : undefined}
                                        tabIndex={-1}
                                        className={cn('mt-5 grid grid-cols-1 gap-2.5 rounded-2xl focus:outline-none sm:grid-cols-2',
                                          errors.assetCategory && 'ring-2 ring-amber-600/40')}
                                      >
                                        {CATEGORIES.map((c) => (
                                          <button key={c.value} type="button" onClick={() => { setAssetCategory(c.value); clearError('assetCategory'); }}
                                            aria-pressed={assetCategory === c.value}
                                            className={cn('flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                              assetCategory === c.value ? 'bg-primary/[0.07] ring-primary/50' : 'bg-muted/60 ring-border hover:ring-foreground/25')}>
                                            <Truck className={cn('mt-0.5 h-4 w-4 shrink-0', assetCategory === c.value ? 'text-primary' : 'text-muted-foreground')} />
                                            <span>
                                              <span className="block text-sm font-semibold text-foreground">{c.label}</span>
                                              <span className="block text-[11px] text-muted-foreground">{c.desc}</span>
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                      <FieldError id="pp-err-assetCategory" message={errors.assetCategory} />
                                    </motion.div>
                                  )}

                                  {/* 2 — Sale or rent */}
                                  {step === 1 && (
                                    <motion.div key="s1" {...stepMotion} transition={{ duration: 0.25 }}>
                                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Selling it, or renting it out?</h3>
                                      <p className="mt-1 text-sm text-muted-foreground">Sale pricing and rental rates come from different evidence.</p>
                                      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        {([
                                          { value: 'sale', icon: DollarSign, label: 'For sale', desc: 'Market value, range & list strategies' },
                                          { value: 'rental', icon: CalendarDays, label: 'For rent', desc: 'Daily & weekly rate benchmarks' },
                                        ] as const).map((m) => (
                                          <button key={m.value} type="button" onClick={() => setMode(m.value)}
                                            aria-pressed={mode === m.value}
                                            className={cn('rounded-xl p-5 text-left ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                              mode === m.value ? 'bg-primary/[0.07] ring-primary/50' : 'bg-muted/60 ring-border hover:ring-foreground/25')}>
                                            <m.icon className={cn('h-5 w-5', mode === m.value ? 'text-primary' : 'text-muted-foreground')} />
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
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Where is it?<Req /></h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Prices move by market. A state or ZIP anchors your report locally first.</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                          <Label htmlFor="pp-city">City <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                          <Input id="pp-city" placeholder="Austin" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-12 rounded-xl text-base" />
                                        </div>
                                        <div>
                                          <Label htmlFor="pp-state">State<Req /></Label>
                                          <div className="relative mt-1">
                                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input id="pp-state" placeholder="TX" maxLength={2} value={state}
                                              onChange={(e) => { setState(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); clearError('location'); }}
                                              aria-invalid={!!errors.location}
                                              aria-describedby={errors.location ? 'pp-err-location' : undefined}
                                              className="h-12 rounded-xl pl-9 text-base uppercase" />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
                                      </div>
                                      <div>
                                        <Label htmlFor="pp-zip">ZIP code<Req /></Label>
                                        <Input id="pp-zip" inputMode="numeric" placeholder="78704" maxLength={5} value={zip}
                                          onChange={(e) => { setZip(e.target.value.replace(/\D/g, '').slice(0, 5)); clearError('location'); }}
                                          aria-invalid={!!errors.location}
                                          aria-describedby={errors.location ? 'pp-err-location' : undefined}
                                          className="mt-1 h-12 rounded-xl text-base" />
                                      </div>
                                      <FieldError id="pp-err-location" message={errors.location} />
                                    </motion.div>
                                  )}

                                  {/* 4 — Year & size */}
                                  {step === 3 && (
                                    <motion.div key="s3" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-4">
                                      <div>
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Year and approximate size</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">The year anchors depreciation. Size is optional but tightens your range.</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label htmlFor="pp-year">Year<Req /></Label>
                                          <Input id="pp-year" inputMode="numeric" placeholder="2019" value={year}
                                            onChange={(e) => { setYear(e.target.value.replace(/\D/g, '').slice(0, 4)); clearError('year'); }}
                                            aria-invalid={!!errors.year}
                                            aria-describedby={errors.year ? 'pp-err-year' : undefined}
                                            className="mt-1 h-12 rounded-xl text-base" />
                                          <FieldError id="pp-err-year" message={errors.year} />
                                        </div>
                                        <div>
                                          <Label htmlFor="pp-len">Length (ft) <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                          <Input id="pp-len" inputMode="decimal" placeholder="18" value={lengthFt}
                                            onChange={(e) => setLengthFt(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} className="mt-1 h-12 rounded-xl text-base" />
                                        </div>
                                      </div>
                                      {mode === 'sale' && assetCategory === 'food_truck' && (
                                        <div>
                                          <Label htmlFor="pp-miles">Mileage <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                          <Input id="pp-miles" inputMode="numeric" placeholder="85,000" value={mileage}
                                            onChange={(e) => setMileage(e.target.value.replace(/\D/g, ''))} className="mt-1 h-12 rounded-xl text-base" />
                                        </div>
                                      )}
                                    </motion.div>
                                  )}

                                  {/* 5 — Condition */}
                                  {step === 4 && (
                                    <motion.div key="s4" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-5">
                                      <div>
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">How's it holding up?</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Honest answers price better than optimistic ones.</p>
                                      </div>
                                      <div>
                                        <Label>Overall condition<Req /></Label>
                                        <div
                                          data-pp-field="condition"
                                          role="group"
                                          aria-label="Overall condition"
                                          aria-invalid={!!errors.condition}
                                          aria-describedby={errors.condition ? 'pp-err-condition' : undefined}
                                          tabIndex={-1}
                                          className={cn('mt-1.5 grid grid-cols-2 gap-2 rounded-2xl focus:outline-none sm:grid-cols-4',
                                            errors.condition && 'ring-2 ring-amber-600/40')}
                                        >
                                          {CONDITIONS.map((c) => (
                                            <button key={c.value} type="button" onClick={() => { setCondition(c.value); clearError('condition'); }}
                                              aria-pressed={condition === c.value}
                                              className={cn('rounded-xl px-3 py-3 text-left ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                                condition === c.value ? 'bg-primary/[0.08] ring-primary/50' : 'bg-muted/60 ring-border hover:ring-foreground/25')}>
                                              <span className={cn('block text-sm font-semibold', condition === c.value ? 'text-primary' : 'text-foreground')}>{c.label}</span>
                                              <span className="block text-[10px] text-muted-foreground">{c.desc}</span>
                                            </button>
                                          ))}
                                        </div>
                                        <FieldError id="pp-err-condition" message={errors.condition} />
                                      </div>
                                      <div>
                                        <Label>Operational status<Req /></Label>
                                        <div
                                          data-pp-field="operationalStatus"
                                          role="group"
                                          aria-label="Operational status"
                                          aria-invalid={!!errors.operationalStatus}
                                          aria-describedby={errors.operationalStatus ? 'pp-err-operationalStatus' : undefined}
                                          tabIndex={-1}
                                          className={cn('mt-1.5 grid grid-cols-1 gap-1.5 rounded-2xl focus:outline-none sm:grid-cols-2',
                                            errors.operationalStatus && 'ring-2 ring-amber-600/40')}
                                        >
                                          {OPERATIONAL.map((o) => (
                                            <button key={o.value} type="button" onClick={() => { setOperationalStatus(o.value); clearError('operationalStatus'); }}
                                              aria-pressed={operationalStatus === o.value}
                                              className={cn('rounded-xl px-3 py-2.5 text-left text-xs font-semibold ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                                operationalStatus === o.value ? 'bg-primary/[0.08] text-primary ring-primary/50' : 'bg-muted/60 text-muted-foreground ring-border hover:ring-foreground/25')}>
                                                {o.label}
                                              </button>
                                            ))}
                                        </div>
                                        <FieldError id="pp-err-operationalStatus" message={errors.operationalStatus} />
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* 6 — Features + optional detail */}
                                  {step === 5 && (
                                    <motion.div key="s5" {...stepMotion} transition={{ duration: 0.25 }} className="space-y-5">
                                      <div>
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Equipment & anything else</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Tap what's on board. Everything here is optional.</p>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {FEATURES.map((f) => (
                                          <button key={f.key} type="button"
                                            onClick={() => setFeatures((p) => ({ ...p, [f.key]: !p[f.key] }))}
                                            aria-pressed={!!features[f.key]}
                                            className={cn('rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                              features[f.key] ? 'bg-primary/[0.08] text-primary ring-primary/50' : 'bg-muted/60 text-muted-foreground ring-border hover:ring-foreground/25')}>
                                            {f.label}
                                          </button>
                                        ))}
                                      </div>
                                      <div>
                                        <Label htmlFor="pp-notes">Anything worth noting <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                        <Textarea id="pp-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                                          placeholder="New tires, rebuilt engine, fresh wrap, a known issue a buyer would find on inspection…"
                                          className="mt-1 rounded-xl text-base" />
                                        <p className="mt-1 text-[11px] text-muted-foreground">One line is plenty. Skip it if nothing comes to mind.</p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Nav */}
                                <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
                                  <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                                  </Button>
                                  {step < lastStep ? (
                                    <Button variant="cta" onClick={goNext}>
                                      Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button variant="cta" size="cta" onClick={goNext}>
                                      Get my pricing <ArrowRight className="ml-1.5 h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </SectionCard>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>

                {/* ─── FAQ ─── */}
                <section className="container max-w-2xl px-4 pt-20 md:pt-28">
                  <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">Questions, answered</h2>
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
                </section>

                {/* ─── FINAL PRODUCT CONNECTION ─── */}
                <FinalConnections />
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
