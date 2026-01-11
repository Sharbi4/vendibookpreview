import { ShieldCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HostCardProps {
  hostName: string | null;
  hostAvatar?: string | null;
  isVerified?: boolean;
  memberSince?: string;
  onContact: () => void;
}

const HostCard = ({ 
  hostName, 
  hostAvatar, 
  isVerified = false,
  memberSince,
  onContact 
}: HostCardProps) => {
  const initials = hostName 
    ? hostName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'H';

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold text-foreground mb-4">Hosted by</h3>
      
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={hostAvatar || undefined} alt={hostName || 'Host'} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-lg">
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
      </div>

      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-4">
          <ShieldCheck className="h-4 w-4" />
          <span>Identity verified</span>
        </div>
      )}

      <Button 
        variant="outline" 
        className="w-full"
        onClick={onContact}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Contact Host
      </Button>
    </div>
  );
};

export default HostCard;
