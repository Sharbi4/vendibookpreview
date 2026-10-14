import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ws } from '@/components/workspace/ui';
import { scrollToSection } from './scrollToSection';

/**
 * Airbnb-style settings rows for /dashboard/account: a label, the current value
 * and one quiet action on the right. Used only by the account pages.
 */

export type RowAction =
  | { label: string; to: string; external?: false }
  | { label: string; href: string; external: true }
  | { label: string; onClick: () => void; disabled?: boolean };

/** Underlined text action ("Edit", "Manage") with a comfortable tap target. */
export const rowActionCls =
  'inline-flex min-h-9 items-center whitespace-nowrap rounded-md px-1 text-[13.5px] font-semibold text-[#1C1B1A] underline decoration-[#1C1B1A]/30 decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-[#FF5124] hover:text-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50';

export function RowActionButton({ action, className }: { action: RowAction; className?: string }) {
  if ('to' in action) return <Link to={action.to} className={cn(rowActionCls, className)}>{action.label}</Link>;
  if ('href' in action) return <a href={action.href} className={cn(rowActionCls, className)}>{action.label}</a>;
  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={cn(rowActionCls, className)}>
      {action.label}
    </button>
  );
}

export interface SettingsRowProps {
  label: ReactNode;
  /** Current value. Strings render in ink; pass `muted` for "Not provided". */
  value?: ReactNode;
  muted?: boolean;
  /** Small status pill after the label. */
  status?: ReactNode;
  /** One line of help under the value. */
  hint?: ReactNode;
  action?: RowAction | ReactNode;
  children?: ReactNode;
}

const isRowAction = (a: unknown): a is RowAction =>
  !!a && typeof a === 'object' && 'label' in (a as Record<string, unknown>) && ('to' in (a as object) || 'href' in (a as object) || 'onClick' in (a as object));

export function SettingsRow({ label, value, muted, status, hint, action, children }: SettingsRowProps) {
  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4 sm:gap-6 sm:px-6 sm:py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[14px] font-semibold leading-5 text-[#1C1B1A]">{label}</span>
          {status}
        </div>
        {value !== undefined && value !== null && value !== '' && (
          <div className={cn('mt-1 break-words text-[14px] leading-5', muted ? 'text-[#8A847B]' : 'text-[#3D3935]')}>{value}</div>
        )}
        {hint && <p className="mt-1 text-[12.5px] leading-5 text-[#8A847B]">{hint}</p>}
        {children}
      </div>
      {action && (
        <div className="-my-1 shrink-0 pt-0.5">
          {isRowAction(action) ? <RowActionButton action={action} /> : action}
        </div>
      )}
    </li>
  );
}

export interface SettingsSectionProps {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Content under the rows (a note or a single button), separated by a hairline. */
  footer?: ReactNode;
  className?: string;
}

/** A titled group of rows. The heading sits outside the card, like Airbnb's account pages. */
export function SettingsSection({ id, title, description, children, footer, className }: SettingsSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('scroll-mt-24', className)}>
      <div className="mb-3 px-1">
        <h2 id={`${id}-title`} className="text-[17px] font-semibold tracking-[-0.015em] text-[#1C1B1A]">{title}</h2>
        {description && <p className={cn(ws.sectionNote, 'mt-1 max-w-2xl')}>{description}</p>}
      </div>
      <div className={cn(ws.surface, 'overflow-hidden')}>
        <ul className="divide-y divide-[#F1ECE5]">{children}</ul>
        {footer && <div className="border-t border-[#F1ECE5] px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </section>
  );
}

export interface IndexItem {
  id: string;
  label: string;
}

/** Compact jump row for phones and tablets, where the side index is hidden. */
export function SectionChips({ items, label = 'Jump to a settings section' }: { items: IndexItem[]; label?: string }) {
  const go = (id: string) => { scrollToSection(id); };
  return (
    <nav aria-label={label} className="-mb-4 min-w-0 sm:-mb-6 lg:hidden">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(item.id)}
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-[#E2DBD0] bg-white px-3.5 text-[13px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Sticky in-page index (desktop). Highlights the section in view. */
export function SectionIndex({ items, label = 'Settings sections' }: { items: IndexItem[]; label?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const clicked = useRef({ at: 0 });

  // The section whose heading has passed the top bar is active; the last one wins at the page end.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
      if (!els.length) return;
      const doc = document.documentElement;
      const atEnd = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= 140) current = el.id;
      // Keep a clicked item highlighted while its smooth scroll settles.
      if (Date.now() - clicked.current.at < 1200) return;
      setActive(atEnd ? els[els.length - 1].id : current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  const go = (id: string) => {
    clicked.current.at = Date.now();
    if (scrollToSection(id)) setActive(id);
  };

  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const on = item.id === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'relative flex w-full items-center rounded-lg py-2 pl-4 pr-3 text-left text-[13.5px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1C1B1A]',
                  on ? 'bg-white font-semibold text-[#1C1B1A] shadow-[0_0_0_1px_rgba(28,27,26,0.05)]' : 'font-medium text-[#5E5953] hover:bg-white/70 hover:text-[#1C1B1A]',
                )}
              >
                {on && <span aria-hidden="true" className="absolute inset-y-2 left-1.5 w-[3px] rounded-full bg-[#FF5124]" />}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
