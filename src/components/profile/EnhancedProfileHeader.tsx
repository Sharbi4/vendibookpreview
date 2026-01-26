import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Clock, CreditCard, Zap, Star, Edit, Shield, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VerifiedBadgeImage } from '@/components/verification/VerificationBadge';
import { cn } from '@/lib/utils';
import { getPublicDisplayName, getDisplayInitials } from '@/lib/displayName';
import type { UserProfile, UserStats } from '@/hooks/useUserProfile';

interface EnhancedProfileHeaderProps {
  profile: UserProfile;
  stats: UserStats | null;
  isOwnProfile: boolean;
  stripeConnected?: boolean;
  isFastResponder?: boolean;
  avgResponseTime?: string;
  isHost?: boolean;
}

const EnhancedProfileHeader = ({
  profile,
  stats,
  isOwnProfile,
  stripeConnected,
  isFastResponder,
  avgResponseTime,
  isHost,
}: EnhancedProfileHeaderProps) => {
  const displayName = getPublicDisplayName(profile);
  const initials = getDisplayInitials(profile);
  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
    },
  };

  return (
    <motion.div 
      className="relative overflow-hidden bg-gradient-to-br from-card via-card to-muted/30 border-b"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container py-8 md:py-10 relative">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Enhanced Avatar */}
          <motion.div 
            variants={itemVariants}
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
                <AvatarFallback className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {/* Verified badge overlay */}
              {profile.identity_verified && (
                <motion.div 
                  className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
                >
                  <VerifiedBadgeImage size="lg" />
                </motion.div>
              )}
            </div>
            
            {/* Animated ring effect */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.div>

          {/* Info Section */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            {/* Name Row */}
            <motion.div variants={itemVariants} className="flex items-center justify-center md:justify-start gap-3 flex-wrap mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {displayName}
              </h1>
              {isOwnProfile && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-full" asChild>
                    <Link to="/account">
                      <Edit className="h-3.5 w-3.5" />
                      Edit Profile
                    </Link>
                  </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Trust Badges Row */}
            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-4"
            >
              <TooltipProvider delayDuration={200}>
                {/* Verified Badge */}
                <motion.div variants={badgeVariants}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm',
                          profile.identity_verified
                            ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 dark:text-amber-400 dark:border-amber-700'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {profile.identity_verified ? (
                          <VerifiedBadgeImage size="md" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                        {profile.identity_verified ? 'ID Verified' : 'Unverified'}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {profile.identity_verified 
                        ? 'Identity verified via Stripe Identity'
                        : 'Identity not yet verified'}
                    </TooltipContent>
                  </Tooltip>
                </motion.div>

                {/* Stripe Connected Badge */}
                {isHost && (
                  <motion.div variants={badgeVariants}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge
                            variant={stripeConnected ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs gap-1.5 px-3 py-1.5 rounded-full shadow-sm',
                              stripeConnected
                                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            {stripeConnected ? 'Payouts Enabled' : 'No Payouts'}
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {stripeConnected 
                          ? 'Connected to Stripe for secure payouts'
                          : 'Stripe not connected - cannot receive payments'}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}

                {/* Host Badge */}
                {isHost && (
                  <motion.div variants={badgeVariants}>
                    <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5 rounded-full border-primary/30 bg-primary/5">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Host
                    </Badge>
                  </motion.div>
                )}

                {/* Fast Responder Badge */}
                {isFastResponder && (
                  <motion.div variants={badgeVariants}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge className="text-xs gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400 shadow-sm">
                            <Clock className="h-3.5 w-3.5" />
                            Fast Responder
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {avgResponseTime 
                          ? `Typically responds within ${avgResponseTime}`
                          : 'Responds quickly to booking requests'}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}

                {/* Rating Badge */}
                {stats?.averageRating && stats.averageRating > 0 && (
                  <motion.div variants={badgeVariants}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5 rounded-full shadow-sm">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            {stats.averageRating.toFixed(1)}
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {stats.totalReviewsReceived} review{stats.totalReviewsReceived !== 1 ? 's' : ''}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}
              </TooltipProvider>
            </motion.div>

            {/* Member Since with icon */}
            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground"
            >
              <Calendar className="h-4 w-4" />
              <span>Member since {memberSince}</span>
              {isHost && stats?.totalListings && stats.totalListings > 0 && (
                <>
                  <span className="text-border">•</span>
                  <MapPin className="h-4 w-4" />
                  <span>{stats.totalListings} listing{stats.totalListings !== 1 ? 's' : ''}</span>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedProfileHeader;
