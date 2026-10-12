import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef } from 'react';
import { playNotificationSound } from '@/lib/notificationSound';

export interface BuyerOffer {
  id: string;
  listing_id: string;
  seller_id: string;
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
}

export const useBuyerOffers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading, refetch } = useQuery({
    queryKey: ['buyer-offers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          listing:listings(id, title, cover_image_url, price_sale)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BuyerOffer[];
    },
    enabled: !!user,
  });

  const cancelOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase.rpc('respond_to_offer' as never, { p_offer_id: offerId, p_action: 'cancel' } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-offers'] });
      toast({
        title: 'Offer cancelled',
        description: 'Your offer has been withdrawn.',
      });
    },
    onError: (error) => {
      console.error('Error cancelling offer:', error);
      toast({
        title: 'Failed to cancel',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const respondToCounter = useMutation({
    mutationFn: async ({ 
      offerId, 
      action 
    }: { 
      offerId: string; 
      action: 'accept' | 'decline';
    }) => {
      // Server locks the row, checks expiry and snapshots the agreed price.
      const { data: result, error } = await supabase.rpc('respond_to_offer' as never, { p_offer_id: offerId, p_action: action } as never);
      if (error) throw error;
      if (result === 'expired') throw new Error('This counteroffer has expired.');

      // Notify seller
      await supabase.functions.invoke('send-offer-notification', {
        body: {
          offer_id: offerId,
          event_type: action === 'accept' ? 'counter_accepted' : 'counter_declined',
        },
      });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['buyer-offers'] });
      toast({
        title: action === 'accept' ? 'Counter-offer accepted!' : 'Counter-offer declined',
        description: action === 'accept' 
          ? 'Price agreed. Nothing has been charged — an itemized invoice comes next.'
          : 'The seller has been notified.',
      });
    },
    onError: (error) => {
      console.error('Error responding to counter:', error);
      toast({
        title: 'Failed to respond',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const pendingOffers = offers.filter(o => o.status === 'pending');
  const counteredOffers = offers.filter(o => o.status === 'countered');
  const acceptedOffers = offers.filter(o => o.status === 'accepted');
  const purchasedOffers = offers.filter(o => o.status === 'purchased');
  const declinedOffers = offers.filter(o => o.status === 'declined');
  const expiredOffers = offers.filter(o => o.status === 'expired');

  const stats = {
    total: offers.length,
    pending: pendingOffers.length,
    countered: counteredOffers.length,
    accepted: acceptedOffers.length,
    purchased: purchasedOffers.length,
    declined: declinedOffers.length,
  };

  // Track initial load to avoid sound on first render
  const isInitialLoad = useRef(true);

  // Subscribe to realtime updates with notification sound
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('buyer-offers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `buyer_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          const oldStatus = (payload.old as { status: string }).status;
          
          // Play sound when status changes (seller responded)
          if (!isInitialLoad.current && newStatus !== oldStatus) {
            if (newStatus === 'accepted') {
              playNotificationSound();
              toast({
                title: 'Offer Accepted! 🎉',
                description: 'Your offer has been accepted. Complete your purchase now!',
              });
            } else if (newStatus === 'countered') {
              playNotificationSound();
              const counterAmount = (payload.new as { counter_amount: number }).counter_amount;
              toast({
                title: 'Counter-Offer Received! 💬',
                description: `The seller proposed $${counterAmount?.toLocaleString() || ''}`,
              });
            } else if (newStatus === 'declined') {
              playNotificationSound();
              toast({
                title: 'Offer Declined',
                description: 'The seller has declined your offer.',
                variant: 'destructive',
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: ['buyer-offers', user.id] });
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
    acceptedOffers,
    purchasedOffers,
    declinedOffers,
    expiredOffers,
    stats,
    isLoading,
    refetch,
    cancelOffer: cancelOffer.mutate,
    isCancelling: cancelOffer.isPending,
    respondToCounter: respondToCounter.mutate,
    isRespondingToCounter: respondToCounter.isPending,
  };
};
