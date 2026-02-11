import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Calendar, Star, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorefrontTrustStripProps {
  isVerified: boolean;
  responseTime?: string;
  completedBookings: number;
  averageRating?: number;
  totalReviews?: number;
  memberSince: string;
  isTopRated?: boolean;
  isSuperhost?: boolean;
}

const StorefrontTrustStrip = ({
  isVerified,
  responseTime,
  completedBookings,
  averageRating,
  totalReviews,
  memberSince,
  isTopRated,
  isSuperhost,
}: StorefrontTrustStripProps) => {
  const items = [
    {
      icon: ShieldCheck,
      label: isVerified ? 'Verified ID' : 'Unverified',
      value: isVerified ? '✓' : '—',
      accent: isVerified ? 'text-emerald-600' : 'text-muted-foreground',
      bg: isVerified ? 'bg-emerald-500/10' : 'bg-muted/50',
      show: true,
    },
    {
      icon: Star,
      label: `${totalReviews || 0} reviews`,
      value: averageRating ? averageRating.toFixed(1) : '—',
      accent: 'text-amber-600',
      bg: 'bg-amber-500/10',
      show: (totalReviews || 0) > 0,
    },
    {
      icon: Calendar,
      label: 'Completed',
      value: completedBookings.toString(),
      accent: 'text-blue-600',
      bg: 'bg-blue-500/10',
      show: completedBookings > 0,
    },
    {
      icon: Clock,
      label: 'Responds in',
      value: responseTime || '—',
      accent: 'text-violet-600',
      bg: 'bg-violet-500/10',
      show: !!responseTime,
    },
    {
      icon: Award,
      label: isSuperhost ? 'Superhost' : 'Top Rated',
      value: '★',
      accent: 'text-primary',
      bg: 'bg-primary/10',
      show: isTopRated || isSuperhost,
    },
  ].filter(item => item.show);

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              whileHover={{ y: -4, scale: 1.03 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl min-w-fit",
                "bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-sm hover:shadow-md transition-all"
              )}
            >
              <div className={cn("p-2 rounded-lg", item.bg)}>
                <Icon className={cn("h-4 w-4", item.accent)} />
              </div>
              <div>
                <p className={cn("text-lg font-bold leading-none", item.accent)}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default StorefrontTrustStrip;
