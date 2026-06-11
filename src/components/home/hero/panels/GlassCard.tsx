import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  className?: string;
  rotate?: number;
}

/**
 * Frosted cream glassmorphism card used for hero overlay modules.
 * Real HTML — never bake content into background images.
 */
const GlassCard = ({ children, className, rotate = 0 }: Props) => (
  <div
    className={cn(
      'relative rounded-2xl p-3 sm:p-4 text-neutral-900',
      'backdrop-blur-xl',
      className,
    )}
    style={{
      background: 'rgba(255, 250, 242, 0.78)',
      border: '1px solid rgba(255, 106, 26, 0.22)',
      boxShadow:
        '0 18px 50px rgba(255, 106, 26, 0.16), inset 0 1px 0 rgba(255,255,255,0.6)',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
    }}
  >
    {/* soft orange glow halo */}
    <div
      className="absolute -inset-3 -z-10 rounded-3xl pointer-events-none opacity-60"
      style={{
        background:
          'radial-gradient(60% 60% at 50% 50%, rgba(255,106,26,0.25) 0%, transparent 70%)',
      }}
      aria-hidden
    />
    {children}
  </div>
);

export default GlassCard;
