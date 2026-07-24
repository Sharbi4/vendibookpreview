import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrustPoint {
  /** Optional Lucide icon component. Never use Sparkles/Star. */
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
}

interface Props {
  title?: string;
  points: TrustPoint[];
  /** Plain-language disclaimer, e.g. "Vendibook doesn't guarantee condition or fitness for use." */
  disclaimer?: React.ReactNode;
  className?: string;
  /** Compact = tighter padding, single row on desktop. */
  variant?: 'default' | 'compact';
}

/**
 * Contextual trust module. Place next to hesitation points (checkout, contact,
 * document upload) — not on a separate page. Uses neutral surfaces with an orange
 * accent only on the header icon.
 */
export function TrustModule({
  title = 'What we do to protect you',
  points,
  disclaimer,
  className,
  variant = 'default',
}: Props) {
  const isCompact = variant === 'compact';
  return (
    <aside
      className={cn(
        'rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm',
        isCompact ? 'p-3' : 'p-4 md:p-5',
        className,
      )}
      aria-label={title}
    >
      <div className={cn('flex items-center gap-2', isCompact ? 'mb-2' : 'mb-3')}>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/12 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ul
        className={cn(
          'grid gap-2',
          isCompact ? 'sm:grid-cols-2' : 'sm:grid-cols-2',
        )}
      >
        {points.map((p, i) => {
          const Icon = p.icon;
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              {Icon ? (
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                />
              )}
              <div className="min-w-0">
                <span className="font-medium text-foreground/90">{p.label}</span>
                {p.detail && (
                  <span className="text-muted-foreground"> — {p.detail}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {disclaimer && (
        <p className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
          {disclaimer}
        </p>
      )}
    </aside>
  );
}

export default TrustModule;
