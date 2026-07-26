import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Spark chip — Vendibook's listing intelligence brand mark.
 * Use "Powered by Spark" attribution instead of generic "AI-powered".
 *
 * Variants:
 *  - default: subtle brand tint for entitled surfaces.
 *  - gold:    matches the Pro/gold unlock ladder for gated features.
 */
type SparkChipProps = {
  label?: string;
  variant?: 'default' | 'gold';
  size?: 'xs' | 'sm';
  className?: string;
};

export const SparkChip: React.FC<SparkChipProps> = ({
  label = 'Spark',
  variant = 'default',
  size = 'xs',
  className,
}) => {
  const sizeCls =
    size === 'sm'
      ? 'h-6 px-2 text-[11px]'
      : 'h-5 px-1.5 text-[10px]';
  const iconCls = size === 'sm' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const tone =
    variant === 'gold'
      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
      : 'bg-primary/10 text-primary border-primary/25';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide',
        sizeCls,
        tone,
        className,
      )}
    >
      <Flame className={iconCls} aria-hidden />
      {label}
    </span>
  );
};

export default SparkChip;
