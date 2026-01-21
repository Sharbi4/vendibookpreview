import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
      response 
    }: { 
      offerId: string; 
      status: 'accepted' | 'declined'; 
      response?: string;
    }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          status,
          seller_response: response || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('seller_id', user?.id);

      if (error) throw error;

      // Send email notification to buyer
      await supabase.functions.invoke('send-offer-notification', {
        body: {
          offer_id: offerId,
          event_type: status === 'accepted' ? 'offer_accepted' : 'offer_declined',
        },
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['host-offers'] });
      toast({
        title: status === 'accepted' ? 'Offer accepted!' : 'Offer declined',
        description: status === 'accepted' 
          ? 'The buyer will be notified to complete the purchase.'
          : 'The buyer has been notified.',
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
  const respondedOffers = offers.filter(o => o.status !== 'pending');

  return {
    offers,
    pendingOffers,
    respondedOffers,
    isLoading,
    refetch,
    respondToOffer: respondToOffer.mutate,
    isResponding: respondToOffer.isPending,
  };
};
