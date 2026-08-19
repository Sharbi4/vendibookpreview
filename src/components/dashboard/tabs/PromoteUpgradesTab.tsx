import { Link } from 'react-router-dom';
import { PromotionHub } from '../PromotionHub';
import UpgradesPanel from '../UpgradesPanel';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Rocket, ArrowRight, ChevronRight, TrendingUp } from 'lucide-react';


const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
};

const daysBetween = (iso?: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const d = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return d;
};

const PromoteUpgradesTab = () => {
  const { activePromotions = [], isLoading } = useEntitlements() as any;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Promote & Upgrades</h1>
        <p className="text-sm text-muted-foreground mt-1">Boost visibility, unlock premium placement, and view active promotions.</p>
      </header>

      <UpgradesPanel />

      <section className="rounded-md border border-border bg-card p-5">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">Active boosts</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/pricing">Browse packages <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking active promotions…</p>
        ) : activePromotions.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Rocket className="h-4 w-4" />
            No active boosts. Featured listings appear higher and get 3–5× more views.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activePromotions.map((p: any) => {
              const endsAt = p.endsAt ?? p.ends_at;
              const daysLeft = daysBetween(endsAt);
              return (
                <li key={p.id}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full py-3 flex items-center justify-between text-sm hover:bg-muted/40 rounded-md px-2 -mx-2 transition text-left"
                      >
                        <div>
                          <p className="text-foreground font-medium">{p.productName ?? p.promo_type ?? 'Boost'}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : 'Active'} · Ends {fmt(endsAt)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">Performance</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Boosted listings typically see 3–5× more views. Detailed impression data appears in Insights within 24 hours of activation.
                      </p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Ends {fmt(endsAt)}</span>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/pricing">Extend</Link>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PromotionHub />
    </div>
  );
};

export default PromoteUpgradesTab;
