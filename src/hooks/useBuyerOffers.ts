import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
      const { error } = await supabase
        .from('offers')
        .update({ status: 'cancelled' })
        .eq('id', offerId)
        .eq('buyer_id', user?.id)
        .eq('status', 'pending');

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

  const pendingOffers = offers.filter(o => o.status === 'pending');
  const acceptedOffers = offers.filter(o => o.status === 'accepted');
  const declinedOffers = offers.filter(o => o.status === 'declined');
  const expiredOffers = offers.filter(o => o.status === 'expired');

  const stats = {
    total: offers.length,
    pending: pendingOffers.length,
    accepted: acceptedOffers.length,
    declined: declinedOffers.length,
  };

  return {
    offers,
    pendingOffers,
    acceptedOffers,
    declinedOffers,
    expiredOffers,
    stats,
    isLoading,
    refetch,
    cancelOffer: cancelOffer.mutate,
    isCancelling: cancelOffer.isPending,
  };
};
