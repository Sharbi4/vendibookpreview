import { FileText, Clock, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import {
  DOCUMENT_TYPE_LABELS,
  DEADLINE_TYPE_LABELS,
} from '@/types/documents';

interface RequirementsModalProps {
  listingId: string;
}

const RequirementsModal = ({ listingId }: RequirementsModalProps) => {
  const { data: requiredDocs, isLoading } = useListingRequiredDocuments(listingId);

  const hasRequirements = requiredDocs && requiredDocs.length > 0;

  const getDeadlineIcon = (type: string) => {
    switch (type) {
      case 'before_booking_request':
        return <AlertCircle className="h-3 w-3" />;
      case 'before_approval':
        return <Clock className="h-3 w-3" />;
      default:
        return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  const getDeadlineColor = (type: string) => {
    switch (type) {
      case 'before_booking_request':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
      case 'before_approval':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
  };

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Requirements</p>
                <p className="text-xs text-muted-foreground">
                  {hasRequirements
                    ? `${requiredDocs.length} document${requiredDocs.length !== 1 ? 's' : ''} required`
                    : 'No documents required'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">
              View
            </Button>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Requirements for this booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasRequirements ? (
            <>
              <p className="text-sm text-muted-foreground">
                The host requires the following documents to complete your booking.
              </p>

              <div className="space-y-2">
                {requiredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`gap-1 text-xs ${getDeadlineColor(doc.deadline_type)}`}
                    >
                      {getDeadlineIcon(doc.deadline_type)}
                      {doc.deadline_type === 'before_booking_request'
                        ? 'Before request'
                        : doc.deadline_type === 'before_approval'
                        ? 'Before approval'
                        : 'After approval'}
                    </Badge>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground italic">
                Requirements are set by the host.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No documents required for this listing.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequirementsModal;
