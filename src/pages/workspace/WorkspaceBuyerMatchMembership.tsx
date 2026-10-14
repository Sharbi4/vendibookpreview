import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { bm, usd } from '@/components/monetization/buyerMatchUi';
import { useBuyerMatch } from '@/hooks/useBuyerMatch';
import { useSubscriptionManagement, fmtSubDate } from '@/hooks/useSubscriptionManagement';
import { BUYERMATCH_BENEFITS, BUYERMATCH_DISCLOSURE } from '@/lib/monetization/buyerMatch';
import { CAMPAIGN_STATUS } from '@/lib/monetization/buyerMatchIntelligence';
import { SALE_SELLER_FEE_PERCENT } from '@/lib/commissions';

const FIGURE = 'font-display text-[30px] font-normal leading-tight tracking-[-0.02em] tabular-nums sm:text-[40px]';
const PLAN_RETURN = '/pricing?returnTo=%2Fdashboard%2Fbuyermatch%2Fmembership';

export default function WorkspaceBuyerMatchMembership() {
  const q = useBuyerMatch(); const billing = useSubscriptionManagement(); const data = q.data;
  const meta = billing.sub?.metadata as Record<string, unknown> | undefined;
  // Never substitute current catalog prices for a member's actual billing agreement.
  const amount = typeof meta?.amount_cents === 'number' ? meta.amount_cents : typeof meta?.price_cents === 'number' ? meta.price_cents : null;
  const cycle = typeof meta?.billing_interval === 'string' ? meta.billing_interval : null;
  const currency = typeof meta?.currency === 'string' && /^[A-Z]{3}$/.test(meta.currency) ? meta.currency : null;
  const price = amount !== null && currency ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100) : null;
  const plan = data?.config.entitled ? 'Vendibook Pro' : billing.sub?.tier ? String(billing.sub.tier).replace(/_/g, ' ') : 'Free membership';
  const ending = billing.scheduledCancel || billing.sub?.status === 'canceled';
  const campaigns = data?.campaigns ?? [];

  return <WorkspaceShell><div className={bm.page + ' max-w-5xl'}>
    <Link to="/dashboard/buyermatch" className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#5E5953] hover:text-[#1C1B1A]"><ArrowLeft className="h-4 w-4"/>BuyerMatch</Link>
    <header className="mt-8 pb-10">
      <p className={bm.eyebrow}>Membership</p>
      <h1 className={bm.h1 + ' mt-4 capitalize'}>{plan}</h1>
      <p className={bm.lead + ' mt-3 first-letter:uppercase'}>{billing.sub?.status ? String(billing.sub.status).replace(/_/g, ' ') : 'No recurring membership on file'}{data?.config.entitled ? ' · BuyerMatch included' : ''}</p>
    </header>

    {q.isLoading || billing.isLoading ? <p role="status" className={bm.body + ' flex items-center gap-2'}><Loader2 className="h-4 w-4 animate-spin"/>Loading your membership…</p> : <div className="space-y-14">
      {(q.error || billing.error) && <div role="alert" className={bm.card + ' p-6'}><p className="text-[15px] font-semibold">Membership details couldn&rsquo;t be fully loaded.</p><p className={bm.body + ' mt-1'}>Your billing is unchanged.</p><button type="button" className={bm.quiet + ' mt-4'} onClick={() => { void q.refetch(); void billing.refetch(); }}>Retry</button></div>}

      <section aria-label="Current membership" className={bm.card + ' grid gap-8 p-6 sm:grid-cols-2 sm:p-10'}>
        <div>
          <p className={FIGURE}>{price ?? '—'}{price && cycle ? <span className="ml-1 text-[18px] text-[#8A847B]">/ {cycle}</span> : null}</p>
          <p className={bm.label}>{price ? 'Billed amount on your membership record' : 'No billed amount on your membership record'}</p>
          {price && !cycle && <p className={bm.note + ' mt-1'}>Billing cycle: check your provider agreement.</p>}
        </div>
        <div className="sm:border-l sm:border-[#ECE6DD] sm:pl-8">
          <p className={FIGURE}>{fmtSubDate(billing.accessEndsAt)}</p>
          <p className={bm.label}>{ending ? 'Access ends' : 'Next renewal on record'}</p>
          {!billing.accessEndsAt && <p className={bm.note + ' mt-1'}>No renewal date on record. We don&rsquo;t assume an ongoing paid membership.</p>}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-[#ECE6DD] pt-6 sm:col-span-2">
          {data?.config.entitled ? <Link to="/dashboard/buyermatch?activate=1" className={bm.primary}>Start a buyer search</Link> : <Link to={PLAN_RETURN} className={bm.primary}>Choose a plan</Link>}
          {billing.provider !== 'none' && <button type="button" className={bm.quiet} onClick={billing.openBilling}>{billing.provider === 'paypal' ? 'Manage payment in PayPal' : 'Payment management'}</button>}
          {billing.hasSubscription && !billing.scheduledCancel && <AlertDialog><AlertDialogTrigger asChild><button type="button" className={bm.quiet} disabled={billing.busy !== null}>Cancel membership</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel your membership?</AlertDialogTitle><AlertDialogDescription>Future billing stops after your payment provider confirms the cancellation. Paid access continues through the period you already paid for. Past reports stay available, and no listing is removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep membership</AlertDialogCancel><AlertDialogAction onClick={billing.cancel}>Confirm cancellation</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
          {ending && <Link to={PLAN_RETURN} className={bm.quiet}>Review renewal options</Link>}
        </div>
        <p className={bm.note + ' sm:col-span-2'}>Pro doesn&rsquo;t change the {SALE_SELLER_FEE_PERCENT}% seller fee on equipment sold through Vendibook checkout.</p>
      </section>

      {data && <section className="grid gap-12 md:grid-cols-2">
        <div>
          <h2 className={bm.h3}>Sale listings that qualify</h2>
          <p className={bm.note + ' mt-1'}>{data.listings.length} published sale listing{data.listings.length === 1 ? '' : 's'}. Eligibility is checked again when you send one for review.</p>
          <ul className="mt-4">{data.listings.map(l => <li key={l.id}><Link to={'/listing/' + l.id} className="flex items-center gap-4 border-b border-[#ECE6DD] py-3">
            {l.cover_image_url ? <img src={l.cover_image_url} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover"/> : <span className="h-14 w-20 shrink-0 rounded-lg bg-[#F3EEE7]"/>}
            <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{l.title}</span><span className={bm.note}>{usd(l.price_sale) ?? 'No asking price'}</span></span>
          </Link></li>)}</ul>
          {!data.listings.length && <Link to="/dashboard/listings" className={bm.link + ' mt-4 inline-block'}>Manage your listings</Link>}
        </div>
        <div>
          <h2 className={bm.h3}>Your buyer searches</h2>
          <p className={bm.note + ' mt-1'}>{campaigns.filter(c => c.status === 'researching').length} searching · {campaigns.filter(c => c.status === 'pending_activation').length} waiting for review</p>
          <ul className="mt-4">{campaigns.map(c => <li key={c.id}><Link to={'/dashboard/buyermatch?campaign=' + c.id} className="flex items-center justify-between gap-4 border-b border-[#ECE6DD] py-3"><span className="truncate text-[14px] font-semibold">{c.listing_snapshot.title}</span><span className={bm.note + ' shrink-0'}>{CAMPAIGN_STATUS[c.status] ?? c.status}</span></Link></li>)}</ul>
          {!campaigns.length && <p className={bm.body + ' mt-4'}>No searches yet.</p>}
        </div>
      </section>}
    </div>}

    <section id="benefits" className="mt-16 scroll-mt-24 border-t border-[#ECE6DD] pt-10">
      <h2 className={bm.h2}>What Pro adds for sellers</h2>
      <ol className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">{BUYERMATCH_BENEFITS.map((b, i) => <li key={b.title}>
        <p className="font-display text-[18px] text-[#FF5124]">{String(i + 1).padStart(2, '0')}</p>
        <h3 className="mt-2 text-[16px] font-semibold">{b.title}</h3>
        <p className={bm.body + ' mt-1'}>{b.body}</p>
      </li>)}</ol>
      <p className={bm.note + ' mt-8'}>{BUYERMATCH_DISCLOSURE}</p>
    </section>
  </div></WorkspaceShell>;
}
