import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

const child: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
  },
};

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
}

/**
 * Stagger-reveals direct children with a quiet upward fade.
 * Each direct child should be a <Reveal>…</Reveal> or any motion child.
 */
export const SectionReveal = ({ children, className }: SectionRevealProps) => {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
};

export const Reveal = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <motion.div variants={child} className={className}>
    {children}
  </motion.div>
);

export default SectionReveal;
