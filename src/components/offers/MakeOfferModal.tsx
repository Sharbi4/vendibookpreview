import { useSaleActionState } from '@/hooks/useSaleActionState';
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Send, Tag, Loader2, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { OFFER_TERMS_TEXT, OFFER_TERMS_VERSION, OFFER_EXPIRY_HOURS, offerErrorMessage } from '@/lib/offers/offerTerms';

interface MakeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  sellerId: string;
  listingTitle: string;
  askingPrice: number;
  onOfferSent?: () => void;
  /** Prefill (e.g. drafted by Atlas); the buyer still reviews and sends. */
  initialAmount?: number;
  initialMessage?: string;
}

export const MakeOfferModal = ({
  open,
  onOpenChange,
  listingId,
  sellerId,
  listingTitle,
  askingPrice,
  onOfferSent,
  initialAmount,
  initialMessage,
}: MakeOfferModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const eligibility = useSaleActionState(open ? listingId : undefined);
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'amount' | 'review'>('amount');
  const [acknowledged, setAcknowledged] = useState(false);

  const submitting = useRef(false);
  useEffect(() => { if (!open) { setStep('amount'); setAcknowledged(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    if (initialAmount && initialAmount > 0) setOfferAmount(String(Math.round(initialAmount)));
    if (initialMessage) setMessage(initialMessage);
  }, [open, initialAmount, initialMessage]);

  // Check if user is the owner of this listing
  const isOwner = user?.id === sellerId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || submitting.current || !eligibility.canOffer) return;
    
    // Prevent owners from making offers on their own listings
    if (isOwner) {
      toast({
        title: 'Cannot make offer',
        description: 'You cannot make an offer on your own listing.',
        variant: 'destructive',
      });
      return;
    }
    
    const amount = parseFloat(offerAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount < eligibility.minimumOffer || amount > 10000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
      toast({
        title: 'Invalid amount',
        description: eligibility.minimumOffer > 0 ? `Enter an offer of at least ${eligibility.minimumOffer.toLocaleString()}.` : 'Please enter a valid offer amount.',
        variant: 'destructive',
      });
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);

    try {
      if (step === 'amount') { setStep('review'); setAcknowledged(false); setIsSubmitting(false); return; }
      if (!acknowledged) { setIsSubmitting(false); return; }
      // Server verifies the acknowledgment text/version and records it with the offer.
      const { data: offerId, error: offerError } = await supabase.rpc('submit_offer' as never, {
        p_listing_id: listingId, p_amount: Math.round(amount * 100) / 100, p_message: message.trim() || null,
        p_terms_version: OFFER_TERMS_VERSION, p_terms_text: OFFER_TERMS_TEXT, p_acknowledged: true,
      } as never);
      if (offerError) throw offerError;
      const offer = { id: offerId as unknown as string };

      // Send email notification to seller
      void supabase.functions.invoke('send-offer-notification', {
        body: {
          offer_id: offer.id,
          event_type: 'new_offer',
        },
      }).catch(error => console.warn('Offer email will retry', error));

      toast({
        title: 'Offer sent',
        description: 'Nothing has been charged. The seller can accept, decline or counter.',
      });

      setOfferAmount('');
      setMessage('');
      setStep('amount');
      setAcknowledged(false);
      onOpenChange(false);
      onOfferSent?.();
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast({
        title: 'Failed to send offer',
        description: offerErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const suggestedOffers = [
    Math.round(askingPrice * 0.9),
    Math.round(askingPrice * 0.85),
    Math.round(askingPrice * 0.8),
  ].filter(amount => amount >= eligibility.minimumOffer);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setStep('amount'); setAcknowledged(false); } onOpenChange(o); }}>
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
          {eligibility.isError ? <p role="alert">Unable to check offer availability. <button type="button" className="underline" onClick={()=>void eligibility.refetch()}>Try again</button></p> : eligibility.isLoading ? <p role="status">Checking availability…</p> : !eligibility.canOffer ? <p role="status">This listing is not accepting offers right now.</p> : null}
          {eligibility.minimumOffer > 0 && <p className="text-sm text-muted-foreground">Minimum offer: ${eligibility.minimumOffer.toLocaleString()}</p>}
          {step === 'review' ? <>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Your offer for "{listingTitle}"</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">${Number(offerAmount).toLocaleString()}</p>
              {message.trim() && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">"{message.trim()}"</p>}
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Checkbox id="offer-ack" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} aria-describedby="offer-ack-text" className="mt-0.5" />
              <Label htmlFor="offer-ack" id="offer-ack-text" className="text-sm font-normal leading-relaxed text-foreground">{OFFER_TERMS_TEXT}</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              See the <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>, <Link to="/legal/payments-terms" target="_blank" className="text-primary underline">Payments Terms</Link> and <Link to="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>. If the seller doesn't respond within {OFFER_EXPIRY_HOURS} hours, the offer expires.
            </p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('amount')}><ArrowLeft className="h-4 w-4 mr-2" />Edit offer</Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || !acknowledged || !eligibility.canOffer}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Send offer
              </Button>
            </div>
          </> : <>
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
                min={Math.max(0.01,eligibility.minimumOffer)}
                max="10000000"
                step="0.01"
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
              maxLength={1000}
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
              disabled={!offerAmount || isSubmitting || !eligibility.canOffer}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Review offer
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Offer expires in 48 hours if not responded to. You won't be charged.
          </p>
          </>}
        </form>
      </DialogContent>
    </Dialog>
  );
};
