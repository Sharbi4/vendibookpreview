import { Check, Clock, CircleDot, ShieldCheck, FileSignature, CreditCard, MapPin, Handshake, PartyPopper, type LucideIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { formatCents } from '@/lib/protectedSale/fees';

type ProtectedSale = Database['public']['Tables']['protected_sales']['Row'];
type Role = 'buyer' | 'seller' | null;
type State = 'complete' | 'active' | 'pending';

export type TimelineStage = {
  id: string;
  label: string;
  icon: LucideIcon;
  state: State;
  timestamp: string | null;
  detail: string;
  nextAction: string | null;
  waitingOn: 'you' | 'them' | null;
};

function fmt(ts: string | null): string | null {
  if (!ts) return null;
  try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return ts; }
}

function bothIdVerified(ps: ProtectedSale) {
  return !!ps.buyer_identity_verified_at && !!ps.seller_identity_verified_at;
}
function bothHandoffConfirmed(ps: ProtectedSale) {
  return !!ps.handoff_confirmed_by_buyer_at && !!ps.handoff_confirmed_by_seller_at;
}

export function buildTimeline(ps: ProtectedSale, role: Role): TimelineStage[] {
  const meVerified = role === 'buyer' ? !!ps.buyer_identity_verified_at
    : role === 'seller' ? !!ps.seller_identity_verified_at : false;
  const themVerified = role === 'buyer' ? !!ps.seller_identity_verified_at
    : role === 'seller' ? !!ps.buyer_identity_verified_at : false;
  const meConfirmed = role === 'buyer' ? !!ps.handoff_confirmed_by_buyer_at
    : role === 'seller' ? !!ps.handoff_confirmed_by_seller_at : false;
  const themConfirmed = role === 'buyer' ? !!ps.handoff_confirmed_by_seller_at
    : role === 'seller' ? !!ps.handoff_confirmed_by_buyer_at : false;

  const stages: TimelineStage[] = [];

  // 1. Identity
  const idComplete = bothIdVerified(ps);
  stages.push({
    id: 'identity',
    label: 'Identity verification',
    icon: ShieldCheck,
    state: idComplete ? 'complete' : 'active',
    timestamp: idComplete
      ? fmt(
          (ps.buyer_identity_verified_at ?? '') > (ps.seller_identity_verified_at ?? '')
            ? ps.buyer_identity_verified_at : ps.seller_identity_verified_at,
        )
      : null,
    detail: idComplete
      ? 'Both parties verified through Vendibook identity verification.'
      : `Buyer ${ps.buyer_identity_verified_at ? '✓' : '…'} · Seller ${ps.seller_identity_verified_at ? '✓' : '…'}`,
    nextAction: idComplete ? null : (meVerified ? 'Waiting on the other party to verify.' : 'Verify your ID with Vendibook identity verification.'),
    waitingOn: idComplete ? null : (meVerified ? 'them' : 'you'),
  });

  // 2. Agreement
  const agreementComplete = !!ps.agreement_signed_at;
  const agreementActive = idComplete && !agreementComplete;
  stages.push({
    id: 'agreement',
    label: 'Signed agreement',
    icon: FileSignature,
    state: agreementComplete ? 'complete' : agreementActive ? 'active' : 'pending',
    timestamp: fmt(ps.agreement_signed_at),
    detail: agreementComplete
      ? 'Immutable snapshot locked. The dispute team sees exactly this record.'
      : 'Captures price, deposit, fee, and handoff terms.',
    nextAction: agreementComplete ? null
      : !idComplete ? 'Unlocks after both IDs verify.'
      : role === 'buyer' ? 'Review and sign the agreement.'
      : 'Waiting on the buyer to sign.',
    waitingOn: agreementComplete ? null : !idComplete ? null : role === 'buyer' ? 'you' : 'them',
  });

  // 3. Deposit
  const depositComplete = !!ps.deposit_paid_at;
  const depositActive = agreementComplete && !depositComplete;
  stages.push({
    id: 'deposit',
    label: `${formatCents(ps.deposit_cents)} deposit`,
    icon: CreditCard,
    state: depositComplete ? 'complete' : depositActive ? 'active' : 'pending',
    timestamp: fmt(ps.deposit_paid_at),
    detail: depositComplete
      ? `Held by Vendibook. Balance of ${formatCents(ps.balance_cents)} due at handoff.`
      : `Vendibook holds funds until both parties confirm handoff.`,
    nextAction: depositComplete ? null
      : !agreementComplete ? 'Unlocks after the agreement is signed.'
      : role === 'buyer' ? `Pay the ${formatCents(ps.deposit_cents)} deposit.`
      : 'Waiting on the buyer to pay the deposit.',
    waitingOn: depositComplete ? null : !agreementComplete ? null : role === 'buyer' ? 'you' : 'them',
  });

  // 4. Handoff scheduled
  const scheduled = !!ps.handoff_scheduled_at;
  const scheduleActive = depositComplete && !scheduled;
  const mode = (ps.handoff_mode as string | null) ?? null;
  stages.push({
    id: 'schedule',
    label: 'Handoff scheduled',
    icon: MapPin,
    state: scheduled ? 'complete' : scheduleActive ? 'active' : 'pending',
    timestamp: fmt(ps.handoff_scheduled_at),
    detail: scheduled
      ? `${mode === 'delivery' ? 'Delivery' : 'Pickup'} confirmed. Both parties see the same plan.`
      : 'Seller proposes pickup or delivery details.',
    nextAction: scheduled ? null
      : !depositComplete ? 'Unlocks after the deposit is paid.'
      : role === 'seller' ? 'Add pickup or delivery details.'
      : 'Waiting on the seller to schedule.',
    waitingOn: scheduled ? null : !depositComplete ? null : role === 'seller' ? 'you' : 'them',
  });

  // 5. Confirm handoff
  const confirmed = bothHandoffConfirmed(ps);
  const confirmActive = scheduled && !confirmed;
  stages.push({
    id: 'confirm',
    label: 'Handoff confirmed',
    icon: Handshake,
    state: confirmed ? 'complete' : confirmActive ? 'active' : 'pending',
    timestamp: confirmed
      ? fmt(
          (ps.handoff_confirmed_by_buyer_at ?? '') > (ps.handoff_confirmed_by_seller_at ?? '')
            ? ps.handoff_confirmed_by_buyer_at : ps.handoff_confirmed_by_seller_at,
        )
      : null,
    detail: `Buyer ${ps.handoff_confirmed_by_buyer_at ? '✓ ' + fmt(ps.handoff_confirmed_by_buyer_at) : '…'} · Seller ${ps.handoff_confirmed_by_seller_at ? '✓ ' + fmt(ps.handoff_confirmed_by_seller_at) : '…'}`,
    nextAction: confirmed ? null
      : !scheduled ? 'Unlocks after handoff is scheduled.'
      : meConfirmed ? 'Waiting on the other party to confirm.'
      : 'Confirm the exchange happened.',
    waitingOn: confirmed ? null : !scheduled ? null : meConfirmed ? 'them' : 'you',
  });

  // 6. Funds released
  const released = !!ps.funds_released_at;
  stages.push({
    id: 'released',
    label: 'Funds released',
    icon: PartyPopper,
    state: released ? 'complete' : 'pending',
    timestamp: fmt(ps.funds_released_at),
    detail: released
      ? role === 'seller'
        ? 'Payout is typically released within 24 hours of delivery confirmation.'
        : 'Your protection window closes. Thanks for using Protected Sale.'
      : 'Auto-releases once both parties confirm handoff.',
    nextAction: released ? null : confirmed ? 'Processing release…' : null,
    waitingOn: null,
  });

  // Suppress details if silently cancelled/refunded
  if (ps.status === 'cancelled' || ps.status === 'refunded') {
    return stages.map((s) => s.state === 'complete' ? s : { ...s, state: 'pending', nextAction: 'Protection cancelled.', waitingOn: null });
  }

  return stages;
}

export function ProtectedSaleTimeline({
  ps, role, className = '',
}: {
  ps: ProtectedSale;
  role: Role;
  className?: string;
}) {
  const stages = buildTimeline(ps, role);
  const activeIndex = stages.findIndex((s) => s.state === 'active');

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
          {role === 'seller' ? 'Seller timeline' : role === 'buyer' ? 'Buyer timeline' : 'Timeline'}
        </h2>
        {activeIndex >= 0 ? (
          <span className="text-xs text-white/50">Step {activeIndex + 1} of {stages.length}</span>
        ) : (
          <span className="text-xs text-emerald-300">All steps complete</span>
        )}
      </div>

      <ol className="relative">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isLast = i === stages.length - 1;
          const dotClass =
            s.state === 'complete' ? 'bg-emerald-500 text-black ring-4 ring-emerald-500/20'
            : s.state === 'active' ? 'bg-orange-500 text-black ring-4 ring-orange-500/25 animate-pulse'
            : 'bg-white/10 text-white/40 ring-4 ring-white/[0.03]';
          const railClass =
            s.state === 'complete' ? 'bg-emerald-500/40'
            : s.state === 'active' ? 'bg-gradient-to-b from-orange-500/50 to-white/10'
            : 'bg-white/10';

          return (
            <li key={s.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast ? (
                <span aria-hidden className={`absolute left-[15px] top-8 h-full w-0.5 ${railClass}`} />
              ) : null}
              <div className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${dotClass}`}>
                {s.state === 'complete' ? <Check className="h-4 w-4" strokeWidth={3} />
                  : s.state === 'active' ? <CircleDot className="h-4 w-4" />
                  : <Icon className="h-4 w-4" />}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className={`text-sm font-semibold ${s.state === 'pending' ? 'text-white/50' : 'text-white'}`}>
                    {s.label}
                  </h3>
                  {s.timestamp ? (
                    <span className="inline-flex items-center gap-1 text-xs text-white/50">
                      <Clock className="h-3 w-3" /> {s.timestamp}
                    </span>
                  ) : s.state === 'active' ? (
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-orange-300">
                      In progress
                    </span>
                  ) : null}
                </div>
                <p className={`mt-1 text-xs ${s.state === 'pending' ? 'text-white/40' : 'text-white/70'}`}>
                  {s.detail}
                </p>
                {s.nextAction ? (
                  <div className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                    s.waitingOn === 'you'
                      ? 'bg-orange-500/15 text-orange-200'
                      : s.waitingOn === 'them'
                      ? 'bg-white/5 text-white/60'
                      : 'bg-white/5 text-white/50'
                  }`}>
                    {s.waitingOn === 'you' ? '→ Your turn' : s.waitingOn === 'them' ? '⏳ Waiting on them' : null}
                    <span>{s.nextAction}</span>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
