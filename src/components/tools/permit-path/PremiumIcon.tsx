import { motion, type MotionProps } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export type IconAccent =
  | 'orange' | 'emerald' | 'sky' | 'amber' | 'violet' | 'rose' | 'teal' | 'blue' | 'green' | 'red';

const ACCENT: Record<IconAccent, { from: string; to: string; ring: string; glow: string; icon: string; border: string }> = {
  orange:  { from: 'from-[#FF5124]/35', to: 'to-[#FF5124]/5',   ring: 'ring-[#FF5124]/30', glow: 'rgba(255,81,36,0.55)',  icon: 'text-[#FF7A52]', border: 'border-[#FF5124]/30' },
  emerald: { from: 'from-emerald-400/35', to: 'to-emerald-500/5', ring: 'ring-emerald-400/30', glow: 'rgba(52,211,153,0.45)', icon: 'text-emerald-300', border: 'border-emerald-400/30' },
  sky:     { from: 'from-sky-400/35',    to: 'to-sky-500/5',    ring: 'ring-sky-400/30',    glow: 'rgba(56,189,248,0.45)', icon: 'text-sky-300',    border: 'border-sky-400/30' },
  amber:   { from: 'from-amber-400/35',  to: 'to-amber-500/5',  ring: 'ring-amber-400/30',  glow: 'rgba(251,191,36,0.45)', icon: 'text-amber-300',  border: 'border-amber-400/30' },
  violet:  { from: 'from-violet-400/35', to: 'to-violet-500/5', ring: 'ring-violet-400/30', glow: 'rgba(167,139,250,0.45)', icon: 'text-violet-300', border: 'border-violet-400/30' },
  rose:    { from: 'from-rose-400/35',   to: 'to-rose-500/5',   ring: 'ring-rose-400/30',   glow: 'rgba(251,113,133,0.45)', icon: 'text-rose-300',   border: 'border-rose-400/30' },
  teal:    { from: 'from-teal-400/35',   to: 'to-teal-500/5',   ring: 'ring-teal-400/30',   glow: 'rgba(45,212,191,0.45)',  icon: 'text-teal-300',   border: 'border-teal-400/30' },
  blue:    { from: 'from-blue-400/35',   to: 'to-blue-500/5',   ring: 'ring-blue-400/30',   glow: 'rgba(96,165,250,0.45)',  icon: 'text-blue-300',   border: 'border-blue-400/30' },
  green:   { from: 'from-green-400/35',  to: 'to-green-500/5',  ring: 'ring-green-400/30',  glow: 'rgba(74,222,128,0.45)',  icon: 'text-green-300',  border: 'border-green-400/30' },
  red:     { from: 'from-red-400/35',    to: 'to-red-500/5',    ring: 'ring-red-400/30',    glow: 'rgba(248,113,113,0.5)',  icon: 'text-red-300',    border: 'border-red-400/30' },
};

const SIZES = {
  sm: { tile: 'h-9 w-9 rounded-lg',  icon: 'h-4 w-4' },
  md: { tile: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
  lg: { tile: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
  xl: { tile: 'h-16 w-16 rounded-2xl', icon: 'h-8 w-8' },
};

interface Props {
  icon: LucideIcon;
  accent?: IconAccent;
  size?: keyof typeof SIZES;
  className?: string;
  pulse?: boolean;
  /** Hover micro-interaction: 'spin' | 'tick' | 'bounce' | 'nudge' | 'draw' | 'pop' | 'none' */
  hover?: 'spin' | 'tick' | 'bounce' | 'nudge' | 'draw' | 'pop' | 'lift' | 'none';
  delay?: number;
  filled?: boolean;
  children?: ReactNode;
}

const hoverAnims: Record<NonNullable<Props['hover']>, MotionProps> = {
  spin:   { whileHover: { rotate: 12 }, transition: { type: 'spring', stiffness: 300, damping: 14 } },
  tick:   { whileHover: { rotate: [0, -8, 8, -4, 0] }, transition: { duration: 0.5 } },
  bounce: { whileHover: { y: [0, -4, 0, -2, 0] }, transition: { duration: 0.45 } },
  nudge:  { whileHover: { x: [0, 3, 0, 3, 0] }, transition: { duration: 0.45 } },
  draw:   { whileHover: { scale: [1, 1.08, 1] }, transition: { duration: 0.35 } },
  pop:    { whileHover: { scale: 1.12 }, transition: { type: 'spring', stiffness: 380, damping: 12 } },
  lift:   { whileHover: { y: -2, scale: 1.04 }, transition: { type: 'spring', stiffness: 300, damping: 18 } },
  none:   {},
};

export default function PremiumIcon({
  icon: Icon,
  accent = 'orange',
  size = 'md',
  className,
  pulse = false,
  hover = 'lift',
  delay = 0,
  filled = true,
  children,
}: Props) {
  const a = ACCENT[accent];
  const s = SIZES[size];
  const hov = hoverAnims[hover];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 18 }}
      className={cn('relative inline-flex items-center justify-center', className)}
    >
      {/* outer glow */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit] blur-xl opacity-70 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${a.glow}, transparent 70%)` }}
      />
      {pulse && (
        <motion.span
          aria-hidden
          className={cn('absolute inset-0 rounded-[inherit] ring-2', a.ring)}
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <motion.span
        {...hov}
        className={cn(
          'relative inline-flex items-center justify-center border bg-gradient-to-br shadow-inner',
          'before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none',
          s.tile,
          a.from,
          a.to,
          a.border,
        )}
        style={{
          backgroundColor: '#0d0d10',
        }}
      >
        <Icon
          className={cn('relative drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]', s.icon, a.icon)}
          strokeWidth={2.2}
          {...(filled ? { fill: 'currentColor', fillOpacity: 0.22 } : {})}
        />
        {children}
      </motion.span>
    </motion.div>
  );
}
