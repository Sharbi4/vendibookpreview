import { motion } from 'framer-motion';
import { MapPin, Star, Calendar, Clock, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedPublicProfileStatsProps {
  stats: {
    totalListings?: number;
    averageRating?: number;
    totalReviewsReceived?: number;
  } | null;
  completedBookings?: number;
  responseTime?: string;
  isHost: boolean;
}

const EnhancedPublicProfileStats = ({ 
  stats, 
  completedBookings,
  responseTime,
  isHost 
}: EnhancedPublicProfileStatsProps) => {
  const statItems = [
    {
      label: 'Listings',
      value: stats?.totalListings || 0,
      icon: MapPin,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      textColor: 'text-violet-700 dark:text-violet-300',
      show: isHost,
    },
    {
      label: 'Rating',
      value: stats?.averageRating ? stats.averageRating.toFixed(1) : '—',
      subValue: stats?.totalReviewsReceived ? `${stats.totalReviewsReceived} reviews` : undefined,
      icon: Star,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      textColor: 'text-amber-700 dark:text-amber-300',
      show: (stats?.totalReviewsReceived || 0) > 0,
    },
    {
      label: 'Completed',
      value: completedBookings || 0,
      subValue: 'bookings',
      icon: Calendar,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      show: (completedBookings || 0) > 0,
    },
    {
      label: 'Response',
      value: responseTime || '—',
      subValue: 'avg time',
      icon: Clock,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      textColor: 'text-blue-700 dark:text-blue-300',
      show: !!responseTime,
    },
  ];

  const visibleItems = statItems.filter(item => item.show);

  if (visibleItems.length === 0) return null;

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

  // Determine grid columns based on visible items
  const gridCols = visibleItems.length === 1 ? 'grid-cols-1' 
    : visibleItems.length === 2 ? 'grid-cols-2' 
    : visibleItems.length === 3 ? 'grid-cols-3' 
    : 'grid-cols-2 md:grid-cols-4';

  return (
    <motion.div 
      className={cn('grid gap-3 md:gap-4', gridCols)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {visibleItems.map((item, index) => {
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
              'border-border/50'
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

              {/* Sub value */}
              {item.subValue && (
                <p className="text-xs text-muted-foreground mb-0.5">
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

export default EnhancedPublicProfileStats;
