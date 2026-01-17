import { FileText, CheckCircle2, Clock, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';

interface BookingStepRequirementsProps {
  listingId: string;
  onContinue: () => void;
  onBack: () => void;
}

const BookingStepRequirements = ({
  listingId,
  onContinue,
  onBack,
}: BookingStepRequirementsProps) => {
  const { data: requiredDocs, isLoading } = useListingRequiredDocuments(listingId);

  const hasRequirements = requiredDocs && requiredDocs.length > 0;

  const getDeadlineInfo = (type: string) => {
    switch (type) {
      case 'before_booking_request':
        return { label: 'Before request', icon: AlertCircle, color: 'text-amber-600' };
      case 'before_approval':
        return { label: 'Before approval', icon: Clock, color: 'text-blue-600' };
      default:
        return { label: 'After approval', icon: CheckCircle2, color: 'text-emerald-600' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Requirements
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasRequirements ? 'Documents needed for this booking' : 'No documents required'}
        </p>
      </div>

      {/* Requirements checklist */}
      {hasRequirements ? (
        <div className="space-y-2">
          {requiredDocs.map((doc) => {
            const deadline = getDeadlineInfo(doc.deadline_type);
            const Icon = deadline.icon;
            
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {DOCUMENT_TYPE_LABELS[doc.document_type]}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs gap-1">
                  <Icon className={`h-3 w-3 ${deadline.color}`} />
                  {deadline.label}
                </Badge>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            No documents required for this listing
          </p>
        </div>
      )}

      {/* Info note */}
      {hasRequirements && (
        <p className="text-xs text-muted-foreground">
          You can upload documents after submitting your request.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button variant="gradient" onClick={onContinue} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
};

export default BookingStepRequirements;
