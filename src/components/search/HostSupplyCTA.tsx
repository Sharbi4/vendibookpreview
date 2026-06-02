import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Surfaced on /search when results are sparse (<3 listings).
 * Targets the supply funnel — converts demand-side searchers into hosts.
 */
export const HostSupplyCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/40 px-6 py-7 sm:px-8 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5 border border-border/60">
            <Store className="h-5 w-5 text-foreground/80" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Don't see what you need?
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              List your truck, trailer, or space on Vendibook and keep 87.1% of every booking.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            trackLeadEvent('homepage_host_list_click', { source: 'search_low_results' });
            navigate('/list');
          }}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Start listing
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
