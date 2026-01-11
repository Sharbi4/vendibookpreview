import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const useBookingMessages = (bookingId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !bookingId) return;

    try {
      const { data, error } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, bookingId]);

  const sendMessage = async (messageText: string) => {
    if (!user || !bookingId || !messageText.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('booking_messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          message: messageText.trim(),
        });

      if (error) throw error;
      
      // Refetch messages after sending
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const markAsRead = async () => {
    if (!user || !bookingId) return;

    try {
      await supabase
        .from('booking_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`booking-messages-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as BookingMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const unreadCount = messages.filter(
    (m) => m.sender_id !== user?.id && !m.read_at
  ).length;

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    markAsRead,
    unreadCount,
    refetch: fetchMessages,
  };
};
