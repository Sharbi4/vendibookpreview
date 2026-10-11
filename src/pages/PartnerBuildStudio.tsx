import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';
import { EQUIPMENT_CATEGORIES, parseEquipmentCsv, toCents } from '@/lib/buildStudio/partnerCatalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type Mfr = { id: string; name: string; status: string };
type Row = { id: string; sku: string; name: string; status: string; version: number; [k: string]: any };
const usd = (c: number | null) => (c == null ? 'Quote required' : (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
const sel = 'h-10 rounded-md border border-input bg-background px-2 text-sm';
const emptyModel = { sku: '', name: '', vehicle_type: 'food_trailer', int_length_in: '', int_width_in: '', int_height_in: '', base_price: '', lead_time_weeks: '' };
const emptyEq = { sku: '', name: '', category: 'Cooking', width_in: '', depth_in: '', height_in: '', price: '', power: '', description: '' };

/** Manufacturer partner workspace: own models, equipment, CSV import and submitted builds only (RLS-enforced). */
export default function PartnerBuildStudio() {
  const { user, isLoading } = useAuth();
  const [mfrs, setMfrs] = useState<Mfr[] | null>(null);
  const [mid, setMid] = useState('');
  const [models, setModels] = useState<Row[]>([]);
  const [equipment, setEquipment] = useState<Row[]>([]);
  const [builds, setBuilds] = useState<Row[]>([]);
  const [regions, setRegions] = useState(0);
  const [m, setM] = useState(emptyModel);
  const [e, setE] = useState(emptyEq);
  const [csv, setCsv] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    void db.from('bs_manufacturers').select('id, name, status').order('name').then(({ data }: { data: Mfr[] | null }) => {
      setMfrs(data ?? []); if (data?.[0]) setMid(data[0].id);
    });
  }, [user]);

  const load = useCallback(async () => {
    if (!mid) return;
    const [a, b, c, d] = await Promise.all([
      db.from('bs_models').select('*').eq('manufacturer_id', mid).order('name'),
      db.from('bs_equipment').select('*').eq('manufacturer_id', mid).order('category').order('name'),
      db.from('bs_builds').select('id, name, zip, status, subtotal_cents, quote_required, created_at').eq('manufacturer_id', mid).order('created_at', { ascending: false }).limit(50),
      db.from('bs_region_assignments').select('id', { count: 'exact', head: true }).eq('manufacturer_id', mid).is('ended_at', null),
    ]);
    setModels(a.data ?? []); setEquipment(b.data ?? []); setBuilds(c.data ?? []); setRegions(d.count ?? 0);
  }, [mid]);
  useEffect(() => { void load(); }, [load]);

  const run = async (p: Promise<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) toast.error(error.message); else { toast.success(ok); void load(); }
    return !error;
  };

  if (isLoading || (user && mfrs === null)) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth?redirect=/partner/build-studio" replace />;
  if (!mfrs?.length) return <main className="container mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-semibold">Build Studio partners</h1>
    <p className="mt-2 text-muted-foreground">This area is for approved manufacturing partners. Contact support@vendibook.com if you build food trucks or trailers and want to partner with Vendibook.</p></main>;

  const statusActions = (table: string, r: Row) => <>
    {r.status === 'draft' && <Button size="sm" variant="outline" onClick={() => run(db.from(table).update({ status: 'submitted' }).eq('id', r.id), 'Submitted to Vendibook for approval')}>Submit</Button>}
    {r.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => run(db.from(table).update({ status: 'inactive' }).eq('id', r.id), 'Hidden from customers')}>Deactivate</Button>}
    {r.status === 'inactive' && <Button size="sm" variant="ghost" onClick={() => run(db.from(table).update({ status: 'submitted' }).eq('id', r.id), 'Resubmitted')}>Resubmit</Button>}
    {r.status === 'draft' && <Button size="sm" variant="ghost" onClick={() => run(db.from(table).delete().eq('id', r.id), 'Deleted')}>Delete</Button>}
  </>;
  const editPrice = (table: string, col: string, r: Row) => {
    const v = window.prompt(`New price in USD for ${r.name} (leave blank for "requires quote"). Changes are versioned and audited.`, r[col] == null ? '' : String(r[col] / 100));
    if (v === null) return;
    const c = v.trim() === '' ? null : toCents(v);
    if (c === undefined) { toast.error('Enter a valid price'); return; }
    void run(db.from(table).update({ [col]: c }).eq('id', r.id), 'Price updated');
  };

  const addModel = async () => {
    const n = (s: string) => (s.trim() === '' ? null : Number(s));
    const price = m.base_price.trim() === '' ? null : toCents(m.base_price);
    if (price === undefined) { toast.error('Enter a valid base price'); return; }
    const ok = await run(db.from('bs_models').insert({ manufacturer_id: mid, sku: m.sku.trim(), name: m.name.trim(), vehicle_type: m.vehicle_type,
      int_length_in: n(m.int_length_in), int_width_in: n(m.int_width_in), int_height_in: n(m.int_height_in),
      base_price_cents: price, lead_time_weeks: n(m.lead_time_weeks) }), 'Model added as draft');
    if (ok) setM(emptyModel);
  };
  const addEquipment = async () => {
    const price = e.price.trim() === '' ? null : toCents(e.price);
    if (price === undefined) { toast.error('Enter a valid price'); return; }
    const ok = await run(db.from('bs_equipment').insert({ manufacturer_id: mid, sku: e.sku.trim(), name: e.name.trim(), category: e.category,
      width_in: Number(e.width_in), depth_in: Number(e.depth_in), height_in: Number(e.height_in), price_cents: price,
      power: e.power.trim() || null, description: e.description.trim() || null }), 'Equipment added as draft');
    if (ok) setE(emptyEq);
  };
  const importCsv = async () => {
    const { rows, errors } = parseEquipmentCsv(csv);
    setCsvErrors(errors);
    if (errors.length || !rows.length) return;
    const existing = new Set(equipment.filter((x) => x.status !== 'draft').map((x) => x.sku));
    const locked = rows.filter((r) => existing.has(r.sku));
    if (locked.length) { setCsvErrors(locked.map((r) => `${r.sku}: already submitted or approved — edit it in the list instead`)); return; }
    const ok = await run(db.from('bs_equipment').upsert(rows.map((r) => ({ ...r, manufacturer_id: mid, status: 'draft' })), { onConflict: 'manufacturer_id,sku' }), `Imported ${rows.length} items as drafts`);
    if (ok) setCsv('');
  };

  const current = mfrs.find((x) => x.id === mid);
  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <SEO title="Build Studio Partner | Vendibook" description="Manage your Build Studio catalog" noindex />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Build Studio partner</h1>
          <p className="text-sm text-muted-foreground">{current?.name} · {current?.status} · {regions} assigned region{regions === 1 ? '' : 's'}. Customers only see items Vendibook has approved.</p>
        </div>
        {mfrs.length > 1 && <select className={sel} value={mid} onChange={(ev) => setMid(ev.target.value)}>{mfrs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Approved models', models.filter((x) => x.status === 'approved').length], ['Approved equipment', equipment.filter((x) => x.status === 'approved').length],
          ['Awaiting Vendibook', [...models, ...equipment].filter((x) => x.status === 'submitted').length], ['Submitted builds', builds.length]].map(([k, v]) =>
          <Card key={k as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-semibold">{v}</p></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader><CardTitle>Models</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {models.map((r) => <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-2">
            <span className="min-w-[240px] font-medium">{r.name} <span className="text-muted-foreground">({r.sku}, v{r.version})</span></span>
            <span className="text-muted-foreground">{r.int_length_in}″ × {r.int_width_in}″ interior · {usd(r.base_price_cents)} · {r.status}</span>
            <Button size="sm" variant="ghost" onClick={() => editPrice('bs_models', 'base_price_cents', r)}>Edit price</Button>
            {statusActions('bs_models', r)}
          </div>)}
          <div className="grid gap-2 sm:grid-cols-4">
            <Input className="text-base" placeholder="SKU" value={m.sku} onChange={(ev) => setM({ ...m, sku: ev.target.value })} />
            <Input className="text-base sm:col-span-2" placeholder="Model name" value={m.name} onChange={(ev) => setM({ ...m, name: ev.target.value })} />
            <select className={sel} value={m.vehicle_type} onChange={(ev) => setM({ ...m, vehicle_type: ev.target.value })}><option value="food_trailer">Food trailer</option><option value="food_truck">Food truck</option></select>
            <Input className="text-base" inputMode="decimal" placeholder="Interior length (in)" value={m.int_length_in} onChange={(ev) => setM({ ...m, int_length_in: ev.target.value })} />
            <Input className="text-base" inputMode="decimal" placeholder="Interior width (in)" value={m.int_width_in} onChange={(ev) => setM({ ...m, int_width_in: ev.target.value })} />
            <Input className="text-base" inputMode="decimal" placeholder="Interior height (in)" value={m.int_height_in} onChange={(ev) => setM({ ...m, int_height_in: ev.target.value })} />
            <Input className="text-base" inputMode="decimal" placeholder="Base price USD (blank = quote)" value={m.base_price} onChange={(ev) => setM({ ...m, base_price: ev.target.value })} />
            <Input className="text-base" inputMode="numeric" placeholder="Build time (weeks)" value={m.lead_time_weeks} onChange={(ev) => setM({ ...m, lead_time_weeks: ev.target.value })} />
            <Button className="sm:col-span-3" disabled={!m.sku || !m.name || !m.int_length_in || !m.int_width_in || !m.int_height_in} onClick={addModel}>Add model</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Equipment and options</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {equipment.map((r) => <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-2">
            <span className="min-w-[240px] font-medium">{r.name} <span className="text-muted-foreground">({r.sku}, v{r.version})</span></span>
            <span className="text-muted-foreground">{r.category} · {r.width_in}×{r.depth_in}×{r.height_in}″ · {usd(r.price_cents)} · {r.status}</span>
            <Button size="sm" variant="ghost" onClick={() => editPrice('bs_equipment', 'price_cents', r)}>Edit price</Button>
            {statusActions('bs_equipment', r)}
          </div>)}
          <div className="grid gap-2 sm:grid-cols-4">
            <Input className="text-base" placeholder="SKU" value={e.sku} onChange={(ev) => setE({ ...e, sku: ev.target.value })} />
            <Input className="text-base sm:col-span-2" placeholder="Name" value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} />
            <select className={sel} value={e.category} onChange={(ev) => setE({ ...e, category: ev.target.value })}>{EQUIPMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <Input className="text-base" inputMode="decimal" placeholder="Width (in)" value={e.width_in} onChange={(ev) => setE({ ...e, width_in: ev.target.value })} />
            <Input className="text-base" inputMode="decimal" placeholder="Depth (in)" value={e.depth_in} onChange={(ev) => setE({ ...e, depth_in: ev.target.value })} />
            <Input className="text-base" inputMode="decimal" placeholder="Height (in)" value={e.height_in} onChange={(ev) => setE({ ...e, height_in: ev.target.value })} />
            <Input className="text-base" inputMode="decimal" placeholder="Price USD (blank = quote)" value={e.price} onChange={(ev) => setE({ ...e, price: ev.target.value })} />
            <Input className="text-base sm:col-span-2" placeholder="Fuel / power (e.g. Propane 90,000 BTU)" value={e.power} onChange={(ev) => setE({ ...e, power: ev.target.value })} />
            <Input className="text-base sm:col-span-2" placeholder="Short description" value={e.description} onChange={(ev) => setE({ ...e, description: ev.target.value })} />
            <Button className="sm:col-span-4" disabled={!e.sku || !e.name || !e.width_in || !e.depth_in || !e.height_in} onClick={addEquipment}>Add equipment</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Import equipment from CSV</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Header row: sku,name,category,width_in,depth_in,height_in,price_usd,power,description. Leave price_usd blank for "requires quote". Rows import as drafts; submit them for approval afterward.</p>
          <Textarea rows={6} className="font-mono text-sm" value={csv} onChange={(ev) => setCsv(ev.target.value)} placeholder={'sku,name,category,width_in,depth_in,height_in,price_usd,power,description\nG36,36" griddle,Cooking,36,30,36,2400,Propane 90k BTU,Flat-top'} />
          {csvErrors.length > 0 && <ul className="text-xs text-destructive">{csvErrors.slice(0, 20).map((x) => <li key={x}>{x}</li>)}</ul>}
          <Button variant="outline" disabled={!csv.trim()} onClick={importCsv}>Validate and import</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Submitted customer builds</CardTitle></CardHeader>
        <CardContent>
          {builds.length === 0 ? <p className="text-sm text-muted-foreground">No builds submitted for engineering review yet.</p> :
            builds.map((b) => <p key={b.id} className="text-sm">{b.name ?? 'Untitled build'} · ZIP {b.zip} · {b.status} · {usd(b.subtotal_cents)}{b.quote_required ? ' + quoted items' : ''}</p>)}
        </CardContent>
      </Card>
    </main>
  );
}
