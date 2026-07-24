import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  /** Optional Lucide icon component. Never use Sparkles/Star. */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: React.ReactNode;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * Guidance-first empty state. Never a bare "No results" line — always give the
 * user one concrete next step.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border/70 bg-card/40 backdrop-blur-sm px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-foreground/70">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
          {secondaryAction &&
            (secondaryAction.to ? (
              <Button asChild variant="outline" size="sm">
                <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
          {action &&
            (action.to ? (
              <Button asChild size="sm">
                <Link to={action.to}>
                  {action.label}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
