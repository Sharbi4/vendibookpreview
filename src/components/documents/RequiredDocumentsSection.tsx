import { FileText, Shield, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DEADLINE_TYPE_LABELS,
  DOCUMENT_GROUPS,
  type DocumentType,
} from '@/types/documents';
import { cn } from '@/lib/utils';

interface RequiredDocumentsSectionProps {
  listingId: string;
}

export const RequiredDocumentsSection = ({ listingId }: RequiredDocumentsSectionProps) => {
  const { data: requiredDocs, isLoading } = useListingRequiredDocuments(listingId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!requiredDocs || requiredDocs.length === 0) {
    return null;
  }

  // Group documents by their groups
  const groupedDocs = DOCUMENT_GROUPS.map((group) => ({
    ...group,
    documents: group.documents.filter((docType) =>
      requiredDocs.some((rd) => rd.document_type === docType)
    ),
  })).filter((group) => group.documents.length > 0);

  // Get deadline info for a document
  const getDocumentInfo = (docType: DocumentType) => {
    return requiredDocs.find((rd) => rd.document_type === docType);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Required Documents
        </h2>
        <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20">
          {requiredDocs.length} required
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        To complete a booking, you'll need to provide the following documents for verification.
      </p>

      <div className="space-y-4">
        {groupedDocs.map((group) => (
          <div key={group.label} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {group.label}
            </h3>
            <div className="grid gap-2">
              {group.documents.map((docType) => {
                const docInfo = getDocumentInfo(docType);
                if (!docInfo) return null;

                return (
                  <TooltipProvider key={docType}>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border bg-card',
                            'hover:border-primary/30 transition-colors cursor-help'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-md bg-primary/10">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {DOCUMENT_TYPE_LABELS[docType]}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {DOCUMENT_TYPE_DESCRIPTIONS[docType]}
                              </p>
                            </div>
                          </div>

                          <DeadlineBadge deadlineType={docInfo.deadline_type} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{DOCUMENT_TYPE_LABELS[docType]}</p>
                          <p className="text-xs text-muted-foreground">
                            {DEADLINE_TYPE_LABELS[docInfo.deadline_type]}
                          </p>
                          {docInfo.description && (
                            <p className="text-xs">{docInfo.description}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            Secure Document Handling
          </p>
          <p className="text-blue-700 dark:text-blue-300">
            Your documents are stored securely and only shared with the host for verification purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

// Deadline badge component
const DeadlineBadge = ({
  deadlineType,
}: {
  deadlineType: 'before_booking_request' | 'before_approval' | 'after_approval_deadline';
}) => {
  const config = {
    before_booking_request: {
      label: 'Before Request',
      icon: AlertCircle,
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    },
    before_approval: {
      label: 'Before Approval',
      icon: Clock,
      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    },
    after_approval_deadline: {
      label: 'After Approval',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    },
  };

  const { label, icon: Icon, className } = config[deadlineType];

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs shrink-0', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

export default RequiredDocumentsSection;
