import { Link } from 'react-router-dom';
import { PromotionHub } from '../PromotionHub';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Button } from '@/components/ui/button';
import { Sparkles as _s, Rocket, ArrowRight } from 'lucide-react';

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
};

const PromoteUpgradesTab = () => {
  const { activePromotions = [], isLoading } = useEntitlements() as any;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Promote & Upgrades</h1>
        <p className="text-sm text-muted-foreground mt-1">Boost visibility, unlock premium placement, and view active promotions.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
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
            {activePromotions.map((p: any) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{p.productName ?? p.promo_type ?? 'Boost'}</span>
                <span className="text-xs text-muted-foreground">Ends {fmt(p.endsAt ?? p.ends_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PromotionHub />
    </div>
  );
};

export default PromoteUpgradesTab;
