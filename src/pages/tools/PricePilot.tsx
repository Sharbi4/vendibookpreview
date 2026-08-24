import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import {
  ArrowLeft, ArrowRight, Camera, Check, DollarSign, FileText, ImagePlus,
  Loader2, MapPin, RotateCcw, ShieldCheck, TrendingDown, TrendingUp, Truck, X,
} from 'lucide-react';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';
import { cn } from '@/lib/utils';

// ─── Types (mirror pricepilot-appraisal response) ────────────────────────────

interface AdjustmentEntry { label: string; direction: 'up' | 'down' | 'neutral'; detail: string }
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
  caveats?: string[]; photo_observations?: string[];
}
interface AppraisalResponse {
  ok: true;
  mode: 'sale' | 'rental';
  subject: { assetCategory: string; categoryLabel: string; city: string | null; state: string | null; year: number | null; make: string | null; model: string | null; lengthFt: number | null };
  valuation: {
    estimatedMarketLow?: number; estimatedMarketHigh?: number;
    recommendedListPrice?: number; quickSalePrice?: number; premiumPositionPrice?: number;
    dailyRate?: number; weeklyRate?: number; monthlyRate?: number;
    confidenceScore: number; confidenceLabel: 'high' | 'moderate' | 'limited';
    comparableCount: number; strongComparableCount?: number; medianComparablePrice?: number;
    adjustmentSummary: AdjustmentEntry[]; methodology: string[]; warnings: string[];
  };
  distribution: { min: number; q1: number; median: number; q3: number; max: number; recommended: number } | null;
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
  { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' }, { value: 'project', label: 'Project' },
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

const LOADING_STEPS = [
  'Pulling comparable market evidence…',
  'Scoring similarity and weighting evidence…',
  'Filtering statistical outliers…',
  'Computing the weighted market range…',
  'Writing your professional interpretation…',
];

const fmt = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${Math.round(n).toLocaleString('en-US')}` : '—';

// ─── Photo downscale ─────────────────────────────────────────────────────────

async function downscalePhoto(file: File): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch { return null; }
}

// ─── Small UI atoms ──────────────────────────────────────────────────────────

const SectionCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={cn('bg-sale-card rounded-2xl p-5 md:p-7', className)}>{children}</div>
);

const Eyebrow: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</p>
);

const ConfidenceBadge: React.FC<{ score: number; label: string }> = ({ score, label }) => (
  <span className={cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
    label === 'high' ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-600/25'
      : label === 'moderate' ? 'chip-accent'
      : 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-600/25',
  )}>
    <ShieldCheck className="h-3.5 w-3.5" /> {label} confidence · {score}/100
  </span>
);

const EvidenceBadge: React.FC<{ comp: CompRow }> = ({ comp }) => {
  if (comp.evidenceType === 'facebook_observed' && comp.observedStatus === 'sold')
    return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-600/25">Sold-status observed</span>;
  if (comp.observedStatus === 'pending')
    return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-600/25">Pending</span>;
  return <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ring-1 ring-black/10">Asking price</span>;
};

// ─── Page ────────────────────────────────────────────────────────────────────

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PricePilot — Mobile Food Equipment Appraisals',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '19.00', priceCurrency: 'USD' },
  description:
    'Data-driven appraisals for food trucks, trailers, carts, and mobile bars. Estimated market range, pricing strategies, and rental rate benchmarks computed from real comparable evidence.',
  featureList: [
    'Deterministic comparable-based valuation',
    'Estimated market range with quick-sale and premium strategies',
    'Daily, weekly, and monthly rental rate benchmarks',
    'Confidence score, evidence table, and methodology disclosure',
  ],
};

export default function PricePilot() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Intake state
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'sale' | 'rental'>('sale');
  const [assetCategory, setAssetCategory] = useState<string>('food_truck');
  const [year, setYear] = useState(''); const [make, setMake] = useState(''); const [model, setModel] = useState('');
  const [lengthFt, setLengthFt] = useState(''); const [mileage, setMileage] = useState('');
  const [city, setCity] = useState(''); const [state, setState] = useState('');
  const [condition, setCondition] = useState('good'); const [operationalStatus, setOperationalStatus] = useState('turnkey');
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [knownIssues, setKnownIssues] = useState(''); const [recentUpgrades, setRecentUpgrades] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Run state
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState<AppraisalResponse | null>(null);

  const canContinue = step === 0 ? !!assetCategory : step === 1 ? state.trim().length === 2 : true;

  const onPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = 3 - photos.length;
    const chosen = Array.from(files).slice(0, room);
    const scaled = (await Promise.all(chosen.map(downscalePhoto))).filter((p): p is string => !!p);
    setPhotos((prev) => [...prev, ...scaled].slice(0, 3));
  };

  const runAppraisal = async () => {
    setLoading(true); setLoadStep(0); setResult(null);
    const ticker = setInterval(() => setLoadStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1600);
    try {
      const { data, error } = await invokeEdge<AppraisalResponse>('pricepilot-appraisal', {
        body: {
          mode, assetCategory,
          year: year || undefined, make: make || undefined, model: model || undefined,
          lengthFt: lengthFt || undefined, mileage: mileage || undefined,
          city: city || undefined, state: state.toUpperCase() || undefined,
          condition, operationalStatus, features,
          knownIssues: knownIssues || undefined, recentUpgrades: recentUpgrades || undefined,
          photos,
        },
      });
      if (error || !data?.ok) {
        toast({ title: 'Appraisal failed', description: error ?? 'Please try again.', variant: 'destructive' });
        return;
      }
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const v = result?.valuation;

  return (
    <>
      <SEO
        title="PricePilot — Food Truck & Trailer Appraisals | Vendibook"
        description="Know what your equipment is worth before you list it. PricePilot computes a defensible market range, pricing strategies, and rental rate benchmarks from real comparable evidence."
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1">
          <div className="sale-light">
            <div className="container max-w-3xl px-4 py-10 md:py-16">

              {/* Header */}
              <div className="mb-8 text-center">
                <Eyebrow>Vendibook Premium Tools</Eyebrow>
                <h1 className="mt-2 font-display text-3xl md:text-[2.75rem] leading-tight font-semibold text-foreground">
                  {result ? 'Your appraisal report' : 'Price your equipment with evidence, not guesses'}
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm md:text-base text-muted-foreground">
                  {result
                    ? `Prepared ${new Date(result.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${result.subject.categoryLabel}${result.subject.state ? ` · ${result.subject.state}` : ''}`
                    : 'PricePilot analyzes observed market comparables with a deterministic valuation engine, then writes a professional interpretation of your result.'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {/* ─── LOADING ─── */}
                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SectionCard className="py-14 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-600" />
                      <div className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
                        {LOADING_STEPS.map((s, i) => (
                          <div key={s} className={cn('flex items-center gap-2.5 text-sm transition-opacity', i > loadStep ? 'opacity-30' : 'opacity-100')}>
                            {i < loadStep
                              ? <Check className="h-4 w-4 text-emerald-600" />
                              : i === loadStep
                                ? <span className="h-4 w-4 animate-pulse rounded-full bg-orange-500/40" />
                                : <span className="h-4 w-4 rounded-full bg-black/[0.08]" />}
                            <span className="text-foreground/80">{s}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ─── REPORT ─── */}
                {!loading && result && v && (
                  <motion.div key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    {/* Headline number */}
                    <SectionCard className="text-center">
                      <Eyebrow>{result.mode === 'sale' ? 'Recommended list price' : 'Recommended daily rate'}</Eyebrow>
                      <p className="mt-2 font-display text-4xl md:text-5xl font-semibold tabular-nums text-foreground">
                        {result.mode === 'sale' ? fmt(v.recommendedListPrice) : fmt(v.dailyRate)}
                      </p>
                      {result.mode === 'sale' && v.estimatedMarketLow && v.estimatedMarketHigh && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Estimated market range {fmt(v.estimatedMarketLow)} – {fmt(v.estimatedMarketHigh)}
                        </p>
                      )}
                      <div className="mt-4 flex justify-center">
                        <ConfidenceBadge score={v.confidenceScore} label={v.confidenceLabel} />
                      </div>
                      {result.narrative?.headline && (
                        <p className="mx-auto mt-4 max-w-lg text-sm italic text-foreground/75">“{result.narrative.headline}”</p>
                      )}
                    </SectionCard>

                    {/* Range visualization (sale) */}
                    {result.mode === 'sale' && result.distribution && v.estimatedMarketLow && v.estimatedMarketHigh && (
                      <SectionCard>
                        <Eyebrow>Market position</Eyebrow>
                        {(() => {
                          const d = result.distribution!;
                          const span = Math.max(1, d.max - d.min);
                          const pct = (n: number) => `${(((n - d.min) / span) * 100).toFixed(1)}%`;
                          return (
                            <div className="mt-5">
                              <div className="relative h-2.5 rounded-full bg-black/[0.06]">
                                <div className="absolute inset-y-0 rounded-full bg-orange-500/25"
                                  style={{ left: pct(v.estimatedMarketLow!), right: `${100 - ((v.estimatedMarketHigh! - d.min) / span) * 100}%` }} />
                                <div className="absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded bg-orange-600 shadow" style={{ left: pct(d.recommended) }} />
                                <div className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded bg-black/40" style={{ left: pct(d.median) }} />
                              </div>
                              <div className="mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                                <span>{fmt(d.min)}</span>
                                <span>comp median {fmt(d.median)}</span>
                                <span>{fmt(d.max)}</span>
                              </div>
                            </div>
                          );
                        })()}
                        {/* Strategy cards */}
                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[
                            { label: 'Quick sale', value: v.quickSalePrice, note: 'Priced to move fast' },
                            { label: 'Recommended', value: v.recommendedListPrice, note: 'Balanced market position' },
                            { label: 'Premium position', value: v.premiumPositionPrice, note: 'Test the top of the range' },
                          ].map((s) => (
                            <div key={s.label} className={cn('rounded-xl p-4 ring-1', s.label === 'Recommended' ? 'bg-orange-500/[0.07] ring-orange-600/30' : 'bg-black/[0.02] ring-black/10')}>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{fmt(s.value)}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.note}</p>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {/* Rental rates */}
                    {result.mode === 'rental' && (
                      <SectionCard>
                        <Eyebrow>Rate benchmarks</Eyebrow>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[
                            { label: 'Daily', value: v.dailyRate }, { label: 'Weekly', value: v.weeklyRate }, { label: 'Monthly', value: v.monthlyRate },
                          ].map((s) => (
                            <div key={s.label} className="rounded-xl bg-black/[0.02] p-4 ring-1 ring-black/10 text-center">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{fmt(s.value)}</p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          Benchmarked from current published asking rates — equipment sale prices are never used to estimate rental rates.
                        </p>
                      </SectionCard>
                    )}

                    {/* Adjustments */}
                    {v.adjustmentSummary.length > 0 && (
                      <SectionCard>
                        <Eyebrow>How your equipment shaped the estimate</Eyebrow>
                        <ul className="mt-3 divide-y divide-black/[0.06]">
                          {v.adjustmentSummary.map((a) => (
                            <li key={a.label} className="flex items-start gap-3 py-2.5">
                              {a.direction === 'up' ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                : a.direction === 'down' ? <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                : <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                              <div>
                                <p className="text-sm font-medium text-foreground">{a.label}</p>
                                <p className="text-[12px] text-muted-foreground">{a.detail}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </SectionCard>
                    )}

                    {/* Professional interpretation */}
                    {result.narrative && (
                      <SectionCard>
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-orange-600" /><Eyebrow>Professional interpretation</Eyebrow></div>
                        {result.narrative.summary && <p className="mt-3 text-sm leading-relaxed text-foreground/85">{result.narrative.summary}</p>}
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          {!!result.narrative.drivers_positive?.length && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Working in your favor</p>
                              <ul className="space-y-1.5">{result.narrative.drivers_positive.map((d) => (
                                <li key={d} className="flex items-start gap-2 text-[13px] text-foreground/80"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{d}</li>
                              ))}</ul>
                            </div>
                          )}
                          {!!result.narrative.drivers_negative?.length && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">Worth considering</p>
                              <ul className="space-y-1.5">{result.narrative.drivers_negative.map((d) => (
                                <li key={d} className="flex items-start gap-2 text-[13px] text-foreground/80"><TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />{d}</li>
                              ))}</ul>
                            </div>
                          )}
                        </div>
                        {!!result.narrative.photo_observations?.length && (
                          <div className="mt-4 rounded-xl bg-black/[0.02] p-3.5 ring-1 ring-black/10">
                            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Camera className="h-3.5 w-3.5" /> Photo observations</p>
                            <ul className="space-y-1">{result.narrative.photo_observations.map((d) => (
                              <li key={d} className="text-[13px] text-foreground/75">· {d}</li>
                            ))}</ul>
                          </div>
                        )}
                      </SectionCard>
                    )}

                    {/* Comparable evidence */}
                    <SectionCard>
                      <Eyebrow>Comparable evidence · {v.comparableCount} after outlier filtering</Eyebrow>
                      <ul className="mt-3 divide-y divide-black/[0.06]">
                        {result.comparables.map((c) => (
                          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {[c.year, c.lengthFt ? `${c.lengthFt} ft` : null, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')} · {c.similarity}% match
                              </p>
                            </div>
                            <EvidenceBadge comp={c} />
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {fmt(c.displayedPrice)}
                              {c.previousDisplayedPrice && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground line-through">{fmt(c.previousDisplayedPrice)}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                        “Sold-status observed” means a marketplace listing was marked sold — it signals market movement but is never treated as a verified closing price.
                      </p>
                    </SectionCard>

                    {/* Warnings + methodology */}
                    {v.warnings.length > 0 && (
                      <div className="rounded-2xl bg-amber-500/[0.07] p-4 ring-1 ring-amber-600/20">
                        {v.warnings.map((w) => <p key={w} className="text-[12px] leading-relaxed text-amber-800">· {w}</p>)}
                      </div>
                    )}
                    <SectionCard>
                      <Eyebrow>Methodology</Eyebrow>
                      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-foreground/75">
                        {v.methodology.map((m) => <li key={m}>{m}</li>)}
                      </ol>
                      <p className="mt-4 border-t border-black/[0.06] pt-3 text-[11px] text-muted-foreground">
                        PricePilot is an appraisal aid, not a certified appraisal. Always confirm local demand and condition with a professional before a major transaction.
                      </p>
                    </SectionCard>

                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600" onClick={reset}>
                        <RotateCcw className="mr-1.5 h-4 w-4" /> Run another appraisal
                      </Button>
                      <Button size="lg" variant="outline" asChild>
                        <Link to="/list-start">List your equipment <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── INTAKE WIZARD ─── */}
                {!loading && !result && (
                  <motion.div key="intake" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <SectionCard>
                      {/* Stepper */}
                      <div className="mb-6 flex items-center gap-1.5">
                        {['Equipment', 'Details', 'Condition', 'Photos & notes'].map((label, i) => (
                          <button key={label} type="button" onClick={() => i < step && setStep(i)}
                            className={cn('flex-1 rounded-lg px-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                              i === step ? 'bg-orange-500/10 text-orange-700 ring-1 ring-orange-600/30'
                                : i < step ? 'text-emerald-700' : 'text-muted-foreground/60')}>
                            {label}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        {step === 0 && (
                          <motion.div key="s0" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                            <Eyebrow>What are we appraising?</Eyebrow>
                            <div className="mt-3 grid grid-cols-2 gap-2.5">
                              {(['sale', 'rental'] as const).map((m) => (
                                <button key={m} type="button" onClick={() => setMode(m)}
                                  className={cn('rounded-xl p-4 text-left ring-1 transition-all', mode === m ? 'bg-orange-500/[0.07] ring-orange-600/40' : 'bg-black/[0.02] ring-black/10 hover:ring-black/20')}>
                                  <DollarSign className={cn('h-4 w-4', mode === m ? 'text-orange-600' : 'text-muted-foreground')} />
                                  <p className="mt-2 text-sm font-semibold text-foreground">{m === 'sale' ? 'For sale' : 'For rent'}</p>
                                  <p className="text-[11px] text-muted-foreground">{m === 'sale' ? 'Market value & list strategies' : 'Daily / weekly / monthly rates'}</p>
                                </button>
                              ))}
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {CATEGORIES.map((c) => (
                                <button key={c.value} type="button" onClick={() => setAssetCategory(c.value)}
                                  className={cn('flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition-all', assetCategory === c.value ? 'bg-orange-500/[0.07] ring-orange-600/40' : 'bg-black/[0.02] ring-black/10 hover:ring-black/20')}>
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

                        {step === 1 && (
                          <motion.div key="s1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                            <Eyebrow>Equipment details</Eyebrow>
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label htmlFor="pp-year">Year</Label><Input id="pp-year" inputMode="numeric" placeholder="2019" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className="text-base" /></div>
                              <div><Label htmlFor="pp-len">Length (ft)</Label><Input id="pp-len" inputMode="decimal" placeholder="18" value={lengthFt} onChange={(e) => setLengthFt(e.target.value)} className="text-base" /></div>
                              <div><Label htmlFor="pp-make">Make</Label><Input id="pp-make" placeholder="Ford" value={make} onChange={(e) => setMake(e.target.value)} className="text-base" /></div>
                              <div><Label htmlFor="pp-model">Model</Label><Input id="pp-model" placeholder="E-450" value={model} onChange={(e) => setModel(e.target.value)} className="text-base" /></div>
                            </div>
                            {mode === 'sale' && assetCategory === 'food_truck' && (
                              <div><Label htmlFor="pp-miles">Mileage</Label><Input id="pp-miles" inputMode="numeric" placeholder="85,000" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ''))} className="text-base" /></div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div><Label htmlFor="pp-city">City</Label><Input id="pp-city" placeholder="Austin" value={city} onChange={(e) => setCity(e.target.value)} className="text-base" /></div>
                              <div>
                                <Label htmlFor="pp-state">State <span className="text-orange-600">*</span></Label>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input id="pp-state" placeholder="TX" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} className="pl-9 text-base uppercase" />
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">Two-letter code — anchors the comparable set.</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {step === 2 && (
                          <motion.div key="s2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                            <Eyebrow>Condition & equipment</Eyebrow>
                            <div>
                              <Label>Overall condition</Label>
                              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                                {CONDITIONS.map((c) => (
                                  <button key={c.value} type="button" onClick={() => setCondition(c.value)}
                                    className={cn('rounded-lg px-2 py-2.5 text-xs font-semibold ring-1 transition-all', condition === c.value ? 'bg-orange-500/[0.08] text-orange-700 ring-orange-600/40' : 'bg-black/[0.02] text-muted-foreground ring-black/10')}>
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Operational status</Label>
                              <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {OPERATIONAL.map((o) => (
                                  <button key={o.value} type="button" onClick={() => setOperationalStatus(o.value)}
                                    className={cn('rounded-lg px-3 py-2.5 text-left text-xs font-semibold ring-1 transition-all', operationalStatus === o.value ? 'bg-orange-500/[0.08] text-orange-700 ring-orange-600/40' : 'bg-black/[0.02] text-muted-foreground ring-black/10')}>
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Equipment package</Label>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {FEATURES.map((f) => (
                                  <button key={f.key} type="button" onClick={() => setFeatures((p) => ({ ...p, [f.key]: !p[f.key] }))}
                                    className={cn('rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all', features[f.key] ? 'bg-orange-500/[0.08] text-orange-700 ring-orange-600/40' : 'bg-black/[0.02] text-muted-foreground ring-black/10')}>
                                    {features[f.key] && <Check className="mr-1 inline h-3 w-3" />}{f.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div><Label htmlFor="pp-issues">Known issues</Label><Textarea id="pp-issues" rows={3} placeholder="Anything a buyer would discover on inspection…" value={knownIssues} onChange={(e) => setKnownIssues(e.target.value)} className="text-base" /></div>
                              <div><Label htmlFor="pp-upgrades">Recent upgrades</Label><Textarea id="pp-upgrades" rows={3} placeholder="New tires, rebuilt engine, fresh wrap…" value={recentUpgrades} onChange={(e) => setRecentUpgrades(e.target.value)} className="text-base" /></div>
                            </div>
                          </motion.div>
                        )}

                        {step === 3 && (
                          <motion.div key="s3" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                            <Eyebrow>Photos (optional)</Eyebrow>
                            <p className="text-[12px] text-muted-foreground">
                              Up to 3 photos. The appraiser notes conservative cosmetic observations only — photos never set the price.
                            </p>
                            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPhotos(e.target.files)} />
                            <div className="flex flex-wrap gap-3">
                              {photos.map((p, i) => (
                                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl ring-1 ring-black/10">
                                  <img src={p} alt={`Equipment photo ${i + 1}`} className="h-full w-full object-cover" />
                                  <button type="button" aria-label="Remove photo" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              {photos.length < 3 && (
                                <button type="button" onClick={() => fileRef.current?.click()}
                                  className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-black/15 text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-600">
                                  <ImagePlus className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Nav */}
                      <div className="mt-7 flex items-center justify-between border-t border-black/[0.06] pt-5">
                        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                        </Button>
                        {step < 3 ? (
                          <Button className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => canContinue && setStep((s) => s + 1)} disabled={!canContinue}>
                            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600" onClick={runAppraisal}>
                            Run my appraisal <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </SectionCard>

                    {/* Trust copy */}
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {[
                        { icon: ShieldCheck, t: 'Evidence-based', d: 'Weighted comparable analysis — never a single AI-invented number.' },
                        { icon: FileText, t: 'Fully disclosed', d: 'Every report shows its comps, adjustments, and methodology.' },
                        { icon: DollarSign, t: 'Sale & rental', d: 'Sale valuations and rental rate benchmarks in one tool.' },
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

            {/* FAQ */}
            <section className="container max-w-3xl px-4 pb-16">
              <h2 className="mb-4 text-center font-display text-2xl font-semibold text-foreground">Questions, answered</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1">
                  <AccordionTrigger>How does PricePilot estimate value?</AccordionTrigger>
                  <AccordionContent>It scores observed market comparables for similarity to your equipment, weights them by evidence quality, filters statistical outliers, and computes a weighted median with a quartile-based range. Documented adjustments for condition, operational status, equipment package, and year refine the result. AI writes the interpretation — it never invents the numbers.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Is PricePilot free?</AccordionTrigger>
                  <AccordionContent>PricePilot is a premium tool. It is included with Growth and Operator memberships, and is also available as a one-time lifetime unlock from the tools page.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>Where does the evidence come from?</AccordionTrigger>
                  <AccordionContent>Observed marketplace listings (including sold-status records) and current Vendibook asking prices. Observed sold status signals market movement but is never treated as a verified closing price.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4">
                  <AccordionTrigger>Can it estimate rental rates?</AccordionTrigger>
                  <AccordionContent>Yes. Rental mode benchmarks daily, weekly, and monthly rates from published Vendibook asking rates. Sale prices are never used to estimate rental rates.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <div className="container max-w-3xl px-4 pb-20">
              <ToolCrossLinks
                currentTool="pricepilot"
                title="Keep building"
                subtitle="Got your appraisal? Write a listing that converts, or map the permits you need to operate."
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
