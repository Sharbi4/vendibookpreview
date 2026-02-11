import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { 
  Calendar, Clock, Building2, Zap, Star, Share2, Flag, 
  ShieldAlert, MapPin, MessageCircle, MoreHorizontal, Eye,
  ShieldCheck, Loader2, Camera, ImageIcon, X, Pencil
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const displayName = getPublicDisplayName(profile);
  const initials = getDisplayInitials(profile);
  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy');
  
  // Upload state for own profile
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, type: 'avatar' | 'header') => {
    const isAvatar = type === 'avatar';
    const setUploading = isAvatar ? setIsUploadingAvatar : setIsUploadingHeader;
    
    setUploading(true);
    
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      const maxSize = isAvatar ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${isAvatar ? '5MB' : '10MB'}`);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${type}-${Date.now()}.${fileExt}`;
      const bucket = isAvatar ? 'avatars' : 'headers';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const updateField = isAvatar ? 'avatar_url' : 'header_image_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: 'Image updated',
        description: `Your ${isAvatar ? 'profile picture' : 'header image'} has been updated.`,
      });

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeHeader = async () => {
    setIsUploadingHeader(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ header_image_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      toast({ title: 'Header removed' });
      queryClient.invalidateQueries({ queryKey: ['public-profile'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to remove header image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingHeader(false);
    }
  };
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
      className="relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Enhanced header with uploadable image support */}
      {profile.header_image_url ? (
        <div className="absolute inset-0 h-44 md:h-56 group">
          <img 
            src={profile.header_image_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
          {/* Glass overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-card" />
          <div className="absolute inset-0 backdrop-blur-[2px]" style={{ maskImage: 'linear-gradient(to bottom, transparent 60%, black 100%)' }} />
          
          {/* Edit overlay for own profile */}
          {isOwnProfile && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-9"
                onClick={() => headerInputRef.current?.click()}
                disabled={isUploadingHeader}
              >
                {isUploadingHeader ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-1.5" />
                    Change Header
                  </>
                )}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-9"
                onClick={removeHeader}
                disabled={isUploadingHeader}
              >
                <X className="h-4 w-4 mr-1.5" />
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={cn(
            "absolute inset-0 h-44 md:h-56 overflow-hidden",
            isOwnProfile ? "cursor-pointer group" : "pointer-events-none"
          )}
          onClick={isOwnProfile ? () => headerInputRef.current?.click() : undefined}
        >
          {/* Orange gradient background matching homepage header */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)] via-[hsl(20,90%,50%)] to-[hsl(40,100%,49%)]" />
          
          {/* Animated shine overlay */}
          <div className="absolute inset-0 hp2-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          
          {/* Glass overlay */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/5" />

          {/* Gradient fade to content */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Upload prompt for own profile */}
          {isOwnProfile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              {isUploadingHeader ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 mb-2 text-white" />
                  <span className="text-sm font-medium text-white">Add header image</span>
                  <span className="text-xs text-white/80">Recommended: 1200 x 400px</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={headerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file, 'header');
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file, 'avatar');
        }}
      />

      {/* Glass card container for profile info - STRONGER BORDERS */}
      <div className="container pt-28 md:pt-36 pb-6 md:pb-8 relative">
        <div className="rounded-2xl p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] bg-white/40 dark:bg-white/[0.06] backdrop-blur-2xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
          {/* Enhanced Avatar with upload support for own profile */}
          <motion.div 
            variants={itemVariants}
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div 
              className={cn("relative", isOwnProfile && "cursor-pointer group")}
              onClick={isOwnProfile ? () => avatarInputRef.current?.click() : undefined}
            >
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-xl ring-2 ring-border">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-xl md:text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload overlay for own profile */}
              {isOwnProfile && (
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
              )}
              
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
                            ? 'bg-white/50 dark:bg-white/10 backdrop-blur-xl text-foreground border-white/30 dark:border-white/15'
                            : 'bg-white/30 dark:bg-white/5 backdrop-blur-sm text-muted-foreground border-white/20 dark:border-white/10'
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
                          <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full shadow-sm bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border-white/20 dark:border-white/10">
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
                          <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full shadow-sm bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border-white/20 dark:border-white/10">
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
                          <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full shadow-sm bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border-white/20 dark:border-white/10">
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
                    <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-full bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border-white/20 dark:border-white/10">
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

            {/* CTA Buttons with dark-shine styling */}
            {!isOwnProfile && isHost && (
              <div className="flex flex-col gap-2 w-48">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="dark-shine"
                    onClick={onMessageHost} 
                    disabled={isMessaging} 
                    className="w-full rounded-xl shadow-lg"
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
                    className="w-full rounded-xl bg-white/40 dark:bg-white/[0.06] backdrop-blur-xl border border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10"
                  >
                    View Listings ({stats?.totalListings || 0})
                  </Button>
                </motion.div>
              </div>
            )}

            {isOwnProfile && (
              <div className="flex flex-col sm:flex-row gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" className="rounded-xl" asChild>
                    <Link to="/dashboard?view=host">← Back to Dashboard</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="dark-shine" className="rounded-xl shadow-lg" asChild>
                    <Link to="/account">Edit Profile</Link>
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedPublicProfileHeader;
