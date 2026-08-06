import React, { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FieldHelpProps {
  /**
   * Plain-language name of the field or term the help describes. Used to build
   * the screen-reader label, e.g. "More information about title status".
   */
  label: string;
  /** The guidance itself. Keep it supplemental — never the only place a requirement appears. */
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * Accessible information tip used across the listing gateway, wizard, manage
 * listing, readiness system and concierge intake.
 *
 * Behaviour:
 * - Desktop: opens on hover and on keyboard focus, toggles on click.
 * - Mobile / touch: opens on tap (hover handlers are ignored).
 * - Dismisses on Escape, outside click, or blur (Radix Popover).
 *
 * Tooltips supplement visible requirements. Do not place essential validation
 * rules or privacy facts only inside a FieldHelp.
 */
export const FieldHelp: React.FC<FieldHelpProps> = ({
  label,
  children,
  side = 'top',
  align = 'center',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setCanHover(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const hoverOpen = () => {
    if (!canHover) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const hoverClose = () => {
    if (!canHover) return;
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`More information about ${label}`}
          onClick={() => setOpen((v) => !v)}
          onFocus={() => setOpen(true)}
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground',
            'transition-colors hover:text-foreground focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className,
          )}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        collisionPadding={12}
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverClose}
        className="w-[min(20rem,calc(100vw-2rem))] text-sm leading-relaxed text-foreground"
      >
        <p className="sr-only">{label}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
};

export default FieldHelp;
