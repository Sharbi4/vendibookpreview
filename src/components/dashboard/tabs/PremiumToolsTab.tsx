import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Flame, ShieldCheck } from 'lucide-react';
import { TOOLS } from '@/lib/tools/catalog';
import { useToolAccess } from '@/hooks/useToolAccess';
import ToolTile from '@/components/tools/ToolTile';
import { Button } from '@/components/ui/button';

const PremiumToolsTab = () => {
  const access = useToolAccess();

  const unlockedCount = TOOLS.filter((t) => access.bySlug[t.slug]?.unlocked).length;
  const totalCount = TOOLS.length;
  const showUpsell = access.hostTier === 'free' || access.hostTier === 'starter';

  return (
    <div className="mx-auto max-w-[1160px] space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-lg border border-border bg-card/60 backdrop-blur px-6 py-8 md:px-8 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 90% at 100% 0%, hsl(var(--brand-ember) / 0.10), transparent 60%)',
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Your plan · {access.hostLabel}
              <span aria-hidden>•</span>
              <span>{unlockedCount} of {totalCount} tools unlocked</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-foreground">
              Premium Tools
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg">
              The operator toolkit — pricing, marketing, permits, and market research, all built in.
            </p>
          </div>
          {showUpsell && (
            <Button asChild variant="glass-cta" className="gap-1">
              <Link to="/dashboard?view=host&tab=promote">
                <Crown className="h-4 w-4" /> See upgrades
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Grid */}
      <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <li key={t.slug} className="h-full">
            <ToolTile tool={t} access={access.bySlug[t.slug]} />
          </li>
        ))}
      </ul>

      {access.legacyPermitPath && (
        <div className="rounded-lg border border-[hsl(var(--brand-ember)/0.35)] bg-[hsl(var(--brand-ember)/0.06)] p-4 text-sm text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-[hsl(var(--brand-ember))]" />
          <span>
            <span className="font-medium">Founding member.</span>{' '}
            You have permanent free access to PermitPath Plus for the roadmaps you already created.
          </span>
        </div>
      )}
    </div>
  );
};

export default PremiumToolsTab;
