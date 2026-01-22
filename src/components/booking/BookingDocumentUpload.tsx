import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Eye,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_DESCRIPTIONS } from '@/types/documents';
import type { DocumentType } from '@/types/documents';
import type { ListingRequiredDocument } from '@/hooks/useRequiredDocuments';

export interface StagedDocument {
  documentType: DocumentType;
  file: File;
  preview?: string;
}

interface DocumentUploadItemProps {
  requirement: ListingRequiredDocument;
  stagedFile: StagedDocument | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
  disabled?: boolean;
}

const DocumentUploadItem = ({
  requirement,
  stagedFile,
  onUpload,
  onRemove,
  isUploading = false,
  disabled = false,
}: DocumentUploadItemProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        stagedFile
          ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50'
          : 'bg-card border-border',
        dragActive && 'border-primary border-2 bg-primary/5'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !isUploading) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <h4 className="font-medium text-foreground text-sm">
              {DOCUMENT_TYPE_LABELS[requirement.document_type]}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {requirement.description || DOCUMENT_TYPE_DESCRIPTIONS[requirement.document_type]}
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            'gap-1',
            stagedFile 
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
              : 'bg-amber-100 text-amber-700 border-amber-200'
          )}
        >
          {stagedFile ? (
            <>
              <Clock className="h-3 w-3" />
              Ready
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" />
              Required
            </>
          )}
        </Badge>
      </div>

      {/* Staged file info */}
      {stagedFile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 p-2 bg-background/50 rounded-lg">
          <FileText className="h-4 w-4 text-emerald-600" />
          <span className="truncate flex-1">{stagedFile.file.name}</span>
          <span className="text-xs">{formatFileSize(stagedFile.file.size)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Upload area */}
      {!stagedFile && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </>
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            PDF, JPG, PNG, or WebP (max 10MB)
          </p>
        </div>
      )}

      {stagedFile && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Replace File
        </Button>
      )}
      
      {/* Hidden file input for replace */}
      {stagedFile && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
      )}
    </div>
  );
};

interface BookingDocumentUploadProps {
  requiredDocs: ListingRequiredDocument[];
  stagedDocuments: StagedDocument[];
  onDocumentsChange: (docs: StagedDocument[]) => void;
  onComplete: () => void;
  disabled?: boolean;
}

export const BookingDocumentUpload = ({
  requiredDocs,
  stagedDocuments,
  onDocumentsChange,
  onComplete,
  disabled = false,
}: BookingDocumentUploadProps) => {
  const handleUpload = (docType: DocumentType, file: File) => {
    const newDocs = stagedDocuments.filter(d => d.documentType !== docType);
    newDocs.push({ documentType: docType, file });
    onDocumentsChange(newDocs);
  };

  const handleRemove = (docType: DocumentType) => {
    onDocumentsChange(stagedDocuments.filter(d => d.documentType !== docType));
  };

  const allDocsStaged = requiredDocs.every(req =>
    stagedDocuments.some(doc => doc.documentType === req.document_type)
  );

  const stagedCount = stagedDocuments.length;
  const totalRequired = requiredDocs.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This host requires the following documents. Please upload them to proceed with your booking.
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(stagedCount / totalRequired) * 100}%` }}
          />
        </div>
        <span className="text-muted-foreground font-medium">
          {stagedCount}/{totalRequired}
        </span>
      </div>

      {/* Document upload cards */}
      <div className="space-y-3">
        {requiredDocs.map((requirement) => (
          <DocumentUploadItem
            key={requirement.id}
            requirement={requirement}
            stagedFile={stagedDocuments.find(d => d.documentType === requirement.document_type) || null}
            onUpload={(file) => handleUpload(requirement.document_type, file)}
            onRemove={() => handleRemove(requirement.document_type)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Review notice */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium">Document Review Process</p>
            <p>
              Documents will be sent to admin for review. Typically reviewed within 30 minutes, 
              though some cases may take longer. You'll be notified once your documents have been reviewed.
            </p>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <Button 
        onClick={onComplete}
        disabled={!allDocsStaged || disabled}
        className="w-full"
        variant="dark-shine"
      >
        {allDocsStaged ? 'Continue' : `Upload ${totalRequired - stagedCount} more document${totalRequired - stagedCount > 1 ? 's' : ''}`}
      </Button>
    </div>
  );
};

export default BookingDocumentUpload;
