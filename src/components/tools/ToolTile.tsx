import { Link } from 'react-router-dom';
import { ArrowRight, Check, Crown, Flame, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolDef } from '@/lib/tools/catalog';
import type { ToolAccess } from '@/hooks/useToolAccess';

interface Props {
  tool: ToolDef;
  access: ToolAccess;
  className?: string;
}

const tierChip = (t: string) =>
  t === 'starter' ? 'Starter' : t === 'pro' ? 'Pro' : t === 'premium' ? 'Premium' : 'Free';

/**
 * Reusable premium tool tile.
 * - Unlocked tools open the tool directly.
 * - Locked tools open the /tools/:slug/preview funnel step (never dead-end).
 */
const ToolTile = ({ tool, access, className }: Props) => {
  const Icon = tool.icon;
  const to = access.unlocked ? tool.href : `/tools/${tool.slug}/preview`;
  const flame = tool.flame;

  return (
    <Link
      to={to}
      aria-label={access.unlocked ? `Open ${tool.name}` : `Preview ${tool.name}`}
      className={cn(
        'group relative flex h-full flex-col rounded-lg border bg-card/80 backdrop-blur p-5',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl',
        flame
          ? 'border-[hsl(var(--brand-ember)/0.45)] hover:border-[hsl(var(--brand-ember))]'
          : 'border-border hover:border-foreground/40',
        className,
      )}
    >
      {flame && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg opacity-70"
          style={{
            background:
              'radial-gradient(120% 60% at 0% 0%, hsl(var(--brand-ember) / 0.10), transparent 60%)',
          }}
        />
      )}

      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-md border',
            flame
              ? 'border-[hsl(var(--brand-ember)/0.45)] bg-[hsl(var(--brand-ember)/0.12)]'
              : 'border-border bg-muted/40',
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              flame ? 'text-[hsl(var(--brand-ember))]' : 'text-foreground',
            )}
          />
        </span>

        {access.unlocked ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
            <Check className="h-3 w-3" /> Unlocked
          </span>
        ) : tool.minTier === 'free' ? null : (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium',
              flame
                ? 'border-[hsl(var(--brand-ember)/0.45)] bg-[hsl(var(--brand-ember)/0.12)] text-[hsl(var(--brand-ember))]'
                : 'border-border bg-muted/40 text-muted-foreground',
            )}
          >
            {flame ? <Flame className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {tierChip(tool.minTier)}
          </span>
        )}
      </div>

      <div className="relative mt-4 flex-1">
        <h3 className="text-base font-semibold text-foreground">{tool.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tool.tagline}
        </p>
      </div>

      <div className="relative mt-5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {access.unlocked
            ? access.reason === 'grandfathered'
              ? 'Founding member — free access'
              : access.reason === 'subscription'
                ? 'Included with your plan'
                : access.reason === 'purchase'
                  ? 'You own this tool'
                  : 'Free'
            : tool.unlockPrice
              ? <>From <span className="text-foreground font-medium">{tool.unlockPrice}</span></>
              : <span className="inline-flex items-center gap-1"><Crown className="h-3 w-3" /> Upgrade to unlock</span>}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
          {access.unlocked ? 'Open' : 'See what\u2019s inside'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
};

export default ToolTile;
