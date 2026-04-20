import { motion, useReducedMotion } from 'framer-motion';

/**
 * AnimatedHeroScene
 * Custom SVG illustration with looping motion. Uber/Airbnb-grade.
 * Depicts: city skyline → food truck driving → map pin drop → payment card → checkmark.
 * All colors use semantic tokens via currentColor + opacity layers.
 */
const AnimatedHeroScene = ({ variant = 'marketplace' }: { variant?: 'marketplace' | 'host' | 'seller' }) => {
  const reduce = useReducedMotion();

  // Variant-specific accent (still semantic — uses foreground with opacity)
  const accent = variant === 'host' ? 'text-emerald-500' : variant === 'seller' ? 'text-amber-500' : 'text-primary';

  return (
    <div className="relative w-full aspect-[16/10] max-w-3xl mx-auto">
      <svg
        viewBox="0 0 800 500"
        className="w-full h-full"
        role="img"
        aria-label="Animated illustration of the Vendibook marketplace flow"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="road" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--foreground))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky / ambient */}
        <rect x="0" y="0" width="800" height="500" fill="url(#sky)" />
        <circle cx="400" cy="280" r="220" fill="url(#glow)" />

        {/* City skyline silhouettes (parallax) */}
        <motion.g
          animate={reduce ? undefined : { x: [0, -8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          opacity={0.18}
        >
          {[
            [60, 220, 50, 140],
            [120, 180, 60, 180],
            [190, 240, 40, 120],
            [240, 160, 70, 200],
            [320, 210, 55, 150],
            [385, 130, 65, 230],
            [460, 200, 50, 160],
            [520, 170, 75, 190],
            [605, 230, 45, 130],
            [660, 180, 60, 180],
            [730, 220, 50, 140],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="hsl(var(--foreground))" rx="2" />
          ))}
          {/* Window dots */}
          {Array.from({ length: 22 }).map((_, i) => (
            <rect
              key={`w${i}`}
              x={80 + (i % 11) * 60 + (i % 3) * 5}
              y={250 + (i % 5) * 18}
              width="3"
              height="3"
              fill="hsl(var(--background))"
              opacity={0.6}
            />
          ))}
        </motion.g>

        {/* Road */}
        <rect x="0" y="380" width="800" height="80" fill="url(#road)" />
        <motion.g
          animate={reduce ? undefined : { x: [-40, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 22 }).map((_, i) => (
            <rect key={i} x={i * 40} y={418} width="20" height="3" fill="hsl(var(--foreground))" opacity={0.25} rx="1.5" />
          ))}
        </motion.g>

        {/* Map pin drop */}
        <motion.g
          initial={reduce ? undefined : { y: -30, opacity: 0 }}
          animate={reduce ? undefined : { y: [-30, 0, 0, -30], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, times: [0, 0.2, 0.8, 1], ease: 'easeOut' }}
          className={accent}
        >
          <path
            d="M 640 180 C 640 160, 660 145, 680 145 C 700 145, 720 160, 720 180 C 720 210, 680 250, 680 250 C 680 250, 640 210, 640 180 Z"
            fill="currentColor"
          />
          <circle cx="680" cy="180" r="10" fill="hsl(var(--background))" />
        </motion.g>

        {/* Food truck — drives in from left */}
        <motion.g
          initial={reduce ? undefined : { x: -300 }}
          animate={reduce ? undefined : { x: [-300, 100, 100, 900] }}
          transition={{ duration: 9, repeat: Infinity, times: [0, 0.35, 0.75, 1], ease: 'easeInOut' }}
        >
          {/* Body */}
          <rect x="220" y="320" width="180" height="80" rx="10" fill="hsl(var(--foreground))" />
          {/* Cab */}
          <path d="M 400 340 L 450 340 L 460 360 L 460 400 L 400 400 Z" fill="hsl(var(--foreground))" opacity={0.85} />
          {/* Window */}
          <rect x="410" y="348" width="38" height="22" rx="3" fill="hsl(var(--background))" opacity={0.7} />
          {/* Service window */}
          <rect x="240" y="340" width="100" height="35" rx="4" fill="hsl(var(--background))" opacity={0.85} />
          {/* Awning */}
          <path d="M 240 335 L 340 335 L 340 325 L 240 325 Z" className={accent} fill="currentColor" />
          {/* Logo dot */}
          <circle cx="370" cy="365" r="6" className={accent} fill="currentColor" />
          {/* Wheels */}
          <motion.g animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '255px 408px' }}>
            <circle cx="255" cy="408" r="14" fill="hsl(var(--foreground))" />
            <circle cx="255" cy="408" r="6" fill="hsl(var(--background))" opacity={0.4} />
          </motion.g>
          <motion.g animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '425px 408px' }}>
            <circle cx="425" cy="408" r="14" fill="hsl(var(--foreground))" />
            <circle cx="425" cy="408" r="6" fill="hsl(var(--background))" opacity={0.4} />
          </motion.g>
        </motion.g>

        {/* Payment card — flies in from right */}
        <motion.g
          initial={reduce ? undefined : { x: 300, opacity: 0, rotate: 15 }}
          animate={reduce ? undefined : { x: [300, 0, 0, 300], opacity: [0, 1, 1, 0], rotate: [15, -8, -8, 15] }}
          transition={{ duration: 7, delay: 1.5, repeat: Infinity, times: [0, 0.25, 0.85, 1], ease: 'easeOut' }}
          style={{ transformOrigin: '120px 130px' }}
        >
          <rect x="60" y="100" width="160" height="100" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeOpacity={0.2} strokeWidth="1.5" />
          <rect x="76" y="120" width="32" height="22" rx="3" className={accent} fill="currentColor" opacity={0.8} />
          <rect x="76" y="160" width="80" height="6" rx="3" fill="hsl(var(--foreground))" opacity={0.3} />
          <rect x="76" y="172" width="50" height="5" rx="2.5" fill="hsl(var(--foreground))" opacity={0.2} />
          <circle cx="190" cy="180" r="10" fill="hsl(var(--foreground))" opacity={0.15} />
          <circle cx="200" cy="180" r="10" fill="hsl(var(--foreground))" opacity={0.15} />
        </motion.g>

        {/* Verified checkmark badge — pops in */}
        <motion.g
          initial={reduce ? undefined : { scale: 0, opacity: 0 }}
          animate={reduce ? undefined : { scale: [0, 1.2, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 4, delay: 4, repeat: Infinity, repeatDelay: 5, times: [0, 0.15, 0.25, 0.85, 1], ease: 'backOut' }}
          style={{ transformOrigin: '680px 100px' }}
        >
          <circle cx="680" cy="100" r="34" fill="hsl(var(--foreground))" />
          <path d="M 665 100 L 676 112 L 696 90" stroke="hsl(var(--background))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </motion.g>

        {/* Floating particles */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.circle
            key={i}
            cx={120 + i * 110}
            cy={420}
            r={2}
            fill="hsl(var(--foreground))"
            opacity={0.3}
            animate={reduce ? undefined : { y: [0, -120, 0], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 4 + i * 0.4, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          />
        ))}
      </svg>
    </div>
  );
};

export default AnimatedHeroScene;
