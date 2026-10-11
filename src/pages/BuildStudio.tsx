import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Info, Loader2, Save, Trash2, FolderOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ALWAYS_REQUIRED, EQUIPMENT, EXTERIOR_COLORS, MENU_SUGGESTIONS, TRAILER, findFreeSpot, placementIssues,
  priceBuild, specOf, type BuildConfig, type Wall,
} from '@/lib/buildStudio/catalog';
import type { ViewMode } from '@/components/buildStudio/TrailerScene';

const TrailerScene = lazy(() => import('@/components/buildStudio/TrailerScene'));
const SAVE_KEY = 'vb.buildStudio.saves.v1';
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
type Saved = { name: string; savedAt: string; config: BuildConfig };
const readSaves = (): Saved[] => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch { return []; } };

export default function BuildStudio() {
  const [zip, setZip] = useState('');
  const [started, setStarted] = useState(false);
  const [config, setConfig] = useState<BuildConfig>({ color: 'white', items: [] });
  const [view, setView] = useState<ViewMode>('exterior');
  const [roof, setRoof] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState('');
  const [saves, setSaves] = useState<Saved[]>([]);
  const [saveName, setSaveName] = useState('');
  useEffect(() => setSaves(readSaves()), []);

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
  const save = () => {
    const name = saveName.trim() || `Build ${saves.length + 1}`;
    persist([{ name, savedAt: new Date().toISOString(), config }, ...saves.filter((s) => s.name !== name)].slice(0, 10));
    setSaveName(''); setNotice(`Saved “${name}” on this device.`);
  };

  if (!started) {
    return <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Build Studio — design your food trailer in 3D" description="Design a 16 ft concession trailer in 3D: pick colors, add kitchen equipment and see a preliminary build price." canonical="/build-studio" />
      <Header />
      <main className="flex-1 container max-w-xl py-16">
        <p className="text-xs uppercase tracking-widest text-primary">Build Studio · Prototype</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Design your food trailer in 3D</h1>
        <p className="mt-3 text-muted-foreground">Start with a 16 ft concession trailer, add kitchen equipment, and watch a preliminary price update as you go.</p>
        <form className="mt-8 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d{5}$/.test(zip)) setStarted(true); }}>
          <Input inputMode="numeric" maxLength={5} placeholder="ZIP code" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))} className="text-base" aria-label="ZIP code" />
          <Button type="submit" disabled={!/^\d{5}$/.test(zip)}>Start building</Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">No regional build partner is connected yet, so this prototype uses demonstration equipment and pricing for every ZIP code.</p>
      </main>
      <Footer />
    </div>;
  }

  return <div className="min-h-screen flex flex-col bg-background">
    <SEO title="Build Studio — design your food trailer in 3D" description="Design a 16 ft concession trailer in 3D." canonical="/build-studio" noindex />
    <Header />
    <div className="border-b border-border bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
      Prototype · ZIP {zip} · Demonstration prices and specs — not a quote. No regional build partner is connected yet.
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
        <div>
          <h2 className="text-sm font-semibold text-foreground">Exterior color</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXTERIOR_COLORS.map((c) => <button key={c.id} type="button" title={`${c.name}${c.price ? ` +${money(c.price)}` : ''}`} aria-label={c.name} aria-pressed={config.color === c.id}
              onClick={() => setConfig((x) => ({ ...x, color: c.id }))}
              className={`h-9 w-9 rounded-full border-2 ${config.color === c.id ? 'border-primary' : 'border-border'}`} style={{ background: c.hex }} />)}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">What will you serve?</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(MENU_SUGGESTIONS).map((m) => <Button key={m} size="sm" variant={menu === m ? 'default' : 'outline'} onClick={() => setMenu(m)}>{m}</Button>)}
          </div>
          {menu && <p className="mt-2 text-xs text-muted-foreground">Typical for {menu}: {MENU_SUGGESTIONS[menu].map((id) => specOf(id).name).join(', ')}. Most health departments also require a {ALWAYS_REQUIRED.map((id) => specOf(id).name.toLowerCase()).join(' and a ')}. Check your local rules.</p>}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Add equipment</h2>
          <ul className="mt-2 space-y-2">
            {EQUIPMENT.map((e) => {
              const count = config.items.filter((i) => i.id === e.id).length;
              const hint = (menu && MENU_SUGGESTIONS[menu].includes(e.id)) || ALWAYS_REQUIRED.includes(e.id);
              return <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.name}{hint && menu ? <span className="ml-1 text-xs text-primary">suggested</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{e.category} · {money(e.price)}{count ? ` · ${count} added` : ''}</p>
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
            <dt className="text-muted-foreground">Price</dt><dd>{money(s.price)} (demo)</dd>
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
          <ul className="mt-2 space-y-1 text-xs">
            {price.lines.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="text-muted-foreground">{l.label}</span><span>{money(l.amount)}</span></li>)}
          </ul>
          <p className="mt-3 flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Estimate</span><span>{money(price.total)}</span></p>
          <p className="mt-2 text-[11px] text-muted-foreground">Demonstration pricing. Delivery, taxes and fees aren't included. A final manufacturing quote comes only after a build partner's engineering review.</p>
          {allIssues.length > 0 && <p className="mt-2 text-xs text-destructive">Fix {allIssues.length} layout issue{allIssues.length > 1 ? 's' : ''} before saving a final layout.</p>}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Save and reload</h2>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Build name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="text-base" />
            <Button onClick={save}><Save className="mr-1 h-4 w-4" />Save</Button>
          </div>
          {saves.length > 0 && <ul className="mt-2 space-y-1">
            {saves.map((s) => <li key={s.name} className="flex items-center justify-between text-xs">
              <span className="truncate">{s.name} · {new Date(s.savedAt).toLocaleDateString()}</span>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setConfig(s.config); setSelected(null); setNotice(`Loaded “${s.name}”.`); }}><FolderOpen className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => persist(saves.filter((x) => x.name !== s.name))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </span>
            </li>)}
          </ul>}
          <p className="mt-1 text-[11px] text-muted-foreground">Builds are saved on this device for now.</p>
        </div>
      </aside>
    </main>
  </div>;
}
