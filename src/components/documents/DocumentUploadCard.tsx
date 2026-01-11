import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_DESCRIPTIONS } from '@/types/documents';
import type { DocumentType, DocumentStatus } from '@/types/documents';
import type { BookingDocument, ListingRequiredDocument } from '@/hooks/useRequiredDocuments';

interface DocumentUploadCardProps {
  requirement: ListingRequiredDocument;
  uploadedDocument: BookingDocument | null;
  onUpload: (file: File) => void;
  onDelete?: () => void;
  isUploading?: boolean;
  disabled?: boolean;
}

const StatusBadge = ({ status }: { status: DocumentStatus | 'missing' }) => {
  const config = {
    missing: {
      label: 'Required',
      icon: AlertTriangle,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    pending: {
      label: 'Pending Review',
      icon: Clock,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 border-red-200',
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

export const DocumentUploadCard = ({
  requirement,
  uploadedDocument,
  onUpload,
  onDelete,
  isUploading = false,
  disabled = false,
}: DocumentUploadCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const status: DocumentStatus | 'missing' = uploadedDocument?.status || 'missing';
  const canUpload = status === 'missing' || status === 'rejected';
  const canReplace = status === 'pending';

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

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        status === 'approved'
          ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
          : status === 'rejected'
          ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
          : status === 'pending'
          ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
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
            <h4 className="font-medium text-foreground">
              {DOCUMENT_TYPE_LABELS[requirement.document_type]}
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {requirement.description || DOCUMENT_TYPE_DESCRIPTIONS[requirement.document_type]}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Rejection reason */}
      {status === 'rejected' && uploadedDocument?.rejection_reason && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg p-3 mb-3">
          <strong>Reason:</strong> {uploadedDocument.rejection_reason}
        </div>
      )}

      {/* Uploaded file info */}
      {uploadedDocument && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <FileText className="h-4 w-4" />
          <span className="truncate flex-1">{uploadedDocument.file_name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(uploadedDocument.file_url, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload area */}
      {(canUpload || canReplace) && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          <div className="flex gap-2">
            <Button
              variant={canReplace ? 'outline' : 'default'}
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {canReplace ? 'Replace File' : 'Upload Document'}
                </>
              )}
            </Button>

            {canReplace && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the uploaded document. You can upload a new one afterwards.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            PDF, JPG, PNG, or WebP (max 10MB)
          </p>
        </div>
      )}

      {status === 'approved' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Document verified</span>
        </div>
      )}

      {status === 'pending' && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <Clock className="h-4 w-4" />
          <span>Awaiting host review</span>
        </div>
      )}
    </div>
  );
};
