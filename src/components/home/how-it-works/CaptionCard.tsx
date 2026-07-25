import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  caption: string;
  /** Larger sizing for the modal; default is tile-sized. */
  size?: 'tile' | 'modal';
  className?: string;
}

/**
 * Kinetic caption card. Sofia Pro display type, token colors, single active
 * caption at a time. Fades + rises on change; static swap for
 * prefers-reduced-motion users.
 */
export const CaptionCard = ({ caption, size = 'tile', className }: Props) => {
  const reduced = useReducedMotion();

  const sizeClasses =
    size === 'modal'
      ? 'text-2xl sm:text-3xl md:text-4xl leading-tight tracking-tight'
      : 'text-base sm:text-lg leading-snug tracking-tight';

  return (
    <div className={cn('pointer-events-none relative w-full', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={caption}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduced ? 0.15 : 0.35, ease: 'easeOut' }}
          className={cn(
            'font-display font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]',
            sizeClasses,
          )}
        >
          {caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default CaptionCard;
