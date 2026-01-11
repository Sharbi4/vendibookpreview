import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { detectPII, PII_BLOCK_MESSAGE } from '@/lib/piiDetection';

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
  pii_blocked: boolean;
}

export interface ConversationDetails {
  id: string;
  listing_id: string | null;
  host_id: string;
  shopper_id: string;
  listing?: {
    title: string;
    cover_image_url: string | null;
  } | null;
  host?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  shopper?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useConversationMessages = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  const fetchConversation = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          listing:listings(title, cover_image_url)
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setIsAuthorized(false);
        }
        throw error;
      }

      // Check if user is participant
      if (data.host_id !== user.id && data.shopper_id !== user.id) {
        setIsAuthorized(false);
        return;
      }

      // Fetch profiles separately
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.host_id)
        .single();

      const { data: shopperProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.shopper_id)
        .single();

      setConversation({
        ...data,
        host: hostProfile,
        shopper: shopperProfile,
      } as ConversationDetails);
      setIsAuthorized(true);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setIsAuthorized(false);
    }
  }, [user, conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationId]);

  const sendMessage = async (messageText: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !conversationId || !messageText.trim()) {
      return { success: false, error: 'Invalid message' };
    }

    // Check for PII
    const piiResult = detectPII(messageText);
    if (piiResult.hasPII) {
      return { success: false, error: PII_BLOCK_MESSAGE };
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message: messageText.trim(),
        });

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      return { success: false, error: 'Failed to send message' };
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async () => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from('conversation_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchConversation();
    fetchMessages();
  }, [fetchConversation, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ConversationMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const otherParty = conversation
    ? user?.id === conversation.host_id
      ? conversation.shopper
      : conversation.host
    : null;

  return {
    messages,
    conversation,
    otherParty,
    isLoading,
    isSending,
    isAuthorized,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
  };
};
