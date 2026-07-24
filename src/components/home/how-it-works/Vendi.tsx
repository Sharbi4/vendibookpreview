import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

export type VendiAccessory = 'search' | 'calendar' | 'camera' | 'dashboard' | 'none';

interface VendiProps {
  accessory?: VendiAccessory;
  className?: string;
  size?: number;
  /** disable idle animation (e.g. reduced motion or in thumbnails) */
  still?: boolean;
}

/**
 * "Vendi" — Vendibook's friendly marketplace guide character.
 * A rounded food-trailer silhouette with a small display-panel face,
 * two dot eyes, subtle wheels, and an optional context accessory.
 */
export const Vendi = ({ accessory = 'none', className, size = 160, still = false }: VendiProps) => {
  const prefersReduced = useReducedMotion();
  const animate = !still && !prefersReduced;

  return (
    <motion.svg
      viewBox="0 0 200 180"
      width={size}
      height={size * (180 / 200)}
      className={className}
      role="img"
      aria-label="Vendi, Vendibook's guide character"
      animate={animate ? { y: [0, -4, 0] } : undefined}
      transition={animate ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      {/* soft shadow */}
      <ellipse cx="100" cy="162" rx="60" ry="6" fill="hsl(var(--foreground))" opacity="0.08" />

      {/* trailer body */}
      <rect
        x="24"
        y="52"
        width="152"
        height="96"
        rx="22"
        fill="hsl(var(--card))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
      />
      {/* roof accent */}
      <rect x="24" y="52" width="152" height="14" rx="8" fill="hsl(var(--primary))" opacity="0.9" />
      {/* antenna */}
      <line x1="100" y1="52" x2="100" y2="34" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="30" r="4" fill="hsl(var(--primary))" />

      {/* display panel / face */}
      <rect x="44" y="80" width="112" height="46" rx="12" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
      {/* eyes */}
      <motion.g
        animate={animate ? { scaleY: [1, 1, 0.15, 1] } : undefined}
        transition={animate ? { duration: 4.6, repeat: Infinity, times: [0, 0.9, 0.95, 1], ease: 'easeInOut' } : undefined}
        style={{ transformOrigin: '100px 103px', transformBox: 'fill-box' }}
      >
        <circle cx="82" cy="103" r="5" fill="hsl(var(--foreground))" />
        <circle cx="118" cy="103" r="5" fill="hsl(var(--foreground))" />
      </motion.g>
      {/* smile */}
      <path d="M 88 115 Q 100 122 112 115" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* wheels */}
      <circle cx="60" cy="150" r="10" fill="hsl(var(--foreground))" />
      <circle cx="60" cy="150" r="4" fill="hsl(var(--card))" />
      <circle cx="140" cy="150" r="10" fill="hsl(var(--foreground))" />
      <circle cx="140" cy="150" r="4" fill="hsl(var(--card))" />

      {/* accessory */}
      {accessory === 'search' && (
        <g transform="translate(150 42)">
          <circle cx="0" cy="0" r="14" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <circle cx="-2" cy="-2" r="6" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <line x1="3" y1="3" x2="9" y2="9" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {accessory === 'calendar' && (
        <g transform="translate(148 40)">
          <rect x="-14" y="-12" width="26" height="22" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <line x1="-14" y1="-6" x2="12" y2="-6" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <circle cx="-6" cy="2" r="2" fill="hsl(var(--primary))" />
          <circle cx="0" cy="2" r="2" fill="hsl(var(--primary))" />
          <circle cx="6" cy="2" r="2" fill="hsl(var(--foreground))" opacity="0.3" />
        </g>
      )}
      {accessory === 'camera' && (
        <g transform="translate(150 42)">
          <rect x="-14" y="-10" width="28" height="20" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <rect x="-4" y="-14" width="10" height="4" rx="1" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <circle cx="0" cy="0" r="5" fill="hsl(var(--primary))" />
          <circle cx="0" cy="0" r="2" fill="hsl(var(--background))" />
        </g>
      )}
      {accessory === 'dashboard' && (
        <g transform="translate(148 40)">
          <rect x="-14" y="-12" width="28" height="22" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <rect x="-10" y="0" width="4" height="8" fill="hsl(var(--primary))" />
          <rect x="-3" y="-4" width="4" height="12" fill="hsl(var(--primary))" />
          <rect x="4" y="-8" width="4" height="16" fill="hsl(var(--primary))" />
        </g>
      )}
    </motion.svg>
  );
};

export default Vendi;
