import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, Building2, Zap, Star, Share2, Flag, 
  ShieldAlert, MapPin, MessageCircle, MoreHorizontal, Eye,
  ShieldCheck, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VerifiedBadgeImage } from '@/components/verification/VerificationBadge';
import { cn } from '@/lib/utils';
import { getPublicDisplayName, getDisplayInitials } from '@/lib/displayName';
import TopRatedBadge from './TopRatedBadge';
import AboutSection from './AboutSection';

interface PublicProfileData {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  username: string | null;
  business_name: string | null;
  public_city: string | null;
  public_state: string | null;
  avatar_url: string | null;
  header_image_url?: string | null;
  identity_verified: boolean;
  created_at: string;
  bio?: string | null;
}

interface EnhancedPublicProfileHeaderProps {
  profile: PublicProfileData;
  stats: {
    totalListings?: number;
    averageRating?: number;
    totalReviewsReceived?: number;
  } | null;
  isOwnProfile: boolean;
  serviceArea: string | null;
  responseTime?: string;
  completedBookings?: number;
  isHost: boolean;
  onMessageHost: () => void;
  onShare: () => void;
  onReport: () => void;
  onShowSafety: () => void;
  onViewListings: () => void;
  isMessaging: boolean;
  listingContext: string | null;
  isTopRated?: boolean;
  isSuperhost?: boolean;
}

const EnhancedPublicProfileHeader = ({
  profile,
  stats,
  isOwnProfile,
  serviceArea,
  responseTime,
  completedBookings,
  isHost,
  onMessageHost,
  onShare,
  onReport,
  onShowSafety,
  onViewListings,
  isMessaging,
  listingContext,
  isTopRated,
  isSuperhost,
}: EnhancedPublicProfileHeaderProps) => {
  const navigate = useNavigate();
  const displayName = getPublicDisplayName(profile);
  const initials = getDisplayInitials(profile);
  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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
      className="relative overflow-hidden border-b"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header image or decorative background */}
      {profile.header_image_url ? (
        <div className="absolute inset-0 h-32 md:h-40">
          <img 
            src={profile.header_image_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-br from-card via-card to-muted/30">
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
      )}

      <div className="container py-6 md:py-8 relative">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
          {/* Enhanced Avatar */}
          <motion.div 
            variants={itemVariants}
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="relative">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-xl md:text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {/* Verified badge overlay - positioned at bottom-right with proper offset */}
              {profile.identity_verified && (
                <motion.div 
                  className="absolute bottom-0 right-0 translate-x-1 translate-y-1 bg-background rounded-full p-0.5 shadow-lg border-2 border-background"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
                >
                  <VerifiedBadgeImage size="md" />
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
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                {displayName}
              </h1>
              
              {/* Mobile Menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    <DropdownMenuItem onClick={onShare} className="text-sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Profile
                    </DropdownMenuItem>
                    {!isOwnProfile && (
                      <DropdownMenuItem onClick={onReport} className="text-sm">
                        <Flag className="h-4 w-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={onShowSafety} className="text-sm">
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      Safety Tips
                    </DropdownMenuItem>
                    {isOwnProfile && (
                      <DropdownMenuItem onClick={() => navigate('/account')} className="text-sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Edit Profile
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            {/* Business Name & Location */}
            <motion.div variants={itemVariants} className="space-y-1 mb-3">
              {profile.business_name && (
                <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{profile.business_name}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{serviceArea || 'Service area not set'}</span>
              </p>
            </motion.div>

            {/* Trust Badges Row */}
            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-3"
            >
              <TooltipProvider delayDuration={200}>
                {/* Top Rated / Superhost Badge */}
                {(isTopRated || isSuperhost) && (
                  <motion.div variants={badgeVariants}>
                    <TopRatedBadge isTopRated={isTopRated} isSuperhost={isSuperhost} />
                  </motion.div>
                )}

                {/* Verified Badge */}
                <motion.div variants={badgeVariants}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm',
                          profile.identity_verified
                            ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 dark:text-amber-400 dark:border-amber-700'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {profile.identity_verified ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        {profile.identity_verified ? 'Verified' : 'Not Verified'}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {profile.identity_verified 
                        ? 'Identity verified via secure verification'
                        : 'Identity not yet verified'}
                    </TooltipContent>
                  </Tooltip>
                </motion.div>

                {/* Response Time Badge */}
                {responseTime && (
                  <motion.div variants={badgeVariants}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full shadow-sm">
                            <Clock className="h-3.5 w-3.5" />
                            ~{responseTime}
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>Average response time</TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}

                {/* Completed Bookings Badge */}
                {(completedBookings || 0) > 0 && (
                  <motion.div variants={badgeVariants}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full shadow-sm">
                            <Calendar className="h-3.5 w-3.5" />
                            {completedBookings} booked
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>Completed bookings</TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}

                {/* Rating Badge */}
                {stats?.averageRating && stats.averageRating > 0 && (
                  <motion.div variants={badgeVariants}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full shadow-sm">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            {stats.averageRating.toFixed(1)} ({stats.totalReviewsReceived})
                          </Badge>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {stats.totalReviewsReceived} review{stats.totalReviewsReceived !== 1 ? 's' : ''}
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}

                {/* Host Badge */}
                {isHost && (
                  <motion.div variants={badgeVariants}>
                    <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full border-primary/30 bg-primary/5">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Host
                    </Badge>
                  </motion.div>
                )}
              </TooltipProvider>
            </motion.div>

            {/* Member Since */}
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

            {/* About/Bio Section */}
            {(profile.bio || isOwnProfile) && (
              <motion.div variants={itemVariants} className="mt-4 max-w-xl">
                <AboutSection 
                  bio={profile.bio || null} 
                  isOwnProfile={isOwnProfile}
                  displayName={displayName}
                />
              </motion.div>
            )}
          </div>

          {/* Desktop CTA Block */}
          <motion.div 
            variants={itemVariants}
            className="hidden md:flex flex-col items-end gap-3 flex-shrink-0"
          >
            {/* Overflow Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem onClick={onShare} className="text-sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Profile
                </DropdownMenuItem>
                {!isOwnProfile && (
                  <DropdownMenuItem onClick={onReport} className="text-sm">
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onShowSafety} className="text-sm">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Safety Tips
                </DropdownMenuItem>
                {isOwnProfile && (
                  <DropdownMenuItem onClick={() => navigate('/account')} className="text-sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CTA Buttons */}
            {!isOwnProfile && isHost && (
              <div className="flex flex-col gap-2 w-48">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={onMessageHost} 
                    disabled={isMessaging} 
                    className="w-full rounded-xl shadow-md"
                  >
                    {isMessaging ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    {listingContext ? 'Message about listing' : 'Message Host'}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="outline" 
                    onClick={onViewListings}
                    className="w-full rounded-xl"
                  >
                    View Listings ({stats?.totalListings || 0})
                  </Button>
                </motion.div>
              </div>
            )}

            {isOwnProfile && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to="/account">Edit Profile</Link>
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedPublicProfileHeader;
