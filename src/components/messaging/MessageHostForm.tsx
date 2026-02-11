import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import { trackHostContacted } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

interface MessageHostFormProps {
  listingId: string;
  hostId: string;
  listingTitle?: string;
  className?: string;
}

const MessageHostForm = ({
  listingId,
  hostId,
  listingTitle,
  className = '',
}: MessageHostFormProps) => {
  const defaultMessage = listingTitle
    ? `Hi! I'd like to learn more about "${listingTitle}" and set up a time to see it.`
    : "Hi! I'd like to set up a time to see this.";

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOrCreateConversation } = useConversations();
  const [message, setMessage] = useState(defaultMessage);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    // If not logged in, save intent and redirect to auth
    if (!user) {
      // Store the pending message in sessionStorage so we can send it after auth
      sessionStorage.setItem('pendingMessage', JSON.stringify({
        listingId,
        hostId,
        message: message.trim(),
      }));
      toast({
        title: 'Sign in required',
        description: 'Please sign in to message the host. Your message will be sent automatically.',
      });
      navigate('/auth', { state: { from: `/listing/${listingId}`, pendingMessage: true } });
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
        const { error } = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message: message.trim(),
          });

        if (error) throw error;

        // Update conversation last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        trackHostContacted(listingId);
        toast({
          title: 'Message sent!',
          description: 'The host has been notified.',
        });
        navigate(`/messages/${conversationId}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a message to the host..."
        className="min-h-[80px] resize-none text-sm bg-background border-border focus-visible:ring-primary/30"
        disabled={isLoading}
      />
      <Button
        onClick={handleSend}
        disabled={isLoading || !message.trim()}
        className="w-full h-11 font-medium"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Send Message
      </Button>
    </div>
  );
};

export default MessageHostForm;
