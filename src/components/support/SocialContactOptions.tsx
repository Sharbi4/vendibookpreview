import { MessageCircle, Phone, MessageSquare } from 'lucide-react';
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

  const openWhatsApp = () => {
    // Using WhatsApp Business API link format
    const phone = '18778836342'; // Vendibook phone
    const message = encodeURIComponent('Hi, I have a question about Vendibook.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const openSMS = () => {
    const phone = '+18778836342';
    const message = encodeURIComponent('Hi, I need help with Vendibook.');
    // SMS link format works on both mobile and some desktops
    window.location.href = `sms:${phone}?body=${message}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Live Chat */}
      <Button
        onClick={openZendeskChat}
        variant="outline"
        className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Live Chat</p>
          <p className="text-xs text-muted-foreground">Chat with us now</p>
        </div>
      </Button>

      {/* WhatsApp */}
      <Button
        onClick={openWhatsApp}
        variant="outline"
        className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-500/5 hover:border-green-500/50"
      >
        <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 fill-current"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">WhatsApp</p>
          <p className="text-xs text-muted-foreground">Message us</p>
        </div>
      </Button>

      {/* SMS */}
      <Button
        onClick={openSMS}
        variant="outline"
        className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-500/5 hover:border-blue-500/50"
      >
        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Text Us</p>
          <p className="text-xs text-muted-foreground">Send an SMS</p>
        </div>
      </Button>
    </div>
  );
};

export default SocialContactOptions;
