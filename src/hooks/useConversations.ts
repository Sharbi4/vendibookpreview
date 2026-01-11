import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  listing_id: string | null;
  host_id: string;
  shopper_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
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
  last_message?: {
    message: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count?: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch conversations with related data
      const { data: convos, error } = await supabase
        .from('conversations')
        .select(`
          *,
          listing:listings(title, cover_image_url)
        `)
        .or(`host_id.eq.${user.id},shopper_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch profile data separately for each conversation
      const enrichedConversations = await Promise.all(
        (convos || []).map(async (convo) => {
          // Get host profile
          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', convo.host_id)
            .single();

          // Get shopper profile
          const { data: shopperProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', convo.shopper_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('conversation_messages')
            .select('message, created_at, sender_id')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from('conversation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...convo,
            host: hostProfile,
            shopper: shopperProfile,
            last_message: lastMessage || null,
            unread_count: count || 0,
          } as Conversation;
        })
      );

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const getOrCreateConversation = useCallback(
    async (listingId: string, hostId: string): Promise<string | null> => {
      if (!user) return null;

      try {
        // Check if conversation exists
        const { data: existing, error: fetchError } = await supabase
          .from('conversations')
          .select('id')
          .eq('listing_id', listingId)
          .eq('host_id', hostId)
          .eq('shopper_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          return existing.id;
        }

        // Create new conversation
        const { data: newConvo, error: createError } = await supabase
          .from('conversations')
          .insert({
            listing_id: listingId,
            host_id: hostId,
            shopper_id: user.id,
          })
          .select('id')
          .single();

        if (createError) throw createError;

        return newConvo.id;
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: 'Error',
          description: 'Failed to start conversation.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    refetch: fetchConversations,
    getOrCreateConversation,
  };
};
