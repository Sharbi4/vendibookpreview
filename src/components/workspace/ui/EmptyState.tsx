import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ws } from './tokens';

export interface EmptyStateAction {
  label: string;
  to: string;
}

export interface EmptyStateProps {
  /** What's missing, stated plainly: "No offers yet." */
  title: ReactNode;
  /** The concrete next step and why it matters. */
  body?: ReactNode;
  /** Primary next step (orange CTA). */
  action?: EmptyStateAction;
  /** Optional second step (outlined). */
  secondary?: EmptyStateAction;
  /** Left-aligned and tighter, for use inside a Panel. */
  compact?: boolean;
  className?: string;
}

/** Empty state with a concrete next step. Text only: no illustration. */
export function EmptyState({ title, body, action, secondary, compact, className }: EmptyStateProps) {
  return (
    <div className={cn(compact ? 'py-1' : 'px-5 py-10 sm:px-8 sm:py-12', className)}>
      <p className={cn('font-semibold tracking-[-0.01em] text-[#1C1B1A]', compact ? 'text-[14px]' : 'text-[17px]')}>{title}</p>
      {body && <p className={cn(ws.body, 'mt-1.5 max-w-xl', compact && 'text-[13px] leading-5')}>{body}</p>}
      {(action || secondary) && (
        <div className={cn('flex flex-wrap items-center gap-2.5', compact ? 'mt-3' : 'mt-5')}>
          {action && (
            compact ? (
              <Link to={action.to} className={ws.link}>{action.label}</Link>
            ) : (
              <Button asChild variant="cta" className={ws.cta}>
                <Link to={action.to}>{action.label}</Link>
              </Button>
            )
          )}
          {secondary && (
            compact ? (
              <Link to={secondary.to} className={cn(ws.actionLink, 'ml-2')}>{secondary.label}</Link>
            ) : (
              <Link to={secondary.to} className={ws.secondary}>{secondary.label}</Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
