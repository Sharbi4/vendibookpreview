import React from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, Shield, ArrowRight, Info, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { useUserDocuments } from '@/hooks/useUserDocuments';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';
import type { DocumentType } from '@/types/documents';

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
  const { data: requiredDocs, isLoading: loadingRequired } = useListingRequiredDocuments(listingId);
  const { data: userDocs, isLoading: loadingUserDocs } = useUserDocuments();

  const isLoading = loadingRequired || loadingUserDocs;
  const hasRequirements = requiredDocs && requiredDocs.length > 0;

  // Helper to check if user has this document type
  const getUserDocStatus = (docType: DocumentType) => {
    const userDoc = userDocs?.find(d => d.document_type === docType);
    if (!userDoc) return { status: 'missing' as const, doc: null };
    return { status: userDoc.status, doc: userDoc };
  };

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

  // Count docs user already has
  const docsWithStatus = requiredDocs?.map(doc => ({
    ...doc,
    userStatus: getUserDocStatus(doc.document_type as DocumentType),
  })) || [];
  
  const approvedCount = docsWithStatus.filter(d => d.userStatus.status === 'approved').length;
  const pendingCount = docsWithStatus.filter(d => d.userStatus.status === 'pending').length;
  const missingCount = docsWithStatus.filter(d => d.userStatus.status === 'missing').length;

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
        
        {/* Summary badges showing user's status */}
        {hasRequirements && docsWithStatus.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {approvedCount > 0 && (
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {approvedCount} verified
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                <Clock className="h-3 w-3 mr-1" />
                {pendingCount} pending review
              </Badge>
            )}
            {missingCount > 0 && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Upload className="h-3 w-3 mr-1" />
                {missingCount} to upload
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Requirements checklist with user's status */}
      {hasRequirements ? (
        <div className="space-y-3">
          {docsWithStatus.map((doc) => {
            const deadline = getDeadlineInfo(doc.deadline_type);
            const { status: userStatus } = doc.userStatus;
            
            // Determine visual state based on user's existing docs
            const getStatusBadge = () => {
              switch (userStatus) {
                case 'approved':
                  return (
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  );
                case 'pending':
                  return (
                    <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  );
                case 'rejected':
                  return (
                    <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0 text-xs gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Reupload needed
                    </Badge>
                  );
                default:
                  return (
                    <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1">
                      {React.createElement(deadline.icon, { className: `h-3 w-3 ${deadline.color}` })}
                      {deadline.label}
                    </Badge>
                  );
              }
            };

            const bgClass = userStatus === 'approved' 
              ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
              : userStatus === 'pending'
              ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10'
              : 'border-border';
            
            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${bgClass}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    userStatus === 'approved' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                      : userStatus === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : deadline.bg
                  }`}>
                    {userStatus === 'approved' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <FileText className={`h-4 w-4 ${userStatus === 'pending' ? 'text-amber-600' : deadline.color}`} />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      {DOCUMENT_TYPE_LABELS[doc.document_type]}
                    </span>
                    {doc.description && (
                      <span className="text-xs text-muted-foreground">{doc.description}</span>
                    )}
                    {userStatus === 'approved' && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        ✓ From a previous booking
                      </span>
                    )}
                  </div>
                </div>
                {getStatusBadge()}
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
            {approvedCount > 0 
              ? `You have ${approvedCount} verified document${approvedCount > 1 ? 's' : ''} that can be reused. You can upload any remaining documents after submitting your request.`
              : 'You can upload documents after submitting your request. The host will review them before approval.'}
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