import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// Stagger container for child animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Fade up animation for items
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    }
  },
};

// Scale fade animation
export const scaleFade: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    }
  },
};

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    }
  },
};

// Slide in from right
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    }
  },
};

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// Animated section wrapper with scroll trigger
export const AnimatedSection = ({ children, className, delay = 0 }: AnimatedSectionProps) => (
  <motion.section
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-50px" }}
    variants={{
      hidden: { opacity: 0, y: 30 },
      show: { 
        opacity: 1, 
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 80,
          damping: 20,
          delay,
        }
      },
    }}
    className={className}
  >
    {children}
  </motion.section>
);

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

// Animated card with stagger support
export const AnimatedCard = ({ children, className, index = 0 }: AnimatedCardProps) => (
  <motion.div
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-30px" }}
    variants={{
      hidden: { opacity: 0, y: 20, scale: 0.98 },
      show: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 15,
          delay: index * 0.1,
        }
      },
    }}
    whileHover={{ 
      y: -4, 
      transition: { type: 'spring', stiffness: 400, damping: 25 } 
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

// Animated list item with stagger
export const AnimatedListItem = ({ children, className, index = 0 }: AnimatedListItemProps) => (
  <motion.li
    initial="hidden"
    whileInView="show"
    viewport={{ once: true }}
    variants={{
      hidden: { opacity: 0, x: -15 },
      show: { 
        opacity: 1, 
        x: 0,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 15,
          delay: index * 0.08,
        }
      },
    }}
    className={className}
  >
    {children}
  </motion.li>
);

interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

// Simple hover scale wrapper
export const HoverScale = ({ children, className, scale = 1.02 }: HoverScaleProps) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    className={className}
  >
    {children}
  </motion.div>
);

interface PulseProps {
  children: ReactNode;
  className?: string;
}

// Subtle pulse animation for attention
export const Pulse = ({ children, className }: PulseProps) => (
  <motion.div
    animate={{ 
      scale: [1, 1.02, 1],
      opacity: [1, 0.9, 1],
    }}
    transition={{ 
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface ShimmerProps {
  className?: string;
}

// Shimmer effect overlay
export const Shimmer = ({ className }: ShimmerProps) => (
  <motion.div
    className={cn(
      "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent",
      className
    )}
    animate={{ translateX: ['100%', '-100%'] }}
    transition={{ 
      duration: 2,
      repeat: Infinity,
      repeatDelay: 3,
      ease: "easeInOut",
    }}
  />
);
