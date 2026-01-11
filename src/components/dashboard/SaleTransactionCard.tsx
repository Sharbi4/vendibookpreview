import { format } from 'date-fns';
import { CheckCircle2, Clock, DollarSign, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SaleTransaction } from '@/hooks/useSaleTransactions';
import { CATEGORY_LABELS } from '@/types/listing';

interface SaleTransactionCardProps {
  transaction: SaleTransaction;
  role: 'buyer' | 'seller';
  onConfirm: (id: string) => void;
  isConfirming?: boolean;
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
  isConfirming = false,
}: SaleTransactionCardProps) => {
  const statusConfig = STATUS_CONFIG[transaction.status];
  const StatusIcon = statusConfig.icon;
  
  const otherParty = role === 'buyer' ? transaction.seller : transaction.buyer;
  const otherPartyLabel = role === 'buyer' ? 'Seller' : 'Buyer';
  
  const canConfirm = role === 'buyer' 
    ? ['paid', 'seller_confirmed'].includes(transaction.status) && !transaction.buyer_confirmed_at
    : ['paid', 'buyer_confirmed'].includes(transaction.status) && !transaction.seller_confirmed_at;

  const isWaitingForOther = role === 'buyer'
    ? transaction.buyer_confirmed_at && !transaction.seller_confirmed_at
    : transaction.seller_confirmed_at && !transaction.buyer_confirmed_at;

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
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold">${transaction.amount.toLocaleString()}</p>
              </div>
              {role === 'seller' && (
                <>
                  <div>
                    <p className="text-muted-foreground">Platform Fee</p>
                    <p className="font-medium text-destructive">-${transaction.platform_fee.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">You Receive</p>
                    <p className="font-semibold text-primary">${transaction.seller_payout.toLocaleString()}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(transaction.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
            
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleTransactionCard;
