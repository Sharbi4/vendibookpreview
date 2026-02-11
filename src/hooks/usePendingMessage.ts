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

        const { error } = await supabase
          .from('conversation_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message,
          });

        if (error) throw error;

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
          description: 'Failed to send your message. Please try again from the listing.',
          variant: 'destructive',
        });
      }
    };

    sendPending();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
};
