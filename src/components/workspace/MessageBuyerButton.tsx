import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MessageBuyerButtonProps {
  listingId: string;
  buyerId: string;
  className?: string;
  label?: string;
}

/**
 * Seller-side counterpart to MessageHostButton: the signed-in seller is the
 * host on the conversation and the buyer is the shopper.
 */
export default function MessageBuyerButton({
  listingId,
  buyerId,
  className = '',
  label = 'Message buyer',
}: MessageBuyerButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!user || user.id === buyerId) return;
    setIsLoading(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('host_id', user.id)
        .eq('shopper_id', buyerId)
        .maybeSingle();
      if (fetchError) throw fetchError;

      let conversationId = existing?.id as string | undefined;

      if (!conversationId) {
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({ listing_id: listingId, host_id: user.id, shopper_id: buyerId })
          .select('id')
          .single();
        if (createError) throw createError;
        conversationId = created.id as string;
      }

      navigate(`/dashboard/messages/${conversationId}`);
    } catch {
      toast({
        title: "We couldn't open that conversation",
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`v2-btn-outline v2-btn-sm ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
