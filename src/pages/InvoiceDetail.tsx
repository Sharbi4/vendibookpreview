import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authPath } from '@/lib/auth/returnTo';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import CommerceStatus from '@/components/commerce/CommerceStatus';
import { commerceDb, invoiceMoney } from '@/hooks/useCommerceRecords';
import { Button } from '@/components/ui/button';

export default function InvoiceDetail() {
  const {invoiceId}=useParams();const {user,isLoading:loading}=useAuth();
  const query=useQuery({
    queryKey:['invoice',invoiceId,user?.id],enabled:!!user&&!!invoiceId,refetchInterval:15000,
    queryFn:async()=>{const {data,error}=await commerceDb.from('sale_invoices').select('*').eq('id',invoiceId).maybeSingle();if(error)throw error;return data;},
  });
  if(loading)return <Loader2 className="m-8 animate-spin"/>;
  if(!user)return <Navigate replace to={authPath(`/invoices/${invoiceId}`,'signin')}/>;
  const i=query.data;
  return <WorkspaceShell><div className="mx-auto max-w-4xl space-y-5">
    <div className="flex items-center justify-between print:hidden"><Link to="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4"/>Invoices &amp; Payments</Link>{i&&<Button variant="outline" onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Print / Save PDF</Button>}</div>
    {query.isLoading?<Loader2 className="animate-spin"/>:query.error?<div role="alert"><p>Invoice could not be loaded.</p><Button onClick={()=>query.refetch()}>Retry</Button></div>:!i?<p>Invoice not found or unavailable to this account.</p>:<>
      <article className="overflow-hidden rounded-3xl border bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b bg-gradient-to-br from-orange-50 to-white p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6"><img src="/brand/vendibook-logo-email.png" alt="Vendibook" className="h-9 w-auto"/><CommerceStatus status={i.status}/></div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Equipment purchase invoice</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{i.invoice_number}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Issued by Vendibook on behalf of {i.seller_snapshot.legal_name}, the legal seller.</p>
        </header>
        <div className="space-y-8 p-6 sm:p-10">
          <div className="grid gap-6 sm:grid-cols-2"><section><h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill to</h2><p className="mt-2 font-medium">{i.buyer_snapshot.name}</p><p className="text-sm text-muted-foreground">{i.buyer_snapshot.email}</p></section><section className="sm:text-right"><p className="text-sm">Issued {new Date(i.issued_at).toLocaleDateString()}</p><p className="mt-1 text-sm font-medium">Due {new Date(i.due_at).toLocaleDateString()}</p><p className="mt-1 text-xs text-muted-foreground">USD · {i.invoice_number}</p></section></div>
          <section><h2 className="text-xl font-semibold">{i.terms_snapshot.listing_title}</h2><p className="mt-1 break-all text-xs text-muted-foreground">Listing {i.listing_id}</p>{i.terms_snapshot.included_items&&<p className="mt-3 whitespace-pre-wrap text-sm">{i.terms_snapshot.included_items}</p>}</section>
          <dl className="space-y-4 border-y py-6">{[
            ['Equipment',i.equipment_cents],['Agreed delivery',i.delivery_cents],['Shipping',i.freight_cents],['Sales tax',i.tax_cents],
          ].map(([label,value])=><div key={String(label)} className="flex justify-between gap-4 text-sm"><dt>{label}</dt><dd className="font-medium">{label==='Shipping'&&i.terms_snapshot.freight_payer==='seller'?'Free shipping':invoiceMoney(value as number)}</dd></div>)}
          <div className="flex justify-between gap-4 border-t pt-5 text-xl font-semibold"><dt>Total due</dt><dd>{invoiceMoney(i.total_cents)}</dd></div></dl>
          <section className="rounded-2xl bg-stone-50 p-5 text-sm leading-6"><h2 className="font-semibold">Delivery &amp; purchase terms</h2><p>{String(i.terms_snapshot.fulfillment_type).replace(/_/g, ' ')}</p>{i.terms_snapshot.delivery_address&&<p>{i.terms_snapshot.delivery_address}</p>}{i.terms_snapshot.delivery_instructions&&<p className="whitespace-pre-wrap">{i.terms_snapshot.delivery_instructions}</p>}<Link className="mt-3 inline-flex items-center gap-2 text-orange-700 underline" to="/legal/purchase-agreement"><FileText className="h-4 w-4"/>Purchase agreement</Link></section>
          <p className="text-xs leading-5 text-muted-foreground">This invoice is not a payment receipt. The seller remains the legal seller. Applicable tax is based on the recorded determination for this purchase. No separate Vendibook buyer platform fee is added.</p>
        </div>
      </article>
      {i.status==='issued'&&i.buyer_id===user.id&&<section className="rounded-3xl border bg-orange-50/50 p-6 print:hidden"><h2 className="font-semibold">Payment pending activation</h2><p className="mt-2 text-sm text-muted-foreground">Online invoice payments will be available after payment verification is complete. Nothing has been charged. Your invoice remains available here.</p></section>}
      {i.paid_at&&<section className="rounded-2xl border p-5"><h2 className="font-semibold">Payment captured</h2><p className="mt-2 text-sm">Captured {new Date(i.paid_at).toLocaleString()}. Seller disbursement: {i.disbursement_status.replace(/_/g, ' ')}.</p>{i.auto_disbursement_at&&<p className="mt-2 text-sm">Provider release deadline: {new Date(i.auto_disbursement_at).toLocaleDateString()}. A reported issue does not extend the provider's holding period.</p>}<Link className="mt-3 inline-block text-sm text-orange-700 underline" to={`/order-tracking/${i.sale_id}`}>View order and handoff actions</Link></section>}
    </>}
  </div></WorkspaceShell>;
}
