import React, { useState, useRef } from 'react';
import { 
  FileText, Upload, CheckCircle2, Clock, AlertCircle, Shield, 
  ArrowRight, Info, X, Loader2, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';
import { DOCUMENT_TYPE_LABELS } from '@/types/documents';
import type { DocumentType, ListingRequiredDocument } from '@/types/documents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  documentType: DocumentType;
  file: File;
  preview?: string;
}

interface BookingStepDocumentUploadProps {
  listingId: string;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

const BookingStepDocumentUpload = ({
  listingId,
  uploadedFiles,
  onFilesChange,
  onContinue,
  onBack,
}: BookingStepDocumentUploadProps) => {
  const { toast } = useToast();
  const { data: requiredDocs, isLoading } = useListingRequiredDocuments(listingId);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(null);

  const hasRequirements = requiredDocs && requiredDocs.length > 0;

  // Check upload status for each required document
  const getUploadStatus = (docType: DocumentType) => {
    const uploaded = uploadedFiles.find(f => f.documentType === docType);
    return uploaded ? 'uploaded' : 'missing';
  };

  const uploadedCount = requiredDocs?.filter(doc => 
    getUploadStatus(doc.document_type) === 'uploaded'
  ).length || 0;

  const progress = hasRequirements ? (uploadedCount / (requiredDocs?.length || 1)) * 100 : 100;
  const allUploaded = hasRequirements ? uploadedCount === (requiredDocs?.length || 0) : true;

  const handleFileSelect = (docType: DocumentType) => {
    setCurrentDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDocType) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (JPG, PNG, WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Add to uploaded files
    const newUpload: UploadedFile = {
      documentType: currentDocType,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };

    // Replace if already exists for this type
    const filtered = uploadedFiles.filter(f => f.documentType !== currentDocType);
    onFilesChange([...filtered, newUpload]);

    toast({
      title: 'Document added',
      description: `${DOCUMENT_TYPE_LABELS[currentDocType]} ready for upload`,
    });

    // Reset
    setCurrentDocType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (docType: DocumentType) => {
    onFilesChange(uploadedFiles.filter(f => f.documentType !== docType));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // No requirements - skip this step
  if (!hasRequirements) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">No Documents Required</h4>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            This listing doesn't require any documents for booking
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12">
            Back
          </Button>
          <Button variant="gradient" onClick={onContinue} className="flex-1 h-12">
            Continue to Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
      />

      {/* Header */}
      <div className="border-b border-primary/10 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-md">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Upload Documents</h3>
            <p className="text-sm text-muted-foreground">
              Upload required documents for verification
            </p>
          </div>
        </div>
      </div>

      {/* Important notice */}
      <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
          <strong>Payment will be held</strong> until our team reviews and approves your documents. 
          This typically takes 1-2 business days.
        </AlertDescription>
      </Alert>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {uploadedCount} of {requiredDocs?.length} documents ready
          </span>
          {allUploaded ? (
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              All ready
            </span>
          ) : (
            <span className="text-muted-foreground">
              {(requiredDocs?.length || 0) - uploadedCount} remaining
            </span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Document upload cards */}
      <div className="space-y-3">
        {requiredDocs?.map((requirement) => {
          const status = getUploadStatus(requirement.document_type);
          const uploadedFile = uploadedFiles.find(f => f.documentType === requirement.document_type);

          return (
            <div
              key={requirement.id}
              className={`p-4 border rounded-xl transition-colors ${
                status === 'uploaded'
                  ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    status === 'uploaded'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-muted'
                  }`}>
                    {status === 'uploaded' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      {DOCUMENT_TYPE_LABELS[requirement.document_type]}
                    </span>
                    {uploadedFile ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {uploadedFile.file.name}
                      </span>
                    ) : requirement.description ? (
                      <span className="text-xs text-muted-foreground">
                        {requirement.description}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {status === 'uploaded' ? (
                    <>
                      {uploadedFile?.preview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => window.open(uploadedFile.preview, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveFile(requirement.document_type)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => handleFileSelect(requirement.document_type)}
                      disabled={uploadingType === requirement.document_type}
                    >
                      {uploadingType === requirement.document_type ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      Upload
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Accepted formats: PDF, JPG, PNG, WebP. Maximum file size: 10MB per document.
          Documents are securely stored and only shared with our verification team.
        </p>
      </div>

      {/* What's Next */}
      <div className="p-3 bg-gradient-to-r from-muted/50 to-primary/5 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-white" />
          </div>
          <span className="text-muted-foreground">
            <strong className="text-foreground">Next:</strong> Review your booking details and submit
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12">
          Back
        </Button>
        <Button 
          variant="gradient" 
          onClick={onContinue} 
          className="flex-1 h-12"
          disabled={!allUploaded}
        >
          {allUploaded ? (
            <>
              Continue to Review
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            `Upload ${(requiredDocs?.length || 0) - uploadedCount} more`
          )}
        </Button>
      </div>
    </div>
  );
};

export default BookingStepDocumentUpload;
