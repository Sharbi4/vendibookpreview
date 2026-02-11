import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useTypingIndicator = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [otherTypingName, setOtherTypingName] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    if (!conversationId || !user) return;
    
    const now = Date.now();
    // Throttle to once every 2 seconds
    if (now - lastBroadcastRef.current < 2000) return;
    lastBroadcastRef.current = now;

    const channel = supabase.channel(`typing-${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, user_name: 'typing' },
    });
  }, [conversationId, user]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: user.id },
    });
  }, [conversationId, user]);

  // Listen for typing events from others
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId && senderId !== user.id) {
          setIsOtherTyping(true);
          setOtherTypingName(payload.payload?.user_name || null);
          
          // Clear previous timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Auto-hide after 3 seconds of no typing
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
            setOtherTypingName(null);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId && senderId !== user.id) {
          setIsOtherTyping(false);
          setOtherTypingName(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user]);

  return {
    isOtherTyping,
    otherTypingName,
    broadcastTyping,
    stopTyping,
  };
};
