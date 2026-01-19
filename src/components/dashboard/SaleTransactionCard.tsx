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

// Role-specific status labels for clarity
const getStatusConfig = (status: string, role: 'buyer' | 'seller', transaction: SaleTransaction) => {
  const hasShipping = transaction.fulfillment_type === 'delivery' || transaction.fulfillment_type === 'vendibook_freight';
  
  // Role-specific labels for better clarity
  if (role === 'buyer') {
    switch (status) {
      case 'pending':
        return { label: 'Pending Payment', variant: 'secondary' as const, icon: Clock };
      case 'paid':
        if (hasShipping && !transaction.shipped_at) {
          return { label: 'Awaiting Shipment', variant: 'default' as const, icon: Package };
        }
        if (hasShipping && transaction.shipped_at && !transaction.delivered_at) {
          return { label: 'In Transit', variant: 'default' as const, icon: Truck };
        }
        return { label: 'Ready to Confirm Receipt', variant: 'default' as const, icon: ShieldCheck };
      case 'seller_confirmed':
        return { label: 'Ready to Confirm Receipt', variant: 'default' as const, icon: ShieldCheck };
      case 'buyer_confirmed':
        return { label: 'Awaiting Seller Confirmation', variant: 'default' as const, icon: Clock };
      case 'completed':
        return { label: 'Complete', variant: 'default' as const, icon: CheckCircle2 };
      case 'disputed':
        return { label: 'Under Review', variant: 'destructive' as const, icon: AlertCircle };
      case 'refunded':
        return { label: 'Refunded', variant: 'secondary' as const, icon: DollarSign };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'secondary' as const, icon: AlertCircle };
      default:
        return { label: 'Unknown', variant: 'secondary' as const, icon: Clock };
    }
  } else {
    // Seller labels
    switch (status) {
      case 'pending':
        return { label: 'Awaiting Payment', variant: 'secondary' as const, icon: Clock };
      case 'paid':
        if (hasShipping && !transaction.shipped_at) {
          return { label: 'Ship Now', variant: 'default' as const, icon: Package };
        }
        if (hasShipping && transaction.shipped_at && !transaction.delivered_at) {
          return { label: 'In Transit', variant: 'default' as const, icon: Truck };
        }
        return { label: 'Confirm Handoff', variant: 'default' as const, icon: ShieldCheck };
      case 'buyer_confirmed':
        return { label: 'Confirm to Release Funds', variant: 'default' as const, icon: ShieldCheck };
      case 'seller_confirmed':
        return { label: 'Awaiting Buyer Confirmation', variant: 'default' as const, icon: Clock };
      case 'completed':
        return { label: 'Funds Released', variant: 'default' as const, icon: CheckCircle2 };
      case 'disputed':
        return { label: 'Under Review', variant: 'destructive' as const, icon: AlertCircle };
      case 'refunded':
        return { label: 'Refunded', variant: 'secondary' as const, icon: DollarSign };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'secondary' as const, icon: AlertCircle };
      default:
        return { label: 'Unknown', variant: 'secondary' as const, icon: Clock };
    }
  }
};

// Action button labels based on context
const getActionLabel = (role: 'buyer' | 'seller', transaction: SaleTransaction): string => {
  const hasShipping = transaction.fulfillment_type === 'delivery' || transaction.fulfillment_type === 'vendibook_freight';
  
  if (role === 'buyer') {
    if (hasShipping && transaction.delivered_at) {
      return 'Confirm Delivery';
    }
    return 'Confirm Receipt';
  } else {
    if (hasShipping && !transaction.shipped_at) {
      return 'Mark as Shipped';
    }
    if (hasShipping) {
      return 'Confirm Delivery';
    }
    return 'Confirm Handoff';
  }
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
  
  const statusConfig = getStatusConfig(transaction.status, role, transaction);
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

  const actionLabel = getActionLabel(role, transaction);

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
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      
      <CardContent className="relative p-0">
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

            {/* Escrow Status Banner */}
            {['paid', 'buyer_confirmed', 'seller_confirmed'].includes(transaction.status) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                    <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      🔒 Funds Held Securely by VendiBook
                    </p>
                    <p className="text-xs text-blue-600/90 dark:text-blue-300/90 mt-1">
                      ${transaction.amount.toLocaleString()} is protected in escrow. {role === 'buyer' 
                        ? 'Confirm receipt to release payment to seller.' 
                        : 'Funds will be released after both parties confirm.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Funds Released Banner for completed transactions */}
            {transaction.status === 'completed' && transaction.payout_completed_at && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      ✅ {role === 'seller' ? 'Funds Released to Your Account' : 'Payment Released to Seller'}
                    </p>
                    <p className="text-xs text-emerald-600/90 dark:text-emerald-300/90 mt-1">
                      Transaction completed on {format(new Date(transaction.payout_completed_at), 'MMM d, yyyy')}
                    </p>
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
            
            {/* Confirmation status with clearer labels */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                {transaction.buyer_confirmed_at ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                <span className={transaction.buyer_confirmed_at ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {transaction.buyer_confirmed_at 
                    ? `Buyer confirmed ${format(new Date(transaction.buyer_confirmed_at), 'MMM d')}`
                    : 'Buyer confirmation pending'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                {transaction.seller_confirmed_at ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                <span className={transaction.seller_confirmed_at ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {transaction.seller_confirmed_at 
                    ? `Seller confirmed ${format(new Date(transaction.seller_confirmed_at), 'MMM d')}`
                    : 'Seller confirmation pending'
                  }
                </span>
              </div>
            </div>

            {/* Action hint for current user */}
            {canConfirm && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {role === 'buyer' 
                        ? 'Ready to confirm receipt' 
                        : 'Ready to confirm this sale'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {role === 'buyer'
                        ? 'Once you confirm, funds will be released to the seller after their confirmation.'
                        : 'Once both parties confirm, payment will be released to your account.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

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
            
            {/* Actions with clearer labels */}
            <div className="flex flex-wrap gap-2">
              {canConfirm && (
                <Button 
                  onClick={() => onConfirm(transaction.id)}
                  disabled={isConfirming}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {actionLabel}
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
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">
                      Awaiting {role === 'buyer' ? 'seller' : 'buyer'} confirmation
                    </span>
                    <span className="text-amber-600 ml-1">
                      — Funds will be released once confirmed
                    </span>
                  </div>
                </div>
              )}
              
              {transaction.status === 'completed' && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">
                      {role === 'seller' 
                        ? transaction.payout_completed_at 
                          ? 'Funds released to your account'
                          : 'Processing payout to your account'
                        : 'Transaction complete'
                      }
                    </span>
                    {role === 'seller' && transaction.payout_completed_at && (
                      <span className="text-emerald-600 ml-1">
                        — ${transaction.seller_payout.toLocaleString()} deposited
                      </span>
                    )}
                  </div>
                </div>
              )}

              {transaction.status === 'disputed' && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 px-4 py-2.5 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">Under review by our team</span>
                    <span className="text-destructive/80 ml-1">
                      — Payment held securely
                    </span>
                  </div>
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
