import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Flame, Loader2, ShieldCheck } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export type BoostPaymentStage = 'authorized' | 'confirming' | 'confirmed' | 'review';

interface ActivePromo {
  starts_at: string;
  ends_at: string;
}

const POLL_MS = 3_000;
const MAX_POLL_MS = 90_000;

/**
 * Polls for the boost promotion row the server writes once PayPal money is
 * confirmed. The SDK approval alone is never treated as a live boost — the
 * `listing_promotions` row (written from the verified capture / webhook) is
 * the only signal that flips this to "confirmed".
 */
export const useBoostActivation = (listingId: string, enabled: boolean) => {
  const [promo, setPromo] = useState<ActivePromo | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    startedAt.current = Date.now();
    setTimedOut(false);

    const tick = async () => {
      const { data } = await supabase
        .from('listing_promotions')
        .select('starts_at, ends_at, active')
        .eq('listing_id', listingId)
        .eq('active', true)
        .order('starts_at', { ascending: false })
        .limit(1);

      if (cancelled) return;
      const row = (data ?? [])[0] as ActivePromo | undefined;
      if (row) {
        setPromo(row);
        return;
      }
      if (Date.now() - startedAt.current > MAX_POLL_MS) {
        setTimedOut(true);
        return;
      }
      timer = window.setTimeout(tick, POLL_MS);
    };

    let timer = window.setTimeout(tick, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [listingId, enabled]);

  return { promo, timedOut };
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

interface StepRowProps {
  state: 'done' | 'active' | 'idle';
  title: string;
  description: string;
}

const StepRow = ({ state, title, description }: StepRowProps) => (
  <div
    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
      state === 'idle'
        ? 'border-white/8 bg-white/[0.02] opacity-60'
        : 'border-white/12 bg-white/[0.04]'
    }`}
  >
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(14,100%,57%)]/12 ring-1 ring-[hsl(14,100%,57%)]/30">
      {state === 'done' ? (
        <CheckCircle2 className="h-4 w-4 text-[hsl(14,100%,62%)]" />
      ) : state === 'active' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(14,100%,62%)]" />
      ) : (
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  </div>
);

interface BoostPaymentStatusProps {
  listingTitle: string;
  stage: BoostPaymentStage;
  promo: ActivePromo | null;
  onDone: () => void;
}

/** Post-approval status panel: authorized → confirming → confirmed. */
const BoostPaymentStatus = ({ listingTitle, stage, promo, onDone }: BoostPaymentStatusProps) => {
  const confirmed = stage === 'confirmed';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(14,100%,57%)]/12 ring-1 ring-[hsl(14,100%,57%)]/35">
          {confirmed ? (
            <Flame className="h-5 w-5 text-[hsl(14,100%,62%)]" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-[hsl(14,100%,62%)]" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {confirmed ? 'Boost confirmed' : 'Payment in progress'}
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {confirmed ? 'Your listing is boosted' : 'Confirming your payment'}
          </h3>
        </div>
      </div>

      <div className="grid gap-2">
        <StepRow
          state="done"
          title="Authorized with PayPal"
          description={`PayPal approved the payment for “${listingTitle}”.`}
        />
        <StepRow
          state={confirmed ? 'done' : 'active'}
          title="Confirming with Vendibook"
          description={
            confirmed
              ? 'Payment verified on our side.'
              : 'We verify the capture server-side before anything goes live. This usually takes a few seconds.'
          }
        />
        <StepRow
          state={confirmed ? 'done' : 'idle'}
          title="Boost live"
          description={
            confirmed && promo
              ? `Featured from ${formatDate(promo.starts_at)} to ${formatDate(promo.ends_at)}.`
              : 'Top of search, category pages, and the homepage Featured rail.'
          }
        />
      </div>

      {stage === 'review' ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">
          PayPal is still clearing this payment. Nothing further is needed from you — we’ll email
          your receipt and switch the boost on the moment it settles. You can close this window.
        </p>
      ) : null}

      <Button
        variant={confirmed ? 'dark-shine' : 'outline'}
        className="h-11 w-full rounded-xl"
        onClick={onDone}
      >
        {confirmed ? 'Done' : 'Close and keep working'}
      </Button>
    </div>
  );
};

export default BoostPaymentStatus;
