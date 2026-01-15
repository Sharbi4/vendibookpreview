import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="flex justify-center">
      {/* Live Chat */}
      <Button
        onClick={openZendeskChat}
        variant="outline"
        className="h-auto py-4 px-8 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Live Chat</p>
          <p className="text-xs text-muted-foreground">Chat with us now</p>
        </div>
      </Button>
    </div>
  );
};

export default SocialContactOptions;
