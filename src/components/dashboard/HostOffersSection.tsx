import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Tag, Check, X, Clock, Loader2, MessageSquare, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const OfferCard = ({ 
  offer, 
  onAccept, 
  onDecline,
  isResponding 
}: { 
  offer: HostOffer; 
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string, response?: string) => void;
  isResponding: boolean;
}) => {
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  
  const isPending = offer.status === 'pending';
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date() && isPending;
  const percentOfAsking = offer.listing.price_sale 
    ? Math.round((offer.offer_amount / offer.listing.price_sale) * 100)
    : null;

  const handleDecline = () => {
    onDecline(offer.id, declineReason);
    setShowDeclineModal(false);
    setDeclineReason('');
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
                
                {/* Status Badge */}
                {isExpired ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Expired
                  </Badge>
                ) : offer.status === 'accepted' ? (
                  <Badge className="bg-emerald-500 text-white">Accepted</Badge>
                ) : offer.status === 'declined' ? (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    Declined
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
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

              {/* Message */}
              {offer.message && (
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg mb-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground line-clamp-2">{offer.message}</p>
                </div>
              )}

              {/* Actions or Response */}
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
                    variant="outline"
                    onClick={() => setShowDeclineModal(true)}
                    disabled={isResponding}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              ) : offer.seller_response ? (
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
    </>
  );
};

export const HostOffersSection = () => {
  const { pendingOffers, respondedOffers, isLoading, respondToOffer, isResponding } = useHostOffers();

  const handleAccept = (offerId: string) => {
    respondToOffer({ offerId, status: 'accepted' });
  };

  const handleDecline = (offerId: string, response?: string) => {
    respondToOffer({ offerId, status: 'declined', response });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingOffers.length === 0 && respondedOffers.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
          <Tag className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No offers yet</p>
        <p className="text-xs text-muted-foreground">
          Offers from buyers will appear here.
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="pending" className="relative">
          Pending
          {pendingOffers.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
              {pendingOffers.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="responded">History</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-3">
        {pendingOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending offers
          </p>
        ) : (
          pendingOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isResponding={isResponding}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="responded" className="space-y-3">
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
              isResponding={isResponding}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
