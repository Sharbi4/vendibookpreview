import { FileText, CheckCircle2, Clock, AlertCircle, Shield, ArrowRight, Info } from 'lucide-react';
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
        return { label: 'Before request', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      case 'before_approval':
        return { label: 'Before approval', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      default:
        return { label: 'After approval', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
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
      {/* Header */}
      <div className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Document Requirements</h3>
            <p className="text-sm text-muted-foreground">
              {hasRequirements ? 'Documents needed for this booking' : 'No documents required'}
            </p>
          </div>
        </div>
      </div>

      {/* Requirements checklist */}
      {hasRequirements ? (
        <div className="space-y-3">
          {requiredDocs.map((doc) => {
            const deadline = getDeadlineInfo(doc.deadline_type);
            const Icon = deadline.icon;
            
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${deadline.bg} flex items-center justify-center`}>
                    <FileText className={`h-4 w-4 ${deadline.color}`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      {DOCUMENT_TYPE_LABELS[doc.document_type]}
                    </span>
                    {doc.description && (
                      <span className="text-xs text-muted-foreground">{doc.description}</span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1">
                  <Icon className={`h-3 w-3 ${deadline.color}`} />
                  {deadline.label}
                </Badge>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">No Documents Required</h4>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            This host doesn't require any documents for booking
          </p>
        </div>
      )}

      {/* Info note */}
      {hasRequirements && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            You can upload documents after submitting your request. The host will review them before approval.
          </p>
        </div>
      )}

      {/* What's Next */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <ArrowRight className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">Next:</strong> Enter booking details and contact info
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12">
          Back
        </Button>
        <Button variant="gradient" onClick={onContinue} className="flex-1 h-12">
          Continue to Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default BookingStepRequirements;