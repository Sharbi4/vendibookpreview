import { Shield, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { useDocumentsOnFile } from '@/hooks/useDocumentsOnFile';
import { DEADLINE_TYPE_LABELS } from '@/types/documents';

interface RequiredDocumentsBannerProps {
  listingId: string | undefined;
  variant?: 'compact' | 'full';
}

export const RequiredDocumentsBanner = ({
  listingId,
  variant = 'compact',
}: RequiredDocumentsBannerProps) => {
  const { data: requiredDocs, isLoading } = useListingRequiredDocuments(listingId);
  const requiredDocTypes = requiredDocs?.map(d => d.document_type as string);
  const { data: docsOnFileData } = useDocumentsOnFile(requiredDocTypes);
  const docsOnFile = docsOnFileData?.docsOnFile ?? false;

  if (isLoading || !requiredDocs || requiredDocs.length === 0) {
    return null;
  }

  const deadlineType = requiredDocs[0]?.deadline_type;
  const docCount = requiredDocs.length;

  // Show "on file" banner instead of warning when docs are valid
  if (docsOnFile) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            {docCount} document{docCount > 1 ? 's' : ''} on file — no upload needed
          </span>
        </div>
      );
    }

    return (
      <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 dark:text-emerald-200">
          <strong className="block mb-1">Documents On File ✓</strong>
          <p className="text-sm">
            Your {docCount} required document{docCount > 1 ? 's are' : ' is'} already approved and on file. No re-upload needed.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
        <Shield className="h-4 w-4 shrink-0" />
        <span>
          {docCount} document{docCount > 1 ? 's' : ''} required for this rental
        </span>
      </div>
    );
  }

  return (
    <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <Shield className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <strong className="block mb-1">Document Verification Required</strong>
        <p className="text-sm">
          This rental requires {docCount} document{docCount > 1 ? 's' : ''} to be uploaded.{' '}
          {deadlineType && (
            <span className="font-medium">{DEADLINE_TYPE_LABELS[deadlineType]}</span>
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
};
