import { motion, useReducedMotion } from 'framer-motion';
import { Search, Calendar, Camera, LayoutDashboard } from 'lucide-react';
import mascot from '@/assets/vendi-mascot.png';
import { cn } from '@/lib/utils';
import { useMobileRender } from './scenes/primitives';

export type VendiAccessory = 'search' | 'calendar' | 'camera' | 'dashboard' | 'none';

interface VendiProps {
  accessory?: VendiAccessory;
  className?: string;
  size?: number;
  /** disable idle animation (e.g. reduced motion or in thumbnails) */
  still?: boolean;
  /**
   * Force mobile render mode. When omitted, Vendi auto-detects it from
   * MobileRenderContext (populated by SceneShell). Mobile mode:
   *   • elevates z-index so the mascot always sits above caption overlays
   *   • shrinks the accessory chip to icon-only so it never crops off the
   *     side of a scaled-down 960×540 canvas on a phone stage
   *   • boosts the visible size floor so the character stays legible even
   *     when the scene's scale factor is small
   */
  mobileMode?: boolean;
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
export const Vendi = ({ accessory = 'none', className, size = 180, still = false, mobileMode }: VendiProps) => {
  const prefersReduced = useReducedMotion();
  const ctx = useMobileRender();
  const isMobile = mobileMode ?? ctx.isMobile;
  const animate = !still && !prefersReduced;
  const acc = accessory !== 'none' ? accessoryMeta[accessory] : null;

  // Mobile render mode enforces a legibility floor so the character never
  // collapses into a dot on tiny phone stages.
  const rendered = isMobile ? Math.max(size, 200) : size;

  return (
    <div
      className={cn(
        'relative inline-block select-none',
        // Elevated stacking so Vendi is never occluded by scene overlays,
        // caption gradients, or neighboring dashboard cards on mobile.
        isMobile ? 'z-40' : 'z-10',
        className,
      )}
      style={{ width: rendered, height: rendered }}
      aria-label="Vendi, Vendibook's guide character"
      role="img"
    >
      {/* warm ground glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-primary/30 blur-2xl"
        style={{ bottom: rendered * 0.04, width: rendered * 0.72, height: rendered * 0.12 }}
        animate={animate ? { opacity: [0.55, 0.85, 0.55], scaleX: [1, 1.08, 1] } : undefined}
        transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />

      {/* soft floor shadow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/30 blur-md"
        style={{ bottom: rendered * 0.02, width: rendered * 0.55, height: rendered * 0.06 }}
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

      {/* Accessory chip removed — the SEARCH / CALENDAR / CAMERA / DASHBOARD
          chips were internal scene labels bleeding into user-facing UI.
          Prop is still accepted for backward compatibility, but never
          rendered. */}
    </div>
  );
};

export default Vendi;

