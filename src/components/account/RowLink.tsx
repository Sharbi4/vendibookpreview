import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RowLinkProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  external?: boolean;
  rightSlot?: React.ReactNode;
  destructive?: boolean;
}

/**
 * A single scannable row used across /account.
 * Every row navigates OR opens an in-place editor — no dead text.
 */
export function RowLink({
  icon: Icon,
  label,
  hint,
  to,
  onClick,
  external,
  rightSlot,
  destructive,
}: RowLinkProps) {
  const body = (
    <div className="flex w-full items-center gap-4 py-4 px-5 text-left transition-colors hover:bg-muted/40">
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50',
        destructive && 'border-destructive/40 text-destructive',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-semibold', destructive ? 'text-destructive' : 'text-foreground')}>
          {label}
        </div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{hint}</div>}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      {external
        ? <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />}
    </div>
  );

  if (to) {
    if (external || to.startsWith('http')) {
      return (
        <a href={to} target="_blank" rel="noreferrer" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          {body}
        </a>
      );
    }
    return (
      <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {body}
    </button>
  );
}

export function SectionCard({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 px-1">
        <h2 className="text-base font-semibold text-foreground font-display">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {children}
      </div>
    </section>
  );
}
