import * as React from 'react';
import { motion, useReducedMotion, useInView, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

export const fmt = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${Math.round(n).toLocaleString('en-US')}` : '—';

/** Soft white editorial surface on the warm ivory canvas. */
export const SectionCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={cn('bg-sale-card rounded-2xl p-5 md:p-7', className)}>{children}</div>
);

export const Eyebrow: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground', className)}>{children}</p>
);

export const Pill: React.FC<React.PropsWithChildren<{ tone?: 'neutral' | 'good' | 'warn' | 'accent'; icon?: React.ReactNode }>> =
  ({ children, tone = 'neutral', icon }) => (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1',
      tone === 'good' && 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/25',
      tone === 'warn' && 'bg-amber-500/10 text-amber-700 ring-amber-600/25',
      tone === 'accent' && 'chip-accent',
      tone === 'neutral' && 'bg-black/[0.04] text-muted-foreground ring-black/10',
    )}>
      {icon}{children}
    </span>
  );

export type Confidence = 'high' | 'medium' | 'directional';
export const confidenceTone = (c: Confidence): 'good' | 'accent' | 'warn' => (c === 'high' ? 'good' : c === 'medium' ? 'accent' : 'warn');
export const confidenceText = (c: Confidence) => (c === 'high' ? 'High confidence' : c === 'medium' ? 'Medium confidence' : 'Directional estimate');

/**
 * Animated low → estimate → high range bar.
 * Animates exactly once, when it scrolls into view. Honors reduced motion.
 */
export const RangeBar: React.FC<{
  low: number; high: number; estimate: number; benchmark?: number | null;
  suffix?: string; size?: 'md' | 'lg';
}> = ({ low, high, estimate, benchmark, suffix, size = 'md' }) => {
  const reduce = useReducedMotion();
  const pad = Math.max((high - low) * 0.12, high * 0.04, 1);
  const min = Math.max(0, low - pad);
  const max = high + pad;
  const span = Math.max(1, max - min);
  const pct = (n: number) => Math.min(96, Math.max(4, ((n - min) / span) * 100));
  const lg = size === 'lg';

  return (
    <div className={lg ? 'pt-14' : 'pt-9'}>
      <div className={cn('relative rounded-full bg-black/[0.06]', lg ? 'h-3' : 'h-2.5')}>
        {/* Market range band — draws outward from the estimate */}
        <motion.div
          className="absolute inset-y-0 rounded-full bg-orange-500/25"
          initial={reduce ? false : { left: `${pct(estimate)}%`, right: `${100 - pct(estimate)}%` }}
          whileInView={{ left: `${pct(low)}%`, right: `${100 - pct(high)}%` }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
        {/* Benchmark tick */}
        {typeof benchmark === 'number' && benchmark > min && benchmark < max && (
          <motion.div
            className={cn('absolute top-1/2 w-[2px] -translate-y-1/2 rounded bg-black/40', lg ? 'h-4' : 'h-3.5')}
            style={{ left: `${pct(benchmark)}%` }}
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: 0.9 }}
          />
        )}
        {/* Estimate marker — settles into place once */}
        <motion.div
          className={cn('absolute top-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-md ring-4 ring-white', lg ? 'h-7 w-7' : 'h-6 w-6')}
          initial={reduce ? false : { left: `${pct(low)}%`, scale: 0.6, opacity: 0 }}
          whileInView={{ left: `${pct(estimate)}%`, scale: 1, opacity: 1, x: '-50%' }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.45 }}
        />
        {/* Floating estimate label */}
        <motion.div
          className={cn(
            'absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground font-semibold tabular-nums text-background shadow',
            lg ? '-top-12 px-4 py-1.5 text-sm' : '-top-9 px-3 py-1 text-[12px]',
          )}
          initial={reduce ? false : { left: `${pct(low)}%`, opacity: 0 }}
          whileInView={{ left: `${pct(estimate)}%`, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.45 }}
        >
          {fmt(estimate)}{suffix ?? ''}
        </motion.div>
      </div>
      <div className={cn('mt-2.5 flex items-center justify-between tabular-nums text-muted-foreground', lg ? 'text-[13px]' : 'text-[12px]')}>
        <span>Low · {fmt(low)}{suffix ?? ''}</span>
        {/* Center benchmark caption only when it can't collide with the estimate marker */}
        {typeof benchmark === 'number' && Math.abs(pct(benchmark) - pct(estimate)) > 12 && (
          <span className="hidden sm:inline">{fmt(benchmark)} benchmark</span>
        )}
        <span>High · {fmt(high)}{suffix ?? ''}</span>
      </div>
    </div>
  );
};

/** Money figure that counts up subtly the first time it enters the viewport. */
export const CountUpMoney: React.FC<{ value: number; suffix?: string; className?: string }> = ({ value, suffix, className }) => {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px' });
  const [display, setDisplay] = React.useState(reduce ? value : 0);

  React.useEffect(() => {
    if (reduce) { setDisplay(value); return; }
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={className}>
      ${Math.round(display).toLocaleString('en-US')}{suffix ?? ''}
    </span>
  );
};

/** Standard scroll-triggered section reveal. Single use, small translate. */
export const Reveal: React.FC<React.PropsWithChildren<{ className?: string; delay?: number }>> = ({ children, className, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
