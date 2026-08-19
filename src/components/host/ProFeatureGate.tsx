import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';
import { cn } from '@/lib/utils';

interface ProFeatureGateProps {
  requires?: HostTier;
  featureName: string;
  description?: string;
  children: ReactNode;
  /** When true, still render children behind a blurred overlay instead of replacing them. */
  preview?: boolean;
  className?: string;
}

/**
 * Gates content behind a host subscription tier. Renders an upsell card when
 * the current user doesn't meet the minimum tier — with an optional blurred
 * preview of the underlying UI.
 */
export function ProFeatureGate({
  requires = 'pro',
  featureName,
  description,
  children,
  preview = false,
  className,
}: ProFeatureGateProps) {
  const ent = useHostEntitlements();

  if (ent.isLoading) return null;
  if (ent.hasAtLeast(requires)) return <>{children}</>;

  const tierLabel = requires === 'premium' ? 'Host Premium' : 'Host Pro';

  const upsell = (
    <div
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/70 to-card/50 backdrop-blur-sm p-5 md:p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Crown className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {tierLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden /> Locked
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {featureName}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
          <Button asChild size="sm" className="mt-3">
            <Link to="/pricing">
              Unlock with {tierLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  if (!preview) return upsell;

  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none select-none opacity-40 blur-[2px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md">{upsell}</div>
      </div>
    </div>
  );
}

export default ProFeatureGate;
