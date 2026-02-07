import { useMemo, useState } from 'react';
import { FileCheck, FileClock, FileText, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/documents';

type DocStatus = 'missing' | 'pending' | 'approved' | 'rejected';

export interface DocumentComplianceBadgeData {
  hasRequirements: boolean;
  allApproved: boolean;
  missingCount: number;
  pendingCount: number;
  rejectedCount: number;
  documentStatuses: Array<{
    documentType: DocumentType;
    status: DocStatus;
    uploaded: {
      rejection_reason: string | null;
      uploaded_at: string;
    } | null;
  }>;
}

const statusTokens = {
  success: {
    container: 'border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]',
    dot: 'bg-[hsl(var(--status-success-text))]',
  },
  warning: {
    container: 'border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]',
    dot: 'bg-[hsl(var(--status-warning-text))]',
  },
} as const;

function splitByStatus(items: DocumentComplianceBadgeData['documentStatuses']) {
  return {
    approved: items.filter((d) => d.status === 'approved'),
    pending: items.filter((d) => d.status === 'pending'),
    rejected: items.filter((d) => d.status === 'rejected'),
    missing: items.filter((d) => d.status === 'missing'),
  };
}

export function DocumentComplianceBadge({ compliance }: { compliance: DocumentComplianceBadgeData }) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => splitByStatus(compliance.documentStatuses), [compliance.documentStatuses]);

  if (!compliance?.hasRequirements) return null;

  const approvedCount = groups.approved.length;

  const badge = (() => {
    if (compliance.allApproved && approvedCount > 0) {
      return {
        label: 'Documents Approved',
        Icon: FileCheck,
        className: cn(
          'border',
          statusTokens.success.container,
        ),
      };
    }

    if (compliance.rejectedCount > 0) {
      return {
        label: compliance.rejectedCount === 1 ? 'Document Declined' : `${compliance.rejectedCount} Declined`,
        Icon: FileWarning,
        className: 'border border-destructive/30 bg-destructive/10 text-destructive',
      };
    }

    if (compliance.pendingCount > 0) {
      return {
        label: 'Documents Pending',
        Icon: FileClock,
        // Signature “darkshine” pill
        className: 'border border-border bg-foreground text-background shadow-lg',
      };
    }

    if (compliance.missingCount > 0) {
      return {
        label: compliance.missingCount === 1 ? '1 Missing' : `${compliance.missingCount} Missing`,
        Icon: FileText,
        className: 'border border-border bg-muted text-muted-foreground',
      };
    }

    return null;
  })();

  if (!badge) return null;

  return (
    <>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
          'hover:shadow-md hover:scale-[1.02] active:scale-[0.99]',
          badge.className,
        )}
        onClick={() => setOpen(true)}
      >
        <badge.Icon className="h-3 w-3" />
        {badge.label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </DialogTitle>
            <DialogDescription>
              Required documents for this booking (hosts can view status only)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {groups.approved.length > 0 && (
              <section className="space-y-2">
                <div className={cn('flex items-center gap-2 text-sm font-medium', statusTokens.success.container, 'border-none bg-transparent p-0')}
                >
                  <FileCheck className="h-4 w-4" />
                  Approved ({groups.approved.length})
                </div>
                <div className="space-y-1 pl-6">
                  {groups.approved.map((doc) => (
                    <div key={doc.documentType} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusTokens.success.dot)} />
                      {DOCUMENT_TYPE_LABELS[doc.documentType]}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {groups.pending.length > 0 && (
              <section className="space-y-2">
                <div className={cn('flex items-center gap-2 text-sm font-medium', statusTokens.warning.container, 'border-none bg-transparent p-0')}>
                  <FileClock className="h-4 w-4" />
                  Pending Admin Review ({groups.pending.length})
                </div>
                <div className="space-y-1 pl-6">
                  {groups.pending.map((doc) => (
                    <div key={doc.documentType} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusTokens.warning.dot)} />
                      {DOCUMENT_TYPE_LABELS[doc.documentType]}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {groups.rejected.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <FileWarning className="h-4 w-4" />
                  Declined ({groups.rejected.length})
                </div>
                <div className="space-y-2 pl-6">
                  {groups.rejected.map((doc) => (
                    <div key={doc.documentType} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        {DOCUMENT_TYPE_LABELS[doc.documentType]}
                      </div>
                      {doc.uploaded?.rejection_reason && (
                        <p className="pl-3.5 text-xs text-destructive/80 italic">
                          Reason: {doc.uploaded.rejection_reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {groups.missing.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Not Uploaded ({groups.missing.length})
                </div>
                <div className="space-y-1 pl-6">
                  {groups.missing.map((doc) => (
                    <div key={doc.documentType} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                      {DOCUMENT_TYPE_LABELS[doc.documentType]}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Documents are reviewed by Vendibook admin. You’ll be notified once the review is complete.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
