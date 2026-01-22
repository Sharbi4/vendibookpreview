import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';
import type { DocumentStatus } from '@/types/documents';
import type { BookingDocument } from '@/hooks/useRequiredDocuments';
import { format } from 'date-fns';

interface HostDocumentReviewCardProps {
  document: BookingDocument;
  bookingId: string;
  isInstantBook?: boolean;
}

const StatusBadge = ({ status }: { status: DocumentStatus }) => {
  const config = {
    pending: {
      label: 'Pending Admin Review',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-300',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-300',
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

/**
 * Host-facing document card - READ ONLY
 * Documents are reviewed by admin, not hosts
 * Hosts can only see document status, not the documents themselves
 */
export const HostDocumentReviewCard = ({ document, bookingId, isInstantBook = false }: HostDocumentReviewCardProps) => {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        document.status === 'approved'
          ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20'
          : document.status === 'rejected'
          ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20'
          : 'bg-amber-50/30 border-amber-200 dark:bg-amber-950/10'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-sm text-foreground truncate">
            {DOCUMENT_TYPE_LABELS[document.document_type]}
          </span>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span>Submitted {format(new Date(document.uploaded_at), 'MMM d, h:mm a')}</span>
      </div>

      {document.status === 'pending' && (
        <div className="flex items-start gap-2 p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Being reviewed by Vendibook. Typically within 30 minutes. You'll be notified once reviewed.
          </span>
        </div>
      )}

      {document.status === 'approved' && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Verified by Vendibook</span>
        </div>
      )}

      {document.status === 'rejected' && document.rejection_reason && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded p-2">
          <strong>Rejection reason:</strong> {document.rejection_reason}
        </div>
      )}
    </div>
  );
};