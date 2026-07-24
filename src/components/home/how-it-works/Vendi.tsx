import { motion, useReducedMotion } from 'framer-motion';
import { Search, Calendar, Camera, LayoutDashboard } from 'lucide-react';
import mascot from '@/assets/vendi-mascot.png';
import { cn } from '@/lib/utils';

export type VendiAccessory = 'search' | 'calendar' | 'camera' | 'dashboard' | 'none';

interface VendiProps {
  accessory?: VendiAccessory;
  className?: string;
  size?: number;
  /** disable idle animation (e.g. reduced motion or in thumbnails) */
  still?: boolean;
}

const accessoryMeta: Record<Exclude<VendiAccessory, 'none'>, { Icon: typeof Search; label: string }> = {
  search: { Icon: Search, label: 'Search' },
  calendar: { Icon: Calendar, label: 'Calendar' },
  camera: { Icon: Camera, label: 'Camera' },
  dashboard: { Icon: LayoutDashboard, label: 'Dashboard' },
};

/**
 * "Vendi" — Vendibook's floating marketplace guide character.
 * Rendered from a premium mascot illustration with a soft hover/bob loop,
 * a warm ground-glow, and an optional context accessory chip.
 */
export const Vendi = ({ accessory = 'none', className, size = 180, still = false }: VendiProps) => {
  const prefersReduced = useReducedMotion();
  const animate = !still && !prefersReduced;
  const acc = accessory !== 'none' ? accessoryMeta[accessory] : null;

  return (
    <div
      className={cn('relative inline-block select-none', className)}
      style={{ width: size, height: size }}
      aria-label="Vendi, Vendibook's guide character"
      role="img"
    >
      {/* warm ground glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-primary/30 blur-2xl"
        style={{ bottom: size * 0.04, width: size * 0.72, height: size * 0.12 }}
        animate={animate ? { opacity: [0.55, 0.85, 0.55], scaleX: [1, 1.08, 1] } : undefined}
        transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />

      {/* soft floor shadow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/30 blur-md"
        style={{ bottom: size * 0.02, width: size * 0.55, height: size * 0.06 }}
        animate={animate ? { scaleX: [1, 0.9, 1], opacity: [0.35, 0.25, 0.35] } : undefined}
        transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />

      {/* mascot */}
      <motion.img
        src={mascot}
        alt=""
        draggable={false}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl"
        animate={animate ? { y: [0, -8, 0], rotate: [-1.2, 1.2, -1.2] } : undefined}
        transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />

      {/* accessory chip */}
      {acc && (
        <motion.div
          className="absolute right-[6%] top-[4%] flex items-center gap-1 rounded-full border border-border/60 bg-background/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-lg backdrop-blur"
          initial={animate ? { scale: 0, rotate: -20 } : undefined}
          animate={animate ? { scale: 1, rotate: 0 } : undefined}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
        >
          <acc.Icon className="h-3 w-3 text-primary" strokeWidth={2.5} />
          {acc.label}
        </motion.div>
      )}
    </div>
  );
};

export default Vendi;
