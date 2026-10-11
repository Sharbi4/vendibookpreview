import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Beef, Cake, Check, ChevronLeft, ChevronRight, Coffee, Croissant, Egg, Expand, Flame, FolderOpen, Grid3x3, HelpCircle,
  IceCreamCone, Info, Layers, Loader2, MapPin, Maximize, Minus, Pizza, Plus, Refrigerator, Ruler, RotateCcw, Sandwich, Save, Tag, Trash2,
  Truck, Utensils, Wrench, X, Zap, Droplets, Palette, Sparkles, ShieldCheck, Pencil, Copy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import StudioPreview, { FloorPlan } from '@/components/buildStudio/StudioPreview';
import { DRAFT_KEY, SAVES_KEY, readDrafts, type StudioDraft } from '@/lib/buildStudio/drafts';
import '@/components/buildStudio/studio.css';
import { DELIVERY_LABELS } from '@/lib/buildStudio/partnerCatalog';
import {
  DEMO_DATA, EQUIPMENT, FINISHES, EXTERIOR_COLORS, TRAILER, findFreeSpot, placementIssues, priceBuild, setPartnerCatalog, specOf,
  resetToDemoCatalog, type BuildConfig, type EquipmentSpec, type PartnerEquipment, type PartnerModel, type Wall,
} from '@/lib/buildStudio/catalog';
import { BUSINESS_CATEGORIES, PANEL_GROUPS, greatFor, recommend } from '@/lib/buildStudio/business';
import type { ViewMode } from '@/components/buildStudio/TrailerScene';

const TrailerScene = StudioPreview;
const SAVE_KEY = SAVES_KEY;
const cents = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const inch = (m: number) => Math.round(m * 39.37);
type ServerPrice = { status: string; lines?: { id?: string; label: string; amount_cents: number | null; quote_required: boolean }[];
  subtotal_cents?: number; quote_required?: boolean; delivery_options?: { method: string; fee_cents: number | null; notes: string | null }[]; problems?: { id: string; name?: string; issue: string }[]; lead_time_weeks?: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase as any).rpc(fn, args);
type Saved = StudioDraft;
type Step = 'landing' | 'zip' | 'business' | 'studio' | 'review';

const CAT_ICONS: Record<string, typeof Beef> = { burgers: Sandwich, tacos: Utensils, pizza: Pizza, bbq: Flame, coffee: Coffee, dessert: IceCreamCone, breakfast: Egg, bakery: Croissant, other: Cake };
const GROUP_ICONS: Record<string, typeof Beef> = { trailer: Truck, cooking: Flame, refrigeration: Refrigerator, plumbing: Droplets, prep: Layers, power: Zap, other: Wrench, finishes: Palette };
const groupOf = (category: string) => PANEL_GROUPS.find((g) => g.categories.includes(category))?.id ?? 'other';

function StudioNav({ onHome, onBuilds, onHelp, user }: { onHome: () => void; onBuilds: () => void; onHelp: () => void; user: boolean }) {
  return <header className="bs-nav">
    <div className="bs-brand"><Link to="/" aria-label="Back to Vendibook"><img src="/brand/vendibook-logo-email.png" alt="Vendibook" /></Link>
      <span><button type="button" onClick={onHome}>Build Studio</button></span></div>
    <nav aria-label="Build Studio">
      <button onClick={onBuilds}><FolderOpen size={15} />My builds</button>
      <button className="bs-help" onClick={onHelp}><HelpCircle size={15} />Help</button>
      <Link className="bs-nav-save" to={user ? '/dashboard' : '/auth?redirect=/build-studio'}>{user ? 'My account' : 'Sign in'}<ArrowRight size={14} /></Link>
    </nav>
  </header>;
}

const Pane = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-2xl border border-border bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] ${className}`}>{children}</div>;

export default function BuildStudio() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('landing');
  const [zip, setZip] = useState('');
  const [zipState, setZipState] = useState<'idle' | 'checking' | 'covered' | 'not_covered'>('idle');
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
  const [labels, setLabels] = useState(false);
  const [dims, setDims] = useState(false);
  const [grid, setGrid] = useState(false);
  const [cmd, setCmd] = useState<{ kind: 'in' | 'out' | 'reset'; n: number }>({ kind: 'reset', n: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [menuText, setMenuText] = useState('');
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [saves, setSaves] = useState<Saved[]>([]);
  const [saveName, setSaveName] = useState('');
  const [panel, setPanel] = useState('trailer');
  const [learn, setLearn] = useState<EquipmentSpec | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [heroColor, setHeroColor] = useState('white');
  const [mobileOptions, setMobileOptions] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [guideTopic, setGuideTopic] = useState<'menu' | 'power' | 'review'>('menu');
  const [showBuilds, setShowBuilds] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [recovered, setRecovered] = useState<Saved | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [storageError, setStorageError] = useState('');
  const [priceAttempt, setPriceAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { setSaves(readDrafts(localStorage)); setRecovered(readDrafts(localStorage, DRAFT_KEY)[0] ?? null); }
    catch { setStorageError('Saved drafts could not be read. Existing device data has been preserved.'); }
  }, []);
  useEffect(() => {
    if (partner || (step !== 'studio' && step !== 'review') || storageError) return;
    setSaveStatus('Saving on this device…');
    const timeout = setTimeout(() => {
      const draft = { name: saveName.trim() || 'My kitchen concept', savedAt: new Date().toISOString(), config, categories: cats, menu: menuItems };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify([draft])); setRecovered(draft); setSaveStatus('All changes saved on this device'); }
      catch { setSaveStatus('Device save failed. Your design is still here.'); }
    }, 600);
    return () => clearTimeout(timeout);
  }, [config, cats, menuItems, saveName, partner, step, storageError, saveAttempt]);
  useEffect(() => () => resetToDemoCatalog(), []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const checkZip = async () => {
    if (!/^\d{5}$/.test(zip)) { setZipError('Enter a 5-digit ZIP code.'); return; }
    setZipState('checking'); setZipError('');
    const { data, error } = await rpc('bs_resolve_zip', { p_zip: zip });
    if (error) { setZipState('idle'); setZipError("We couldn't check that ZIP code. Please try again."); return; }
    if (data?.status === 'invalid_zip') { setZipState('idle'); setZipError("That doesn't look like a valid ZIP code."); return; }
    if (data?.status === 'covered' && data.models?.length) {
      setPartner({ models: data.models, equipment: data.equipment ?? [] });
      pickModel(data.models[0], data.equipment ?? []);
      setZipState('covered'); return;
    }
    setZipState('not_covered');
  };
  const pickModel = (m: PartnerModel, eq: PartnerEquipment[]) => {
    setPartnerCatalog(m, eq); setModelId(m.id); setConfig({ color: 'white', items: [], finish: FINISHES[0]?.id }); setDelivery(''); setSavedId(null); setSelected(null); setServerPrice(null);
  };
  const startDemo = () => { resetToDemoCatalog(); setPartner(null); setModelId(''); setConfig({ color: 'white', items: [] }); setStep('business'); };
  const requestCoverage = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reqEmail.trim())) { setZipError('Enter a valid email.'); return; }
    const { error } = await supabase.from('bs_coverage_requests').insert({ zip, email: reqEmail.trim().slice(0, 255), user_id: user?.id ?? null });
    if (error) setZipError("Couldn't send your request. Please try again."); else { setReqSent(true); setZipError(''); }
  };

  // Server is the authority for partner pricing; recompute after each change.
  const equipmentIds = [...config.items.map((i) => i.id), ...(config.finish ? [config.finish] : [])].join(',');
  useEffect(() => {
    if (!partner || !modelId) return;
    let live = true; setPricing(true); setServerPrice(null);
    const t = setTimeout(async () => {
      const { data, error } = await rpc('bs_price_build', { p_zip: zip, p_model_id: modelId, p_equipment_ids: equipmentIds ? equipmentIds.split(',') : [], p_delivery_method: delivery || null });
      if (!live) return;
      setPricing(false);
      setServerPrice(error ? { status: 'error' } : data);
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [partner, modelId, equipmentIds, zip, delivery, priceAttempt]);
  useEffect(() => { setSavedId(null); setSubmitted(false); }, [config, delivery, modelId, zip]);

  const price = useMemo(() => priceBuild(config), [config]);
  const sel = config.items.find((i) => i.uid === selected);
  const allIssues = config.items.flatMap((i) => placementIssues(config, i.uid).map((m) => `${specOf(i.id).name}: ${m}`));
  const recs = useMemo(() => recommend(cats, menuItems, EQUIPMENT), [cats, menuItems, modelId, partner]); // eslint-disable-line react-hooks/exhaustive-deps

  const addTo = (c: BuildConfig, id: string): BuildConfig | null => {
    const s = specOf(id);
    for (const wall of (s.allowedWalls ?? ['back', 'service']) as Wall[]) {
      const x = findFreeSpot(c, id, wall);
      if (x !== null) return { ...c, items: [...c.items, { uid: `${id}-${Date.now()}-${c.items.length}`, id, wall, x }] };
    }
    return null;
  };
  const add = (id: string) => {
    const next = addTo(config, id);
    if (!next) { setNotice(`No room left for the ${specOf(id).name}. Remove or move something first.`); return; }
    setConfig(next); setSelected(next.items[next.items.length - 1].uid); setNotice(''); if (view === 'exterior') setView('interior');
  };
  const addRecommended = () => {
    let c = config; const skipped: string[] = [];
    for (const r of recs) {
      const item = r.available.find((e) => e.price !== null) ?? r.available[0];
      if (!item || c.items.some((i) => i.id === item.id)) continue;
      const next = addTo(c, item.id); if (next) c = next; else skipped.push(item.name);
    }
    setConfig(c); setStep('studio'); setView('interior');
    setNotice(skipped.length ? `Didn't fit: ${skipped.join(', ')}. Try a longer model or remove something.` : 'Suggested equipment added. Adjust anything you like.');
  };
  const update = (patch: Partial<{ x: number; wall: Wall }>) =>
    setConfig((c) => ({ ...c, items: c.items.map((i) => (i.uid === selected ? { ...i, ...patch } : i)) }));
  const remove = (uid = selected) => { setConfig((c) => ({ ...c, items: c.items.filter((i) => i.uid !== uid) })); setSelected(null); };
  const persist = (next: Saved[]) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); setSaves(next); return true; }
    catch { setNotice('Device storage is unavailable. Your design is still here — please retry.'); return false; }
  };
  const resume = (draft: Saved) => {
    resetToDemoCatalog(); setPartner(null); setModelId(''); setConfig(structuredClone(draft.config)); setCats(draft.categories ?? []); setMenuItems(draft.menu ?? []);
    setSaveName(draft.name); setSelected(null); setShowBuilds(false); setStep('studio'); setView('interior');
  };
  const save = async () => {
    if (saveBusy) return;
    if (partner) {
      if (!user) { setNotice('Sign in to save this build to your account.'); return; }
      setSaveBusy(true);
      try {
      const { data, error } = await rpc('bs_save_build', { p_zip: zip, p_model_id: modelId, p_config: config, p_name: saveName.trim() || null, p_delivery_method: delivery || null });
      setNotice(error ? "We couldn't save your build. Your design is still here — please try again." : "Saved to your account with today's prices.");
      if (!error) { setSaveName(''); setSavedId(data as string); }
      } catch { setNotice('Save failed. Your design is still here — please retry.'); }
      finally { setSaveBusy(false); }
      return;
    }
    const name = saveName.trim() || `Build ${saves.length + 1}`;
    if (storageError) { setNotice(storageError); return; }
    if (persist([{ name, savedAt: new Date().toISOString(), config, categories: cats, menu: menuItems }, ...saves.filter((s) => s.name !== name)].slice(0, 10))) {
      setNotice(`Saved “${name}” on this device.`);
    }
  };
  const submitForReview = async () => {
    if (submitting || submitted || !partner || pricing || serverPrice?.status !== 'ok' || allIssues.length || serverPrice?.problems?.length) return;
    if (!user) { setNotice('Sign in to send your build for engineering review.'); return; }
    setSubmitting(true);
    try {
    // Submit a fresh immutable snapshot; a prior save may have completed after an edit.
    let id: string | null = null;
    if (!id) {
      const { data, error } = await rpc('bs_save_build', { p_zip: zip, p_model_id: modelId, p_config: config, p_name: saveName.trim() || null, p_delivery_method: delivery || null });
      if (error) { setNotice("We couldn't save your build. Please try again."); return; }
      id = data as string;
    }
    const { error } = await rpc('bs_submit_build', { p_build_id: id, p_note: null });
    setNotice(error ? "We couldn't send your build. Please try again." : 'Sent for engineering review. Track it in My builds.');
    if (!error) { setSavedId(id); setSubmitted(true); }
    } catch { setNotice("We couldn't send your build. Your design is still here — please retry."); }
    finally { setSubmitting(false); }
  };
  const addMenu = () => {
    const items = menuText.split(/,|\n/).map((s) => s.trim()).filter((s) => s && s.length <= 40);
    if (items.length) setMenuItems((m) => [...new Set([...m, ...items])].slice(0, 20));
    setMenuText('');
  };
  const fullscreen = () => { const el = stageRef.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); };
  const camera = (kind: 'in' | 'out' | 'reset') => setCmd((c) => ({ kind, n: c.n + 1 }));

  const unavailableReason = (e: EquipmentSpec) => {
    if (findFreeSpot(config, e.id, 'back') === null && findFreeSpot(config, e.id, 'service') === null) return 'No room left in this layout.';
    return null;
  };

  // Price breakdown grouped like the brief: base, equipment groups, customization, delivery, other.
  const breakdown = useMemo(() => {
    const groups = new Map<string, { amount: number; quote: boolean }>();
    const put = (k: string, amt: number | null) => { const g = groups.get(k) ?? { amount: 0, quote: false }; if (amt == null) g.quote = true; else g.amount += amt; groups.set(k, g); };
    if (partner) {
      (serverPrice?.lines ?? []).forEach((l, i) => {
        const amt = l.amount_cents == null ? null : l.amount_cents / 100;
        if (i === 0 || l.id === modelId) put('Base trailer', amt);
        else if (l.id && FINISHES.some((f) => f.id === l.id)) put('Customization', amt);
        else if (l.id && EQUIPMENT.some((e) => e.id === l.id)) put(PANEL_GROUPS.find((g) => g.id === groupOf(specOf(l.id!).category))!.label, amt);
        else if (/deliver|pickup|tow|flatbed/i.test(l.label)) put('Delivery estimate', amt);
        else put('Other charges', amt);
      });
    } else {
      price.lines.forEach((l, i) => put(i === 0 ? 'Base trailer' : /^Exterior/.test(l.label) ? 'Customization' : (() => {
        const p = config.items[i - 2] ?? config.items.find((x) => specOf(x.id).name === l.label);
        return p ? PANEL_GROUPS.find((g) => g.id === groupOf(specOf(p.id).category))!.label : 'Other charges';
      })(), l.amount));
    }
    return [...groups.entries()];
  }, [partner, serverPrice, price, config.items, modelId]);
  const total = partner ? (serverPrice?.status === 'ok' && serverPrice.subtotal_cents != null ? serverPrice.subtotal_cents / 100 : null) : price.total;
  const priceLabel = total == null ? (pricing ? 'Updating…' : 'Price unavailable') : money(total);
  const incomplete = partner ? !!serverPrice?.quote_required : price.quoteRequired;
  const buildTitle = TRAILER.name;
  const concept = cats.length ? `Custom ${BUSINESS_CATEGORIES.find((c) => c.id === cats[0])?.name.split(' and ')[0].toLowerCase() ?? 'food'} kitchen` : 'Your kitchen. Your way.';

  const seo = <SEO title="Build Studio — design your food truck or trailer in 3D" description="Design a food truck or trailer around your menu: customize equipment in 3D, see preliminary pricing, and request an engineering-reviewed quote." canonical="/build-studio" noindex={step === 'studio'} />;
  const shell = (children: ReactNode) => <div className="sale-light build-studio min-h-screen">{seo}
    <StudioNav onHome={() => setStep('landing')} onBuilds={() => setShowBuilds(true)} onHelp={() => setShowHelp(true)} user={!!user} />{children}
    <Dialog open={showHelp} onOpenChange={setShowHelp}><DialogContent className="sale-light build-studio">
      <DialogTitle>From your idea to your kitchen</DialogTitle><DialogDescription>Build with confidence, one decision at a time.</DialogDescription>
      <ol className="space-y-4 text-sm leading-relaxed"><li><strong>1. Start with your location and menu.</strong> We check regional availability and suggest equipment from the available catalog.</li><li><strong>2. Make it yours.</strong> Select equipment and finishes. Rotate the trailer, look inside, or inspect the floor plan. All prices are preliminary.</li><li><strong>3. Review before you commit.</strong> A manufacturing partner must confirm engineering, delivery, the final quote and legal terms before purchase.</li></ol>
      <p className="text-xs text-muted-foreground">Demo designs save on this device. Regional builds require sign-in to save to your account. No payment is collected in this preview.</p>
      <Link to="/contact" className="text-sm text-primary underline">Contact Vendibook</Link>
    </DialogContent></Dialog>
    <Dialog open={showBuilds} onOpenChange={setShowBuilds}><DialogContent className="sale-light build-studio max-w-4xl max-h-[85dvh] overflow-y-auto">
      <DialogTitle>My builds</DialogTitle><DialogDescription>Your kitchen ideas, ready when you are. These demo drafts are stored on this device.</DialogDescription>
      <Link to="/build-studio/my-builds" className="text-sm text-primary underline">View account builds, engineering reviews and quotes →</Link>
      {storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
      {!saves.length && !recovered && <p className="py-8 text-muted-foreground">Your next business starts with an idea. Start designing to create your first draft.</p>}
      {recovered && <Button variant="outline" onClick={() => resume(recovered)}>Resume last autosaved design</Button>}
      <div className="bs-local-grid">{saves.map(s => <article className="bs-draft-card" key={s.name}>
        {!partner && <FloorPlan config={s.config} selected={null} onSelect={() => resume(s)} />}
        <div className="bs-draft-body"><span className="bs-preview-badge">Demo draft</span><h2 className="mt-3">{s.name}</h2><p>{new Date(s.savedAt).toLocaleDateString()} · {s.config.items.length} equipment items</p>
          {!partner && <p>{money(priceBuild(s.config).total)} · demonstration price</p>}
          <div className="bs-draft-actions"><Button size="sm" onClick={() => resume(s)}>Continue designing</Button>
            <Button size="sm" variant="outline" aria-label={`Duplicate ${s.name}`} onClick={() => { const name = `${s.name.slice(0, 48)} copy ${Date.now().toString().slice(-5)}`; persist([{ ...s, name, savedAt: new Date().toISOString() }, ...saves].slice(0, 10)); }}><Copy size={14} /></Button>
            <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => { if (window.confirm(`Delete the device draft “${s.name}”?`)) persist(saves.filter(x => x.name !== s.name)); }}><Trash2 size={14} /></Button></div>
        </div></article>)}</div>
    </DialogContent></Dialog>
  </div>;

  /* ---------------- Landing ---------------- */
  if (step === 'landing') return shell(<main>
    <section className="bs-hero">
      <div className="bs-hero-copy">
        <p className="bs-eyebrow">A little imagination. A whole new business.</p>
        <h1>Your business.<br /><em>Your build.</em></h1>
        <p className="bs-hero-description">The kitchen you've been dreaming about.<br />Designed around your menu, your vision,<br className="hidden sm:block" /> and your next chapter.</p>
        <div className="bs-hero-actions"><Button onClick={() => setStep('zip')}>Start designing<ArrowRight className="ml-3 h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setShowHelp(true)}>How it works</Button></div>
        <p className="bs-hero-note"><ShieldCheck size={14} />Explore freely. Engineering review before you commit.</p>
        {recovered && <button className="mt-5 text-xs text-primary underline" onClick={() => resume(recovered)}>Welcome back — continue your design →</button>}
      </div>
      <div className="bs-hero-stage"><TrailerScene config={{ color: heroColor, items: [] }} view="exterior" roof selected={null} onSelect={() => {}} /></div>
      <div className="bs-hero-controls"><span>Make it yours</span>{EXTERIOR_COLORS.map(c => <button key={c.id} aria-label={`Preview ${c.name}`} aria-pressed={heroColor === c.id} style={{ background: c.hex }} onClick={() => setHeroColor(c.id)} />)}</div>
      <p className="bs-hero-caption">Drag to explore · Concept visualization, subject to engineering approval</p>
    </section>
    <div className="bs-trust-strip"><span><Layers size={16} />Your menu. Your layout.</span><span><RotateCcw size={16} />Explore every angle in 3D</span><span><ShieldCheck size={16} />Reviewed before it's built</span></div>
    <section id="how" className="bs-how">
      <div>
        <div className="bs-how-heading"><h2>Big dreams. A clear next step.</h2><p>From “what if” to your first service.</p></div>
        <ol>
          {[['Tell us about your business', 'Share your location and what you want to serve. We suggest a kitchen setup that fits.'],
            ['Customize your mobile kitchen in 3D', 'Add equipment, choose finishes and watch the preliminary price update as you go.'],
            ['Receive an engineering-reviewed quote', 'A regional manufacturing partner checks your design and sends a final quote. Nothing is charged until you approve.']]
            .map(([t, d], i) => <li key={t}><span>0{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}
        </ol>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">Designs and prices in Build Studio are preliminary. A manufacturing partner validates the final specifications before anything is built.</p>
      </div>
    </section>
  </main>);

  /* ---------------- ZIP ---------------- */
  if (step === 'zip') return shell(<main className="mx-auto max-w-xl px-4 py-16 sm:py-24">
    <Progress at={1} />
    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Where will your business operate?</h1>
    <p className="mt-3 text-muted-foreground">We'll use your location to find available build options and estimate delivery costs.</p>
    {zipState !== 'not_covered' ? <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (zipState === 'covered') setStep('business'); else void checkZip(); }}>
      <label htmlFor="bs-zip" className="text-sm font-medium text-foreground">ZIP code</label>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input id="bs-zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="85004" value={zip} aria-invalid={!!zipError} aria-describedby="bs-zip-msg"
            onChange={(e) => { setZip(e.target.value.replace(/\D/g, '')); setZipState('idle'); setZipError(''); }} className="h-14 rounded-xl pl-10 text-lg tracking-widest" />
        </div>
        <Button type="submit" className="h-14 rounded-xl px-6" disabled={zipState === 'checking'}>{zipState === 'checking' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}</Button>
      </div>
      <p id="bs-zip-msg" role="status" className={`mt-3 text-sm ${zipError ? 'text-destructive' : 'text-muted-foreground'}`}>
        {zipError || (zipState === 'covered' ? <span className="inline-flex items-center gap-1.5 text-foreground"><Check className="h-4 w-4 text-primary" />Great! Build Studio is available in your area.</span> : 'Five digits, e.g. 85004.')}
      </p>
      {import.meta.env.DEV && <div className="mt-8 rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Local design preview · sample catalog only. This does not establish regional availability.</p><Button type="button" variant="outline" className="mt-3" onClick={startDemo}>Explore with demo pricing</Button></div>}
    </form> : <Pane className="mt-8 p-6">
      <p className="font-medium text-foreground">Build Studio isn't available in {zip} yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">We don't have a manufacturing partner serving your area today. Leave your email and we'll let you know when one is.</p>
      {reqSent ? <p className="mt-4 text-sm text-foreground" role="status"><Check className="mr-1 inline h-4 w-4 text-primary" />Thanks — we'll email you when coverage opens.</p> : <div className="mt-4 flex gap-2">
        <Input type="email" placeholder="you@example.com" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} className="h-11 text-base" aria-label="Email" />
        <Button className="h-11" onClick={requestCoverage}>Notify me</Button>
      </div>}
      {zipError && <p className="mt-2 text-sm text-destructive">{zipError}</p>}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
        <Button variant="outline" onClick={startDemo}>Explore with demo pricing</Button>
        <Button variant="ghost" onClick={() => { setZipState('idle'); setReqSent(false); }}>Try another ZIP</Button>
      </div>
    </Pane>}
  </main>);

  /* ---------------- Business ---------------- */
  if (step === 'business') return shell(<main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
    <Progress at={2} />
    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">What are you dreaming of serving?</h1>
    <p className="mt-3 text-muted-foreground">Tell us about your menu, and we'll help you find the right kitchen setup. Pick as many as you like.</p>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BUSINESS_CATEGORIES.map((c) => { const Icon = CAT_ICONS[c.id]; const on = cats.includes(c.id);
        return <button key={c.id} type="button" aria-pressed={on} onClick={() => setCats((x) => on ? x.filter((y) => y !== c.id) : [...x, c.id])}
          className={`relative rounded-2xl border bg-card p-5 text-left transition-all motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30'}`}>
          {on && <Check className="absolute right-4 top-4 h-4 w-4 text-primary" />}
          <span className={`grid h-11 w-11 place-items-center rounded-xl ${on ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'}`}><Icon className="h-5 w-5" /></span>
          <p className="mt-4 font-medium text-foreground">{c.name}</p><p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
        </button>; })}
    </div>

    {cats.length > 0 && <section className="mt-10 motion-safe:animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">What would you like to put on your menu?</h2>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addMenu(); }}>
        <Input value={menuText} onChange={(e) => setMenuText(e.target.value)} placeholder="Burgers, fries, cheesesteaks, milkshakes" className="h-12 text-base" maxLength={300} aria-label="Menu items" />
        <Button type="submit" variant="outline" className="h-12">Add</Button>
      </form>
      {menuItems.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{menuItems.map((m) => <li key={m} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground">
        {m}<button type="button" aria-label={`Remove ${m}`} onClick={() => setMenuItems((x) => x.filter((y) => y !== m))} className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button></li>)}</ul>}

      <h2 className="mt-10 text-xl font-semibold text-foreground">Suggested for your menu</h2>
      <p className="mt-1 text-sm text-muted-foreground">These are general suggestions based on what you'll serve — not manufacturer or health-department requirements. You decide what goes in.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {recs.map((r) => <li key={r.kind}><Pane className="h-full p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-foreground">{r.label}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${r.available.length ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{r.available.length ? (DEMO_DATA ? 'In demo catalog' : 'Available in your area') : 'Not offered yet'}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{r.does}</p>
          <p className="mt-2 text-xs text-muted-foreground">{r.reason === 'health' ? 'Most health departments require this.' : `Why: supports ${r.supports.slice(0, 4).join(', ')}.`}</p>
        </Pane></li>)}
      </ul>
    </section>}

    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
      <Button variant="ghost" onClick={() => setStep('zip')}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setStep('studio')}>Skip and configure manually</Button>
        <Button disabled={!recs.some((r) => r.available.length)} onClick={addRecommended}>Start with these suggestions<ArrowRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </div>
  </main>);

  if (step === 'review') return shell(<main className="bs-review">
    <Button variant="ghost" disabled={submitting} onClick={() => { if (submitted) { setSubmitted(false); setSavedId(null); setNotice('Creating a new revision. Your submitted build remains unchanged.'); } setStep('studio'); }}><ArrowLeft size={16} className="mr-2" />{submitted ? 'Create a revised design' : 'Back to designing'}</Button>
    <p className="bs-eyebrow mt-7">{submitted ? 'Your next chapter' : 'One step closer'}</p>
    <h1>{submitted ? 'Your vision is in review.' : 'Your vision is taking shape.'}</h1>
    <p className="text-muted-foreground max-w-2xl">{submitted ? 'Your submitted revision is locked. Follow engineering updates and your final quote in My builds.' : 'Take a moment to review your kitchen. A manufacturing partner will need to validate the configuration, pricing and delivery before you commit.'}</p>
    <div className="bs-review-grid"><div><div className="bs-review-preview"><TrailerScene config={config} view="exterior" roof selected={null} onSelect={() => {}} /></div>
      <Pane className="mt-5 p-6"><h2 className="font-semibold">{buildTitle}</h2><p className="text-sm text-muted-foreground mt-2">{concept}</p><p className="text-sm text-muted-foreground mt-2">{inch(TRAILER.length)}″ L × {inch(TRAILER.width)}″ W × {inch(TRAILER.height)}″ H · {FINISHES.find(f => f.id === config.finish)?.name ?? EXTERIOR_COLORS.find(c => c.id === config.color)?.name}</p><FloorPlan config={config} selected={null} onSelect={() => {}} /></Pane></div>
      <Pane className="p-6 self-start"><span className="bs-preview-badge">{DEMO_DATA ? 'Demonstration pricing' : 'Preliminary estimate'}</span><h2 className="text-xl font-semibold mt-4">Your build, at a glance</h2>
        <ul className="my-5 space-y-3 text-sm">{(partner ? (serverPrice?.lines ?? []).map(l => ({ label: l.label, amount: l.amount_cents == null ? null : l.amount_cents / 100 })) : price.lines).map((l, i) => <li className="flex justify-between gap-4" key={i}><span className="text-muted-foreground">{l.label}</span><span>{l.amount == null ? 'Quote required' : money(l.amount)}</span></li>)}</ul>
        <div className="border-t border-border pt-4"><p className="text-xs text-muted-foreground">{incomplete ? 'Known subtotal · additional items need a quote' : 'Preliminary build price'}</p><p className="text-3xl font-semibold mt-1" aria-live="polite">{priceLabel}</p></div>
        <p className="mt-4 text-sm text-muted-foreground">Delivery: {delivery ? DELIVERY_LABELS[delivery] ?? delivery : 'To be confirmed'}{zip ? ` · ZIP ${zip}` : ''}</p>
        <p className="mt-2 text-xs text-muted-foreground">{serverPrice?.lead_time_weeks ? `Estimated manufacturing time: ${serverPrice.lead_time_weeks} weeks, subject to confirmation.` : 'Manufacturing schedule to be confirmed.'}</p>
        {allIssues.length > 0 && <ul role="alert" className="mt-4 text-xs text-destructive space-y-1">{allIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
        <p className="mt-5 text-xs text-muted-foreground">The manufacturer is the legal seller of the unit. Vendibook facilitates the purchase. Checkout will require an approved quote, manufacturing agreement and supported marketplace payment terms. No payment is collected here.</p>
        {submitted ? <Button asChild className="mt-6 w-full"><Link to="/build-studio/my-builds">Track engineering review<ArrowRight size={16} className="ml-2" /></Link></Button> : <>
          <Button className="mt-6 w-full" onClick={submitForReview} disabled={!partner || submitting || pricing || allIssues.length > 0 || serverPrice?.status !== 'ok' || !!serverPrice?.problems?.length}>{submitting ? 'Sending for review…' : 'Submit for engineering review'}</Button>
          {!partner && <p className="mt-3 text-xs text-muted-foreground">Demo designs cannot be submitted. A regional manufacturing partner and approved catalog are required.</p>}
          <Button variant="outline" className="mt-3 w-full" onClick={save} disabled={saveBusy}><Save size={15} className="mr-2" />{saveBusy ? 'Saving…' : 'Save my build'}</Button>
        </>}
        {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}
      </Pane></div>
  </main>);

  /* ---------------- Studio ---------------- */
  const groupItems = (gid: string) => EQUIPMENT.filter((e) => groupOf(e.category) === gid);
  const navGroups = [{ id: 'trailer', label: 'Trailer' }, ...PANEL_GROUPS.filter((g) => groupItems(g.id).length), { id: 'finishes', label: 'Finishes' }];

  const leftPanel = <div className="flex h-full min-h-0 flex-col">
    <nav aria-label="Configuration" className="flex gap-1 overflow-x-auto border-b border-border p-2 lg:flex-col lg:overflow-visible">
      {navGroups.map((g) => { const Icon = GROUP_ICONS[g.id] ?? Wrench; const count = g.id === 'trailer' || g.id === 'finishes' ? 0 : config.items.filter((i) => groupOf(specOf(i.id).category) === g.id).length;
        return <button key={g.id} type="button" onClick={() => setPanel(g.id)} aria-current={panel === g.id}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${panel === g.id ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          <Icon className={`h-4 w-4 ${panel === g.id ? 'text-primary' : ''}`} />{g.label}{count > 0 && <span className="ml-auto rounded-full bg-muted px-1.5 text-[11px] text-foreground">{count}</span>}</button>; })}
    </nav>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      {panel === 'trailer' && <>
        <p className="text-xs font-medium text-muted-foreground">Model</p>
        {(partner?.models ?? [null]).map((m) => { const on = !m || m.id === modelId;
          return <button key={m?.id ?? 'demo'} type="button" disabled={!m} onClick={() => m && partner && pickModel(m, partner.equipment)}
            className={`w-full rounded-xl border p-3 text-left ${on ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30'}`}>
            <p className="text-sm font-medium text-foreground">{m?.name ?? TRAILER.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{m ? `${Math.round(m.int_length_in / 12)}′ × ${Math.round(m.int_width_in / 12 * 10) / 10}′ interior · ${m.base_price_cents == null ? 'Quote' : cents(m.base_price_cents)}` : `Demo model · ${money(TRAILER.basePrice ?? 0)}`}</p>
          </button>; })}
        {partner && partner.models.length > 1 && <p className="text-[11px] text-muted-foreground">Switching models clears placed equipment.</p>}
        <dl className="grid grid-cols-2 gap-2 pt-2 text-xs">
          {[['Length', `${inch(TRAILER.length)}″`], ['Width', `${inch(TRAILER.width)}″`], ['Height', `${inch(TRAILER.height)}″`], ['Service window', `${inch(TRAILER.window.to - TRAILER.window.from)}″ wide`]].map(([k, v]) =>
            <div key={k} className="rounded-lg bg-muted p-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-foreground">{v}</dd></div>)}
        </dl>
      </>}
      {panel === 'finishes' && <>
        <p className="text-xs font-medium text-muted-foreground">Exterior {partner && FINISHES.length ? 'finish' : 'color'}</p>
        {(partner && FINISHES.length ? FINISHES.map((f) => ({ id: f.id, name: f.name, hex: f.hex, price: f.price, on: config.finish === f.id, set: () => setConfig((x) => ({ ...x, finish: f.id })) }))
          : EXTERIOR_COLORS.map((c) => ({ id: c.id, name: c.name, hex: c.hex, price: partner ? undefined : c.price, on: config.color === c.id, set: () => setConfig((x) => ({ ...x, color: c.id })) })))
          .map((f) => <button key={f.id} type="button" aria-pressed={f.on} onClick={f.set}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${f.on ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30'}`}>
            <span className="h-7 w-7 shrink-0 rounded-full border border-border" style={{ background: f.hex }} />
            <span className="flex-1 text-foreground">{f.name}</span>
            <span className="text-xs text-muted-foreground">{f.price === undefined ? 'Preview' : f.price == null ? 'Quote' : f.price === 0 ? 'Included' : `+${money(f.price)}`}</span>
          </button>)}
        {partner && !FINISHES.length && <p className="text-[11px] text-muted-foreground">Colors are a preview; your partner quotes paint and wraps.</p>}
        <p className="pt-2 text-[11px] text-muted-foreground">Interior surfaces, cabinets and branding are confirmed with your manufacturer during engineering review.</p>
      </>}
      {PANEL_GROUPS.some((g) => g.id === panel) && groupItems(panel).map((e) => {
        const count = config.items.filter((i) => i.id === e.id).length; const why = unavailableReason(e);
        return <Pane key={e.id} className={`p-3 ${count ? 'border-primary/50' : ''}`}>
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted" style={{ boxShadow: `inset 0 -6px 0 ${e.color}` }} aria-hidden><Tag className="h-4 w-4 text-muted-foreground" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-foreground">{e.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{e.price == null ? 'Manufacturer quote required' : `+${money(e.price)}`}{count ? ` · ${count} added` : ''}</p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{e.notes}</p>
          {why && <p className="mt-1 text-xs text-destructive">{why}</p>}
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" className="h-8" onClick={() => add(e.id)} disabled={!!why}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setLearn(e)}>Learn more</button>
          </div>
        </Pane>; })}
      {notice && <p className="rounded-lg bg-muted p-2 text-xs text-foreground" role="status">{notice}</p>}
    </div>
  </div>;

  const selectedCard = sel && (() => { const s = specOf(sel.id); const issues = placementIssues(config, sel.uid); return <Pane className="border-primary/50 p-3">
    <div className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" /><p className="text-sm font-medium text-foreground">{s.name}</p>
      <button type="button" className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Close" onClick={() => setSelected(null)}><X className="h-4 w-4" /></button></div>
    <p className="mt-1 text-xs text-muted-foreground">{inch(s.w)}″ W × {inch(s.d)}″ D × {inch(s.h)}″ H · {s.price == null ? 'Quote required' : money(s.price)}</p>
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="outline" className="h-8 px-2" aria-label="Move left" onClick={() => update({ x: +(sel.x - 0.1).toFixed(2) })}><ArrowLeft className="h-4 w-4" /></Button>
      <Button size="sm" variant="outline" className="h-8 px-2" aria-label="Move right" onClick={() => update({ x: +(sel.x + 0.1).toFixed(2) })}><ArrowRight className="h-4 w-4" /></Button>
      <Button size="sm" variant="outline" className="h-8" onClick={() => update({ wall: sel.wall === 'back' ? 'service' : 'back' })}>{sel.wall === 'back' ? 'To window side' : 'To back wall'}</Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setLearn(s)}>Details</Button>
      <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => remove()}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>
    </div>
    {issues.length > 0 && <p className="mt-2 text-xs text-destructive" role="alert">{issues.join(' · ')}</p>}
  </Pane>; })();

  const rightPanel = <div className="space-y-4 p-4">
    <div><p className="text-xs font-medium text-muted-foreground">Your build</p><p className="mt-1 text-lg font-semibold text-foreground">{buildTitle}</p><p className="text-sm text-muted-foreground">{concept}</p></div>
    {selectedCard}
    <div>
      <p className="text-xs font-medium text-muted-foreground">Selected equipment</p>
      {config.items.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing added yet. Choose equipment from the left.</p>
        : <ul className="mt-2 divide-y divide-border">{Object.entries(config.items.reduce<Record<string, string[]>>((a, i) => ((a[i.id] ??= []).push(i.uid), a), {})).map(([id, uids]) => { const s = specOf(id);
          return <li key={id} className="flex items-center gap-2 py-2 text-sm">
            <button type="button" className="min-w-0 flex-1 truncate text-left text-foreground hover:text-primary" onClick={() => { setSelected(uids[0]); if (view === 'exterior') setView('interior'); }} title="Show in 3D">{s.name}{uids.length > 1 ? ` × ${uids.length}` : ''}</button>
            <span className="text-xs text-muted-foreground">{s.price == null ? 'Quote' : money(s.price * uids.length)}</span>
          </li>; })}</ul>}
    </div>
    {partner && <label className="block text-xs font-medium text-muted-foreground">Delivery
      {(serverPrice?.delivery_options ?? []).length > 0 ? <select className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-2 text-base text-foreground sm:text-sm" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
        <option value="">Choose delivery…</option>
        {serverPrice!.delivery_options!.map((o) => <option key={o.method} value={o.method}>{DELIVERY_LABELS[o.method] ?? o.method} · {o.fee_cents == null ? 'quoted' : o.fee_cents === 0 ? 'free' : cents(o.fee_cents)}</option>)}
      </select> : <span className="mt-1 block font-normal">Quoted by the build partner.</span>}</label>}
    <div className="rounded-xl bg-muted p-3">
      <button type="button" className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground" onClick={() => setShowBreakdown((v) => !v)} aria-expanded={showBreakdown}>
        Price breakdown<ChevronRight className={`h-4 w-4 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} /></button>
      {showBreakdown && <ul className="mt-2 space-y-1 text-xs">{breakdown.map(([k, g]) => <li key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="text-foreground">{g.quote ? (g.amount ? `${money(g.amount)} + quote` : 'Quote') : money(g.amount)}</span></li>)}
        {partner && !delivery && <li className="flex justify-between"><span className="text-muted-foreground">Delivery estimate</span><span className="text-foreground">Choose above</span></li>}</ul>}
      <p className="mt-3 text-xs text-muted-foreground">{incomplete ? 'Known preliminary subtotal' : 'Preliminary build price'}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground transition-opacity" style={{ opacity: pricing ? 0.5 : 1 }} aria-live="polite">{priceLabel}</p>
      {incomplete && <p className="mt-1 text-xs text-foreground">Some items need a manufacturer quote, so this total is incomplete.</p>}
      {serverPrice?.status === 'error' && <p className="mt-1 text-xs text-destructive">Couldn't refresh the price. <button className="underline" onClick={() => setPriceAttempt(a => a + 1)}>Retry pricing</button></p>}
      {(serverPrice?.problems ?? []).length > 0 && <p className="mt-1 text-xs text-destructive">{serverPrice!.problems!.map((p) => `${p.name ?? specOf(p.id).name}: ${p.issue === 'incompatible' ? 'not compatible with this model' : 'no longer available'}`).join(' · ')}</p>}
      {serverPrice?.lead_time_weeks ? <p className="mt-1 text-xs text-muted-foreground">Estimated build time about {serverPrice.lead_time_weeks} weeks.</p> : null}
      <p className="mt-2 text-[11px] text-muted-foreground">{DEMO_DATA ? 'Demonstration pricing, not a quote.' : 'Not a final price. Taxes excluded.'} The final quote comes after engineering review; nothing is charged now.</p>
    </div>
    {allIssues.length > 0 && <p className="text-xs text-destructive" role="alert">Fix {allIssues.length} layout issue{allIssues.length > 1 ? 's' : ''} before sending for review.</p>}
    <div className="space-y-2">
      <Button className="h-11 w-full rounded-xl" onClick={() => setStep('review')}>Review my build<ArrowRight className="ml-2 h-4 w-4" /></Button>
      {!partner && <p className="text-[11px] text-muted-foreground">Engineering review needs a manufacturing partner in your area.</p>}
      <div className="flex gap-2">
        <Input aria-label="Build name" placeholder="Name this build" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="h-10 text-base sm:text-sm" maxLength={80} />
        <Button variant="outline" className="h-10" onClick={save} disabled={saveBusy}><Save className="mr-1 h-4 w-4" />{saveBusy ? 'Saving' : 'Save'}</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{partner ? 'Saves to your account with exact prices.' : 'Demo builds save on this device.'} {user && <Link to="/build-studio/my-builds" className="text-primary underline">My builds</Link>}</p>
      {saves.length > 0 && !partner && <ul className="space-y-1">{saves.map((s) => <li key={s.name} className="flex items-center justify-between text-xs">
        <span className="truncate text-foreground">{s.name} · {new Date(s.savedAt).toLocaleDateString()}</span>
        <span className="flex"><Button size="sm" variant="ghost" aria-label={`Load ${s.name}`} onClick={() => { setConfig(s.config); setSelected(null); setNotice(`Loaded “${s.name}”.`); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => persist(saves.filter((x) => x.name !== s.name))}><Trash2 className="h-3.5 w-3.5" /></Button></span></li>)}</ul>}
      {notice && <p className="text-xs text-foreground" role="status">{notice}</p>}
    </div>
  </div>;

  const tool = (label: string, icon: ReactNode, on: () => void, pressed?: boolean, disabled?: boolean) =>
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={on}
      className={`grid h-9 w-9 place-items-center rounded-lg transition-colors disabled:opacity-40 ${pressed ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}>{icon}</button>;

  return shell(<main className="bs-workspace">
    <div className="bs-workbar">
      <div><h1>{saveName || 'My kitchen concept'}</h1><p>{DEMO_DATA ? 'Demo catalog · explore your possibilities' : `Regional catalog · ZIP ${zip}`}</p></div>
      <div className="bs-workbar-actions"><span role="status">{partner ? 'Save to your account when ready' : saveStatus || storageError}</span>{saveStatus.includes('failed') && <button onClick={() => setSaveAttempt(a => a + 1)}>Retry save</button>}
        <button type="button" onClick={() => setStep('business')} className="inline-flex items-center gap-2 hover:text-foreground"><Pencil size={13} />Edit menu</button></div>
    </div>
    <div className="bs-workgrid" style={{ gridTemplateColumns: `${leftOpen ? '280px' : '0px'} minmax(0,1fr) ${rightOpen ? '300px' : '0px'}` }}>
      <aside aria-label="Build options" className={`bs-options ${leftOpen ? '' : 'is-hidden'}`}>{leftPanel}</aside>

      <section ref={stageRef} className="bs-stage" aria-label="Interactive design studio">
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground"><Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />Loading your trailer…</div>}>
          <div className="absolute inset-0"><TrailerScene config={config} view={view} roof={roof} selected={selected} onSelect={setSelected} labels={labels} dims={dims} grid={grid} cmd={cmd} /></div>
        </Suspense>
        <div className="bs-stage-title"><h2>{buildTitle}</h2><p>{concept}</p></div>
        <button className="bs-assistant-button" onClick={() => setAssistant(true)}><Sparkles size={16} className="text-primary" />A little guidance for your big idea<ArrowRight size={13} /></button>
        <div className="bs-mobile-config"><Button onClick={() => setMobileOptions(true)}><Layers size={16} className="mr-2" />Customize</Button></div>
        <div className="absolute left-1/2 top-3 -translate-x-1/2" role="radiogroup" aria-label="View">
          <div className="flex rounded-xl border border-border bg-card/95 p-1 shadow-sm">
            {(['exterior', 'interior', 'plan'] as ViewMode[]).map((v) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>{v === 'plan' ? 'Floor plan' : v[0].toUpperCase() + v.slice(1)}</button>)}
          </div>
        </div>
        <div className="absolute left-3 top-3 hidden flex-col gap-1 lg:flex">
          {tool(leftOpen ? 'Hide options' : 'Show options', leftOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />, () => setLeftOpen((v) => !v))}
        </div>
        <div className="absolute right-3 top-3 hidden lg:flex">
          {tool(rightOpen ? 'Hide summary' : 'Show summary', rightOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />, () => setRightOpen((v) => !v))}
        </div>
        <div className="absolute bottom-12 right-3 flex flex-col gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-sm">
          {tool('Zoom in', <Plus className="h-4 w-4" />, () => camera('in'))}
          {tool('Zoom out', <Minus className="h-4 w-4" />, () => camera('out'))}
          {tool('Reset view', <RotateCcw className="h-4 w-4" />, () => camera('reset'))}
          {tool('Full screen', <Maximize className="h-4 w-4" />, fullscreen)}
        </div>
        <div className="absolute bottom-12 left-3 flex flex-col gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-sm">
          {tool(roof ? 'Hide roof' : 'Show roof', <Expand className="h-4 w-4" />, () => setRoof((r) => !r), !roof, view !== 'exterior')}
          {tool('Show dimensions', <Ruler className="h-4 w-4" />, () => setDims((v) => !v), dims)}
          {tool('Show equipment labels', <Tag className="h-4 w-4" />, () => setLabels((v) => !v), labels)}
          {tool('Show placement grid', <Grid3x3 className="h-4 w-4" />, () => setGrid((v) => !v), grid)}
        </div>
        <p className="absolute bottom-3 left-1/2 w-max max-w-[92%] -translate-x-1/2 rounded-md bg-card/90 px-2 py-1 text-center text-[11px] text-muted-foreground">Concept visualization. Final specifications subject to manufacturer engineering approval.</p>
      </section>

      <aside id="bs-summary" aria-label="Your build summary" className={`bs-summary ${rightOpen ? '' : 'is-hidden'}`}>{rightPanel}</aside>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="min-w-0 flex-1"><p className="text-[11px] text-muted-foreground">{incomplete ? 'Known subtotal' : 'Preliminary price'}</p><p className="text-lg font-semibold tabular-nums text-foreground">{priceLabel}</p></div>
      <Button variant="outline" onClick={save} aria-label="Save my build" disabled={saveBusy}><Save className="h-4 w-4" /></Button>
      <Button onClick={() => setStep('review')}>Review build</Button>
    </div>
    <Sheet open={mobileOptions} onOpenChange={setMobileOptions}><SheetContent side="bottom" className="sale-light build-studio bs-options-sheet"><SheetHeader><SheetTitle>Make it yours</SheetTitle></SheetHeader>{leftPanel}</SheetContent></Sheet>
    <Sheet open={assistant} onOpenChange={setAssistant}><SheetContent className="sale-light build-studio w-full sm:max-w-md overflow-y-auto">
      <SheetHeader><SheetTitle><Sparkles className="inline mr-2 text-primary h-5 w-5" />A little help with your build</SheetTitle></SheetHeader>
      <p className="mt-4 text-sm text-muted-foreground">Explore guidance based on your menu and the current catalog. This guide uses curated rules; it is not an engineering approval or a live AI service.</p>
      <div className="flex flex-wrap gap-2 my-5">{(['menu', 'power', 'review'] as const).map(t => <Button key={t} variant={guideTopic === t ? 'default' : 'outline'} size="sm" onClick={() => setGuideTopic(t)}>{t === 'menu' ? 'My menu' : t === 'power' ? 'Power options' : 'What happens next?'}</Button>)}</div>
      {guideTopic === 'menu' && <><h3 className="font-semibold">A kitchen built around what you serve</h3><p className="text-xs text-muted-foreground mt-2">{menuItems.length ? menuItems.join(' · ') : 'Choose your business category or add menu items to get tailored suggestions.'}</p><ul className="mt-5 space-y-4">{recs.map(r => <li key={r.kind} className="border-b border-border pb-4"><h4 className="text-sm font-medium">{r.label}</h4><p className="text-xs text-muted-foreground mt-1">{r.does}</p><p className="text-xs mt-2">{r.available.length ? `${r.available.length} option${r.available.length === 1 ? '' : 's'} in ${DEMO_DATA ? 'the demo' : 'your regional'} catalog` : 'Not in the current catalog — manufacturer confirmation needed'}</p>{r.available.map(e => <Button key={e.id} size="sm" variant="outline" className="mt-2 mr-2" disabled={!!unavailableReason(e)} onClick={() => { add(e.id); }}>{e.name}<Plus size={12} className="ml-2" /></Button>)}</li>)}</ul></>}
      {guideTopic === 'power' && <div className="text-sm space-y-4"><h3 className="font-semibold">How will your kitchen be powered?</h3><p>Shore power uses a suitable connection at your location. Generators provide on-site power and require plans for fuel, exhaust and noise.</p><p>Battery and solar-assisted systems depend on the electrical load, usable capacity, available roof area and operating conditions. The manufacturer must confirm compatibility and runtime.</p><p className="text-muted-foreground">{groupItems('power').length ? 'Explore the power options offered in your regional catalog.' : 'No power packages are currently listed in this catalog. Pricing and specifications need manufacturer confirmation.'}</p>{groupItems('power').length > 0 && <Button onClick={() => { setPanel('power'); setAssistant(false); setMobileOptions(true); }}>Explore power options</Button>}</div>}
      {guideTopic === 'review' && <div className="space-y-4 text-sm"><p>Review your complete design, then submit it when a manufacturing partner is available in your region.</p><p>The partner checks the layout, equipment, ventilation, electrical and plumbing needs. They may request changes before issuing a final quote.</p><p>A final quote must identify the legal manufacturer, delivery terms, payment schedule and agreement. Financing availability and payment capabilities must be confirmed before checkout.</p><Button onClick={() => { setAssistant(false); setStep('review'); }}>Review my design</Button></div>}
    </SheetContent></Sheet>

    <Sheet open={!!learn} onOpenChange={(o) => !o && setLearn(null)}>
      <SheetContent className="sale-light w-full overflow-y-auto sm:max-w-md">
        {learn && <>
          <SheetHeader><SheetTitle className="text-foreground">{learn.name}</SheetTitle></SheetHeader>
          <p className="mt-3 text-sm text-muted-foreground">{learn.notes}</p>
          {greatFor(learn).length > 0 && <><p className="mt-5 text-sm font-medium text-foreground">Great for</p>
            <ul className="mt-2 flex flex-wrap gap-2">{greatFor(learn).map((g) => <li key={g} className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">{g}</li>)}</ul></>}
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Dimensions</dt><dd className="text-foreground">{inch(learn.w)}″ W × {inch(learn.d)}″ D × {inch(learn.h)}″ H</dd>
            <dt className="text-muted-foreground">Power / fuel</dt><dd className="text-foreground">{learn.power}</dd>
            {learn.needs.length > 0 && <><dt className="text-muted-foreground">Also needs</dt><dd className="text-foreground">{learn.needs.join(', ')}</dd></>}
            <dt className="text-muted-foreground">Fits on</dt><dd className="text-foreground">{(learn.allowedWalls ?? ['back', 'service']).map((w) => w === 'back' ? 'back wall' : 'window side').join(', ')}</dd>
            <dt className="text-muted-foreground">Price</dt><dd className="text-foreground">{learn.price == null ? 'Manufacturer quote required' : `${money(learn.price)} ${DEMO_DATA ? '(demo)' : '(preliminary)'}`}</dd>
          </dl>
          <p className="mt-5 text-xs text-muted-foreground">{DEMO_DATA ? 'Demonstration specs.' : "Specs from your regional partner's catalog."} Ventilation, fire suppression and code compliance are confirmed during engineering review.</p>
          <Button className="mt-6 w-full" onClick={() => { add(learn.id); setLearn(null); }}><Plus className="mr-1 h-4 w-4" />Add to build</Button>
        </>}
      </SheetContent>
    </Sheet>
  </main>);
}

function Progress({ at }: { at: number }) {
  return <ol className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Progress">
    {['Location', 'Your menu', 'Design'].map((s, i) => <li key={s} className="flex items-center gap-2">
      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-medium ${i + 1 < at ? 'bg-primary text-primary-foreground' : i + 1 === at ? 'border border-primary text-primary' : 'border border-border'}`} aria-current={i + 1 === at ? 'step' : undefined}>{i + 1 < at ? <Check className="h-3 w-3" /> : i + 1}</span>
      <span className={i + 1 === at ? 'text-foreground' : ''}>{s}</span>{i < 2 && <span className="h-px w-6 bg-border" />}</li>)}
  </ol>;
}
