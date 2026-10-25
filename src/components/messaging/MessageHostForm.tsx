import { sendMarketplaceMessage, messageSendError } from '@/lib/messageSafety';
import './messaging.css';
import { useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import { trackHostContacted } from '@/lib/analytics';
import GuestRequestForm from './GuestRequestForm';

const DRAFT_KEY = 'listingMessageDraft';

interface MessageHostFormProps {
  listingId: string;
  hostId: string;
  listingTitle?: string;
  className?: string;
  /** Prefilled draft (e.g. written by Atlas); the buyer still reviews and sends. */
  initialMessage?: string;
}

const MessageHostForm = ({
  listingId,
  hostId,
  listingTitle,
  className = '',
  initialMessage,
}: MessageHostFormProps) => {
  const defaultMessage = listingTitle
    ? `Hi! I’m interested in "${listingTitle}". Could you share a video walkthrough here on Vendibook?`
    : "Hi! I’m interested in this listing. Could you share a video walkthrough here on Vendibook?";

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreateConversation } = useConversations();
  const [message, setMessage] = useState(() => {
    if (initialMessage?.trim()) return initialMessage.trim();
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      if (draft.listingId === listingId && draft.hostId === hostId && typeof draft.message === 'string') return draft.message;
    } catch { /* no saved draft */ }
    return defaultMessage;
  });
  const messageId = useId();
  const sending = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const goToAuth = () => {
    // Keep the edited request for the listing after sign-in. The buyer reviews
    // and sends it through the verified member messaging flow.
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      listingId,
      hostId,
      message: message.trim(),
    }));
    navigate(`/auth?redirect=${encodeURIComponent(`/listing/${listingId}`)}`);
  };

  const handleSend = async () => {
    if (!message.trim() || sending.current) return;
    sending.current = true;
    try {

      // A listing message must have a buyer account so it reaches the seller's
      // conversation inbox and its normal email notification.
      if (!user) {
        goToAuth();
        return;
      }

      // Don't allow messaging yourself
      if (user.id === hostId) {
        toast({
          title: 'Cannot message yourself',
          description: "This is your own listing.",
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);
      try {
        const conversationId = await getOrCreateConversation(listingId, hostId);
        if (conversationId) {
          // Send the message directly
          await sendMarketplaceMessage('conversation', conversationId, message.trim());
          sessionStorage.removeItem(DRAFT_KEY);

          trackHostContacted(listingId);
          toast({
            title: 'Message sent!',
            description: 'Your message is saved in the conversation.',
          });
          navigate(`/messages/${conversationId}`);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: 'Error',
          description: messageSendError(error),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    } finally {
      sending.current = false;
    }
  };

  if (!user) {
    return (
      <div className={className}>
        <GuestRequestForm listingId={listingId} hostId={hostId} kind="message" defaultMessage={message} />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label htmlFor={messageId} className="block text-sm font-medium">Your message</label>
      <p className="text-xs text-muted-foreground">Start with a video walkthrough request, or edit it to ask your own question.</p>
      <Textarea
        id={messageId}
        maxLength={5000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a message to the host..."
        rows={4}
        className="message-composer min-h-[132px] max-h-[280px] resize-y text-base leading-relaxed border-[1.5px] border-white/10 rounded-md p-4 align-top focus-visible:ring-primary/30"
        disabled={isLoading}
      />
      <p className="text-xs text-muted-foreground">Keep phone numbers and email addresses out of your message. Chat here on Vendibook.</p>
      <Button
        onClick={handleSend}
        disabled={isLoading || !message.trim()}
        variant="cta"
        className="w-full h-12"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <Send className="h-5 w-5 mr-2" />
        )}
        {user ? 'Send Message' : 'Sign in to message the seller'}
      </Button>
      {!user && (
        <p className="text-xs text-center text-muted-foreground">
          Your request goes to the seller’s Vendibook inbox and email after you sign in and send it.
        </p>
      )}
    </div>
  );
};

export default MessageHostForm;
