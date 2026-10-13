import { Link } from 'react-router-dom';
import { LockKeyhole, ArrowUpRight, Activity, Search, MessageSquare, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BuyerMatchPreview() {
  return <section aria-label="BuyerMatch example preview" className="relative overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-6 py-4"><p className="font-medium">Your campaign intelligence</p><span className="text-xs text-muted-foreground">Example preview</span></div>
    <div className="pointer-events-none select-none blur-[4px] opacity-60 p-6" aria-hidden="true">
      <p className="text-lg font-semibold">2023 Food Trailer · $38,500</p><p className="text-sm text-muted-foreground">Example campaign · Last 30 days</p>
      <div className="my-7 grid grid-cols-2 gap-5 sm:grid-cols-4">{[[Search,'1,248','Listing views'],[Link2,'86','Tracked link visits'],[Activity,'34','Outreach attempts'],[MessageSquare,'5','Buyer responses']].map(([Icon,n,label])=>{const I=Icon as typeof Search;return <div key={String(label)}><I className="mb-3 h-4 w-4 text-primary"/><p className="text-3xl font-semibold">{String(n)}</p><p className="mt-1 text-xs text-muted-foreground">{String(label)}</p></div>;})}</div>
      <div className="grid gap-8 sm:grid-cols-2"><div><h3>Buyer engagement</h3><div className="mt-4 flex h-32 items-end gap-3">{[25,42,28,64,45,78,90].map((h,i)=><div key={i} className={`flex-1 rounded-t bg-primary/25 ${h>70?'h-28':h>40?'h-20':'h-12'}`}/>)}</div></div><div><h3>Recent campaign activity</h3>{['Outreach sent · Texas','Tracked listing viewed','Buyer requested more details'].map(s=><p key={s} className="border-b border-border py-4 text-sm">{s}</p>)}</div></div>
    </div>
    <div className="absolute inset-x-4 top-24 z-10 mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:top-28">
      <LockKeyhole className="mx-auto h-6 w-6 text-primary"/><h2 className="mt-4 text-2xl font-semibold">Unlock BuyerMatch AI</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">See how Vendibook helps discover potential buyers, tracks approved outreach, and measures interest in your equipment.</p>
      <Button asChild className="mt-5 w-full"><Link to="/dashboard/buyermatch/membership">Unlock now<ArrowUpRight className="ml-2 h-4 w-4"/></Link></Button>
      <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/dashboard/buyermatch/membership#benefits">Explore membership benefits</Link></Button>
      <p className="mt-3 text-xs text-muted-foreground">Interactive preview only — no payment required here.</p>
    </div>
    <p className="border-t border-border px-6 py-4 text-xs text-muted-foreground">Illustrative sample data only — not actual Vendibook or Muse activity.</p>
  </section>;
}