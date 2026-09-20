import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { parseEdgeError } from '@/lib/edgeErrors';
let sdkPromise: Promise<any> | undefined;
let sdkEnvironment: string | undefined;
async function loadSdk(environment: string) {
  if(sdkEnvironment && sdkEnvironment !== environment) throw new Error('Reload the page to switch payment environments.');
  sdkEnvironment=environment;
  if(!sdkPromise) sdkPromise=new Promise((resolve,reject) => {
    const script=document.createElement('script');
    script.src=environment === 'production'?'https://web.squarecdn.com/v1/square.js':'https://sandbox.web.squarecdn.com/v1/square.js';
    script.onload=()=>resolve((window as any).Square);
    script.onerror=()=>{sdkPromise=undefined;script.remove();reject(new Error('Square could not load. Refresh and try again.'));};
    document.head.appendChild(script);
  });
  return sdkPromise;
}
async function request(body: Record<string,unknown>) {
  const {data,error}=await supabase.functions.invoke('square-billing',{body});
  if(error) {const parsed=await parseEdgeError(error);throw new Error(parsed?.message || 'Billing is unavailable. Please try again.');}
  return data;
}
export default function SquareBillingCheckout({slug,listingId,consentId,interval,onClose}: {slug:string;listingId?:string;consentId?:string;interval?:string;onClose:()=>void}) {
  const [quote,setQuote]=useState<any>(null);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [consent,setConsent]=useState(false);
  const container=useRef<HTMLDivElement>(null);
  const card=useRef<any>(null);
  const lock=useRef(false);
  useEffect(()=>{
    let canceled=false;let instance:any;
    setQuote(null);setReady(false);setStatus('');setError('');setConsent(false);
    void (async()=>{
      const q=await request({action:'prepare',product_slug:slug,listing_id:listingId,consent_id:consentId,billing_interval:interval});
      if(canceled)return;setQuote(q);
      const sdk=await loadSdk(q.environment);
      if(canceled)return;
      instance=await sdk.payments(q.application_id,q.location_id).card();
      if(canceled){await instance.destroy();return;}
      await instance.attach(container.current);card.current=instance;setReady(true);
    })().catch(e=>{if(!canceled)setError(e.message);});
    return ()=>{canceled=true;card.current=null;void instance?.destroy();};
  },[slug,listingId,consentId,interval]);
  const refresh=async()=>{
    if(!quote)return;
    setBusy(true);setError('');
    try{const result=await request({action:'status',attempt_id:quote.attempt_id});setStatus(result.status);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const pay=async()=>{
    if(lock.current || !card.current || !quote || (quote.recurring && !consent))return;
    lock.current=true;setBusy(true);setError('');
    try{
      const result=await card.current.tokenize({billingContact:quote.billing_contact,intent:quote.recurring?'STORE':'CHARGE',customerInitiated:true,sellerKeyedIn:false,...(!quote.recurring?{amount:((quote.amount_cents+quote.tax_cents)/100).toFixed(2),currencyCode:quote.currency}:{})});
      if(result.status!=='OK')throw new Error('Check your card details and try again.');
      const response=await request({action:'pay',attempt_id:quote.attempt_id,source_id:result.token});
      setStatus(response.status);
    }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  };
  const complete=status==='completed'||status==='active';
  const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:quote?.currency||'USD'}).format(cents/100);
  return <section className="sale-light mx-auto my-8 w-full max-w-lg rounded-3xl border border-border bg-[#fffdf9] p-6 shadow-sm sm:p-8">
    <p className="text-xs uppercase tracking-widest text-muted-foreground">Vendibook · Secure billing</p>
    <h1 className="mt-2 text-2xl font-semibold">{quote?.name||'Checkout'}</h1>
    {quote && <div className="my-5 space-y-2 border-y py-4 text-sm"><p className="flex justify-between"><span>Subtotal</span><span>{money(quote.amount_cents)}</span></p><p className="flex justify-between"><span>Sales tax</span><span>{money(quote.tax_cents)}</span></p><p className="flex justify-between text-lg font-semibold"><span>Total{quote.recurring?' per billing cycle':''}</span><span>{money(quote.amount_cents+quote.tax_cents)}</span></p>{quote.recurring && <p className="text-xs text-muted-foreground">Renews {quote.billing_interval}. Cancel from Account → Membership &amp; billing.</p>}</div>}
    <div ref={container} className={status?'hidden':'min-h-24'} />
    {!ready&&!error&&!status&&<p role="status" className="text-sm">Loading secure card payment…</p>}
    {!status&&quote?.recurring&&<label className="my-4 flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/><span>I authorize Square to save this card and charge {money(quote.amount_cents+quote.tax_cents)} {quote.billing_interval} until I cancel.</span></label>}
    {error&&<p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
    {status ? <div role="status" className="space-y-3"><p>{complete?'Payment confirmed. Your purchase is active.':'Your payment is being confirmed. Do not start another checkout.'}</p>{!complete&&<Button onClick={refresh} disabled={busy}>Check payment status</Button>}</div>:<Button className="mt-4 w-full rounded-full" disabled={!ready||busy||(quote?.recurring&&!consent)} onClick={pay}>{busy?'Processing…':quote?.recurring?'Subscribe and pay':'Pay now'}</Button>}
    <Button variant="ghost" className="mt-3 w-full" onClick={onClose} disabled={busy}>{complete?'Return to dashboard':'Back'}</Button>
    <p className="mt-4 text-center text-xs text-muted-foreground">Card details are securely handled by Square.</p>
  </section>;
}
