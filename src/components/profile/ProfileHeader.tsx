import { format } from 'date-fns';
import { Calendar, Clock, CreditCard, User, Zap, Star, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { cn } from '@/lib/utils';
import type { UserProfile, UserStats } from '@/hooks/useUserProfile';

interface ProfileHeaderProps {
  profile: UserProfile;
  stats: UserStats | null;
  isOwnProfile: boolean;
  stripeConnected?: boolean;
  isFastResponder?: boolean;
  avgResponseTime?: string;
  isHost?: boolean;
}

const ProfileHeader = ({
  profile,
  stats,
  isOwnProfile,
  stripeConnected,
  isFastResponder,
  avgResponseTime,
  isHost,
}: ProfileHeaderProps) => {
  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const memberSince = format(new Date(profile.created_at), 'MMM yyyy');

  return (
    <div className="bg-card border-b">
      <div className="container py-6">
        <div className="flex items-start gap-4">
          {/* Avatar - Medium Size */}
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-border shadow-sm flex-shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
            <AvatarFallback className="text-lg md:text-xl font-bold bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            {/* Name Row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                {profile.full_name || 'User'}
              </h1>
              {isOwnProfile && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link to="/account">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>

            {/* Trust Badges Row */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <TooltipProvider delayDuration={200}>
                {/* Verified Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={profile.identity_verified ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs gap-1',
                        profile.identity_verified
                          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <User className="h-3 w-3" />
                      {profile.identity_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {profile.identity_verified 
                      ? 'Identity verified via Stripe Identity'
                      : 'Identity not yet verified'}
                  </TooltipContent>
                </Tooltip>

                {/* Stripe Connected Badge */}
                {isHost && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={stripeConnected ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs gap-1',
                          stripeConnected
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <CreditCard className="h-3 w-3" />
                        {stripeConnected ? 'Payouts Enabled' : 'No Payouts'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {stripeConnected 
                        ? 'Connected to Stripe for secure payouts'
                        : 'Stripe not connected - cannot receive payments'}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Host Badge */}
                {isHost && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Zap className="h-3 w-3" />
                    Host
                  </Badge>
                )}

                {/* Fast Responder Badge */}
                {isFastResponder && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="text-xs gap-1 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400">
                        <Clock className="h-3 w-3" />
                        Fast Responder
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {avgResponseTime 
                        ? `Typically responds within ${avgResponseTime}`
                        : 'Responds quickly to booking requests'}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Rating Badge */}
                {stats?.averageRating && stats.averageRating > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {stats.averageRating.toFixed(1)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {stats.totalReviewsReceived} review{stats.totalReviewsReceived !== 1 ? 's' : ''}
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>

            {/* Member Since */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Member since {memberSince}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
