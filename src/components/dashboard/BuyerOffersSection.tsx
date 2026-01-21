import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Tag, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
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
    case 'accepted':
      return {
        icon: CheckCircle2,
        label: 'Accepted',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
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

const OfferCard = ({ 
  offer, 
  onCancel,
  isCancelling 
}: { 
  offer: BuyerOffer;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) => {
  const statusConfig = getStatusConfig(offer.status, offer.expires_at);
  const StatusIcon = statusConfig.icon;
  const isPending = offer.status === 'pending';
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date() && isPending;

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
              <span className="font-bold text-foreground">
                ${offer.offer_amount.toLocaleString()}
              </span>
              {offer.listing.price_sale && (
                <span className="text-xs text-muted-foreground">
                  of ${offer.listing.price_sale.toLocaleString()} asking
                </span>
              )}
            </div>

            {/* Seller Response */}
            {offer.seller_response && (
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
                {offer.status === 'accepted' && (
                  <Button size="sm" asChild>
                    <Link to={`/checkout/${offer.listing_id}`}>
                      Complete Purchase
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
  const { offers, stats, isLoading, cancelOffer, isCancelling } = useBuyerOffers();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
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
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-primary" />
            My Offers
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          />
        ))}
      </CardContent>
    </Card>
  );
};
