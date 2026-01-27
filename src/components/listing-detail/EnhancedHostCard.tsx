import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Star, ChevronRight, MessageCircle, Award, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageHostButton from '@/components/messaging/MessageHostButton';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { useListingAverageRating } from '@/hooks/useReviews';
import { VerifiedBadgeImage } from '@/components/verification/VerificationBadge';
import { formatLastActive } from '@/hooks/useActivityTracker';

interface EnhancedHostCardProps {
  hostId: string;
  listingId: string;
  hostName: string | null;
  hostAvatar?: string | null;
  isVerified?: boolean;
  memberSince?: string;
  lastActiveAt?: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    }
  },
};

const EnhancedHostCard = ({ 
  hostId,
  listingId,
  hostName, 
  hostAvatar, 
  isVerified = false,
  memberSince,
  lastActiveAt,
}: EnhancedHostCardProps) => {
  const initials = hostName 
    ? hostName.replace(/\.$/, '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'H';

  const profileLink = hostId ? `/u/${hostId}?from_listing=${listingId}` : '#';
  const { data: responseTimeData } = useHostResponseTime(hostId);
  const { data: ratingData } = useListingAverageRating(listingId);

  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;
  const lastActiveText = formatLastActive(lastActiveAt || null);
  const isActiveNow = lastActiveText === 'Active now';

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-30px" }}
    >
      <motion.h2 
        className="text-xl font-semibold text-foreground"
        variants={itemVariants}
      >
        Meet your host
      </motion.h2>
      
      {/* Host Profile Card */}
      <motion.div 
        className="p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border"
        variants={itemVariants}
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Left: Avatar & Quick Stats */}
          <Link 
            to={profileLink} 
            className="flex-shrink-0 group"
          >
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-xl">
                <AvatarImage src={hostAvatar || undefined} alt={hostName || 'Host'} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl md:text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isVerified && (
                <motion.div 
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                >
                  <VerifiedBadgeImage size="lg" />
                </motion.div>
              )}
            </motion.div>
          </Link>

          {/* Right: Info & Stats */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <Link 
                to={profileLink}
                className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
              >
                {hostName || 'Host'}
              </Link>
              {memberYear && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Hosting since {memberYear}
                </p>
              )}
              {lastActiveText && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Circle className={`h-2 w-2 ${isActiveNow ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground/50 text-muted-foreground/50'}`} />
                  {lastActiveText}
                </p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {ratingData?.average && (
                <motion.div 
                  className="flex items-center gap-2 p-2.5 bg-background rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <div>
                    <span className="font-semibold text-foreground">{ratingData.average.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground ml-1">rating</span>
                  </div>
                </motion.div>
              )}
              
              {ratingData?.count && ratingData.count > 0 && (
                <motion.div 
                  className="flex items-center gap-2 p-2.5 bg-background rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-semibold text-foreground">{ratingData.count}</span>
                    <span className="text-xs text-muted-foreground ml-1">review{ratingData.count !== 1 ? 's' : ''}</span>
                  </div>
                </motion.div>
              )}

              {isVerified && (
                <motion.div 
                  className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Verified</span>
                </motion.div>
              )}

              {responseTimeData?.isFastResponder && (
                <motion.div 
                  className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Fast responder</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-3"
        variants={itemVariants}
      >
        <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <MessageHostButton 
            listingId={listingId}
            hostId={hostId}
            variant="outline"
            className="w-full h-12 font-medium"
            label="Message Host"
          />
        </motion.div>
        <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button 
            variant="ghost" 
            asChild
            className="w-full h-12 justify-between hover:bg-muted/50"
          >
            <Link to={profileLink}>
              View full profile
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedHostCard;
