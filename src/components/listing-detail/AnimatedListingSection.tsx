import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedListingSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedListingSection = ({ 
  children, 
  className,
  delay = 0 
}: AnimatedListingSectionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{
      type: 'spring',
      stiffness: 100,
      damping: 20,
      delay,
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface AnimatedHighlightCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  index?: number;
}

export const AnimatedHighlightCard = ({ 
  icon, 
  title, 
  description, 
  index = 0 
}: AnimatedHighlightCardProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{
      type: 'spring',
      stiffness: 100,
      damping: 15,
      delay: index * 0.1,
    }}
    whileHover={{ x: 4 }}
    className="flex items-start gap-4 group cursor-default"
  >
    <motion.div 
      className="flex-shrink-0 p-3 rounded-xl bg-muted/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {icon}
    </motion.div>
    <div className="min-w-0">
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  </motion.div>
);

interface AnimatedPriceTagProps {
  price: number | null;
  label: string;
  highlight?: boolean;
  index?: number;
}

export const AnimatedPriceTag = ({ 
  price, 
  label, 
  highlight = false,
  index = 0 
}: AnimatedPriceTagProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{
      type: 'spring',
      stiffness: 100,
      damping: 15,
      delay: index * 0.1,
    }}
    whileHover={{ scale: 1.02 }}
    className={cn(
      "flex items-center justify-between p-4 rounded-xl transition-colors",
      highlight 
        ? "bg-primary/5 border border-primary/20" 
        : "bg-muted/30 border border-border"
    )}
  >
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn(
      "font-semibold",
      highlight ? "text-lg text-foreground" : "text-foreground"
    )}>
      {price && price > 0 ? `$${price.toLocaleString()}` : '—'}
    </span>
  </motion.div>
);

interface SectionDividerProps {
  className?: string;
}

export const AnimatedDivider = ({ className }: SectionDividerProps) => (
  <motion.div
    initial={{ scaleX: 0 }}
    whileInView={{ scaleX: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={cn("border-t border-border origin-left", className)}
  />
);

export const PulsingDot = () => (
  <motion.span
    className="inline-block w-2 h-2 rounded-full bg-emerald-500"
    animate={{
      scale: [1, 1.2, 1],
      opacity: [1, 0.7, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);
