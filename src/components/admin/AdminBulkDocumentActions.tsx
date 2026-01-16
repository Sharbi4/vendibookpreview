import { useState } from 'react';
import { CheckCircle2, Loader2, X, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
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
import { useAdminBulkApproveDocuments, AdminBookingDocument } from '@/hooks/useAdminDocumentReview';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';

interface AdminBulkDocumentActionsProps {
  documents: AdminBookingDocument[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export const AdminBulkDocumentActions = ({
  documents,
  selectedIds,
  onSelectionChange,
}: AdminBulkDocumentActionsProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const bulkApproveMutation = useAdminBulkApproveDocuments();

  const pendingDocuments = documents.filter(d => d.status === 'pending');
  const selectedPendingDocs = pendingDocuments.filter(d => selectedIds.has(d.id));
  const allPendingSelected = pendingDocuments.length > 0 && pendingDocuments.every(d => selectedIds.has(d.id));
  const somePendingSelected = pendingDocuments.some(d => selectedIds.has(d.id));

  const handleSelectAll = () => {
    if (allPendingSelected) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all pending
      onSelectionChange(new Set(pendingDocuments.map(d => d.id)));
    }
  };

  const handleBulkApprove = () => {
    const docsToApprove = selectedPendingDocs.map(doc => ({
      id: doc.id,
      bookingId: doc.booking_id,
      documentType: doc.document_type,
    }));

    bulkApproveMutation.mutate(docsToApprove, {
      onSuccess: () => {
        onSelectionChange(new Set());
        setShowConfirmDialog(false);
      },
    });
  };

  const clearSelection = () => {
    onSelectionChange(new Set());
  };

  if (pendingDocuments.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all"
                checked={allPendingSelected}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-primary"
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer select-none"
              >
                {allPendingSelected
                  ? `All ${pendingDocuments.length} pending selected`
                  : somePendingSelected
                  ? `${selectedIds.size} of ${pendingDocuments.length} selected`
                  : `Select all ${pendingDocuments.length} pending documents`}
              </label>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={bulkApproveMutation.isPending}
                  >
                    {bulkApproveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Approve {selectedIds.size} Documents
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Approve {selectedPendingDocs.length} Documents?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to approve the following documents. Each user will receive an email notification.
                </p>
                <div className="max-h-48 overflow-y-auto bg-muted/50 rounded-lg p-3 space-y-2">
                  {selectedPendingDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </span>
                      <span className="text-muted-foreground">
                        {doc.booking?.shopper?.full_name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkApproveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {bulkApproveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Approve All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminBulkDocumentActions;
