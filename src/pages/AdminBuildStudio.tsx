import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type Mfr = { id: string; name: string; status: string; contact_email: string | null; is_demo: boolean };
type Region = { id: string; name: string; status: string };
type Assign = { region_id: string; manufacturer_id: string; started_at: string };
type Pending = { id: string; table: 'bs_models' | 'bs_equipment'; name: string; sku: string; manufacturer_id: string; price: number | null; version: number };
const sel = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
const usd = (c: number | null) => (c == null ? 'Quote required' : (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }));

/** Admin control of Build Studio manufacturers, regions, ZIP coverage, assignments and catalog approval. */
export default function AdminBuildStudio() {
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [mfrs, setMfrs] = useState<Mfr[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [zips, setZips] = useState<Record<string, string[]>>({});
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [requests, setRequests] = useState<{ zip: string; created_at: string }[]>([]);
  const [newMfr, setNewMfr] = useState({ name: '', email: '' });
  const [newRegion, setNewRegion] = useState('');
  const [memberEmail, setMemberEmail] = useState<Record<string, string>>({});
  const [zipDraft, setZipDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    void supabase.rpc('is_admin', { user_id: user.id }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = useCallback(async () => {
    const [m, r, z, a, pm, pe, cr] = await Promise.all([
      db.from('bs_manufacturers').select('*').order('name'),
      db.from('bs_regions').select('*').order('name'),
      db.from('bs_region_zip3').select('*').order('zip3'),
      db.from('bs_region_assignments').select('region_id, manufacturer_id, started_at').is('ended_at', null),
      db.from('bs_models').select('id, name, sku, manufacturer_id, base_price_cents, version').eq('status', 'submitted'),
      db.from('bs_equipment').select('id, name, sku, manufacturer_id, price_cents, version').eq('status', 'submitted'),
      db.from('bs_coverage_requests').select('zip, created_at').order('created_at', { ascending: false }).limit(50),
    ]);
    if (m.error || r.error) toast.error("Couldn't load Build Studio settings");
    setMfrs(m.data ?? []); setRegions(r.data ?? []); setAssigns(a.data ?? []); setRequests(cr.data ?? []);
    const zm: Record<string, string[]> = {};
    for (const row of z.data ?? []) (zm[row.region_id] ??= []).push(row.zip3);
    setZips(zm);
    setZipDraft(Object.fromEntries((r.data ?? []).map((x: Region) => [x.id, (zm[x.id] ?? []).join(', ')])));
    setPending([
      ...(pm.data ?? []).map((x: any) => ({ ...x, table: 'bs_models', price: x.base_price_cents })),
      ...(pe.data ?? []).map((x: any) => ({ ...x, table: 'bs_equipment', price: x.price_cents })),
    ]);
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const run = async (p: Promise<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) toast.error(error.message); else { toast.success(ok); void load(); }
  };

  const saveZips = async (regionId: string) => {
    const list = Array.from(new Set((zipDraft[regionId] ?? '').split(/[\s,]+/).filter(Boolean)));
    const bad = list.filter((z) => !/^\d{3}$/.test(z));
    if (bad.length) { toast.error(`Use 3-digit ZIP prefixes only: ${bad.join(', ')}`); return; }
    const taken = await db.from('bs_region_zip3').select('zip3, region_id').in('zip3', list.length ? list : ['000']);
    const clash = (taken.data ?? []).filter((t: any) => t.region_id !== regionId).map((t: any) => t.zip3);
    if (clash.length) { toast.error(`Already in another region: ${clash.join(', ')}`); return; }
    const del = await db.from('bs_region_zip3').delete().eq('region_id', regionId);
    if (del.error) { toast.error(del.error.message); return; }
    if (list.length) await run(db.from('bs_region_zip3').insert(list.map((zip3) => ({ zip3, region_id: regionId }))), 'ZIP coverage saved');
    else { toast.success('ZIP coverage cleared'); void load(); }
  };

  if (isLoading || isAdmin === null) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  const mfrName = (id: string) => mfrs.find((m) => m.id === id)?.name ?? '—';

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <SEO title="Build Studio | Vendibook Admin" description="Build Studio manufacturers and regions" noindex />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Build Studio partners</h1>
        <p className="text-sm text-muted-foreground">Approve manufacturers, define regions by 3-digit ZIP prefix, assign one partner per region, and approve catalog items before customers see them.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Manufacturers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {mfrs.map((m) => <div key={m.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <span className="min-w-[180px] font-medium">{m.name}{m.is_demo && <span className="ml-1 text-xs text-muted-foreground">(demo)</span>}</span>
            <select className={sel} value={m.status} onChange={(e) => run(db.from('bs_manufacturers').update({ status: e.target.value }).eq('id', m.id), 'Status updated')}>
              {['pending', 'approved', 'suspended'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <Input className="h-9 max-w-xs text-base" placeholder="Add partner user by email" value={memberEmail[m.id] ?? ''} onChange={(e) => setMemberEmail({ ...memberEmail, [m.id]: e.target.value })} />
            <Button size="sm" variant="outline" onClick={() => run(db.rpc('bs_add_member_by_email', { p_manufacturer_id: m.id, p_email: memberEmail[m.id] ?? '', p_role: 'editor' }), 'Partner user added')}>Add user</Button>
          </div>)}
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs text-base" placeholder="Manufacturer name" value={newMfr.name} onChange={(e) => setNewMfr({ ...newMfr, name: e.target.value })} />
            <Input className="max-w-xs text-base" placeholder="Contact email" value={newMfr.email} onChange={(e) => setNewMfr({ ...newMfr, email: e.target.value })} />
            <Button disabled={newMfr.name.trim().length < 2} onClick={() => { void run(db.from('bs_manufacturers').insert({ name: newMfr.name.trim(), contact_email: newMfr.email.trim() || null }), 'Manufacturer added'); setNewMfr({ name: '', email: '' }); }}>Add manufacturer</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Regions and assignments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {regions.map((r) => {
            const a = assigns.find((x) => x.region_id === r.id);
            return <div key={r.id} className="space-y-2 border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-[160px] font-medium">{r.name}</span>
                <select className={sel} value={r.status} onChange={(e) => run(db.from('bs_regions').update({ status: e.target.value }).eq('id', r.id), 'Region updated')}>
                  <option>active</option><option>disabled</option>
                </select>
                <select className={sel} value={a?.manufacturer_id ?? ''} onChange={(e) => {
                  if (!window.confirm(e.target.value ? `Assign ${mfrName(e.target.value)} to ${r.name}? Existing builds keep their original partner.` : `Remove the partner from ${r.name}?`)) return;
                  void run(db.rpc('bs_assign_region', { p_region_id: r.id, p_manufacturer_id: e.target.value || null }), 'Assignment updated');
                }}>
                  <option value="">No partner</option>
                  {mfrs.filter((m) => m.status === 'approved').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {a && <span className="text-xs text-muted-foreground">since {new Date(a.started_at).toLocaleDateString()}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Input className="max-w-md text-base" placeholder="ZIP prefixes, e.g. 850, 852, 853" value={zipDraft[r.id] ?? ''} onChange={(e) => setZipDraft({ ...zipDraft, [r.id]: e.target.value })} />
                <Button size="sm" variant="outline" onClick={() => saveZips(r.id)}>Save ZIPs</Button>
                <span className="self-center text-xs text-muted-foreground">{(zips[r.id] ?? []).length} prefixes</span>
              </div>
            </div>;
          })}
          <div className="flex gap-2">
            <Input className="max-w-xs text-base" placeholder="New region name" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} />
            <Button disabled={newRegion.trim().length < 2} onClick={() => { void run(db.from('bs_regions').insert({ name: newRegion.trim() }), 'Region added'); setNewRegion(''); }}>Add region</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Catalog awaiting approval ({pending.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
          {pending.map((p) => <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-[260px]">{p.table === 'bs_models' ? 'Model' : 'Equipment'} · {p.name} <span className="text-muted-foreground">({p.sku}, v{p.version})</span></span>
            <span className="text-muted-foreground">{mfrName(p.manufacturer_id)} · {usd(p.price)}</span>
            <Button size="sm" onClick={() => run(db.from(p.table).update({ status: 'approved' }).eq('id', p.id), 'Approved')}>Approve</Button>
            <Button size="sm" variant="ghost" onClick={() => run(db.from(p.table).update({ status: 'draft' }).eq('id', p.id), 'Sent back to draft')}>Send back</Button>
          </div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Coverage requests</CardTitle></CardHeader>
        <CardContent>
          {requests.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : <p className="text-sm text-muted-foreground">
            {Object.entries(requests.reduce<Record<string, number>>((acc, r) => { const k = r.zip.slice(0, 3); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}))
              .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}xx: ${n}`).join(' · ')}
          </p>}
        </CardContent>
      </Card>
    </main>
  );
}
