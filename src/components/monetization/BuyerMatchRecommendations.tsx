import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { bm } from './buyerMatchUi';

interface Note { title: string; action: string }
export default function BuyerMatchRecommendations({ campaignId }: { campaignId: string }) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [notes,setNotes] = useState<Note[]>([]);
  const [controller,setController] = useState<AbortController | null>(null);
  const review = async () => {
    const abort = new AbortController(); setController(abort); setBusy(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw Error('Sign in to review this listing.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buyermatch-recommendations`, { method:'POST', signal:abort.signal,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({campaign_id:campaignId}) });
      if (!response.ok) { const body = await response.json(); throw Error(body.error ?? 'Suggestions are unavailable right now.'); }
      if (!response.body) throw Error('No suggestions returned.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let output = '';
      while (true) {
        const {done,value} = await reader.read(); if(done) break;
        buffer += decoder.decode(value,{stream:true}); let end: number;
        while ((end=buffer.indexOf('\n'))>=0) {
          const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);
          if(!line.startsWith('data:')||line==='data: [DONE]') continue;
          const event=JSON.parse(line.slice(5));
          if(event.type==='response.output_text.delta') output+=event.delta;
          if(event.type==='error'||event.type==='response.failed') throw Error('Suggestions could not be finished. Try again.');
        }
      }
      const parsed=JSON.parse(output); if(!Array.isArray(parsed.recommendations)) throw Error('No suggestions returned.');
      setNotes((parsed.recommendations as Partial<Note>[]).filter((n): n is Note=>typeof n?.title==='string'&&typeof n?.action==='string').slice(0,5));
    } catch(e) { if(!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Could not review listing.'); }
    finally {setBusy(false);setController(null);}
  };
  return <section className="border-t border-[#ECE6DD] pt-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-xl"><h3 className={bm.h3}>A second read of your listing</h3><p className={bm.body + ' mt-1'}>Specific fixes, written automatically from your title, description, price, equipment list and photo count. They aren&rsquo;t buyer feedback.</p></div>
      <div className="flex shrink-0 gap-2"><button type="button" className={bm.quiet} disabled={busy} onClick={review}>{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{busy ? 'Reading your listing…' : 'Review my listing'}</button>{busy && <button type="button" className={bm.link} onClick={()=>controller?.abort()}>Stop</button>}</div>
    </div>
    {error && <p role="alert" className="mt-3 text-[14px] text-[#B42318]">{error}</p>}
    {!!notes.length && <ol className="mt-6 grid gap-6 md:grid-cols-3">{notes.map((n,i)=><li key={i}><p className="font-display text-[22px] leading-none text-[#FF5124]">{String(i+1).padStart(2,'0')}</p><p className="mt-3 text-[15px] font-semibold">{n.title}</p><p className={bm.body + ' mt-1'}>{n.action}</p></li>)}</ol>}
  </section>;
}
