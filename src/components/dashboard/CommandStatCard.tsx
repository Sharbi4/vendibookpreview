import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CommandStatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  /** Surfaces a single orange dot — used only when this metric needs attention. */
  accent?: boolean;
  href?: string;
  /** Format a numeric value (e.g. currency). Ignored for string values. */
  format?: (n: number) => string;
}

/**
 * Command-center stat: razor-thin 11px uppercase label, then a 48–64px display
 * number that counts up on mount. One whisper-thin border. No shadows.
 * An orange accent dot is the *only* visual signal that this stat is urgent.
 */
export const CommandStatCard = ({
  label,
  value,
  hint,
  accent,
  href,
  format,
}: CommandStatCardProps) => {
  const isNumeric = typeof value === 'number';
  const target = isNumeric ? value : 0;
  const [displayed, setDisplayed] = useState(isNumeric ? 0 : null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isNumeric) return;
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = target;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayed(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isNumeric, target]);

  const rendered = isNumeric
    ? format
      ? format(displayed ?? 0)
      : (displayed ?? 0).toLocaleString()
    : value;

  const body = (
    <motion.div
      whileHover={href ? { y: -2 } : undefined}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={cn(
        'group relative rounded-xl border border-border bg-card px-5 py-5 sm:px-6 sm:py-6',
        'transition-colors duration-200',
        href && 'cursor-pointer hover:border-foreground/20',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {accent && (
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        )}
      </div>
      <div className="mt-3 sm:mt-4 text-[44px] sm:text-[56px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
        {rendered}
      </div>
      {hint && (
        <div className="mt-3 text-xs text-muted-foreground">{hint}</div>
      )}
    </motion.div>
  );

  if (href) return <Link to={href}>{body}</Link>;
  return body;
};

export default CommandStatCard;
