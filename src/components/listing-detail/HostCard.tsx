import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MessageHostButton from '@/components/messaging/MessageHostButton';
import VerificationBadge from '@/components/verification/VerificationBadge';

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
  const initials = hostName 
    ? hostName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'H';

  const profileLink = hostId ? `/profile/${hostId}` : '#';

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold text-foreground mb-4">Hosted by</h3>
      
      <Link to={profileLink} className="flex items-center gap-4 mb-4 group">
        <div className="relative">
          <Avatar className="h-16 w-16 transition-transform group-hover:scale-105">
            <AvatarImage src={hostAvatar || undefined} alt={hostName || 'Host'} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-background rounded-full p-0.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
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

      {/* Verification Badge Card */}
      <div className="mb-4">
        <VerificationBadge isVerified={isVerified} variant="card" />
      </div>

      <div className="flex gap-2">
        {/* Message button demoted to ghost variant to emphasize primary booking CTA */}
        <MessageHostButton 
          listingId={listingId}
          hostId={hostId}
          variant="ghost"
          className="flex-1 text-muted-foreground hover:text-foreground"
        />
        <Button 
          variant="ghost" 
          size="icon"
          asChild
        >
          <Link to={profileLink}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default HostCard;
