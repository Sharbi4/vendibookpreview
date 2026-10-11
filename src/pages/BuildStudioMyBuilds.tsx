import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BUILD_STATUS, BuildTimeline, QuoteCard, usd, type BuildEvent, type Quote } from '@/components/buildStudio/BuildTimeline';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
type Build = { id: string; name: string | null; zip: string; status: string; subtotal_cents: number | null; quote_required: boolean; created_at: string;
  price_snapshot: { lines?: { label: string; amount_cents: number | null }[] } };

/** Shopper's Build Studio builds: send for review, read partner feedback, accept or decline final quotes. No payment here. */
export default function BuildStudioMyBuilds() {
  const { user, isLoading } = useAuth();
  const [builds, setBuilds] = useState<Build[] | null>(null);
  const [events, setEvents] = useState<BuildEvent[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await db.from('bs_builds').select('id, name, zip, status, subtotal_cents, quote_required, created_at, price_snapshot')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) toast.error("Couldn't load your builds");
    setBuilds(data ?? []);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  const loadDetail = useCallback(async (id: string) => {
    const [e, q] = await Promise.all([
      db.from('bs_build_events').select('*').eq('build_id', id).order('created_at'),
      db.from('bs_quotes').select('*').eq('build_id', id).order('version', { ascending: false }),
    ]);
    setEvents(e.data ?? []); setQuotes(q.data ?? []);
  }, []);
  useEffect(() => { if (open) void loadDetail(open); }, [open, loadDetail]);

  const act = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { error } = await db.rpc(fn, args);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(ok); setMsg(''); void load(); if (open) void loadDetail(open);
  };

  if (isLoading || (user && builds === null)) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth?redirect=/build-studio/my-builds" replace />;

  return <div className="min-h-screen flex flex-col bg-background">
    <SEO title="My builds | Build Studio" description="Your Build Studio builds and quotes" noindex />
    <Header />
    <main className="flex-1 container max-w-3xl py-10 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">My builds</h1>
        <Button asChild variant="outline" size="sm"><Link to="/build-studio">New build</Link></Button>
      </div>
      {builds!.length === 0 && <p className="text-muted-foreground">No saved builds yet. Design one in Build Studio and save it to your account.</p>}
      {builds!.map((b) => <div key={b.id} className="rounded-xl border border-border p-4">
        <button type="button" className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left" onClick={() => setOpen(open === b.id ? null : b.id)}>
          <span className="font-medium text-foreground">{b.name ?? 'Untitled build'} <span className="text-xs text-muted-foreground">· ZIP {b.zip} · {new Date(b.created_at).toLocaleDateString()}</span></span>
          <span className="text-sm text-primary">{BUILD_STATUS[b.status] ?? b.status}</span>
        </button>
        {open === b.id && <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Preliminary price when saved</p>
            <ul className="mt-1 space-y-0.5 text-sm">{(b.price_snapshot.lines ?? []).map((l, i) => <li key={i} className="flex justify-between"><span className="text-muted-foreground">{l.label}</span><span>{usd(l.amount_cents)}</span></li>)}</ul>
            <p className="mt-1 flex justify-between font-medium"><span>Subtotal</span><span>{usd(b.subtotal_cents)}{b.quote_required ? ' + quoted items' : ''}</span></p>
          </div>
          {quotes.map((q) => <QuoteCard key={q.id} q={q}>
            {q.status === 'issued' && b.status === 'quoted' && <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={busy || new Date(q.expires_at) < new Date()} onClick={() => {
                if (window.confirm(`Accept quote v${q.version} from ${q.manufacturer_name} for ${usd(q.total_cents)}? No payment is taken now; Vendibook will contact you about next steps.`))
                  void act('bs_respond_quote', { p_quote_id: q.id, p_accept: true, p_note: null }, 'Quote accepted');
              }}>Accept quote</Button>
              <Button variant="outline" disabled={busy} onClick={() => act('bs_respond_quote', { p_quote_id: q.id, p_accept: false, p_note: msg || null }, 'Quote declined — the build partner will follow up')}>Decline</Button>
            </div>}
          </QuoteCard>)}
          {b.status === 'saved' && <Button disabled={busy} onClick={() => act('bs_submit_build', { p_build_id: b.id, p_note: msg || null }, 'Sent for engineering review')}>Send for engineering review</Button>}
          {b.status === 'changes_requested' && <div className="rounded-lg bg-muted/50 p-3 text-sm">
            The build partner asked for changes. Reply below, or open Build Studio to make a revised build and send that instead.
            <div className="mt-2"><Button size="sm" disabled={busy} onClick={() => act('bs_submit_build', { p_build_id: b.id, p_note: msg || null }, 'Sent back for review')}>Send back for review</Button></div>
          </div>}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Activity</p>
            <BuildTimeline events={events} />
          </div>
          {b.status !== 'saved' && <div className="space-y-2">
            <Textarea rows={2} className="text-base" placeholder="Message the build partner" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} />
            <Button size="sm" variant="outline" disabled={busy || !msg.trim()} onClick={() => act('bs_build_message', { p_build_id: b.id, p_body: msg }, 'Message sent')}>Send message</Button>
          </div>}
          <p className="text-[11px] text-muted-foreground">Previews aren't engineering-certified drawings. Nothing is charged in Build Studio.</p>
        </div>}
      </div>)}
    </main>
    <Footer />
  </div>;
}
