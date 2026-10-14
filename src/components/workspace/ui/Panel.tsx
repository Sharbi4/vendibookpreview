import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ws } from './tokens';

export type PanelAction = { label: string; to: string } | ReactNode;

const isLinkAction = (a: PanelAction): a is { label: string; to: string } =>
  !!a && typeof a === 'object' && 'to' in (a as Record<string, unknown>) && 'label' in (a as Record<string, unknown>);

/** "View all →" style link, or any node passed through. */
export function PanelActionLink({ action }: { action: PanelAction }) {
  if (!action) return null;
  if (!isLinkAction(action)) return <>{action}</>;
  return (
    <Link to={action.to} className={ws.actionLink}>
      {action.label}
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );
}

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: PanelAction;
  /** Heading level; defaults to h2. */
  as?: 'h2' | 'h3';
  className?: string;
  id?: string;
}

/** Title row for a section that isn't wrapped in a card (e.g. above a StatGrid). */
export function SectionHeader({ title, description, action, as: H = 'h2', className, id }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <H id={id} className={ws.sectionTitle}>{title}</H>
        {description && <p className={cn(ws.sectionNote, 'mt-1')}>{description}</p>}
      </div>
      {action && <div className="shrink-0"><PanelActionLink action={action} /></div>}
    </div>
  );
}

export interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  /** `{ label, to }` renders a quiet "label →" link; any node is rendered as is. */
  action?: PanelAction;
  children: ReactNode;
  /** Remove body padding, for tables and edge-to-edge lists. */
  flush?: boolean;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Accessible name when there is no title. */
  label?: string;
  as?: 'section' | 'div' | 'aside';
}

/** Titled white card. The header sits above a hairline; content follows. */
export function Panel({ title, description, action, children, flush, footer, className, bodyClassName, label, as: Tag = 'section' }: PanelProps) {
  return (
    <Tag aria-label={!title ? label : undefined} className={cn(ws.surface, 'flex min-w-0 flex-col overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-[#ECE6DD] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className={ws.sectionTitle}>{title}</h2>}
            {description && <p className={cn(ws.sectionNote, 'mt-0.5')}>{description}</p>}
          </div>
          {action && <div className="shrink-0 pt-0.5"><PanelActionLink action={action} /></div>}
        </div>
      )}
      <div className={cn('min-w-0 flex-1', !flush && 'px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-[#ECE6DD] px-5 py-3.5 sm:px-6">{footer}</div>}
    </Tag>
  );
}
