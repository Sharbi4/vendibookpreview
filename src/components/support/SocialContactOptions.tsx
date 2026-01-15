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
      <Button
        onClick={openZendeskChat}
        size="lg"
        className={`
          h-auto py-5 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 
          flex items-center gap-4 group
          ${isOnline 
            ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary' 
            : 'bg-gradient-to-r from-muted-foreground to-muted-foreground/90'
          }
        `}
      >
        <div className="relative">
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            ${isOnline ? 'bg-white/20' : 'bg-white/10'}
            group-hover:scale-105 transition-transform
          `}>
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          {/* Online/Offline pulse indicator */}
          <span 
            className={`
              absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white
              ${isOnline ? 'bg-green-400' : 'bg-gray-400'}
            `}
          >
            {isOnline && (
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
            )}
          </span>
        </div>
        <div className="text-left">
          <p className="font-bold text-white text-lg">Start Live Chat</p>
          <p className={`text-sm ${isOnline ? 'text-white/80' : 'text-white/60'}`}>
            {isOnline ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Online now • Avg. 2 min wait
              </span>
            ) : (
              'Leave a message • We\'ll reply soon'
            )}
          </p>
        </div>
      </Button>
    </div>
  );
};

export default SocialContactOptions;
