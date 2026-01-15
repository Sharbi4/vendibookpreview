import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

const SocialContactOptions = () => {
  const openZendeskChat = () => {
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
  };

  // Check if within business hours (EST timezone)
  // Monday - Friday: 9am - 6pm EST
  // Saturday: 10am - 4pm EST
  const isOnline = useMemo(() => {
    const now = new Date();
    
    // Convert to EST (UTC-5, or UTC-4 during DST)
    const estOffset = -5; // Standard EST offset
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const estHours = (utcHours + estOffset + 24) % 24;
    
    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = now.getUTCDay();
    // Adjust for EST timezone - if we're past midnight UTC but before 5am UTC, we're still in previous day EST
    const estDay = utcHours < Math.abs(estOffset) ? (dayOfWeek + 6) % 7 : dayOfWeek;
    
    // Sunday (0) - Closed
    if (estDay === 0) return false;
    
    // Saturday (6) - 10am to 4pm EST
    if (estDay === 6) {
      return estHours >= 10 && estHours < 16;
    }
    
    // Monday-Friday (1-5) - 9am to 6pm EST
    return estHours >= 9 && estHours < 18;
  }, []);

  return (
    <div className="flex justify-center">
      {/* Live Chat */}
      <Button
        onClick={openZendeskChat}
        variant="outline"
        className="h-auto py-4 px-8 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50 relative"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center relative">
          <MessageCircle className="h-6 w-6" />
          {/* Online/Offline indicator */}
          <span 
            className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
              isOnline ? 'bg-green-500' : 'bg-muted-foreground'
            }`}
            title={isOnline ? 'Online' : 'Offline'}
          />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Live Chat</p>
          <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-muted-foreground'}`}>
            {isOnline ? 'Online now' : 'Leave a message'}
          </p>
        </div>
      </Button>
    </div>
  );
};

export default SocialContactOptions;
