import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';
import { playNotificationSound } from '@/lib/notificationSound';

export interface HostOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  offer_amount: number;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  responded_at: string | null;
  seller_response: string | null;
  counter_amount: number | null;
  counter_message: string | null;
  counter_expires_at: string | null;
  listing: {
    id: string;
    title: string;
    cover_image_url: string | null;
    price_sale: number | null;
  };
  buyer: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export const useHostOffers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading, refetch } = useQuery({
    queryKey: ['host-offers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          listing:listings(id, title, cover_image_url, price_sale)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch buyer profiles separately using the RPC
      const offersWithBuyers = await Promise.all(
        (data || []).map(async (offer) => {
          const { data: buyerData } = await supabase
            .rpc('get_safe_host_profile', { host_user_id: offer.buyer_id });
          
          // buyerData is an array, get first element
          const buyerProfile = Array.isArray(buyerData) ? buyerData[0] : buyerData;
          
          return {
            ...offer,
            buyer: buyerProfile ? {
              id: buyerProfile.id,
              full_name: buyerProfile.full_name,
              avatar_url: buyerProfile.avatar_url,
              email: null,
            } : {
              id: offer.buyer_id,
              full_name: 'Unknown User',
              avatar_url: null,
              email: null,
            },
          };
        })
      );

      return offersWithBuyers as HostOffer[];
    },
    enabled: !!user,
  });

  const respondToOffer = useMutation({
    mutationFn: async ({ 
      offerId, 
      status, 
      response,
      counterAmount,
      counterMessage,
    }: { 
      offerId: string; 
      status: 'accepted' | 'declined' | 'countered'; 
      response?: string;
      counterAmount?: number;
      counterMessage?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        seller_response: response || null,
        responded_at: new Date().toISOString(),
      };

      // Add counter-offer fields if countering
      if (status === 'countered' && counterAmount) {
        updateData.counter_amount = counterAmount;
        updateData.counter_message = counterMessage || null;
        updateData.counter_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from('offers')
        .update(updateData)
        .eq('id', offerId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      // Send email notification to buyer
      const eventType = status === 'countered' ? 'counter_offer' : 
                        status === 'accepted' ? 'offer_accepted' : 'offer_declined';
      
      await supabase.functions.invoke('send-offer-notification', {
        body: {
          offer_id: offerId,
          event_type: eventType,
        },
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['host-offers'] });
      const messages = {
        accepted: { title: 'Offer accepted!', desc: 'The buyer will be notified to complete the purchase.' },
        declined: { title: 'Offer declined', desc: 'The buyer has been notified.' },
        countered: { title: 'Counter-offer sent!', desc: 'The buyer has 48 hours to respond.' },
      };
      toast({
        title: messages[status].title,
        description: messages[status].desc,
      });
    },
    onError: (error) => {
      console.error('Error responding to offer:', error);
      toast({
        title: 'Failed to respond',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const pendingOffers = offers.filter(o => o.status === 'pending');
  const counteredOffers = offers.filter(o => o.status === 'countered');
  const respondedOffers = offers.filter(o => !['pending', 'countered'].includes(o.status));

  // Track initial load to avoid sound on first render
  const isInitialLoad = useRef(true);

  // Subscribe to realtime updates with notification sound
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('host-offers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          // Play sound for new offers (not on initial load)
          if (!isInitialLoad.current) {
            playNotificationSound();
            toast({
              title: 'New Offer Received! 💰',
              description: `You received a $${(payload.new as { offer_amount: number }).offer_amount.toLocaleString()} offer`,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['host-offers', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['host-offers', user.id] });
        }
      )
      .subscribe();

    // Mark initial load as complete after a short delay
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);

  return {
    offers,
    pendingOffers,
    counteredOffers,
    respondedOffers,
    isLoading,
    refetch,
    respondToOffer: respondToOffer.mutate,
    isResponding: respondToOffer.isPending,
  };
};
