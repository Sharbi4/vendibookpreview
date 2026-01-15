import { useState } from 'react';
import { format } from 'date-fns';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  DollarSign,
  MessageSquare,
  ExternalLink,
  Headset,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SaleTransaction } from '@/hooks/useSaleTransactions';
import { CATEGORY_LABELS } from '@/types/listing';
import { useZendeskComments } from '@/hooks/useZendeskComments';

interface DisputeResolutionCardProps {
  transaction: SaleTransaction;
  onResolve: (params: { 
    transactionId: string; 
    resolution: 'refund_buyer' | 'release_to_seller';
    adminNotes?: string;
  }) => void;
  isResolving?: boolean;
}

const DisputeResolutionCard = ({ 
  transaction, 
  onResolve,
  isResolving = false,
}: DisputeResolutionCardProps) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Fetch Zendesk comments for this transaction
  const { data: zendeskComments, isLoading: loadingComments } = useZendeskComments(transaction.id);

  const handleResolve = (resolution: 'refund_buyer' | 'release_to_seller') => {
    onResolve({
      transactionId: transaction.id,
      resolution,
      adminNotes: adminNotes || undefined,
    });
    setShowRefundConfirm(false);
    setShowReleaseConfirm(false);
    setDetailsOpen(false);
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'agent':
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'end-user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-destructive/30">
        <CardHeader className="bg-destructive/5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Dispute #{transaction.id.slice(0, 8)}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {zendeskComments && zendeskComments.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Headset className="h-3 w-3" />
                  {zendeskComments.length} support {zendeskComments.length === 1 ? 'message' : 'messages'}
                </Badge>
              )}
              <Badge variant="destructive">Disputed</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Listing Info */}
            <div className="flex gap-3 flex-1">
              <img
                src={transaction.listing?.cover_image_url || '/placeholder.svg'}
                alt={transaction.listing?.title}
                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              />
              <div>
                <h4 className="font-semibold text-foreground line-clamp-1">
                  {transaction.listing?.title || 'Unknown Listing'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {transaction.listing?.category 
                    ? CATEGORY_LABELS[transaction.listing.category as keyof typeof CATEGORY_LABELS] 
                    : 'Item'}
                </p>
                <p className="text-sm font-semibold text-primary mt-1">
                  ${transaction.amount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Parties */}
            <div className="flex gap-6 flex-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={transaction.buyer?.avatar_url || undefined} />
                  <AvatarFallback>{transaction.buyer?.full_name?.charAt(0) || 'B'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="text-sm font-medium">{transaction.buyer?.full_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={transaction.seller?.avatar_url || undefined} />
                  <AvatarFallback>{transaction.seller?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Seller</p>
                  <p className="text-sm font-medium">{transaction.seller?.full_name || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="text-sm text-muted-foreground">
              <p>Disputed on</p>
              <p className="font-medium text-foreground">
                {format(new Date(transaction.updated_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Dispute Reason */}
          {transaction.message && (
            <div className="mt-4 bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Dispute Reason</p>
                  <p className="text-sm text-muted-foreground mt-1">{transaction.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Zendesk Support Comments */}
          {zendeskComments && zendeskComments.length > 0 && (
            <Collapsible open={commentsOpen} onOpenChange={setCommentsOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Headset className="h-4 w-4" />
                    <span>Support Team Messages ({zendeskComments.length})</span>
                  </div>
                  {commentsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <ScrollArea className="h-[200px] rounded-lg border p-3">
                  <div className="space-y-3">
                    {zendeskComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg ${
                          comment.author_role === 'agent' || comment.author_role === 'admin'
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500'
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {comment.author_name || 'Unknown'}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getRoleBadgeColor(comment.author_role)}`}
                            >
                              {comment.author_role === 'agent' || comment.author_role === 'admin'
                                ? 'Support'
                                : comment.author_role || 'User'}
                            </Badge>
                            {!comment.is_public && (
                              <Badge variant="outline" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {comment.zendesk_created_at
                              ? format(new Date(comment.zendesk_created_at), 'MMM d, h:mm a')
                              : format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}

          {loadingComments && (
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading support messages...</span>
            </div>
          )}

          <Separator className="my-4" />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details & Resolve
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Resolve Dispute</DialogTitle>
                  <DialogDescription>
                    Review the transaction details and decide how to resolve this dispute.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Transaction Summary */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Transaction Amount</Label>
                      <p className="font-semibold">${transaction.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Seller Payout</Label>
                      <p className="font-semibold">${transaction.seller_payout.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Platform Fee</Label>
                      <p className="font-semibold">${transaction.platform_fee.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="font-semibold">
                        {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Confirmation Status */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      {transaction.buyer_confirmed_at ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        Buyer {transaction.buyer_confirmed_at ? 'confirmed' : 'not confirmed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {transaction.seller_confirmed_at ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        Seller {transaction.seller_confirmed_at ? 'confirmed' : 'not confirmed'}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Dispute Reason */}
                  {transaction.message && (
                    <div>
                      <Label className="text-muted-foreground">Dispute Reason</Label>
                      <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">{transaction.message}</p>
                    </div>
                  )}

                  {/* Support Messages in Dialog */}
                  {zendeskComments && zendeskComments.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Headset className="h-4 w-4" />
                        Support Team Messages ({zendeskComments.length})
                      </Label>
                      <ScrollArea className="h-[150px] mt-2 rounded-lg border p-3">
                        <div className="space-y-3">
                          {zendeskComments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`p-2 rounded-lg text-sm ${
                                comment.author_role === 'agent' || comment.author_role === 'admin'
                                  ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500'
                                  : 'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-xs">
                                  {comment.author_name || 'Unknown'}
                                  {(comment.author_role === 'agent' || comment.author_role === 'admin') && (
                                    <span className="ml-1 text-blue-600 dark:text-blue-400">(Support)</span>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {comment.zendesk_created_at
                                    ? format(new Date(comment.zendesk_created_at), 'MMM d, h:mm a')
                                    : format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="text-xs whitespace-pre-wrap">{comment.body}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div>
                    <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Add notes about your decision (will be included in notification emails)..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setShowRefundConfirm(true)}
                    disabled={isResolving}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Refund Buyer
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setShowReleaseConfirm(true)}
                    disabled={isResolving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Release to Seller
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={showRefundConfirm} onOpenChange={setShowRefundConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund to Buyer</AlertDialogTitle>
            <AlertDialogDescription>
              This will issue a full refund of ${transaction.amount.toLocaleString()} to the buyer.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResolve('refund_buyer')}
              disabled={isResolving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Refund'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Release Confirmation Dialog */}
      <AlertDialog open={showReleaseConfirm} onOpenChange={setShowReleaseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Release to Seller</AlertDialogTitle>
            <AlertDialogDescription>
              This will transfer ${transaction.seller_payout.toLocaleString()} to the seller's connected account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResolving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResolve('release_to_seller')}
              disabled={isResolving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Release'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DisputeResolutionCard;
