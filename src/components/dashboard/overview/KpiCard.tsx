import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  format?: (n: number) => string;
  /** Only ONE card in the row should be ember — the primary KPI. */
  ember?: boolean;
  ariaLabel?: string;
}

/**
 * Overview KPI: dark-glass surface, big bold number, whole card clickable.
 * Ember variant is reserved for the primary KPI (Earnings / Active orders).
 */
export const KpiCard = ({
  label,
  value,
  hint,
  href,
  format,
  ember,
  ariaLabel,
}: KpiCardProps) => {
  const isNumeric = typeof value === 'number';
  const [displayed, setDisplayed] = useState(isNumeric ? 0 : null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isNumeric) return;
    const start = performance.now();
    const duration = 800;
    const to = value as number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(to * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isNumeric, value]);

  const rendered = isNumeric
    ? (format ? format(displayed ?? 0) : (displayed ?? 0).toLocaleString())
    : value;

  const body = (
    <motion.div
      whileHover={href ? { y: -2 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'relative px-5 py-5 sm:px-6 sm:py-6 h-full',
        ember ? 'dash-glass-ember rounded-[18px]' : 'dash-glass',
        href && 'dash-glass-interactive cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="dash-label truncate">{label}</span>
        {ember && (
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(255,81,36,0.7)]" />
        )}
      </div>
      <div className="mt-3 sm:mt-4 dash-kpi-number">{rendered}</div>
      {hint && (
        <div className="mt-2 text-[12px]" style={{ color: 'rgb(var(--dash-text-2))' }}>
          {hint}
        </div>
      )}
    </motion.div>
  );

  if (href) {
    return (
      <Link to={href} aria-label={ariaLabel || label} className="block no-underline h-full">
        {body}
      </Link>
    );
  }
  return body;
};

export default KpiCard;
