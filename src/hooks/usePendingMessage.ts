import { sendMarketplaceMessage, messageSendError } from '@/lib/messageSafety';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackHostContacted } from '@/lib/analytics';

/**
 * Processes any pending message stored in sessionStorage after user signs in.
 * Should be mounted once at the app level.
 */
export const usePendingMessage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getOrCreateConversation } = useConversations();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const pending = sessionStorage.getItem('pendingMessage');
    if (!pending) return;

    // Clear immediately to prevent double-send
    sessionStorage.removeItem('pendingMessage');

    const sendPending = async () => {
      try {
        const { listingId, hostId, message } = JSON.parse(pending);

        if (user.id === hostId) return;

        const conversationId = await getOrCreateConversation(listingId, hostId);
        if (!conversationId) return;

        await sendMarketplaceMessage('conversation', conversationId, message);

        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        trackHostContacted(listingId);
        toast({
          title: 'Message sent!',
          description: 'Your message was sent to the host.',
        });
        navigate(`/messages/${conversationId}`);
      } catch (err) {
        console.error('Failed to send pending message:', err);
        toast({
          title: 'Error',
          description: messageSendError(err),
          variant: 'destructive',
        });
      }
    };

    sendPending();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
};
