import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { setPartnerCatalog, specOf, type BuildConfig, type PartnerEquipment, type PartnerModel } from '@/lib/buildStudio/catalog';
import { toCents } from '@/lib/buildStudio/partnerCatalog';
import { BUILD_STATUS, BuildTimeline, QuoteCard, usd, type BuildEvent, type Quote } from './BuildTimeline';
import type { ViewMode } from './TrailerScene';

const TrailerScene = lazy(() => import('./TrailerScene'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type Build = { id: string; name: string | null; zip: string; status: string; subtotal_cents: number | null; quote_required: boolean; created_at: string;
  model_id: string; delivery_method: string | null; config: BuildConfig; submitted_at: string | null;
  price_snapshot: { lines?: { label: string; amount_cents: number | null }[]; lead_time_weeks?: number | null; model_version?: number } };
type Line = { label: string; amount: string };

/** Manufacturer engineering review for builds assigned to this partner. All actions go through server RPCs. */
export default function PartnerReviewPanel({ mid, models, equipment }: { mid: string; models: PartnerModel[]; equipment: PartnerEquipment[] }) {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [open, setOpen] = useState<Build | null>(null);
  const [events, setEvents] = useState<BuildEvent[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [view, setView] = useState<ViewMode>('plan');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [reason, setReason] = useState('');
  const [lead, setLead] = useState('');
  const [terms, setTerms] = useState('');
  const [days, setDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  const load = useCallback(async () => {
    const { data } = await db.from('bs_builds').select('*').eq('manufacturer_id', mid).neq('status', 'saved').order('submitted_at', { ascending: false }).limit(100);
    setBuilds(data ?? []);
    if (open) setOpen((data ?? []).find((b: Build) => b.id === open.id) ?? null);
  }, [mid, open]);
  useEffect(() => { void load(); }, [mid]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBuild = async (b: Build) => {
    setOpen(b); setNote(''); setReason('');
    const model = models.find((m) => m.id === b.model_id);
    if (model) { setPartnerCatalog(model, equipment); setSceneKey((k) => k + 1); }
    setLines((b.price_snapshot.lines ?? []).map((l) => ({ label: l.label, amount: l.amount_cents == null ? '' : (l.amount_cents / 100).toFixed(2) })));
    setLead(String(b.price_snapshot.lead_time_weeks ?? model?.lead_time_weeks ?? ''));
    setTerms(b.delivery_method ? `${b.delivery_method.replace('_', ' ')} to ZIP ${b.zip}` : '');
    const [e, q] = await Promise.all([
      db.from('bs_build_events').select('*').eq('build_id', b.id).order('created_at'),
      db.from('bs_quotes').select('*').eq('build_id', b.id).order('version', { ascending: false }),
    ]);
    setEvents(e.data ?? []); setQuotes(q.data ?? []);
  };

  const act = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { error } = await db.rpc(fn, args);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(ok); setNote('');
    await load();
    if (open) { const { data } = await db.from('bs_builds').select('*').eq('id', open.id).maybeSingle(); if (data) await openBuild(data); }
    return true;
  };

  const issueQuote = () => {
    const parsed = lines.map((l) => ({ label: l.label.trim(), amount_cents: toCents(l.amount) }));
    if (parsed.some((l) => !l.label || l.amount_cents === undefined)) { toast.error('Every line needs a label and a price (use 0 if included)'); return; }
    void act('bs_issue_quote', { p_build_id: open!.id, p_lines: parsed, p_lead_time_weeks: lead ? Number(lead) : null, p_delivery_terms: terms, p_reason: reason || null, p_valid_days: Number(days) }, 'Final quote sent to the customer');
  };
  const total = lines.reduce((s, l) => s + (toCents(l.amount) ?? 0), 0);
  const closed = open && ['accepted', 'rejected'].includes(open.status);

  return <div className="space-y-3">
    {builds.length === 0 && <p className="text-sm text-muted-foreground">No builds sent for engineering review yet.</p>}
    <ul className="space-y-1">
      {builds.map((b) => <li key={b.id}>
        <button type="button" onClick={() => openBuild(b)} className={`flex w-full flex-wrap justify-between gap-2 rounded-lg border p-2 text-left text-sm ${open?.id === b.id ? 'border-primary' : 'border-border'}`}>
          <span>{b.name ?? 'Untitled build'} · ZIP {b.zip} · {models.find((m) => m.id === b.model_id)?.name ?? 'model'}</span>
          <span className="text-primary">{BUILD_STATUS[b.status] ?? b.status} · {usd(b.subtotal_cents)}{b.quote_required ? ' + quoted' : ''}</span>
        </button>
      </li>)}
    </ul>

    {open && <div className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="relative h-72 overflow-hidden rounded-lg border border-border">
          <Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
            <TrailerScene key={sceneKey} config={open.config} view={view} roof={false} selected={null} onSelect={() => {}} />
          </Suspense>
          <div className="absolute left-2 top-2 flex gap-1">{(['plan', 'interior', 'exterior'] as ViewMode[]).map((v) =>
            <Button key={v} size="sm" variant={view === v ? 'default' : 'secondary'} onClick={() => setView(v)}>{v}</Button>)}</div>
        </div>
        <p className="text-[11px] text-muted-foreground">Customer preview, not an engineering drawing. Catalog version used: model v{open.price_snapshot.model_version ?? '?'}.</p>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Equipment and layout</p>
          <ul className="mt-1 text-sm">{open.config.items.map((i) => { const s = specOf(i.id); return <li key={i.uid}>
            {s.name} · {i.wall === 'service' ? 'window side' : 'back wall'} at {Math.round((i.x + 0) * 39.37)}″ from center · {Math.round(s.w * 39.37)}×{Math.round(s.d * 39.37)}×{Math.round(s.h * 39.37)}″ · {s.power}
          </li>; })}</ul>
          <p className="mt-1 text-sm">Delivery: {open.delivery_method ?? 'not chosen'} · ZIP {open.zip}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Preliminary price at submission</p>
          <ul className="text-sm">{(open.price_snapshot.lines ?? []).map((l, i) => <li key={i} className="flex justify-between"><span className="text-muted-foreground">{l.label}</span><span>{usd(l.amount_cents)}</span></li>)}</ul>
        </div>
        <BuildTimeline events={events} />
      </div>

      <div className="space-y-4">
        {quotes.map((q) => <QuoteCard key={q.id} q={q} />)}
        {!closed && <>
          <div className="space-y-2">
            {open.status === 'submitted' && <Button size="sm" variant="outline" disabled={busy} onClick={() => act('bs_partner_review', { p_build_id: open.id, p_kind: 'review_started' }, 'Review started')}>Start review</Button>}
            <Textarea rows={3} className="text-base" placeholder="Note to the customer (required for requests and rejection)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('bs_build_message', { p_build_id: open.id, p_body: note }, 'Message sent')}>Send message</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('bs_partner_review', { p_build_id: open.id, p_kind: 'clarification_requested', p_body: note }, 'Clarification requested')}>Request clarification</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('bs_partner_review', { p_build_id: open.id, p_kind: 'layout_change_requested', p_body: note }, 'Layout change requested')}>Request layout change</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act('bs_partner_review', { p_build_id: open.id, p_kind: 'incompatible_flagged', p_body: note }, 'Flagged')}>Flag incompatible equipment</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm('Reject this build as not manufacturable? The customer will see your note.')) void act('bs_partner_review', { p_build_id: open.id, p_kind: 'rejected', p_body: note }, 'Build rejected'); }}>Reject</Button>
            </div>
          </div>
          {['submitted', 'in_review', 'quoted'].includes(open.status) && <div className="space-y-2 rounded-lg bg-muted/40 p-3">
            <p className="text-sm font-semibold">Issue final quote</p>
            {lines.map((l, i) => <div key={i} className="flex gap-2">
              <Input className="text-base" value={l.label} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input className="w-32 text-base" inputMode="decimal" placeholder="USD" value={l.amount} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
              <Button size="icon" variant="ghost" aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>)}
            <Button size="sm" variant="ghost" onClick={() => setLines([...lines, { label: '', amount: '' }])}><Plus className="mr-1 h-4 w-4" />Add line</Button>
            <p className="flex justify-between text-sm font-semibold"><span>Quote total</span><span>{usd(total)}</span></p>
            {open.subtotal_cents != null && total !== open.subtotal_cents && <p className="text-xs text-muted-foreground">Differs from the preliminary {usd(open.subtotal_cents)} — a reason is required.</p>}
            <Input className="text-base" placeholder="Reason for any price change" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input className="text-base" inputMode="numeric" placeholder="Build time (weeks)" value={lead} onChange={(e) => setLead(e.target.value.replace(/\D/g, ''))} />
              <Input className="text-base" inputMode="numeric" placeholder="Valid for (days)" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
            </div>
            <Input className="text-base" placeholder="Delivery terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
            <Button disabled={busy} onClick={issueQuote}>Send final quote</Button>
            <p className="text-[11px] text-muted-foreground">The customer must accept it. Your company name is shown to the customer on the quote. No payment is taken.</p>
          </div>}
        </>}
      </div>
    </div>}
  </div>;
}
