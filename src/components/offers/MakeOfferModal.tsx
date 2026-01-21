import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Send, Tag, Loader2 } from 'lucide-react';

interface MakeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  sellerId: string;
  listingTitle: string;
  askingPrice: number;
  onOfferSent?: () => void;
}

export const MakeOfferModal = ({
  open,
  onOpenChange,
  listingId,
  sellerId,
  listingTitle,
  askingPrice,
  onOfferSent,
}: MakeOfferModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid offer amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the offer
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .insert({
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          offer_amount: amount,
          message: message.trim() || null,
        })
        .select()
        .single();

      if (offerError) throw offerError;

      // Create in-app notification for seller
      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'offer',
        title: 'New Offer Received! 💰',
        message: `You received a $${amount.toLocaleString()} offer for "${listingTitle}"`,
        link: '/dashboard',
      });

      // Send email notification to seller
      await supabase.functions.invoke('send-offer-notification', {
        body: {
          offer_id: offer.id,
          event_type: 'new_offer',
        },
      });

      toast({
        title: 'Offer sent!',
        description: 'The seller will be notified of your offer.',
      });

      setOfferAmount('');
      setMessage('');
      onOpenChange(false);
      onOfferSent?.();
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast({
        title: 'Failed to send offer',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedOffers = [
    Math.round(askingPrice * 0.9),
    Math.round(askingPrice * 0.85),
    Math.round(askingPrice * 0.8),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Make an Offer
          </DialogTitle>
          <DialogDescription>
            Submit your offer for "{listingTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Asking Price</span>
              <span className="font-semibold text-foreground">
                ${askingPrice.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offerAmount">Your Offer</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="offerAmount"
                type="number"
                placeholder="Enter amount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="pl-9"
                min="1"
                step="1"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {suggestedOffers.map((amount) => (
              <Button
                key={amount}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOfferAmount(amount.toString())}
                className="text-xs"
              >
                ${amount.toLocaleString()}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to the seller..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !offerAmount}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Offer
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Offer expires in 48 hours if not responded to
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
