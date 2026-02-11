import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }

    try {
      // Get all conversations user is part of
      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .or(`host_id.eq.${user.id},shopper_id.eq.${user.id}`);

      if (!convos || convos.length === 0) {
        setCount(0);
        return;
      }

      const convoIds = convos.map(c => c.id);

      // Count unread messages across all conversations
      const { count: unreadCount } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convoIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      setCount(unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-message-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== user.id) {
            setCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_messages',
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          // If read_at was null and is now set, decrement
          if (!old.read_at && updated.read_at && updated.sender_id !== user.id) {
            setCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { count, refetch: fetchCount };
};
