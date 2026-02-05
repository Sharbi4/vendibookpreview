import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Tag, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, ArrowRightLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBuyerOffers, BuyerOffer } from '@/hooks/useBuyerOffers';

const getStatusConfig = (status: string, expiresAt: string | null) => {
  const isExpired = expiresAt && new Date(expiresAt) < new Date() && status === 'pending';
  
  if (isExpired) {
    return {
      icon: AlertCircle,
      label: 'Expired',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      badgeVariant: 'outline' as const,
    };
  }

  switch (status) {
    case 'pending':
      return {
        icon: Clock,
        label: 'Pending',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        badgeVariant: 'outline' as const,
      };
    case 'countered':
      return {
        icon: ArrowRightLeft,
        label: 'Counter-Offer',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        badgeVariant: 'outline' as const,
      };
    case 'accepted':
      return {
        icon: CheckCircle2,
        label: 'Accepted',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        badgeVariant: 'default' as const,
      };
    case 'purchased':
      return {
        icon: CheckCircle2,
        label: 'Purchased',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        badgeVariant: 'default' as const,
      };
    case 'declined':
      return {
        icon: XCircle,
        label: 'Declined',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        badgeVariant: 'outline' as const,
      };
    case 'cancelled':
      return {
        icon: XCircle,
        label: 'Cancelled',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        badgeVariant: 'outline' as const,
      };
    default:
      return {
        icon: Tag,
        label: status,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        badgeVariant: 'outline' as const,
      };
  }
};

interface OfferCardProps {
  offer: BuyerOffer;
  onCancel: (id: string) => void;
  isCancelling: boolean;
  onAcceptCounter: (id: string) => void;
  onDeclineCounter: (id: string) => void;
  isRespondingToCounter: boolean;
}

const OfferCard = ({ 
  offer, 
  onCancel,
  isCancelling,
  onAcceptCounter,
  onDeclineCounter,
  isRespondingToCounter,
}: OfferCardProps) => {
  const statusConfig = getStatusConfig(offer.status, offer.expires_at);
  const StatusIcon = statusConfig.icon;
  const isPending = offer.status === 'pending';
  const isCountered = offer.status === 'countered';
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date() && isPending;

  // For accepted offers with counter, the agreed price is the counter amount
  const agreedPrice = offer.status === 'accepted' && offer.counter_amount 
    ? offer.counter_amount 
    : offer.status === 'accepted' 
      ? offer.offer_amount 
      : null;

  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Listing Image */}
          <Link 
            to={`/listing/${offer.listing_id}`}
            className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {offer.listing.cover_image_url ? (
              <img 
                src={offer.listing.cover_image_url} 
                alt={offer.listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </Link>

          {/* Offer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <Link 
                to={`/listing/${offer.listing_id}`}
                className="font-semibold text-foreground text-sm line-clamp-1 hover:text-primary transition-colors"
              >
                {offer.listing.title}
              </Link>
              <Badge 
                variant={statusConfig.badgeVariant}
                className={statusConfig.color}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Price Info */}
            <div className="flex items-center gap-3 mb-2">
              <span className={`font-bold ${isCountered ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                ${offer.offer_amount.toLocaleString()}
              </span>
              {offer.listing.price_sale && !isCountered && (
                <span className="text-xs text-muted-foreground">
                  of ${offer.listing.price_sale.toLocaleString()} asking
                </span>
              )}
            </div>

            {/* Counter Offer Section */}
            {isCountered && offer.counter_amount && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Seller's counter: ${offer.counter_amount.toLocaleString()}
                  </span>
                </div>
                {offer.counter_message && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 italic mb-2">
                    "{offer.counter_message}"
                  </p>
                )}
                
                {/* Counter Response Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => onAcceptCounter(offer.id)}
                    disabled={isRespondingToCounter}
                    className="flex-1"
                  >
                    {isRespondingToCounter ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept ${offer.counter_amount.toLocaleString()}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeclineCounter(offer.id)}
                    disabled={isRespondingToCounter}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {/* Seller Response (for declined) */}
            {offer.seller_response && offer.status === 'declined' && (
              <p className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded mb-2">
                Seller: "{offer.seller_response}"
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-muted-foreground">
                Sent {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
              </p>
              
              <div className="flex items-center gap-2">
                {offer.status === 'accepted' && agreedPrice && (
                  <Button size="sm" asChild>
                    <Link to={`/checkout/${offer.listing_id}?offer_price=${agreedPrice}`}>
                      Buy for ${agreedPrice.toLocaleString()}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
                {isPending && !isExpired && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(offer.id)}
                    disabled={isCancelling}
                    className="text-destructive hover:text-destructive"
                  >
                    {isCancelling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Cancel'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const BuyerOffersSection = () => {
  const { 
    offers, 
    stats, 
    isLoading, 
    cancelOffer, 
    isCancelling,
    respondToCounter,
    isRespondingToCounter,
  } = useBuyerOffers();

  if (isLoading) {
    return (
      <Card className="border border-border shadow-md">
        <CardContent className="p-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (offers.length === 0) {
    return null; // Don't show section if no offers
  }

  return (
    <Card className="border border-border shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-primary" />
            My Offers
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stats.countered > 0 && (
              <Badge variant="outline" className="text-blue-600 border-blue-500">
                {stats.countered} counter
              </Badge>
            )}
            {stats.pending > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                {stats.pending} pending
              </Badge>
            )}
            {stats.accepted > 0 && (
              <Badge className="bg-emerald-500 text-white">
                {stats.accepted} accepted
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            onCancel={cancelOffer}
            isCancelling={isCancelling}
            onAcceptCounter={(id) => respondToCounter({ offerId: id, action: 'accept' })}
            onDeclineCounter={(id) => respondToCounter({ offerId: id, action: 'decline' })}
            isRespondingToCounter={isRespondingToCounter}
          />
        ))}
      </CardContent>
    </Card>
  );
};
