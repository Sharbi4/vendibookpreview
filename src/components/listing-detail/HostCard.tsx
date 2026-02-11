import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, ChevronRight, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { useListingAverageRating } from '@/hooks/useReviews';
import { VerifiedBadgeImage } from '@/components/verification/VerificationBadge';
import { formatLastActive } from '@/hooks/useActivityTracker';

interface HostCardProps {
  hostId: string;
  listingId: string;
  hostName: string | null;
  hostAvatar?: string | null;
  isVerified?: boolean;
  memberSince?: string;
  lastActiveAt?: string | null;
  listingTitle?: string;
}

const HostCard = ({ 
  hostId,
  listingId,
  hostName, 
  hostAvatar, 
  isVerified = false,
  memberSince,
  lastActiveAt,
  listingTitle,
}: HostCardProps) => {
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Meet your host</h2>
      
      {/* Host Profile Card */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Left: Avatar & Quick Stats */}
        <Link 
          to={profileLink} 
          className="flex-shrink-0 group"
        >
          <div className="relative">
            <Avatar className="h-24 w-24 transition-transform group-hover:scale-105 border-4 border-background shadow-lg">
              <AvatarImage src={hostAvatar || undefined} alt={hostName || 'Host'} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
                <VerifiedBadgeImage size="lg" />
              </div>
            )}
          </div>
        </Link>

        {/* Right: Info & Stats */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <Link 
              to={profileLink}
              className="text-xl font-semibold text-foreground hover:underline underline-offset-2"
            >
              {hostName || 'Host'}
            </Link>
            {memberYear && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Hosting since {memberYear}
              </p>
            )}
            {lastActiveText && (
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Circle className={`h-2 w-2 ${isActiveNow ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground/50 text-muted-foreground/50'}`} />
                {lastActiveText}
              </p>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {ratingData?.average && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-foreground text-foreground" />
                <span className="font-medium">{ratingData.average.toFixed(1)}</span>
                <span className="text-muted-foreground">rating</span>
              </div>
            )}
            
            {ratingData?.count && ratingData.count > 0 && (
              <div className="text-muted-foreground">
                {ratingData.count} review{ratingData.count !== 1 ? 's' : ''}
              </div>
            )}

            {isVerified && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Identity verified</span>
              </div>
            )}

            {responseTimeData?.isFastResponder && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Fast responder</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Form & Profile Link */}
      <div className="space-y-3">
        <MessageHostForm 
          listingId={listingId}
          hostId={hostId}
          listingTitle={listingTitle}
        />
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
      </div>
    </div>
  );
};

export default HostCard;
