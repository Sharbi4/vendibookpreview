import { Link } from 'react-router-dom';
import { ShieldCheck, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HostCardProps {
  hostId?: string;
  hostName: string | null;
  hostAvatar?: string | null;
  isVerified?: boolean;
  memberSince?: string;
  onContact: () => void;
}

const HostCard = ({ 
  hostId,
  hostName, 
  hostAvatar, 
  isVerified = false,
  memberSince,
  onContact 
}: HostCardProps) => {
  const initials = hostName 
    ? hostName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'H';

  const profileLink = hostId ? `/profile/${hostId}` : '#';

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold text-foreground mb-4">Hosted by</h3>
      
      <Link to={profileLink} className="flex items-center gap-4 mb-4 group">
        <Avatar className="h-16 w-16 transition-transform group-hover:scale-105">
          <AvatarImage src={hostAvatar || undefined} alt={hostName || 'Host'} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors">
              {hostName || 'Host'}
            </span>
            {isVerified && (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          {memberSince && (
            <p className="text-sm text-muted-foreground">
              Member since {new Date(memberSince).getFullYear()}
            </p>
          )}
        </div>
      </Link>

      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-4">
          <ShieldCheck className="h-4 w-4" />
          <span>Identity verified</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onContact}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact
        </Button>
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
