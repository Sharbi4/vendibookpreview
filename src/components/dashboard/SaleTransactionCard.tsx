import { useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, DollarSign, ShieldCheck, AlertCircle, Loader2, Flag, MapPin, Truck, Package, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SaleTransaction } from '@/hooks/useSaleTransactions';
import { CATEGORY_LABELS } from '@/types/listing';

interface SaleTransactionCardProps {
  transaction: SaleTransaction;
  role: 'buyer' | 'seller';
  onConfirm: (id: string) => void;
  onDispute?: (params: { transactionId: string; reason: string }) => void;
  isConfirming?: boolean;
  isDisputing?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending Payment', variant: 'secondary' as const, icon: Clock },
  paid: { label: 'In Escrow', variant: 'default' as const, icon: ShieldCheck },
  buyer_confirmed: { label: 'Buyer Confirmed', variant: 'default' as const, icon: CheckCircle2 },
  seller_confirmed: { label: 'Seller Confirmed', variant: 'default' as const, icon: CheckCircle2 },
  completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle2 },
  disputed: { label: 'Disputed', variant: 'destructive' as const, icon: AlertCircle },
  refunded: { label: 'Refunded', variant: 'secondary' as const, icon: DollarSign },
  cancelled: { label: 'Cancelled', variant: 'secondary' as const, icon: AlertCircle },
};

const SaleTransactionCard = ({ 
  transaction, 
  role, 
  onConfirm,
  onDispute,
  isConfirming = false,
  isDisputing = false,
}: SaleTransactionCardProps) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  
  const statusConfig = STATUS_CONFIG[transaction.status];
  const StatusIcon = statusConfig.icon;
  
  const otherParty = role === 'buyer' ? transaction.seller : transaction.buyer;
  const otherPartyLabel = role === 'buyer' ? 'Seller' : 'Buyer';
  
  const canConfirm = role === 'buyer' 
    ? ['paid', 'seller_confirmed'].includes(transaction.status) && !transaction.buyer_confirmed_at
    : ['paid', 'buyer_confirmed'].includes(transaction.status) && !transaction.seller_confirmed_at;

  const canDispute = ['paid', 'buyer_confirmed', 'seller_confirmed'].includes(transaction.status);

  const isWaitingForOther = role === 'buyer'
    ? transaction.buyer_confirmed_at && !transaction.seller_confirmed_at
    : transaction.seller_confirmed_at && !transaction.buyer_confirmed_at;

  const handleSubmitDispute = () => {
    if (onDispute && disputeReason.length >= 10) {
      onDispute({ transactionId: transaction.id, reason: disputeReason });
      setDisputeDialogOpen(false);
      setDisputeReason('');
    }
  };

  const showTrackingSection = role === 'buyer' && 
    (transaction.fulfillment_type === 'delivery' || transaction.fulfillment_type === 'vendibook_freight');

  const getShippingStatusLabel = () => {
    const status = transaction.shipping_status;
    if (status === 'delivered') return 'Delivered';
    if (status === 'shipped' || status === 'in_transit') return 'In Transit';
    if (status === 'out_for_delivery') return 'Out for Delivery';
    if (status === 'processing') return 'Processing';
    return 'Awaiting Shipment';
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="w-full sm:w-48 h-32 sm:h-auto flex-shrink-0">
            <img
              src={transaction.listing?.cover_image_url || '/placeholder.svg'}
              alt={transaction.listing?.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {transaction.listing?.title || 'Unknown Listing'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {transaction.listing?.category ? CATEGORY_LABELS[transaction.listing.category as keyof typeof CATEGORY_LABELS] : 'Item'}
                </p>
              </div>
              
              <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            
            {/* Other party info */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={otherParty?.avatar_url || undefined} />
                <AvatarFallback>
                  {otherParty?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {otherParty?.full_name || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground">{otherPartyLabel}</p>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            {/* Price breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div>
                <p className="text-muted-foreground">Sale Price</p>
                <p className="font-semibold">${transaction.amount.toLocaleString()}</p>
              </div>
              {role === 'seller' && (
                <>
                  <div>
                    <p className="text-muted-foreground">Platform Fee</p>
                    <p className="font-medium text-destructive">-${transaction.platform_fee.toLocaleString()}</p>
                  </div>
                  {transaction.freight_cost && transaction.freight_cost > 0 && (
                    <div>
                      <p className="text-muted-foreground">Freight (Seller-Paid)</p>
                      <p className="font-medium text-destructive">-${transaction.freight_cost.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">You Receive</p>
                    <p className="font-semibold text-primary">${transaction.seller_payout.toLocaleString()}</p>
                  </div>
                </>
              )}
              {role === 'buyer' && transaction.freight_cost && transaction.freight_cost > 0 && (
                <div>
                  <p className="text-muted-foreground">Freight Included</p>
                  <p className="font-medium text-emerald-600">Free Shipping</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(transaction.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
            
            {/* Fulfillment Details */}
            {transaction.fulfillment_type && (
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  {transaction.fulfillment_type === 'delivery' || transaction.fulfillment_type === 'vendibook_freight' ? (
                    <Truck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  ) : (
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {transaction.fulfillment_type === 'vendibook_freight' ? 'VendiBook Freight' :
                       transaction.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}
                    </p>
                    {(transaction.fulfillment_type === 'delivery' || transaction.fulfillment_type === 'vendibook_freight') ? (
                      <>
                        {transaction.delivery_address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transaction.delivery_address}
                          </p>
                        )}
                        {transaction.delivery_instructions && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{transaction.delivery_instructions}"
                          </p>
                        )}
                        {transaction.delivery_fee && transaction.delivery_fee > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Delivery fee: ${transaction.delivery_fee.toLocaleString()}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {transaction.listing?.pickup_location_text && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transaction.listing.pickup_location_text}
                          </p>
                        )}
                        {transaction.listing?.pickup_instructions && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{transaction.listing.pickup_instructions}"
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tracking Status for Buyers */}
            {showTrackingSection && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getShippingStatusLabel()}
                      </p>
                      {transaction.tracking_number && (
                        <p className="text-xs text-muted-foreground">
                          Tracking: {transaction.tracking_number}
                        </p>
                      )}
                      {transaction.estimated_delivery_date && !transaction.delivered_at && (
                        <p className="text-xs text-muted-foreground">
                          Est. delivery: {format(new Date(transaction.estimated_delivery_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to={`/order-tracking/${transaction.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Track
                    </Link>
                  </Button>
                </div>
              </div>
            )}
            
            {/* Confirmation status */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                {transaction.buyer_confirmed_at ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                <span className={transaction.buyer_confirmed_at ? 'text-emerald-600' : 'text-muted-foreground'}>
                  Buyer {transaction.buyer_confirmed_at ? 'confirmed' : 'pending'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {transaction.seller_confirmed_at ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                <span className={transaction.seller_confirmed_at ? 'text-emerald-600' : 'text-muted-foreground'}>
                  Seller {transaction.seller_confirmed_at ? 'confirmed' : 'pending'}
                </span>
              </div>
            </div>

            {/* Dispute message if disputed */}
            {transaction.status === 'disputed' && transaction.message && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Dispute Reason</p>
                    <p className="text-sm text-muted-foreground mt-1">{transaction.message}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canConfirm && (
                <Button 
                  onClick={() => onConfirm(transaction.id)}
                  disabled={isConfirming}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {role === 'buyer' ? 'Confirm Receipt' : 'Confirm Delivery'}
                    </>
                  )}
                </Button>
              )}

              {canDispute && onDispute && (
                <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Flag className="h-4 w-4 mr-2" />
                      Raise Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Raise a Dispute</DialogTitle>
                      <DialogDescription>
                        Explain the issue with this transaction. Our team will review and work to resolve it. 
                        Payment will remain in escrow until the dispute is resolved.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea
                        placeholder="Please describe the issue in detail (minimum 10 characters)..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {disputeReason.length}/10 minimum characters
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleSubmitDispute}
                        disabled={disputeReason.length < 10 || isDisputing}
                      >
                        {isDisputing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Dispute'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              {isWaitingForOther && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    Waiting for {role === 'buyer' ? 'seller' : 'buyer'} confirmation
                  </span>
                </div>
              )}
              
              {transaction.status === 'completed' && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">
                    {role === 'seller' 
                      ? transaction.payout_completed_at 
                        ? 'Payment released to your account'
                        : 'Payment being processed'
                      : 'Transaction complete'
                    }
                  </span>
                </div>
              )}

              {transaction.status === 'disputed' && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Under review by our team</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleTransactionCard;
