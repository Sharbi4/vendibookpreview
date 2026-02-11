import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export const useMessageReactions = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Map<string, MessageReaction[]>>(new Map());

  const fetchReactions = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      // Get all message IDs in this conversation
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('conversation_id', conversationId);

      if (!messages || messages.length === 0) return;

      const messageIds = messages.map(m => m.id);

      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (error) throw error;

      const grouped = new Map<string, MessageReaction[]>();
      (data || []).forEach((r: any) => {
        const existing = grouped.get(r.message_id) || [];
        existing.push(r);
        grouped.set(r.message_id, existing);
      });
      setReactions(grouped);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Realtime subscription for reactions
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          // Refetch all reactions on any change
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchReactions]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const messageReactions = reactions.get(messageId) || [];
    const existing = messageReactions.find(
      r => r.user_id === user.id && r.emoji === emoji
    );

    try {
      if (existing) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const getReactionSummary = (messageId: string): ReactionSummary[] => {
    const messageReactions = reactions.get(messageId) || [];
    const emojiMap = new Map<string, { count: number; hasReacted: boolean }>();
    
    messageReactions.forEach(r => {
      const existing = emojiMap.get(r.emoji) || { count: 0, hasReacted: false };
      existing.count++;
      if (r.user_id === user?.id) existing.hasReacted = true;
      emojiMap.set(r.emoji, existing);
    });

    return Array.from(emojiMap.entries()).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  };

  return { reactions, toggleReaction, getReactionSummary };
};
