import { useEffect, useId, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, CheckCircle2, Wallet, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { authPath } from '@/lib/auth/returnTo';
import { SALE_SELLER_FEE_PERCENT } from '@/lib/commissions';
import { normalizeUsState, parseStateZipFromAddress, taxRateFor } from '../../supabase/functions/_shared/tax';
import { commerceAction, commerceDb, invoiceMoney } from '@/hooks/useCommerceRecords';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Commerce tables are not in the generated Supabase types yet (see commerceDb).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const cents = (dollars: unknown) => Math.round(Number(dollars ?? 0) * 100);
const toCents = (value: string) => Math.round(Number(value || 0) * 100);
const dollars = (value: number) => (value / 100).toFixed(2);

/** Owner process (2026-10-13): invoices are calculated and sent by hand, and the
 * seller payment is released by hand. This page records each step so the buyer
 * sees Pay Invoice and the hold/release state stays in the system. */
export default function AdminInvoices() {
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const admin = useQuery({
    queryKey: ['is-admin', user?.id], enabled: !!user,
    queryFn: async () => { const { data } = await supabase.rpc('is_admin', { user_id: user!.id }); return !!data; },
  });
  const records = useQuery({
    queryKey: ['admin-invoices'], enabled: admin.data === true, refetchInterval: 30000,
    queryFn: async () => {
      const [requests, invoices] = await Promise.all([
        commerceDb.from('sale_purchase_requests').select('*').eq('status', 'approved').order('updated_at', { ascending: true }),
        commerceDb.from('sale_invoices').select('*').order('issued_at', { ascending: false }).limit(200),
      ]);
      if (requests.error || invoices.error) throw requests.error || invoices.error;
      return { requests: (requests.data ?? []) as Row[], invoices: (invoices.data ?? []) as Row[] };
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });

  if (isLoading || admin.isLoading) return <Loader2 className="m-8 animate-spin" />;
  if (!user) return <Navigate replace to={authPath('/admin/invoices', 'signin')} />;
  if (!admin.data) return <Navigate replace to="/" />;

  const invoiced = new Set((records.data?.invoices ?? []).map((i) => i.request_id));
  const toInvoice = (records.data?.requests ?? []).filter((r) => !invoiced.has(r.id));
  const invoices = records.data?.invoices ?? [];
  const awaitingPayment = invoices.filter((i) => i.status === 'issued');
  const held = invoices.filter((i) => i.status === 'paid');
  const done = invoices.filter((i) => !['issued', 'paid'].includes(i.status)).slice(0, 25);

  return <div className="min-h-screen bg-stone-50"><Header /><main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
    <div><h1 className="text-2xl font-semibold">Sale invoices</h1>
      <p className="mt-1 text-sm text-muted-foreground">Invoices and seller payouts are handled by hand. Record each step here after you do it so the buyer and seller see the right status.</p></div>
    {records.isLoading ? <Loader2 className="animate-spin" /> : records.error ? <div role="alert" className="space-y-2"><p>Invoices could not be loaded.</p><Button onClick={() => records.refetch()}>Retry</Button></div> : <>
      <Section title="1. Send invoice" hint="The seller approved these sales. Calculate the invoice, send it to the buyer, then record it.">
        {toInvoice.length === 0 ? <Empty text="No approved sales are waiting for an invoice." /> :
          toInvoice.map((r) => <InvoiceForm key={r.id} request={r} focused={params.get('request') === r.id} onDone={refresh} />)}
      </Section>
      <Section title="2. Record payment" hint="Mark an invoice paid only after the money has arrived. The payment is then held.">
        {awaitingPayment.length === 0 ? <Empty text="No invoices are awaiting payment." /> :
          awaitingPayment.map((i) => <InvoiceCard key={i.id} invoice={i} focused={params.get('invoice') === i.id}>
            <ReferenceAction label="Payment reference (e.g. PayPal or bank transaction ID)" button="Record payment" icon={<CheckCircle2 className="mr-2 h-4 w-4" />}
              run={(reference) => commerceAction({ action: 'admin_record_payment', invoice_id: i.id, reference })} onDone={refresh} />
            <CancelAction requestId={i.request_id} onDone={refresh} />
          </InvoiceCard>)}
      </Section>
      <Section title="3. Release seller payment" hint="Funds are held until the buyer confirms, both parties sign and the walkthrough video is saved.">
        {held.length === 0 ? <Empty text="No payments are being held." /> :
          held.map((i) => <InvoiceCard key={i.id} invoice={i} focused={params.get('invoice') === i.id}>
            {i.release_ready_at
              ? <ReferenceAction label="Payout reference" button="Record release" icon={<Wallet className="mr-2 h-4 w-4" />}
                  run={(reference) => commerceAction({ action: 'admin_record_release', invoice_id: i.id, reference })} onDone={refresh} />
              : <p className="text-sm text-muted-foreground">Waiting on buyer confirmation, both signatures and the walkthrough video. You'll get an email when it's ready.</p>}
          </InvoiceCard>)}
      </Section>
      <Section title="Tax exemption certificates" hint="Certificates apply as soon as buyers upload them. Check each one and revoke any that are invalid.">
        <ExemptionReview />
      </Section>
      <Section title="Recent" hint="Released, cancelled or expired invoices.">
        {done.length === 0 ? <Empty text="Nothing yet." /> : done.map((i) => <InvoiceCard key={i.id} invoice={i} focused={false} />)}
      </Section>
    </>}
  </main><Footer /></div>;
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <section className="space-y-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{hint}</p></div>{children}</section>;
}
const Empty = ({ text }: { text: string }) => <p className="rounded-2xl border border-dashed bg-white p-5 text-sm text-muted-foreground">{text}</p>;

function useFocus(focused: boolean, id: string) {
  useEffect(() => { if (focused) document.getElementById(id)?.scrollIntoView({ block: 'center' }); }, [focused, id]);
}

function InvoiceForm({ request, focused, onDone }: { request: Row; focused: boolean; onDone: () => void }) {
  const terms = request.accepted_terms ?? {};
  const equipment = cents(terms.amount);
  const [delivery, setDelivery] = useState(dollars(cents(terms.delivery_fee)));
  const [freight, setFreight] = useState(dollars(terms.freight_payer === 'seller' ? 0 : cents(terms.freight_cost)));
  const [tax, setTax] = useState('0.00');
  const [fee, setFee] = useState(dollars(Math.round(equipment * SALE_SELLER_FEE_PERCENT / 100)));
  const [jurisdiction, setJurisdiction] = useState('');
  const [dueDays, setDueDays] = useState('7');
  const [url, setUrl] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useFocus(focused, 'request-' + request.id);
  const suggestion = useTaxSuggestion(request, equipment + toCents(delivery));
  const [taxTouched, setTaxTouched] = useState(false);
  useEffect(() => {
    if (!suggestion || taxTouched) return;
    setTax(dollars(suggestion.taxCents));
    setJurisdiction(suggestion.jurisdiction);
  }, [suggestion, taxTouched]);
  const total = equipment + toCents(delivery) + toCents(freight) + toCents(tax);
  const payout = equipment - toCents(fee);
  const submit = async () => {
    setBusy(true);
    try {
      await commerceAction({
        action: 'admin_record_invoice', request_id: request.id, equipment_cents: equipment, delivery_cents: toCents(delivery),
        freight_cents: toCents(freight), tax_cents: toCents(tax), fee_cents: toCents(fee), due_days: Number(dueDays),
        invoice_url: url.trim() || null, invoice_reference: reference.trim() || null, note: note.trim() || null, tax_jurisdiction: jurisdiction.trim() || null,
      });
      toast.success('Invoice recorded. The buyer now sees Pay Invoice.');
      onDone();
    } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  };
  return <article id={'request-' + request.id} className={`space-y-4 rounded-2xl border bg-white p-5 ${focused ? 'ring-2 ring-orange-400' : ''}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{terms.listing_title ?? 'Equipment sale'}</h3>
      <p className="text-xs text-muted-foreground">Request {request.id} · approved {new Date(request.approved_at ?? request.updated_at).toLocaleDateString()}</p></div>
      <Badge variant="secondary">Payment pending</Badge></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Equipment (accepted price)"><Input value={dollars(equipment)} disabled /></Field>
      <Field label="Delivery"><Input inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
      <Field label={terms.freight_payer === 'seller' ? 'Shipping (seller pays: 0)' : 'Shipping'}><Input inputMode="decimal" value={freight} onChange={(e) => setFreight(e.target.value)} /></Field>
      <Field label="Sales tax"><Input inputMode="decimal" value={tax} onChange={(e) => { setTaxTouched(true); setTax(e.target.value); }} /></Field>
      <Field label="Tax jurisdiction"><Input placeholder="e.g. AZ / Pima County" value={jurisdiction} onChange={(e) => { setTaxTouched(true); setJurisdiction(e.target.value); }} /></Field>
      <Field label={`Seller fee (${SALE_SELLER_FEE_PERCENT}% default)`}><Input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
      <Field label="Payment link (https)"><Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
      <Field label="Invoice number / reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      <Field label="Due in (days)"><Input inputMode="numeric" value={dueDays} onChange={(e) => setDueDays(e.target.value)} /></Field>
    </div>
    {suggestion && <p className="rounded-xl bg-stone-50 p-3 text-xs leading-5 text-muted-foreground">{suggestion.explanation}</p>}
    <Field label="Note to buyer and seller (optional, visible to both)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
      <p>Buyer total <strong>{invoiceMoney(total)}</strong> · Seller payout (equipment − fee) <strong>{invoiceMoney(payout)}</strong></p>
      <div className="flex gap-2"><CancelAction requestId={request.id} onDone={onDone} />
        <Button disabled={busy || payout < 0} onClick={submit}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Record invoice sent</Button></div>
    </div>
  </article>;
}

/** Suggested sales tax for a manual invoice: the same rates and exemption rules
 * the checkouts use (equipment + delivery are taxable; shipping is not). The
 * admin can still edit both fields before recording the invoice. */
function useTaxSuggestion(request: Row, taxableCents: number) {
  const terms = request.accepted_terms ?? {};
  const delivers = ['delivery', 'vendibook_freight'].includes(String(terms.fulfillment_type));
  const listing = useQuery({
    queryKey: ['admin-invoice-listing', request.listing_id],
    queryFn: async () => {
      const { data } = await supabase.from('listings').select('state, address').eq('id', request.listing_id).maybeSingle();
      return data;
    },
  });
  const state = normalizeUsState((delivers ? parseStateZipFromAddress(terms.delivery_address).state : null) ?? listing.data?.state ?? null);
  const exemption = useQuery({
    queryKey: ['admin-invoice-exemption', request.buyer_id, state],
    enabled: !!state,
    queryFn: async () => {
      const { data } = await commerceDb.from('tax_exemptions').select('id, certificate_number, entity_name, exemption_type')
        .eq('user_id', request.buyer_id).eq('state', state).eq('status', 'active').maybeSingle();
      return data as Row | null;
    },
  });
  if (listing.isLoading || exemption.isLoading) return null;
  if (!state) return { taxCents: 0, jurisdiction: '', explanation: 'No destination state found for this purchase. Enter the tax by hand.' };
  if (exemption.data) {
    return { taxCents: 0, jurisdiction: `${state} (exempt)`,
      explanation: `The buyer has an active ${exemption.data.exemption_type} exemption for ${state} (${exemption.data.entity_name}, certificate ${exemption.data.certificate_number}), so tax is $0. Review the certificate in Admin before invoicing.` };
  }
  const { ratePct } = taxRateFor(state, 'sale');
  return { taxCents: Math.round(taxableCents * ratePct / 100), jurisdiction: state,
    explanation: `Suggested tax: ${ratePct}% of equipment + delivery (${state} state + average local rate, ${delivers ? 'delivery address' : 'listing location'}). Edit if the exact city rate differs.` };
}

/** Unreviewed certificates first; admins open the file, then mark reviewed or revoke. */
function ExemptionReview() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-tax-exemptions'],
    queryFn: async () => {
      const { data, error } = await commerceDb.from('tax_exemptions').select('*').eq('status', 'active')
        .order('reviewed_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const act = async (id: string, patch: Row, done: string) => {
    const { error } = await commerceDb.from('tax_exemptions').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(done);
    await queryClient.invalidateQueries({ queryKey: ['admin-tax-exemptions'] });
  };
  const open = async (path: string) => {
    const { data, error } = await supabase.storage.from('tax-exemption-certificates').createSignedUrl(path, 300);
    if (error || !data) return toast.error('The certificate file could not be opened.');
    window.open(data.signedUrl, '_blank', 'noopener');
  };
  if (list.isLoading) return <Loader2 className="animate-spin" />;
  if (!list.data?.length) return <Empty text="No active exemption certificates." />;
  return <>{list.data.map((e) => <article key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-sm">
    <div><p className="font-semibold">{e.state} · {e.entity_name} <Badge variant={e.reviewed_at ? 'secondary' : 'destructive'}>{e.reviewed_at ? 'Reviewed' : 'Needs review'}</Badge></p>
      <p className="text-xs text-muted-foreground">{e.exemption_type} · certificate {e.certificate_number} · buyer {e.user_id} · uploaded {new Date(e.created_at).toLocaleDateString()}</p></div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => open(e.document_path)}>View file</Button>
      {!e.reviewed_at && <Button size="sm" onClick={() => act(e.id, { reviewed_at: new Date().toISOString() }, 'Marked reviewed')}>Mark reviewed</Button>}
      <Button variant="ghost" size="sm" onClick={() => { const reason = window.prompt('Why is this certificate being revoked? (shown in admin only)'); if (reason?.trim()) void act(e.id, { status: 'revoked', revoke_reason: reason.trim() }, 'Certificate revoked. Tax applies to this buyer again.'); }}>Revoke</Button>
    </div>
  </article>)}</>;
}

function InvoiceCard({ invoice: i, focused, children }: { invoice: Row; focused: boolean; children?: React.ReactNode }) {
  useFocus(focused, 'invoice-' + i.id);
  const fee = Number(i.fee_snapshot?.fee_cents ?? 0);
  return <article id={'invoice-' + i.id} className={`space-y-3 rounded-2xl border bg-white p-5 ${focused ? 'ring-2 ring-orange-400' : ''}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div>
      <h3 className="font-semibold">{i.invoice_number} · {i.terms_snapshot?.listing_title ?? 'Equipment sale'}</h3>
      <p className="text-xs text-muted-foreground">Buyer {i.buyer_snapshot?.name} ({i.buyer_snapshot?.email}) · Seller {i.seller_snapshot?.legal_name}</p></div>
      <Badge variant="secondary">{String(i.status).replace(/_/g, ' ')} · {String(i.disbursement_status).replace(/_/g, ' ')}</Badge></div>
    <p className="text-sm">Total {invoiceMoney(i.total_cents)} · Fee {invoiceMoney(fee)} · Seller payout {invoiceMoney(Number(i.equipment_cents) - fee)} · Due {new Date(i.due_at).toLocaleDateString()}</p>
    {(i.external_invoice_reference || i.payment_reference || i.release_reference) && <p className="text-xs text-muted-foreground">
      {[i.external_invoice_reference && `Invoice ${i.external_invoice_reference}`, i.payment_reference && `Payment ${i.payment_reference}`, i.release_reference && `Payout ${i.release_reference}`].filter(Boolean).join(' · ')}</p>}
    {children}
  </article>;
}

function ReferenceAction({ label, button, icon, run, onDone }: { label: string; button: string; icon: React.ReactNode; run: (reference: string) => Promise<unknown>; onDone: () => void }) {
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  return <div className="flex flex-wrap items-end gap-2">
    <div className="min-w-[16rem] flex-1 space-y-1"><Label htmlFor={id}>{label}</Label><Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} /></div>
    <Button disabled={busy || !reference.trim()} onClick={async () => {
      setBusy(true);
      try { await run(reference.trim()); toast.success('Saved'); onDone(); } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
    }}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}{button}</Button>
  </div>;
}

function CancelAction({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return <Button variant="outline" disabled={busy} onClick={async () => {
    const reason = window.prompt('Reason for cancelling this sale (shown to buyer and seller)');
    if (!reason?.trim()) return;
    setBusy(true);
    try { await commerceAction({ action: 'admin_cancel', request_id: requestId, reason: reason.trim() }); toast.success('Sale cancelled'); onDone(); }
    catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }}><XCircle className="mr-2 h-4 w-4" />Cancel sale</Button>;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="space-y-1 text-sm"><span className="block font-medium">{label}</span>{children}</label>;
