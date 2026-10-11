import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBoostHistory, type BoostHistoryRow } from '@/hooks/useBoostHistory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';

const PROMO_LABEL: Record<string, string> = {
  featured_7: 'Featured — 7 days',
  featured_30: 'Featured — 30 days',
  top_of_search: 'Top of search',
  highlight: 'Highlight',
  motivated_seller: 'Motivated seller',
  email_campaign: 'Email campaign',
  social_feature: 'Social feature',
};

const PAYMENT_TONE: Record<string, { label: string; tone: string }> = {
  paid: { label: 'Payment complete', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  fulfilled: { label: 'Payment complete', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  pending: { label: 'Payment pending', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  failed: { label: 'Payment failed', tone: 'border-red-500/30 bg-red-500/10 text-red-300' },
  cancelled: { label: 'Payment cancelled', tone: 'border-white/10 bg-white/5 text-muted-foreground' },
  refunded: { label: 'Refunded', tone: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
};

const money = (cents: number | null, currency: string) =>
  cents == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const BoostRow = ({ boost }: { boost: BoostHistoryRow }) => {
  const payment =
    (boost.refundedAt ? PAYMENT_TONE.refunded : boost.paymentStatus ? PAYMENT_TONE[boost.paymentStatus] : null) ??
    { label: boost.paymentStatus ?? 'Payment status unknown', tone: 'border-white/10 bg-white/5 text-muted-foreground' };

  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{boost.listingTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {PROMO_LABEL[boost.promoType] ?? boost.promoType} · {fmtDate(boost.startsAt)} –{' '}
            {fmtDate(boost.endsAt)}
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground">{money(boost.amountCents, boost.currency)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {boost.live ? (
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
            Live · {boost.daysRemaining} day{boost.daysRemaining === 1 ? '' : 's'} left
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[11px] border-white/10 bg-white/5 text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
            {new Date(boost.endsAt).getTime() <= Date.now() ? `Expired ${fmtDate(boost.endsAt)}` : 'Not active'}
          </Badge>
        )}
        <Badge variant="outline" className={`text-[11px] ${payment.tone}`}>
          {payment.label}
        </Badge>
        <Button asChild variant="ghost" size="sm" className="ml-auto h-8 text-xs">
          <Link to={`/listing/${boost.listingId}`}>
            View listing
            <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </li>
  );
};

/** Boost history: current boosts, expiry dates and payment status per boost. */
const BoostHistoryPanel = () => {
  const { user } = useAuth();
  const { boosts, isLoading } = useBoostHistory(user?.id);
  const [showAll, setShowAll] = useState(false);

  const { active, past } = useMemo(
    () => ({
      active: boosts.filter((b) => b.live),
      past: boosts.filter((b) => !b.live),
    }),
    [boosts],
  );

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Rocket className="h-4 w-4 text-primary" aria-hidden="true" />
            Boost history
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Current boosts, when each one expires, and the payment status behind it.
          </p>
        </div>
        {active.length > 0 && (
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            {active.length} active
          </Badge>
        )}
      </header>

      {boosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
          <p className="text-sm text-foreground">No boosts yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Feature a listing from your dashboard to put it in front of more buyers.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/dashboard?tab=listings">Go to your listings</Link>
          </Button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <ul className="space-y-3">
              {active.map((b) => (
                <BoostRow key={b.id} boost={b} />
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Past boosts
              </p>
              <ul className="space-y-3">
                {(showAll ? past : past.slice(0, 3)).map((b) => (
                  <BoostRow key={b.id} boost={b} />
                ))}
              </ul>
              {past.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? 'Show less' : `Show all ${past.length} past boosts`}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default BoostHistoryPanel;
