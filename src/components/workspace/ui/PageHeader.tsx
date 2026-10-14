import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ws } from './tokens';

export interface PageHeaderProps {
  /** Small uppercase line above the title (section or date). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or links, right-aligned on desktop and wrapped below on mobile. */
  actions?: ReactNode;
  /** Extra content under the description (chips, a status line). */
  children?: ReactNode;
  className?: string;
}

/** Page title block for every /dashboard page. One h1 per page. */
export function PageHeader({ eyebrow, title, description, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className={ws.eyebrow}>{eyebrow}</p>}
        <h1 className={cn(ws.title, eyebrow && 'mt-2.5')}>{title}</h1>
        {description && <p className={cn(ws.description, 'mt-2.5')}>{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
