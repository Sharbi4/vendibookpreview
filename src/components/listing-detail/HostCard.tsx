import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import MessageHostButton from '@/components/messaging/MessageHostButton';
import { useHostResponseTime } from '@/hooks/useHostResponseTime';
import { useListingAverageRating } from '@/hooks/useReviews';
import { getDisplayInitials } from '@/lib/displayName';
import { VerifiedBadgeImage } from '@/components/verification/VerificationBadge';

interface HostCardProps {
  hostId: string;
  listingId: string;
  hostName: string | null;
  hostAvatar?: string | null;
  isVerified?: boolean;
  memberSince?: string;
}

const HostCard = ({ 
  hostId,
  listingId,
  hostName, 
  hostAvatar, 
  isVerified = false,
  memberSince,
}: HostCardProps) => {
  // Generate initials from the display name
  const initials = hostName 
    ? hostName.replace(/\.$/, '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'H';

  // Include listing context in profile link for messaging
  const profileLink = hostId ? `/u/${hostId}?from_listing=${listingId}` : '#';
  const { data: responseTimeData } = useHostResponseTime(hostId);
  const { data: ratingData } = useListingAverageRating(listingId);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold text-foreground mb-4">About the Host</h3>
      
      <Link to={profileLink} className="flex items-center gap-4 mb-4 group">
        <div className="relative">
          <Avatar className="h-16 w-16 transition-transform group-hover:scale-105">
            <AvatarImage src={hostAvatar || undefined} alt={hostName || 'Host'} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isVerified && (
            <div className="absolute -bottom-1 -right-1">
              <VerifiedBadgeImage size="lg" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors truncate">
              {hostName || 'Host'}
            </span>
          </div>
          {memberSince && (
            <p className="text-sm text-muted-foreground">
              Member since {new Date(memberSince).getFullYear()}
            </p>
          )}
        </div>
      </Link>

      {/* Trust Badges Row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {isVerified && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 gap-1">
            <VerifiedBadgeImage size="sm" />
            Verified ID
          </Badge>
        )}
        {responseTimeData?.isFastResponder && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-500/50 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20">
            <Clock className="h-3 w-3 mr-0.5" />
            Fast Responder
          </Badge>
        )}
        {ratingData?.average && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
            <Star className="h-3 w-3 mr-0.5 fill-amber-500" />
            {ratingData.average.toFixed(1)}
          </Badge>
        )}
      </div>

      {/* Trust mini-row */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>{isVerified ? 'Verified Host' : 'Host'}</span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Secure Payments</span>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Message button */}
        <MessageHostButton 
          listingId={listingId}
          hostId={hostId}
          variant="outline"
          className="flex-1"
          label="Message Host"
        />
        {/* View Profile button */}
        <Button 
          variant="ghost" 
          size="sm"
          asChild
          className="gap-1"
        >
          <Link to={profileLink}>
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">View Host Profile</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default HostCard;
