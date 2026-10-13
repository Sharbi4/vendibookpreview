import { useState } from 'react';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
export default function BuyerMatchRecommendations({ campaignId }: { campaignId: string }) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [notes,setNotes] = useState<{ title: string; action: string }[]>([]);
  const [controller,setController] = useState<AbortController | null>(null);
  const review = async () => {
    const abort = new AbortController(); setController(abort); setBusy(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw Error('Sign in to review this listing.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buyermatch-recommendations`, { method:'POST', signal:abort.signal,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({campaign_id:campaignId}) });
      if (!response.ok) { const body = await response.json(); throw Error(body.error ?? 'AI suggestions are unavailable.'); }
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
          if(event.type==='error'||event.type==='response.failed') throw Error('AI suggestions could not be completed.');
        }
      }
      const parsed=JSON.parse(output); if(!Array.isArray(parsed.recommendations)) throw Error('No suggestions returned.');
      setNotes(parsed.recommendations.filter((n: any)=>typeof n.title==='string'&&typeof n.action==='string').slice(0,5));
    } catch(e) { if(!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Could not review listing.'); }
    finally {setBusy(false);setController(null);}
  };
  return <section className="border-t border-border pt-5"><h3 className="font-semibold">Personalized listing recommendations</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">Astra suggestions based on your listing facts—not observed buyer feedback or outreach results.</p><div className="mt-3 flex gap-2"><Button variant="outline" disabled={busy} onClick={review}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ClipboardCheck className="mr-2 h-4 w-4"/>}{busy ? 'Reviewing listing…' : 'Review my listing'}</Button>{busy && <Button variant="ghost" onClick={()=>controller?.abort()}>Stop</Button>}</div>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}<ul className="mt-4 space-y-4">{notes.map((n,i)=><li key={i}><p className="text-sm font-semibold">{n.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{n.action}</p></li>)}</ul></section>;
}
