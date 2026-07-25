/**
 * ToolSamplePreview — renders a real, concrete sample of each premium
 * tool's output so buyers see the artifact before paying. Labeled
 * "Example" where data is synthetic; based on the app's real category /
 * state options everywhere else.
 *
 * No AI-generated stock art, no empty placeholder boxes. Every preview is
 * a compact facsimile of the actual tool UI, partially truncated with an
 * "Unlock to see the full …" footer.
 */
import * as React from 'react';
import {
  Check, X, MapPin, DollarSign, FileCheck, TrendingUp, TrendingDown,
  Lightbulb, Wrench, Megaphone, FileText, Search as SearchIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  toolSlug: string;
  className?: string;
}

const ExampleTag = () => (
  <span className="rounded-full border-[1.5px] border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
    Example · Austin, TX
  </span>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'ember' | 'muted' | 'ok' | 'warn' }> = ({
  children,
  tone = 'muted',
}) => (
  <span
    className={cn(
      'rounded-full border-[1.5px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
      tone === 'ember' && 'border-orange-500/50 bg-orange-500/10 text-orange-300',
      tone === 'muted' && 'border-white/15 bg-white/[0.04] text-muted-foreground',
      tone === 'ok' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      tone === 'warn' && 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    )}
  >
    {children}
  </span>
);

const Card: React.FC<React.PropsWithChildren<{ className?: string; title?: string; tag?: React.ReactNode }>> = ({
  children,
  className,
  title,
  tag,
}) => (
  <div className={cn('rounded-md border-[1.5px] border-white/12 bg-white/[0.03] p-4', className)}>
    {(title || tag) && (
      <div className="mb-3 flex items-center gap-2">
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
        {tag}
      </div>
    )}
    {children}
  </div>
);

// ─── PermitPath ──────────────────────────────────────────────────────────────
const PermitPathSample = () => {
  const permits = [
    { name: 'Mobile Food Vendor Permit', agency: 'Austin Public Health', cost: 355, days: '14–21 days', mandatory: true },
    { name: 'Sales & Use Tax Permit', agency: 'Texas Comptroller', cost: 0, days: '1–3 days', mandatory: true },
    { name: 'Food Handler Certification', agency: 'ANSI Accredited', cost: 15, days: 'Same day', mandatory: true },
    { name: 'Certified Food Manager', agency: 'ANSI Accredited', cost: 129, days: '1–7 days', mandatory: true },
    { name: 'Fire Marshal Inspection', agency: 'Austin Fire Dept', cost: 0, days: '7–14 days', mandatory: true },
    { name: 'Commissary Agreement', agency: 'Approved kitchen', cost: 450, days: 'Varies', mandatory: false },
  ];
  const total = permits.reduce((s, p) => s + p.cost, 0);
  return (
    <Card
      title="PermitPath — Roadmap"
      tag={<ExampleTag />}
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> Food truck · Austin, TX 78701
      </div>
      <ul className="divide-y divide-white/10">
        {permits.map((p) => (
          <li key={p.name} className="flex items-start gap-3 py-2.5">
            <FileCheck className={cn('mt-0.5 h-4 w-4 shrink-0', p.mandatory ? 'text-orange-300' : 'text-muted-foreground')} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                {p.mandatory ? <Chip tone="ember">Mandatory</Chip> : <Chip>Recommended</Chip>}
              </div>
              <p className="text-[11px] text-muted-foreground">{p.agency} · {p.days}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {p.cost === 0 ? 'Free' : `$${p.cost}`}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t-[1.5px] border-white/10 pt-3">
        <span className="text-xs text-muted-foreground">Estimated total · 3–6 weeks</span>
        <span className="text-base font-bold tabular-nums text-foreground">${total.toLocaleString()}</span>
      </div>
      <p className="mt-3 rounded-md border-[1.5px] border-orange-500/30 bg-orange-500/[0.06] px-3 py-2 text-[11px] text-orange-200">
        Unlock to see YOUR city's full roadmap — deadlines, direct application links, uploaded
        documents, and PDF export.
      </p>
    </Card>
  );
};

// ─── PricePilot ──────────────────────────────────────────────────────────────
const PricePilotSample = () => (
  <Card
    title="PricePilot — Pricing Report"
    tag={<ExampleTag />}
  >
    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
      <DollarSign className="h-3.5 w-3.5" /> 18 ft food truck · Austin metro
    </div>
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: 'Median sale', value: '$67,500' },
        { label: 'Median rent / day', value: '$385' },
        { label: 'Comps analyzed', value: '42' },
      ].map((s) => (
        <div key={s.label} className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{s.value}</p>
        </div>
      ))}
    </div>
    <div className="mb-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Suggested list price
      </p>
      <div className="rounded-md border-[1.5px] border-orange-500/50 bg-orange-500/[0.08] p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold tabular-nums text-foreground">$69,900 – $74,500</span>
          <Chip tone="ember">+9% vs median</Chip>
        </div>
        <p className="mt-1 text-[11px] text-foreground/75">
          Your equipment package (flat top, 6-burner, hood) is 12% above median. Buyers in
          Austin pay premiums for turnkey trucks — pricing at $72k lists in the top quartile
          without repelling comps browsers.
        </p>
      </div>
    </div>
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      Comparable listings
    </p>
    <ul className="text-xs text-foreground/80 space-y-1.5">
      <li className="flex justify-between"><span>2019 Ford E-450 · 20 ft · Austin</span><span className="tabular-nums text-muted-foreground">$74,500</span></li>
      <li className="flex justify-between"><span>2018 Chevy P30 · 18 ft · San Antonio</span><span className="tabular-nums text-muted-foreground">$62,000</span></li>
      <li className="flex justify-between text-muted-foreground/70"><span>+ 40 more comps</span><TrendingUp className="h-3.5 w-3.5" /></li>
    </ul>
  </Card>
);

// ─── Market Radar ────────────────────────────────────────────────────────────
const MarketRadarSample = () => {
  const rows = [
    { state: 'Texas', active: 128, median: 62000, newThisMonth: 14, trend: 'up' as const },
    { state: 'Florida', active: 96, median: 58500, newThisMonth: 11, trend: 'up' as const },
    { state: 'California', active: 84, median: 78200, newThisMonth: 6, trend: 'down' as const },
    { state: 'Arizona', active: 47, median: 54900, newThisMonth: 5, trend: 'up' as const },
    { state: 'Georgia', active: 39, median: 51200, newThisMonth: 3, trend: 'down' as const },
  ];
  const max = Math.max(...rows.map((r) => r.active));
  return (
    <Card title="Market Radar — Snapshot" tag={<Chip>Example · Live U.S. data</Chip>}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Total active', value: '1,284' },
          { label: 'New this month', value: '96' },
          { label: 'Median price', value: '$61,400' },
        ].map((s) => (
          <div key={s.label} className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.state} className="grid grid-cols-[80px_1fr_80px_80px] items-center gap-3">
            <span className="text-xs font-medium text-foreground">{r.state}</span>
            <div className="h-2 rounded-full bg-white/[0.05]">
              <div
                className="h-2 rounded-full bg-orange-500/70"
                style={{ width: `${(r.active / max) * 100}%` }}
              />
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{r.active} live</span>
            <span className="flex items-center justify-end gap-1 text-xs tabular-nums text-foreground">
              ${(r.median / 1000).toFixed(0)}k
              {r.trend === 'up'
                ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                : <TrendingDown className="h-3 w-3 text-red-400" />}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Listing Studio ──────────────────────────────────────────────────────────
const ListingStudioSample = () => (
  <Card title="Listing Studio — Before / After" tag={<Chip>Example</Chip>}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border-[1.5px] border-red-500/30 bg-red-500/[0.04] p-3">
        <div className="mb-2 flex items-center gap-2">
          <X className="h-3.5 w-3.5 text-red-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-300">Before</span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/70">
          2019 food truck for sale. Runs good. Has grill, fryer, and prep table. Serious
          inquiries only.
        </p>
      </div>
      <div className="rounded-md border-[1.5px] border-emerald-500/40 bg-emerald-500/[0.04] p-3">
        <div className="mb-2 flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">After</span>
        </div>
        <p className="text-xs leading-relaxed text-foreground/85">
          <span className="font-semibold">Turnkey 2019 Ford E-450 · 18 ft · Austin, TX.</span>{' '}
          Fully outfitted commercial kitchen with 36" flat-top griddle, 4-basket fryer,
          stainless prep line, and 3-compartment sink. New tires (2024), fresh inspection,
          documented service history. Ready to permit and serve — no build-out needed.
        </p>
      </div>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
      <div className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-2 text-center">
        <p className="text-muted-foreground">Est. views</p>
        <p className="font-bold text-emerald-300">+318%</p>
      </div>
      <div className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-2 text-center">
        <p className="text-muted-foreground">Est. inquiries</p>
        <p className="font-bold text-emerald-300">+2.4×</p>
      </div>
      <div className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-2 text-center">
        <p className="text-muted-foreground">SEO score</p>
        <p className="font-bold text-foreground">92 / 100</p>
      </div>
    </div>
  </Card>
);

// ─── Marketing Studio ────────────────────────────────────────────────────────
const MarketingStudioSample = () => (
  <Card title="Marketing Studio — Launch Kit" tag={<Chip>Example</Chip>}>
    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
      <div className="aspect-square rounded-md border-[1.5px] border-white/12 bg-gradient-to-br from-orange-500/30 via-amber-500/10 to-transparent p-3">
        <div className="flex h-full flex-col justify-end">
          <p className="font-display text-lg leading-tight text-white drop-shadow">
            Turnkey<br />Food Truck
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/80">Austin · $72k</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Instagram caption</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/85">
            Ready to hit the road on day one 🚚 Fully outfitted 2019 food truck in Austin —
            griddle, fryer, prep line, all inspected & permit-ready. Serious inquiries welcome.
            Full listing 👉 link in bio.
          </p>
        </div>
        <div className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hashtags</p>
          <p className="mt-1 text-[11px] text-foreground/75">
            #foodtruckforsale #austinfoodie #atxfoodtrucks #mobilekitchen #turnkeyfoodtruck
            #vendibook
          </p>
        </div>
        <div className="rounded-md border-[1.5px] border-white/10 bg-black/30 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Facebook Marketplace title</p>
          <p className="mt-1 text-xs font-semibold text-foreground">
            2019 Ford E-450 Food Truck — Turnkey, Austin · $72,000
          </p>
        </div>
      </div>
    </div>
    <p className="mt-3 text-[11px] text-muted-foreground">
      Unlock to generate 12 more variants across Facebook, TikTok, email, and SMS.
    </p>
  </Card>
);

// ─── Concept Lab ─────────────────────────────────────────────────────────────
const ConceptLabSample = () => {
  const checks = [
    { label: 'Local demand (Austin lunch market)', value: 'Strong', ok: true },
    { label: 'Competition density (< 1 mi)', value: '3 similar concepts', ok: true },
    { label: 'Price point ($9–14 entrees)', value: 'In market range', ok: true },
    { label: 'Ingredient cost / plate', value: '34% (target < 32%)', ok: false },
    { label: 'Permit path complexity', value: '3–6 weeks', ok: true },
  ];
  return (
    <Card title="Concept Lab — Validation Report" tag={<Chip>Example · Nashville hot chicken</Chip>}>
      <div className="mb-4 flex items-center justify-between rounded-md border-[1.5px] border-orange-500/50 bg-orange-500/[0.08] p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Concept score</p>
          <p className="text-2xl font-bold text-foreground">78 / 100</p>
        </div>
        <Chip tone="ok">Recommended with tweaks</Chip>
      </div>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-3 text-xs">
            {c.ok
              ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />}
            <span className="flex-1 text-foreground/85">{c.label}</span>
            <span className="text-muted-foreground">{c.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-start gap-2 rounded-md border-[1.5px] border-white/10 bg-black/30 p-2.5">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 text-amber-300" />
        <p className="text-[11px] text-foreground/80">
          Recommended tweak: raise entree price to $12–14 to keep ingredient cost under 32%.
          Projected margin lifts from 41% to 48%.
        </p>
      </div>
    </Card>
  );
};

// ─── BuildKit ────────────────────────────────────────────────────────────────
const BuildKitSample = () => {
  const stages = [
    { stage: 'Chassis + vehicle prep', items: 8, cost: '$18k–$32k', done: true },
    { stage: 'Kitchen equipment (grill, fryer, hood)', items: 12, cost: '$14k–$22k', done: true },
    { stage: 'Plumbing + water (fresh + gray)', items: 6, cost: '$3k–$5k', done: false },
    { stage: 'Electrical + generator', items: 9, cost: '$4k–$8k', done: false },
    { stage: 'Interior finish + graphics wrap', items: 5, cost: '$6k–$12k', done: false },
  ];
  return (
    <Card title="BuildKit — Build-Out Plan" tag={<Chip>Example · 18 ft food truck</Chip>}>
      <ul className="space-y-2">
        {stages.map((s) => (
          <li
            key={s.stage}
            className="flex items-start gap-3 rounded-md border-[1.5px] border-white/10 bg-black/30 p-2.5"
          >
            <div className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px]',
              s.done ? 'border-emerald-500/50 bg-emerald-500/15' : 'border-white/15 bg-white/[0.04]',
            )}>
              {s.done
                ? <Check className="h-3 w-3 text-emerald-300" />
                : <Wrench className="h-3 w-3 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{s.stage}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.items} specs · vendor list included
              </p>
            </div>
            <span className="text-xs font-semibold tabular-nums text-foreground">{s.cost}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t-[1.5px] border-white/10 pt-3">
        <span className="text-xs text-muted-foreground">Estimated build-out · 8–14 weeks</span>
        <span className="text-base font-bold tabular-nums text-foreground">$45k – $79k</span>
      </div>
    </Card>
  );
};

// ─── Fallback ────────────────────────────────────────────────────────────────
const GenericSample: React.FC<{ toolSlug: string }> = ({ toolSlug }) => (
  <Card title="Preview" tag={<Chip>Example</Chip>}>
    <p className="text-sm text-foreground/80">
      A live sample for <span className="font-semibold">{toolSlug}</span> is available inside
      the tool. Unlock to explore.
    </p>
  </Card>
);

const ICON_BY_SLUG: Record<string, React.FC<{ className?: string }>> = {
  'pricepilot': DollarSign,
  'listing-studio': FileText,
  'marketing-studio': Megaphone,
  'market-radar': SearchIcon,
  'concept-lab': Lightbulb,
  'buildkit': Wrench,
  'permitpath': FileCheck,
};

export const YOU_GET: Record<string, string> = {
  'permitpath':
    'You get a saved roadmap for your city — track progress, upload documents, export as PDF.',
  'pricepilot':
    'You get a live pricing report for your category and metro, refreshed daily.',
  'market-radar':
    'You get a market snapshot for any metro — active listings, medians, and month-over-month trends.',
  'listing-studio':
    'You get an AI-rewritten title and description you can apply to your listing in one click.',
  'marketing-studio':
    'You get a ready-to-post social kit — caption, hashtags, and a cropped listing image.',
  'concept-lab':
    'You get a scored concept validation with demand, competition, and margin signals.',
  'buildkit':
    'You get a stage-by-stage build-out plan with vetted vendors and cost benchmarks.',
};

export const ToolSamplePreview: React.FC<Props> = ({ toolSlug, className }) => {
  const Body = React.useMemo(() => {
    switch (toolSlug) {
      case 'permitpath': return <PermitPathSample />;
      case 'pricepilot': return <PricePilotSample />;
      case 'market-radar': return <MarketRadarSample />;
      case 'listing-studio': return <ListingStudioSample />;
      case 'marketing-studio': return <MarketingStudioSample />;
      case 'concept-lab': return <ConceptLabSample />;
      case 'buildkit': return <BuildKitSample />;
      default: return <GenericSample toolSlug={toolSlug} />;
    }
  }, [toolSlug]);
  void ICON_BY_SLUG;
  const youGet = YOU_GET[toolSlug];
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <span className="rounded-full border-[1.5px] border-orange-500/40 bg-orange-500/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
          Example output
        </span>
        <span className="text-[11px] text-muted-foreground">Not your data — a real sample of what this tool produces.</span>
      </div>
      {Body}
      {youGet && (
        <p className="pt-1 text-[12px] text-foreground/75">
          <span className="font-semibold text-foreground">You get:</span> {youGet}
        </p>
      )}
    </div>
  );
};

export default ToolSamplePreview;

