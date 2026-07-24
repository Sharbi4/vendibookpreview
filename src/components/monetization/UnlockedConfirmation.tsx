import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { useEntitlements, type Entitlement } from '@/hooks/useEntitlements';

/**
 * Shown right after a monetization purchase completes.
 * Reads live entitlements so the user sees exactly what is now active
 * and where to go use it.
 */

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return null; }
}

function surfaceFor(e: Entitlement): { label: string; to: string } {
  if (e.source === 'host_subscription') return { label: 'Manage plan', to: '/account' };
  if (e.source === 'listing_promotion' && e.listingId) return { label: 'View boosted listing', to: `/listing/${e.listingId}` };
  if (e.listingId) return { label: 'View listing', to: `/listing/${e.listingId}` };
  const slug = e.productSlug.toLowerCase();
  if (slug.startsWith('permit')) return { label: 'Open PermitPath', to: '/tools/permitpath' };
  if (slug.includes('buyer')) return { label: 'Buyer services', to: '/buyer/services' };
  return { label: 'View purchases', to: '/purchases' };
}

interface Props {
  /** Optional: restrict to a single listing to show relevant unlocks only. */
  listingId?: string;
  className?: string;
}

export default function UnlockedConfirmation({ listingId, className }: Props) {
  const { all, loading } = useEntitlements();
  if (loading) return null;

  const relevant = listingId
    ? all.filter((e) => e.listingId === listingId || e.source === 'host_subscription')
    : all;

  if (relevant.length === 0) return null;

  return (
    <section
      className={
        'rounded-3xl border border-primary/30 bg-primary/[0.06] p-6 md:p-8 backdrop-blur-md ' +
        'shadow-[0_0_60px_-20px_hsl(var(--primary)/0.55)] ' +
        (className ?? '')
      }
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">You unlocked</p>
      </div>
      <h2 className="mt-2 font-display text-2xl md:text-3xl text-foreground">
        Here's what's now active on your account.
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Payment protection is on. Use everything below from your dashboard, anytime.
      </p>

      <ul className="mt-6 space-y-2.5">
        {relevant.map((e, i) => {
          const surface = surfaceFor(e);
          const ends = fmtDate(e.endsAt);
          return (
            <li
              key={`${e.productSlug}-${i}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-background/60 px-4 py-3"
            >
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{e.productName}</div>
                {ends && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {e.kind === 'promotion' ? `Runs through ${ends}` : `Renews ${ends}`}
                  </div>
                )}
              </div>
              <Link
                to={surface.to}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-1.5 transition-all"
              >
                {surface.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link to="/purchases" className="text-primary underline underline-offset-4">
          See all purchases
        </Link>
        <span className="text-muted-foreground">·</span>
        <a href="mailto:support@vendibook.com" className="text-muted-foreground hover:text-foreground">
          Questions? Contact support
        </a>
      </div>
    </section>
  );
}
