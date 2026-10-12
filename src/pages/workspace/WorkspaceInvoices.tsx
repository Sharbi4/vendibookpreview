import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, ArrowUpRight, Loader2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import CommerceStatus from '@/components/commerce/CommerceStatus';
import { useCommerceRecords, commerceAction, invoiceMoney } from '@/hooks/useCommerceRecords';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function WorkspaceInvoices() {
  const {user}=useAuth();
  const {data,isLoading,error,refetch}=useCommerceRecords();
  const client=useQueryClient();
  const [params]=useSearchParams();
  const [view,setView]=useState<'buying'|'selling'>(params.get('view')==='selling'?'selling':'buying');
  const [revision,setRevision]=useState<{id:string;amount:string;items:string}|null>(null);
  const action=useMutation({
    mutationFn:commerceAction,
    onSuccess:()=>{setRevision(null);client.invalidateQueries({queryKey:['commerce-records']});},
  });
  const requests=(data?.requests??[]).filter((r:any)=>view==='buying'?r.buyer_id===user?.id:r.seller_id===user?.id);
  const invoices=(data?.invoices??[]).filter((r:any)=>view==='buying'?r.buyer_id===user?.id:r.seller_id===user?.id);
  const act=(r:any,name:string,proposed?:unknown)=>action.mutate({action:'request_action',request_id:r.id,request_action:name,revision:r.revision,proposed_terms:proposed});
  return <WorkspaceShell><div className="mx-auto max-w-6xl space-y-8">
    <header className="rounded-3xl border bg-gradient-to-br from-orange-50 via-white to-stone-50 p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Your equipment transactions</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Invoices &amp; Payments</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">From the first request to the final handoff. Review terms, follow seller approval, and find every invoice in one place.</p>
      <div className="mt-6 flex gap-2">{(['buying','selling'] as const).map(v=><Button key={v} variant={view===v?'default':'outline'} onClick={()=>setView(v)}>{v==='buying'?'My purchases':'My sales'}</Button>)}</div>
    </header>
    {action.error&&<p role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">{action.error.message}</p>}
    {isLoading?<Loader2 className="animate-spin"/>:error?<div role="alert" className="rounded-2xl border p-5"><p>We could not load your invoices. Please retry.</p><Button onClick={()=>refetch()} variant="outline">Retry</Button></div>:<>
      <section className="space-y-4"><h2 className="text-xl font-semibold">Invoices</h2>
        {!invoices.length&&<p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Approved purchases will appear here with their itemized invoice.</p>}
        <div className="grid gap-4 md:grid-cols-2">{invoices.map((i:any)=><Link key={i.id} to={`/invoices/${i.id}`} className="rounded-3xl border bg-white p-6 shadow-sm transition hover:border-orange-300">
          <div className="flex items-start justify-between gap-3"><FileText className="text-orange-600"/><CommerceStatus status={i.status}/></div>
          <h3 className="mt-5 font-semibold">{i.terms_snapshot.listing_title}</h3><p className="mt-1 text-xs text-muted-foreground">{i.invoice_number} · {i.seller_snapshot.legal_name}</p>
          <div className="mt-5 flex items-center justify-between"><strong className="text-2xl">{invoiceMoney(i.total_cents)}</strong><ArrowUpRight className="h-5 w-5"/></div>
          <p className="mt-3 text-xs text-muted-foreground">Due {new Date(i.due_at).toLocaleDateString()}</p>
          <p className="mt-4 text-sm font-semibold text-orange-700">{i.status==='issued'&&view==='buying'?'Review & pay invoice':'View invoice'}</p>
        </Link>)}</div>
      </section>
      <section className="space-y-4"><h2 className="text-xl font-semibold">Purchase requests</h2>
        {!requests.length&&<p className="text-sm text-muted-foreground">No purchase requests yet.</p>}
        {requests.map((r:any)=>{const seller=r.seller_id===user?.id;const expired=new Date(r.expires_at).getTime()<=Date.now();const active=!expired&&['requested','under_review','revision_pending'].includes(r.status);return <article id={`request-${r.id}`} key={r.id} className={`rounded-3xl border bg-white p-6 ${params.get('request')===r.id?'ring-2 ring-orange-300':''}`}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">{r.accepted_terms.listing_title}</h3><p className="mt-1 text-sm text-muted-foreground">{invoiceMoney(Math.round(Number(r.accepted_terms.amount)*100))} · {String(r.accepted_terms.fulfillment_type).replaceAll('_',' ')}</p></div><CommerceStatus status={expired&&['requested','under_review','revision_pending'].includes(r.status)?'expired':r.status}/></div>
          <p className="mt-3 text-sm text-muted-foreground">Request submitted {new Date(r.created_at).toLocaleDateString()}. No payment is collected before the invoice is separately authorized.</p>
          {r.accepted_terms.delivery_address&&<p className="mt-2 text-sm">Destination: {r.accepted_terms.delivery_address}</p>}
          {r.accepted_terms.delivery_instructions&&<p className="mt-2 whitespace-pre-wrap text-sm">{r.accepted_terms.delivery_instructions}</p>}
          {r.proposed_terms&&<div className="mt-4 rounded-xl bg-orange-50 p-4"><strong>Revised price: {invoiceMoney(r.proposed_terms.equipment_cents)}</strong><p className="mt-2 whitespace-pre-wrap text-sm">{r.proposed_terms.included_items}</p></div>}
          {active&&<div className="mt-5 flex flex-wrap gap-2">
            {seller&&r.status!=='revision_pending'&&<Button disabled={action.isPending} onClick={()=>act(r,'approve')}>Approve &amp; issue invoice</Button>}
            {seller&&<><Button variant="outline" disabled={action.isPending} onClick={()=>setRevision({id:r.id,amount:String(r.accepted_terms.amount),items:r.accepted_terms.included_items??''})}>Propose revised terms</Button><Button variant="ghost" disabled={action.isPending} onClick={()=>act(r,'decline')}>Decline</Button></>}
            {!seller&&r.status==='revision_pending'&&<Button disabled={action.isPending} onClick={()=>act(r,'accept_revision')}>Accept revised terms</Button>}
            {!seller&&<Button variant="outline" disabled={action.isPending} onClick={()=>act(r,'cancel')}>Cancel request</Button>}
          </div>}
          {revision?.id===r.id&&<form className="mt-4 space-y-3 rounded-xl border p-4" onSubmit={e=>{e.preventDefault();const amount=Number(revision.amount);if(Number.isFinite(amount)&&amount>0&&amount<=10000000)act(r,'revise',{equipment_cents:Math.round(amount*100),included_items:revision.items});}}>
            <label className="block text-sm">Equipment price<Input type="number" required min="0.01" max="10000000" step="0.01" value={revision.amount} onChange={e=>setRevision({...revision,amount:e.target.value})}/></label>
            <label className="block text-sm">Included items and revised terms<Textarea required maxLength={4000} value={revision.items} onChange={e=>setRevision({...revision,items:e.target.value})}/></label>
            <p className="text-xs text-muted-foreground">The buyer must explicitly accept these changes before approval.</p><Button disabled={action.isPending}>Send revised terms</Button>
          </form>}
        </article>})}
      </section>
    </>}
  </div></WorkspaceShell>;
}
