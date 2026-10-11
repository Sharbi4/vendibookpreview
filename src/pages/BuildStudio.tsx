import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight, Info, Loader2, Save, Trash2, FolderOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ALWAYS_REQUIRED, DEMO_DATA, EQUIPMENT, FINISHES, EXTERIOR_COLORS, MENU_SUGGESTIONS, TRAILER, findFreeSpot, placementIssues,
  priceBuild, setPartnerCatalog, specOf, resetToDemoCatalog, type BuildConfig, type PartnerEquipment, type PartnerModel, type Wall,
} from '@/lib/buildStudio/catalog';
import type { ViewMode } from '@/components/buildStudio/TrailerScene';

const TrailerScene = lazy(() => import('@/components/buildStudio/TrailerScene'));
const SAVE_KEY = 'vb.buildStudio.saves.v1';
const cents = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
type ServerPrice = { status: string; lines?: { id?: string; label: string; amount_cents: number | null; quote_required: boolean }[];
  subtotal_cents?: number; quote_required?: boolean; delivery_options?: { method: string; fee_cents: number | null; notes: string | null }[]; problems?: { id: string; name?: string; issue: string }[]; lead_time_weeks?: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase as any).rpc(fn, args);
export const DELIVERY_LABELS: Record<string, string> = { factory_pickup: 'Pick up at factory', delivered: 'Delivered', towed: 'Towed to you', flatbed: 'Flatbed delivery', other: 'Other' };
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
type Saved = { name: string; savedAt: string; config: BuildConfig };
const readSaves = (): Saved[] => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch { return []; } };

export default function BuildStudio() {
  const [zip, setZip] = useState('');
  const [started, setStarted] = useState(false);
  const { user } = useAuth();
  const [stage, setStage] = useState<'zip' | 'checking' | 'not_covered' | 'build'>('zip');
  const [partner, setPartner] = useState<{ models: PartnerModel[]; equipment: PartnerEquipment[] } | null>(null);
  const [modelId, setModelId] = useState('');
  const [serverPrice, setServerPrice] = useState<ServerPrice | null>(null);
  const [pricing, setPricing] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [reqSent, setReqSent] = useState(false);
  const [zipError, setZipError] = useState('');
  const [delivery, setDelivery] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [config, setConfig] = useState<BuildConfig>({ color: 'white', items: [] });
  const [view, setView] = useState<ViewMode>('exterior');
  const [roof, setRoof] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState('');
  const [saves, setSaves] = useState<Saved[]>([]);
  const [saveName, setSaveName] = useState('');
  useEffect(() => setSaves(readSaves()), []);
  useEffect(() => () => resetToDemoCatalog(), []);

  const startZip = async () => {
    setStage('checking'); setZipError('');
    const { data, error } = await rpc('bs_resolve_zip', { p_zip: zip });
    if (error) { setStage('zip'); setZipError("We couldn't check that ZIP code. Please try again."); return; }
    if (data?.status === 'invalid_zip') { setStage('zip'); setZipError('Enter a valid 5-digit ZIP code.'); return; }
    if (data?.status === 'covered' && data.models?.length) {
      setPartner({ models: data.models, equipment: data.equipment ?? [] });
      pickModel(data.models[0], data.equipment ?? []);
      setStarted(true); setStage('build'); return;
    }
    setStage('not_covered');
  };
  const pickModel = (m: PartnerModel, eq: PartnerEquipment[]) => {
    setPartnerCatalog(m, eq); setModelId(m.id); setConfig({ color: 'white', items: [], finish: FINISHES[0]?.id }); setDelivery(''); setSavedId(null); setSelected(null); setServerPrice(null);
  };
  const startDemo = () => { resetToDemoCatalog(); setPartner(null); setModelId(''); setStarted(true); setStage('build'); };
  const requestCoverage = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reqEmail.trim())) { setZipError('Enter a valid email.'); return; }
    const { error } = await supabase.from('bs_coverage_requests').insert({ zip, email: reqEmail.trim().slice(0, 255), user_id: user?.id ?? null });
    if (error) setZipError("Couldn't send your request. Please try again."); else { setReqSent(true); setZipError(''); }
  };

  // Server is the authority for partner pricing; recompute after each change.
  const equipmentIds = [...config.items.map((i) => i.id), ...(config.finish ? [config.finish] : [])].join(',');
  useEffect(() => {
    if (!partner || !modelId) return;
    let live = true; setPricing(true);
    const t = setTimeout(async () => {
      const { data, error } = await rpc('bs_price_build', { p_zip: zip, p_model_id: modelId, p_equipment_ids: equipmentIds ? equipmentIds.split(',') : [], p_delivery_method: delivery || null });
      if (!live) return;
      setPricing(false);
      setServerPrice(error ? { status: 'error' } : data);
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [partner, modelId, equipmentIds, zip, delivery]);
  useEffect(() => setSavedId(null), [equipmentIds, delivery, config.items]);

  const price = useMemo(() => priceBuild(config), [config]);
  const sel = config.items.find((i) => i.uid === selected);
  const allIssues = config.items.flatMap((i) => placementIssues(config, i.uid).map((m) => `${specOf(i.id).name}: ${m}`));

  const add = (id: string) => {
    for (const wall of ['back', 'service'] as Wall[]) {
      const x = findFreeSpot(config, id, wall);
      if (x !== null) {
        const uid = `${id}-${Date.now()}`;
        setConfig((c) => ({ ...c, items: [...c.items, { uid, id, wall, x }] }));
        setSelected(uid); setNotice(''); if (view === 'exterior') setView('interior');
        return;
      }
    }
    setNotice(`No room left for the ${specOf(id).name}. Remove or move something first.`);
  };
  const update = (patch: Partial<{ x: number; wall: Wall }>) =>
    setConfig((c) => ({ ...c, items: c.items.map((i) => (i.uid === selected ? { ...i, ...patch } : i)) }));
  const remove = () => { setConfig((c) => ({ ...c, items: c.items.filter((i) => i.uid !== selected) })); setSelected(null); };
  const persist = (next: Saved[]) => { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); setSaves(next); };
  const save = async () => {
    if (partner) {
      if (!user) { setNotice('Sign in to save this build to your account.'); return; }
      const { data, error } = await rpc('bs_save_build', { p_zip: zip, p_model_id: modelId, p_config: config, p_name: saveName.trim() || null, p_delivery_method: delivery || null });
      setNotice(error ? `Couldn't save: ${error.message}` : 'Saved to your account with today\'s prices and catalog version.');
      if (!error) { setSaveName(''); setSavedId(data as string); }
      return;
    }
    const name = saveName.trim() || `Build ${saves.length + 1}`;
    persist([{ name, savedAt: new Date().toISOString(), config }, ...saves.filter((s) => s.name !== name)].slice(0, 10));
    setSaveName(''); setNotice(`Saved “${name}” on this device.`);
  };

  const submitForReview = async () => {
    if (!user) { setNotice('Sign in to send your build for engineering review.'); return; }
    let id = savedId;
    if (!id) {
      const { data, error } = await rpc('bs_save_build', { p_zip: zip, p_model_id: modelId, p_config: config, p_name: saveName.trim() || null, p_delivery_method: delivery || null });
      if (error) { setNotice(`Couldn't save: ${error.message}`); return; }
      id = data as string;
    }
    const { error } = await rpc('bs_submit_build', { p_build_id: id, p_note: null });
    setNotice(error ? `Couldn't send: ${error.message}` : 'Sent to the build partner for engineering review. Track it in My builds.');
    if (!error) setSavedId(null);
  };

  if (!started) {
    return <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Build Studio — design your food trailer in 3D" description="Design a 16 ft concession trailer in 3D: pick colors, add kitchen equipment and see a preliminary build price." canonical="/build-studio" />
      <Header />
      <main className="flex-1 container max-w-xl py-16">
        <p className="text-xs uppercase tracking-widest text-primary">Build Studio · Prototype</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Design your food trailer in 3D</h1>
        <p className="mt-3 text-muted-foreground">Start with a 16 ft concession trailer, add kitchen equipment, and watch a preliminary price update as you go.</p>
        {stage === 'not_covered' ? <div className="mt-8 space-y-4 rounded-xl border border-border p-5">
          <p className="font-medium text-foreground">No build partner serves ZIP {zip} yet.</p>
          <p className="text-sm text-muted-foreground">Leave your email and we'll let you know when a regional manufacturer is available near you.</p>
          {reqSent ? <p className="text-sm text-primary" role="status">Thanks — you're on the early-access list.</p> : <div className="flex gap-2">
            <Input type="email" placeholder="you@example.com" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} className="text-base" aria-label="Email" />
            <Button onClick={requestCoverage}>Notify me</Button>
          </div>}
          {zipError && <p className="text-sm text-destructive">{zipError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={startDemo}>Explore the demo designer</Button>
            <Button variant="ghost" onClick={() => { setStage('zip'); setReqSent(false); }}>Try another ZIP</Button>
          </div>
        </div> : <>
        <form className="mt-8 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d{5}$/.test(zip)) void startZip(); }}>
          <Input inputMode="numeric" maxLength={5} placeholder="ZIP code" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))} className="text-base" aria-label="ZIP code" />
          <Button type="submit" disabled={!/^\d{5}$/.test(zip) || stage === 'checking'}>{stage === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start building'}</Button>
        </form>
        {zipError && <p className="mt-2 text-sm text-destructive">{zipError}</p>}
        <p className="mt-3 text-xs text-muted-foreground">Your ZIP code connects you with the regional build partner that serves your area.</p>
        </>}
      </main>
      <Footer />
    </div>;
  }

  return <div className="min-h-screen flex flex-col bg-background">
    <SEO title="Build Studio — design your food trailer in 3D" description="Design a 16 ft concession trailer in 3D." canonical="/build-studio" noindex />
    <Header />
    <div className="border-b border-border bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
      {DEMO_DATA ? <>Demo · ZIP {zip} · Demonstration prices and specs — not a quote.</> : <>ZIP {zip} · Regional build partner catalog · Preliminary pricing until engineering review — not a quote.</>}
    </div>
    <main className="flex-1 grid lg:grid-cols-[1fr_380px]">
      <section className="relative min-h-[420px] lg:min-h-0">
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <div className="absolute inset-0"><TrailerScene config={config} view={view} roof={roof} selected={selected} onSelect={setSelected} /></div>
        </Suspense>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {(['exterior', 'interior', 'plan'] as ViewMode[]).map((v) => <Button key={v} size="sm" variant={view === v ? 'default' : 'secondary'} onClick={() => setView(v)}>
            {v === 'plan' ? 'Floor plan' : v[0].toUpperCase() + v.slice(1)}</Button>)}
          <Button size="sm" variant="secondary" onClick={() => setRoof((r) => !r)} disabled={view !== 'exterior'}>{roof ? 'Remove roof' : 'Add roof'}</Button>
        </div>
        <p className="absolute bottom-3 left-3 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">Drag to rotate · scroll or pinch to zoom · tap equipment to select. Preview only, not engineering CAD.</p>
      </section>

      <aside className="space-y-6 border-l border-border p-5 lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto">
        {partner && partner.models.length > 1 && <div>
          <h2 className="text-sm font-semibold text-foreground">Model</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {partner.models.map((m) => <Button key={m.id} size="sm" variant={m.id === modelId ? 'default' : 'outline'} onClick={() => pickModel(m, partner.equipment)}>{m.name}</Button>)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Switching models clears placed equipment.</p>
        </div>}
        <div>
          <h2 className="text-sm font-semibold text-foreground">Exterior {partner && FINISHES.length ? 'finish' : `color${partner ? ' (preview)' : ''}`}</h2>
          {partner && FINISHES.length > 0 ? <div className="mt-2 space-y-1">
            {FINISHES.map((f) => <button key={f.id} type="button" aria-pressed={config.finish === f.id} onClick={() => setConfig((x) => ({ ...x, finish: f.id }))}
              className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm ${config.finish === f.id ? 'border-primary' : 'border-border'}`}>
              <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={{ background: f.hex }} />
              <span className="flex-1 text-foreground">{f.name}</span>
              <span className="text-xs text-muted-foreground">{f.price == null ? 'Quote' : f.price === 0 ? 'Included' : `+${money(f.price)}`}</span>
            </button>)}
          </div> : <div className="mt-2 flex flex-wrap gap-2">
            {EXTERIOR_COLORS.map((c) => <button key={c.id} type="button" title={`${c.name}${c.price && !partner ? ` +${money(c.price)}` : ''}`} aria-label={c.name} aria-pressed={config.color === c.id}
              onClick={() => setConfig((x) => ({ ...x, color: c.id }))}
              className={`h-9 w-9 rounded-full border-2 ${config.color === c.id ? 'border-primary' : 'border-border'}`} style={{ background: c.hex }} />)}
          </div>}
        </div>

        {!partner && <div>
          <h2 className="text-sm font-semibold text-foreground">What will you serve?</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(MENU_SUGGESTIONS).map((m) => <Button key={m} size="sm" variant={menu === m ? 'default' : 'outline'} onClick={() => setMenu(m)}>{m}</Button>)}
          </div>
          {menu && <p className="mt-2 text-xs text-muted-foreground">Typical for {menu}: {MENU_SUGGESTIONS[menu].map((id) => specOf(id).name).join(', ')}. Most health departments also require a {ALWAYS_REQUIRED.map((id) => specOf(id).name.toLowerCase()).join(' and a ')}. Check your local rules.</p>}
        </div>}

        <div>
          <h2 className="text-sm font-semibold text-foreground">Add equipment</h2>
          <ul className="mt-2 space-y-2">
            {EQUIPMENT.map((e) => {
              const count = config.items.filter((i) => i.id === e.id).length;
              const hint = (menu && MENU_SUGGESTIONS[menu].includes(e.id)) || ALWAYS_REQUIRED.includes(e.id);
              return <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.name}{hint && menu ? <span className="ml-1 text-xs text-primary">suggested</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{e.category} · {e.price == null ? 'Requires manufacturer quote' : money(e.price)}{count ? ` · ${count} added` : ''}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => add(e.id)}>Add</Button>
              </li>;
            })}
          </ul>
          {notice && <p className="mt-2 text-xs text-muted-foreground" role="status">{notice}</p>}
        </div>

        {sel && (() => { const s = specOf(sel.id); const issues = placementIssues(config, sel.uid); return <div className="rounded-xl border border-primary/40 p-3">
          <div className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">{s.name}</h2></div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Size</dt><dd>{Math.round(s.w * 39.37)}″ W × {Math.round(s.d * 39.37)}″ D × {Math.round(s.h * 39.37)}″ H</dd>
            <dt className="text-muted-foreground">Utilities</dt><dd>{s.power}</dd>
            {s.needs.length > 0 && <><dt className="text-muted-foreground">Also needs</dt><dd>{s.needs.join(', ')}</dd></>}
            <dt className="text-muted-foreground">Price</dt><dd>{s.price == null ? 'Requires manufacturer quote' : `${money(s.price)}${DEMO_DATA ? ' (demo)' : ' (preliminary)'}`}</dd>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" aria-label="Move left" onClick={() => update({ x: +(sel.x - 0.1).toFixed(2) })}><ArrowLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" aria-label="Move right" onClick={() => update({ x: +(sel.x + 0.1).toFixed(2) })}><ArrowRight className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => update({ wall: sel.wall === 'back' ? 'service' : 'back' })}>Move to {sel.wall === 'back' ? 'window side' : 'back wall'}</Button>
            <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>
          </div>
          {issues.length > 0 && <p className="mt-2 text-xs text-destructive" role="alert">{issues.join(' · ')}</p>}
        </div>; })()}

        <div className="rounded-xl bg-muted/50 p-4">
          <h2 className="text-sm font-semibold text-foreground">Preliminary build price</h2>
          {partner ? <>
            {serverPrice?.status === 'error' && <p className="mt-2 text-xs text-destructive">Couldn't refresh the price. Your design is safe — change anything to try again.</p>}
            <ul className="mt-2 space-y-1 text-xs">
              {(serverPrice?.lines ?? []).map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="text-muted-foreground">{l.label}</span><span>{l.amount_cents == null ? 'Quote required' : cents(l.amount_cents)}</span></li>)}
              {!delivery && <li className="flex justify-between gap-2"><span className="text-muted-foreground">Delivery</span><span>Choose below</span></li>}
            </ul>
            {(serverPrice?.delivery_options ?? []).length > 0 ? <label className="mt-3 block text-xs text-muted-foreground">Delivery
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
                <option value="">Choose delivery…</option>
                {serverPrice!.delivery_options!.map((o) => <option key={o.method} value={o.method}>{DELIVERY_LABELS[o.method] ?? o.method} · {o.fee_cents == null ? 'quoted' : o.fee_cents === 0 ? 'free' : cents(o.fee_cents)}{o.notes ? ` · ${o.notes}` : ''}</option>)}
              </select></label> : <p className="mt-2 text-xs text-muted-foreground">Delivery is quoted by the build partner.</p>}
            {(serverPrice?.problems ?? []).length > 0 && <p className="mt-2 text-xs text-destructive">{serverPrice!.problems!.map((p) => `${p.name ?? specOf(p.id).name}: ${p.issue === 'incompatible' ? 'not compatible with this model' : 'no longer available'}`).join(' · ')}</p>}
            <p className="mt-3 flex justify-between border-t border-border pt-2 text-base font-semibold"><span>{serverPrice?.quote_required ? 'Known subtotal' : 'Preliminary subtotal'}</span>
              <span>{pricing && !serverPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : cents(serverPrice?.subtotal_cents ?? 0)}</span></p>
            {serverPrice?.quote_required && <p className="mt-1 text-xs text-muted-foreground">Some items require a manufacturer quote, so the final price will be higher than this subtotal.</p>}
            {serverPrice?.lead_time_weeks ? <p className="mt-1 text-xs text-muted-foreground">Estimated build time: about {serverPrice.lead_time_weeks} weeks.</p> : null}
            <p className="mt-2 text-[11px] text-muted-foreground">Preliminary price from the regional build partner's current catalog. Taxes aren't included. The final quote comes only after engineering review, and nothing is charged now.</p>
          </> : <>
          <ul className="mt-2 space-y-1 text-xs">
            {price.lines.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="text-muted-foreground">{l.label}</span><span>{l.amount == null ? 'Quote required' : money(l.amount)}</span></li>)}
          </ul>
          <p className="mt-3 flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Estimate</span><span>{money(price.total)}</span></p>
          <p className="mt-2 text-[11px] text-muted-foreground">Demonstration pricing. Delivery, taxes and fees aren't included. A final manufacturing quote comes only after a build partner's engineering review.</p>
          </>}
          {allIssues.length > 0 && <p className="mt-2 text-xs text-destructive">Fix {allIssues.length} layout issue{allIssues.length > 1 ? 's' : ''} before saving a final layout.</p>}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Save and reload</h2>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Build name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="text-base" />
            <Button onClick={save}><Save className="mr-1 h-4 w-4" />Save</Button>
          </div>
          {saves.length > 0 && !partner && <ul className="mt-2 space-y-1">
            {saves.map((s) => <li key={s.name} className="flex items-center justify-between text-xs">
              <span className="truncate">{s.name} · {new Date(s.savedAt).toLocaleDateString()}</span>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setConfig(s.config); setSelected(null); setNotice(`Loaded “${s.name}”.`); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => persist(saves.filter((x) => x.name !== s.name))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </span>
            </li>)}
          </ul>}
          {partner && <div className="mt-3 space-y-2">
            <Button className="w-full" onClick={submitForReview} disabled={allIssues.length > 0 || serverPrice?.status !== 'ok'}>Send for engineering review</Button>
            <p className="text-[11px] text-muted-foreground">The build partner checks your layout and sends a final quote. Nothing is charged, and you approve any changes.</p>
            {user && <Link to="/build-studio/my-builds" className="text-xs text-primary underline">My builds and quotes</Link>}
          </div>}
          <p className="mt-1 text-[11px] text-muted-foreground">{partner ? 'Partner builds save to your Vendibook account with the exact prices and catalog version used.' : 'Demo builds are saved on this device.'}</p>
        </div>
      </aside>
    </main>
  </div>;
}
