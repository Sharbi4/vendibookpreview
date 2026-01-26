import { motion } from 'framer-motion';
import { MapPin, Star, Shield, CreditCard, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserStats } from '@/hooks/useUserProfile';

interface EnhancedProfileStatsRowProps {
  stats: UserStats | null;
  isVerified: boolean;
  stripeConnected?: boolean;
  isHost?: boolean;
}

const EnhancedProfileStatsRow = ({ stats, isVerified, stripeConnected, isHost }: EnhancedProfileStatsRowProps) => {
  const statItems = [
    {
      label: 'Active Listings',
      value: stats?.totalListings || 0,
      icon: MapPin,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      textColor: 'text-violet-700 dark:text-violet-300',
    },
    {
      label: 'Reviews',
      value: stats?.totalReviewsReceived || 0,
      subValue: stats?.averageRating ? `${stats.averageRating.toFixed(1)} ★` : undefined,
      icon: Star,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      textColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: isHost ? 'Payouts' : 'Status',
      value: isHost 
        ? (stripeConnected ? 'Active' : 'Inactive')
        : (isVerified ? 'Verified' : 'Pending'),
      icon: isHost ? CreditCard : (isVerified ? CheckCircle2 : Shield),
      highlight: isHost ? stripeConnected : isVerified,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div 
      className="grid grid-cols-3 gap-3 md:gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            variants={cardVariants}
            whileHover={{ 
              scale: 1.03, 
              y: -4,
              transition: { type: 'spring', stiffness: 400, damping: 17 } 
            }}
            className={cn(
              'relative overflow-hidden text-center p-4 md:p-5 rounded-2xl border shadow-sm cursor-default',
              item.bgColor,
              item.highlight !== undefined && item.highlight 
                ? 'border-emerald-200 dark:border-emerald-800'
                : 'border-border/50'
            )}
          >
            {/* Decorative gradient orb */}
            <motion.div 
              className={cn(
                'absolute -top-8 -right-8 w-20 h-20 rounded-full blur-2xl opacity-30',
                `bg-gradient-to-br ${item.color}`
              )}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative">
              {/* Icon container */}
              <motion.div 
                className={cn(
                  'w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-xl flex items-center justify-center',
                  item.iconBg
                )}
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Icon className={cn('h-5 w-5 md:h-6 md:w-6', item.textColor)} />
              </motion.div>

              {/* Value */}
              <motion.p 
                className={cn(
                  'text-xl md:text-2xl font-bold mb-0.5',
                  item.textColor
                )}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 300 }}
              >
                {item.value}
              </motion.p>

              {/* Sub value (for ratings) */}
              {item.subValue && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-0.5">
                  {item.subValue}
                </p>
              )}

              {/* Label */}
              <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default EnhancedProfileStatsRow;
