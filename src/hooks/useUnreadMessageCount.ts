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
          const newMsg = payload.new as { sender_id?: string };
          // Re-count under RLS instead of incrementing: the event stream is not
          // scoped to this user's conversations, so +1 could count other people's mail.
          if (newMsg.sender_id !== user.id) void fetchCount();
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
          const updated = payload.new as { sender_id?: string };
          // A message was marked read (or edited): re-count so the unread dot
          // clears exactly when the real count reaches 0.
          if (updated.sender_id !== user.id) void fetchCount();
        }
      )
      .subscribe();

    // Messages read in another tab or on another device.
    const onFocus = () => { void fetchCount(); };
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return { count, refetch: fetchCount };
};
