import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Tag, Check, X, Clock, Loader2, MessageSquare, DollarSign, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useHostOffers, HostOffer } from '@/hooks/useHostOffers';

interface OfferCardProps {
  offer: HostOffer;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string, response?: string) => void;
  onCounter: (offerId: string, amount: number, message?: string) => void;
  isResponding: boolean;
}

const OfferCard = ({ offer, onAccept, onDecline, onCounter, isResponding }: OfferCardProps) => {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  
  const isPending = offer.status === 'pending';
  const isCountered = offer.status === 'countered';
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date() && isPending;
  const percentOfAsking = offer.listing.price_sale 
    ? Math.round((offer.offer_amount / offer.listing.price_sale) * 100)
    : null;

  const handleDecline = () => {
    onDecline(offer.id, declineReason);
    setShowDeclineModal(false);
    setDeclineReason('');
  };

  const handleCounter = () => {
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) return;
    onCounter(offer.id, amount, counterMessage);
    setShowCounterModal(false);
    setCounterAmount('');
    setCounterMessage('');
  };

  const openCounterModal = () => {
    // Pre-fill with a suggested counter (midpoint between offer and asking)
    if (offer.listing.price_sale) {
      const suggested = Math.round((offer.offer_amount + offer.listing.price_sale) / 2);
      setCounterAmount(suggested.toString());
    }
    setShowCounterModal(true);
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
    }
    switch (offer.status) {
      case 'accepted':
        return <Badge className="bg-emerald-500 text-white">Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="text-destructive border-destructive">Declined</Badge>;
      case 'countered':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-500">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Countered
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Listing Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {offer.listing.cover_image_url ? (
                <img 
                  src={offer.listing.cover_image_url} 
                  alt={offer.listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tag className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Offer Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-semibold text-foreground text-sm line-clamp-1">
                    {offer.listing.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={offer.buyer.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {offer.buyer.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {offer.buyer.full_name || 'Unknown Buyer'}
                    </span>
                  </div>
                </div>
                {getStatusBadge()}
              </div>

              {/* Price Info */}
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">
                    ${offer.offer_amount.toLocaleString()}
                  </span>
                  {percentOfAsking && (
                    <span className="text-xs text-muted-foreground">
                      ({percentOfAsking}% of asking)
                    </span>
                  )}
                </div>
                {offer.listing.price_sale && (
                  <span className="text-xs text-muted-foreground">
                    Asking: ${offer.listing.price_sale.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Counter Offer Display */}
              {isCountered && offer.counter_amount && (
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg mb-2">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Your counter: ${offer.counter_amount.toLocaleString()}
                    </span>
                  </div>
                  {offer.counter_message && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                      "{offer.counter_message}"
                    </p>
                  )}
                  <p className="text-[11px] text-blue-500 mt-1">
                    Waiting for buyer response
                  </p>
                </div>
              )}

              {/* Message */}
              {offer.message && !isCountered && (
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg mb-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground line-clamp-2">{offer.message}</p>
                </div>
              )}

              {/* Actions */}
              {isPending && !isExpired ? (
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => onAccept(offer.id)}
                    disabled={isResponding}
                    className="flex-1"
                  >
                    {isResponding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={openCounterModal}
                    disabled={isResponding}
                    className="flex-1"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Counter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeclineModal(true)}
                    disabled={isResponding}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : offer.seller_response && !isCountered ? (
                <p className="text-xs text-muted-foreground italic mt-2">
                  Your response: "{offer.seller_response}"
                </p>
              ) : null}

              {/* Timestamp */}
              <p className="text-[11px] text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decline Modal */}
      <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Offer</DialogTitle>
            <DialogDescription>
              Optionally add a message for the buyer explaining why you're declining.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="E.g., 'I'm looking for offers closer to asking price' or leave blank..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={isResponding}>
              {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Decline Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Offer Modal */}
      <Dialog open={showCounterModal} onOpenChange={setShowCounterModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Make a Counter-Offer
            </DialogTitle>
            <DialogDescription>
              Propose a different price. The buyer will have 48 hours to respond.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Their offer:</span>
                <span className="font-semibold">${offer.offer_amount.toLocaleString()}</span>
              </div>
              {offer.listing.price_sale && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Your asking price:</span>
                  <span className="font-semibold">${offer.listing.price_sale.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterAmount">Your Counter-Offer</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="counterAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  className="pl-9"
                  min="1"
                  step="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterMessage">Message (optional)</Label>
              <Textarea
                id="counterMessage"
                placeholder="E.g., 'I can meet you halfway at this price...'"
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCounter} 
              disabled={isResponding || !counterAmount || parseFloat(counterAmount) <= 0}
            >
              {isResponding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send Counter-Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const HostOffersSection = () => {
  const { pendingOffers, counteredOffers, respondedOffers, isLoading, respondToOffer, isResponding } = useHostOffers();

  const handleAccept = (offerId: string) => {
    respondToOffer({ offerId, status: 'accepted' });
  };

  const handleDecline = (offerId: string, response?: string) => {
    respondToOffer({ offerId, status: 'declined', response });
  };

  const handleCounter = (offerId: string, amount: number, message?: string) => {
    respondToOffer({ offerId, status: 'countered', counterAmount: amount, counterMessage: message });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allEmpty = pendingOffers.length === 0 && counteredOffers.length === 0 && respondedOffers.length === 0;

  if (allEmpty) {
    return null;
  }

  const activeOffers = [...pendingOffers, ...counteredOffers];

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="active" className="relative">
          Active
          {activeOffers.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
              {activeOffers.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-3">
        {activeOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active offers
          </p>
        ) : (
          activeOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCounter={handleCounter}
              isResponding={isResponding}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="history" className="space-y-3">
        {respondedOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No offer history
          </p>
        ) : (
          respondedOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCounter={handleCounter}
              isResponding={isResponding}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
