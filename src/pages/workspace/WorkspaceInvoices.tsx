import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useCommerceRecords, commerceAction, invoiceMoney } from '@/hooks/useCommerceRecords';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, PageHeader, Panel, SimpleTable, StatusPill, formatDay, ws, type SimpleColumn } from '@/components/workspace/ui';
import { FilterPills } from '@/components/workspace/money/FilterPills';
import { LightScope } from '@/components/workspace/money/LightScope';
import { commercePill, rowBtn } from '@/components/workspace/money/moneyUi';
import { cn } from '@/lib/utils';

type Terms = { listing_title?: string; amount?: number | string; fulfillment_type?: string; included_items?: string | null; delivery_address?: string | null; delivery_instructions?: string | null };
type PurchaseRequest = { id: string; buyer_id: string; seller_id: string; status: string; revision: number; expires_at: string; created_at: string; accepted_terms: Terms; proposed_terms: { equipment_cents: number; included_items?: string } | null };
type Invoice = { id: string; request_id: string; buyer_id: string; seller_id: string; status: string; invoice_number: string; total_cents: number; due_at: string; paid_at: string | null; terms_snapshot: { listing_title?: string } | null; seller_snapshot: { legal_name?: string } | null };
type Party = { buyer_id: string; seller_id: string };

export default function WorkspaceInvoices() {
  const {user}=useAuth();
  const {data,isLoading,error,refetch}=useCommerceRecords();
  const client=useQueryClient();
  const [params]=useSearchParams();
  const requestedView=params.get('view');
  const [picked,setView]=useState<'buying'|'selling'|null>(requestedView==='selling'||requestedView==='buying'?requestedView:null);
  const [revision,setRevision]=useState<{id:string;amount:string;items:string}|null>(null);
  const action=useMutation({
    mutationFn:commerceAction,
    onSuccess:()=>{setRevision(null);client.invalidateQueries({queryKey:['commerce-records']});},
  });
  const mine=(r:Party,v:'buying'|'selling')=>v==='buying'?r.buyer_id===user?.id:r.seller_id===user?.id;
  const allRequests=(data?.requests??[]) as PurchaseRequest[];
  const allInvoices=(data?.invoices??[]) as Invoice[];
  // With no view chosen, open on the side that has records (a seller with no purchases lands on My sales).
  const view:'buying'|'selling'=picked??(data&&!allRequests.some((r)=>mine(r,'buying'))&&!allInvoices.some((r)=>mine(r,'buying'))&&(allRequests.some((r)=>mine(r,'selling'))||allInvoices.some((r)=>mine(r,'selling')))?'selling':'buying');
  const requests=allRequests.filter((r)=>mine(r,view));
  const invoices=allInvoices.filter((r)=>mine(r,view));
  const act=(r:PurchaseRequest,name:string,proposed?:unknown)=>action.mutate({action:'request_action',request_id:r.id,request_action:name,revision:r.revision,proposed_terms:proposed});
  const count=(v:'buying'|'selling')=>data?allInvoices.filter((r)=>mine(r,v)).length+allRequests.filter((r)=>mine(r,v)).length:undefined;
  const buying=view==='buying';

  const invoiceAction=(i:Invoice)=>i.status==='issued'&&buying
    ?<Link to={`/invoices/${i.id}`} className={rowBtn.ink}>Review &amp; pay</Link>
    :<Link to={`/invoices/${i.id}`} className={rowBtn.outline}>View</Link>;
  const invoiceColumns:SimpleColumn<Invoice>[]=[
    {key:'invoice',header:'Invoice',cell:(i)=><span className="block min-w-0">
      <Link to={`/invoices/${i.id}`} className="block max-w-[48vw] truncate font-semibold hover:underline sm:max-w-[20rem]">{i.terms_snapshot?.listing_title||'Equipment invoice'}</Link>
      <span className="block max-w-[48vw] truncate text-[12.5px] text-[#8A847B] sm:max-w-[20rem]">{i.invoice_number}{i.seller_snapshot?.legal_name?` · ${i.seller_snapshot.legal_name}`:''}</span>
      <span className="mt-2 flex flex-wrap items-center gap-2 sm:hidden"><StatusPill tone={commercePill(i.status).tone}>{commercePill(i.status).label}</StatusPill></span>
    </span>},
    {key:'status',header:'Status',hideBelow:'sm',cell:(i)=>{const p=commercePill(i.status);return <span title={p.detail}><StatusPill tone={p.tone}>{p.label}</StatusPill></span>;}},
    {key:'due',header:'Due',hideBelow:'md',className:'whitespace-nowrap text-[#5E5953]',cell:(i)=>i.status==='issued'?formatDay(i.due_at)??'—':i.paid_at?`Paid ${formatDay(i.paid_at)}`:<span className="text-[#B5AEA4]">—</span>},
    {key:'total',header:'Total',align:'right',className:'whitespace-nowrap font-semibold',cell:(i)=><>
      {invoiceMoney(i.total_cents)}
      <span className="mt-2 flex justify-end sm:hidden">{invoiceAction(i)}</span>
    </>},
    {key:'action',header:'Action',srOnlyHeader:true,align:'right',hideBelow:'sm',className:'w-[1%] whitespace-nowrap',cell:(i)=>invoiceAction(i)},
  ];

  return <WorkspaceShell><div className={ws.page}><div className={ws.stack}>
    <PageHeader
      eyebrow="Money"
      title="Invoices"
      description="Equipment purchases from the first request to the final handoff. Review terms, follow seller approval and find every itemized invoice here."
    >
      <FilterPills
        className="mt-6"
        label="Show invoices for"
        value={view}
        onChange={(id)=>setView(id==='selling'?'selling':'buying')}
        options={[{id:'buying',label:'My purchases',count:count('buying')},{id:'selling',label:'My sales',count:count('selling')}]}
      />
    </PageHeader>

    {action.error&&<p role="alert" className="rounded-xl bg-[#FCEBEA] px-4 py-3 text-[14px] text-[#9F1F15]">{action.error.message}</p>}

    {error?<Panel label="Invoices">
      <div role="alert" className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] text-[#1C1B1A]">We could not load your invoices. Please retry.</p>
        <button type="button" onClick={()=>refetch()} className={ws.secondary}>Retry</button>
      </div>
    </Panel>:<>
      <Panel title="Invoices" description={buying?'Itemized invoices for purchases a seller approved.':'Invoices Vendibook issued to buyers of your equipment.'} flush>
        <SimpleTable
          caption="Invoices"
          columns={invoiceColumns}
          rows={invoices}
          rowKey={(i)=>i.id}
          loading={isLoading}
          empty={buying
            ?<EmptyState compact className="px-5 py-5 sm:px-6" title="No invoices yet." body="When a seller approves your purchase request, your itemized invoice appears here with a Pay button." action={{label:'Browse equipment for sale',to:'/browse'}}/>
            :<EmptyState compact className="px-5 py-5 sm:px-6" title="No invoices yet." body="When you approve a buyer’s purchase request, Vendibook prepares their invoice and it shows up here." action={{label:'Your listings',to:'/dashboard/listings'}}/>}
        />
      </Panel>

      <Panel title="Purchase requests" description={buying?'Requests you sent to sellers.':'Requests from buyers waiting on your decision.'} flush>
        {isLoading?<div className="space-y-2 px-5 py-5 sm:px-6"><span className={ws.skeleton+' block h-4 w-56'}/><span className={ws.skeleton+' block h-3 w-40'}/></div>
        :!requests.length?<p className="px-5 py-5 text-[14px] text-[#5E5953] sm:px-6">No purchase requests yet.</p>
        :<ul className="divide-y divide-[#F1ECE5]">
        {requests.map((r)=>{const seller=r.seller_id===user?.id;const invoice=invoices.find((i)=>i.request_id===r.id);const expired=new Date(r.expires_at).getTime()<=Date.now();const active=!expired&&['requested','under_review','revision_pending'].includes(r.status);const pill=commercePill(expired&&['requested','under_review','revision_pending'].includes(r.status)?'expired':r.status);return <li id={`request-${r.id}`} key={r.id} className={cn('px-5 py-5 sm:px-6',params.get('request')===r.id&&'bg-[#FFF6F2] shadow-[inset_3px_0_0_#FF5124]')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1C1B1A]">{r.accepted_terms.listing_title}</h3>
              <p className="mt-0.5 text-[13px] text-[#8A847B]"><span className="font-semibold tabular-nums text-[#1C1B1A]">{invoiceMoney(Math.round(Number(r.accepted_terms.amount)*100))}</span> · {String(r.accepted_terms.fulfillment_type).replace(/_/g, ' ')} · Submitted {formatDay(r.created_at)}</p>
            </div>
            <span title={pill.detail}><StatusPill tone={pill.tone}>{pill.label}</StatusPill></span>
          </div>
          {!invoice&&<p className="mt-3 max-w-2xl text-[13.5px] leading-6 text-[#5E5953]">No payment is collected before the invoice is separately authorized.</p>}
          {active&&<p className="mt-1 text-[13.5px] font-semibold text-[#1C1B1A]">{seller?'Approve or decline by':'The seller has until'} {formatDay(r.expires_at)}{seller?'. After that the request is canceled automatically.':' to respond. After that the request is canceled automatically.'}</p>}
          {r.status==='approved'&&!invoice&&<p className="mt-3 rounded-xl bg-[#FCFAF7] px-4 py-3 text-[13.5px] leading-6 text-[#1C1B1A] ring-1 ring-inset ring-[#ECE6DD]">{seller?'You approved this sale. Vendibook is preparing the buyer\'s invoice and the equipment is reserved while payment is pending.':'The seller approved your purchase. Vendibook is preparing your invoice. You\'ll get an email and a Pay Invoice button here when it\'s ready.'}</p>}
          {r.accepted_terms.delivery_address&&<p className="mt-2 text-[13.5px] text-[#5E5953]">Destination: <span className="text-[#1C1B1A]">{r.accepted_terms.delivery_address}</span></p>}
          {r.accepted_terms.delivery_instructions&&<p className="mt-2 whitespace-pre-wrap text-[13.5px] text-[#5E5953]">{r.accepted_terms.delivery_instructions}</p>}
          {r.proposed_terms&&<div className="mt-4 rounded-xl bg-[#FFF6F2] px-4 py-3 ring-1 ring-inset ring-[#FFD9CB]"><strong className="text-[14px] text-[#1C1B1A]">Revised price: {invoiceMoney(r.proposed_terms.equipment_cents)}</strong><p className="mt-1.5 whitespace-pre-wrap text-[13.5px] text-[#5E5953]">{r.proposed_terms.included_items}</p></div>}
          {invoice&&<p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-[#5E5953]">Invoice {invoice.invoice_number} · {commercePill(invoice.status).label}<Link to={`/invoices/${invoice.id}`} className={ws.link}>{invoice.status==='issued'&&!seller?'Review & pay':'View invoice'}</Link></p>}
          {active&&<div className="mt-4 flex flex-wrap items-center gap-2">
            {seller&&r.status!=='revision_pending'&&<button type="button" className={rowBtn.ink} disabled={action.isPending} onClick={()=>act(r,'approve')}>Approve sale</button>}
            {seller&&<><button type="button" className={rowBtn.outline} disabled={action.isPending} onClick={()=>setRevision({id:r.id,amount:String(r.accepted_terms.amount),items:r.accepted_terms.included_items??''})}>Propose revised terms</button><button type="button" className={rowBtn.quiet} disabled={action.isPending} onClick={()=>act(r,'decline')}>Decline</button></>}
            {!seller&&r.status==='revision_pending'&&<button type="button" className={rowBtn.ink} disabled={action.isPending} onClick={()=>act(r,'accept_revision')}>Accept revised terms</button>}
            {!seller&&<button type="button" className={rowBtn.outline} disabled={action.isPending} onClick={()=>act(r,'cancel')}>Cancel request</button>}
          </div>}
          {revision?.id===r.id&&<LightScope><form className="mt-4 max-w-xl space-y-3 rounded-xl px-4 py-4 ring-1 ring-inset ring-[#ECE6DD] [&_input]:border-[#E2DBD0] [&_input]:bg-white [&_textarea]:border-[#E2DBD0] [&_textarea]:bg-white" onSubmit={e=>{e.preventDefault();const amount=Number(revision.amount);if(Number.isFinite(amount)&&amount>0&&amount<=10000000)act(r,'revise',{equipment_cents:Math.round(amount*100),included_items:revision.items});}}>
            <label className="block space-y-1.5 text-[13.5px] font-semibold">Equipment price<Input type="number" required min="0.01" max="10000000" step="0.01" value={revision.amount} onChange={e=>setRevision({...revision,amount:e.target.value})}/></label>
            <label className="block space-y-1.5 text-[13.5px] font-semibold">Included items and revised terms<Textarea required maxLength={4000} value={revision.items} onChange={e=>setRevision({...revision,items:e.target.value})}/></label>
            <p className="text-[12.5px] text-[#8A847B]">The buyer must explicitly accept these changes before approval.</p>
            <div className="flex flex-wrap items-center gap-2"><button type="submit" className={rowBtn.ink} disabled={action.isPending}>Send revised terms</button><button type="button" className={rowBtn.quiet} onClick={()=>setRevision(null)}>Cancel</button></div>
          </form></LightScope>}
        </li>})}
        </ul>}
      </Panel>
    </>}
  </div></div></WorkspaceShell>;
}
