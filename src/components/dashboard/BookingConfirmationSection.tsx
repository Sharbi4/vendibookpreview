import { useState } from 'react';
import { Check, AlertTriangle, Loader2, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookingConfirmationSectionProps {
  bookingId: string;
  isHost: boolean;
  hostConfirmedAt: string | null;
  shopperConfirmedAt: string | null;
  disputeStatus: string | null;
  onConfirmSuccess?: () => void;
  onDisputeSuccess?: () => void;
}

export const BookingConfirmationSection = ({
  bookingId,
  isHost,
  hostConfirmedAt,
  shopperConfirmedAt,
  disputeStatus,
  onConfirmSuccess,
  onDisputeSuccess,
}: BookingConfirmationSectionProps) => {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  const hasActiveDispute = disputeStatus && disputeStatus !== 'closed';
  const myConfirmation = isHost ? hostConfirmedAt : shopperConfirmedAt;
  const otherConfirmation = isHost ? shopperConfirmedAt : hostConfirmedAt;
  const otherPartyLabel = isHost ? 'renter' : 'host';

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const updateField = isHost ? 'host_confirmed_at' : 'shopper_confirmed_at';
      const { error } = await supabase
        .from('booking_requests')
        .update({ [updateField]: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      // Check if both have now confirmed
      const { data: booking } = await supabase
        .from('booking_requests')
        .select('host_confirmed_at, shopper_confirmed_at')
        .eq('id', bookingId)
        .single();

      if (booking?.host_confirmed_at && booking?.shopper_confirmed_at) {
        // Both confirmed - mark as completed and trigger payout
        await supabase
          .from('booking_requests')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', bookingId);

        toast({
          title: 'Booking Completed! 🎉',
          description: 'Both parties confirmed. Payment will be released shortly.',
        });
      } else {
        toast({
          title: 'Confirmation Received ✓',
          description: `Waiting for ${otherPartyLabel} to confirm.`,
        });
      }

      onConfirmSuccess?.();
      setShowConfirmAlert(false);
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please describe the issue before opening a dispute.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingDispute(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          dispute_status: 'pending',
          dispute_opened_at: new Date().toISOString(),
          dispute_reason: disputeReason.trim(),
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Dispute Opened',
        description: 'Our support team will review and contact you within 24-48 hours.',
      });

      setShowDisputeDialog(false);
      setDisputeReason('');
      onDisputeSuccess?.();
    } catch (error) {
      console.error('Error opening dispute:', error);
      toast({
        title: 'Error',
        description: 'Failed to open dispute. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // If already confirmed, show status
  if (myConfirmation) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            You confirmed this booking ended successfully
          </span>
        </div>
        {!otherConfirmation && (
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Waiting for {otherPartyLabel} to confirm...
          </p>
        )}
      </div>
    );
  }

  // If there's an active dispute, show status
  if (hasActiveDispute) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            Dispute in progress
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Payment is on hold until resolved. Our team will contact you.
        </p>
      </div>
    );
  }

  // Show confirmation prompt
  return (
    <>
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Confirm booking ended successfully?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isHost 
                  ? 'If everything went well, confirm to release payment. If there was an issue, open a dispute.'
                  : 'If everything went well, confirm to get your deposit back. If there was an issue, contact support.'
                }
              </p>
              {otherConfirmation && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {isHost ? 'Renter' : 'Host'} has already confirmed
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowConfirmAlert(true)}
              >
                <Check className="h-4 w-4 mr-1" />
                Confirm All Good
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDisputeDialog(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Report Issue
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Alert Dialog */}
      <AlertDialog open={showConfirmAlert} onOpenChange={setShowConfirmAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking Completed</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost 
                ? 'By confirming, you acknowledge the rental ended successfully. Once both parties confirm, your payment will be released.'
                : 'By confirming, you acknowledge the rental ended successfully. Once both parties confirm, your deposit will be refunded.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isConfirming}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Report an Issue
            </DialogTitle>
            <DialogDescription>
              Opening a dispute will pause automatic payment/deposit release until our team reviews and resolves the issue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Textarea
                placeholder="Describe what went wrong..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Be specific about dates, damage, or issues. Our team will review within 24-48 hours.
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                You can also message the {otherPartyLabel} directly to try resolving first.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleOpenDispute}
              disabled={isSubmittingDispute || !disputeReason.trim()}
            >
              {isSubmittingDispute && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Open Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingConfirmationSection;
