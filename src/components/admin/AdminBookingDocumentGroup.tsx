import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';
import type { AdminBookingDocument } from '@/hooks/useAdminDocumentReview';
import { useAdminApproveAllBookingDocs } from '@/hooks/useAdminDocumentReview';
import AdminDocumentReviewCard from './AdminDocumentReviewCard';

interface AdminBookingDocumentGroupProps {
  bookingId: string;
  documents: AdminBookingDocument[];
  selectedIds: Set<string>;
  onSelectionChange: (docId: string, selected: boolean) => void;
}

export const AdminBookingDocumentGroup = ({
  bookingId,
  documents,
  selectedIds,
  onSelectionChange,
}: AdminBookingDocumentGroupProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const approveAllMutation = useAdminApproveAllBookingDocs();

  const booking = documents[0]?.booking;
  const pendingDocs = documents.filter(d => d.status === 'pending');
  const approvedDocs = documents.filter(d => d.status === 'approved');
  const rejectedDocs = documents.filter(d => d.status === 'rejected');

  const allSelected = pendingDocs.length > 0 && pendingDocs.every(d => selectedIds.has(d.id));

  const handleSelectAll = (checked: boolean) => {
    pendingDocs.forEach(doc => {
      onSelectionChange(doc.id, checked);
    });
  };

  const handleApproveAll = () => {
    approveAllMutation.mutate(
      { bookingId, documents: pendingDocs },
      {
        onSuccess: () => {
          setShowConfirmDialog(false);
        },
      }
    );
  };

  return (
    <>
      <Card className="border-l-4 border-l-primary/50">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              {/* Booking Info */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  {pendingDocs.length > 0 && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-primary"
                    />
                  )}
                  <h3 className="font-semibold text-foreground">
                    {booking?.listing?.title || 'Unknown Listing'}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {documents.length} doc{documents.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {booking?.shopper?.full_name || 'Unknown'}
                  </span>
                  {booking?.shopper?.email && (
                    <span className="text-xs">({booking.shopper.email})</span>
                  )}
                  {booking?.start_date && booking?.end_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(booking.start_date), 'MMM d')} -{' '}
                      {format(new Date(booking.end_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                {/* Status summary */}
                <div className="flex items-center gap-2 pt-1">
                  {pendingDocs.length > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                      {pendingDocs.length} pending
                    </Badge>
                  )}
                  {approvedDocs.length > 0 && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                      {approvedDocs.length} approved
                    </Badge>
                  )}
                  {rejectedDocs.length > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      {rejectedDocs.length} rejected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {pendingDocs.length > 0 && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={approveAllMutation.isPending}
                  >
                    {approveAllMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Approve All ({pendingDocs.length})
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-2 space-y-3">
              {documents.map((doc) => (
                <AdminDocumentReviewCard
                  key={doc.id}
                  document={doc}
                  showCheckbox={doc.status === 'pending'}
                  isSelected={selectedIds.has(doc.id)}
                  onSelectionChange={(selected) => onSelectionChange(doc.id, selected)}
                />
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Approve All Documents for Booking?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to approve all {pendingDocs.length} pending document(s) for this booking.
                  Both the host and renter will receive a single summary email notification.
                </p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    {booking?.listing?.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Renter: {booking?.shopper?.full_name || 'Unknown'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pendingDocs.map(doc => (
                      <Badge key={doc.id} variant="secondary" className="text-xs">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveAllMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveAll}
              disabled={approveAllMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {approveAllMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Approve All & Notify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminBookingDocumentGroup;
