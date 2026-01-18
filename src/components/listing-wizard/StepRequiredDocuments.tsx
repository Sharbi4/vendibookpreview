import React, { useState, useEffect } from 'react';
import { FileText, Shield, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { ListingFormData, ListingCategory } from '@/types/listing';
import {
  DocumentType,
  DocumentDeadlineType,
  RequiredDocumentSetting,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DEADLINE_TYPE_LABELS,
  DEADLINE_TYPE_DESCRIPTIONS,
  DOCUMENT_GROUPS,
  DEFAULT_DOCUMENTS_BY_CATEGORY,
} from '@/types/documents';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface StepRequiredDocumentsProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
}

export const StepRequiredDocuments: React.FC<StepRequiredDocumentsProps> = ({
  formData,
  updateField,
}) => {
  // Initialize with defaults based on category
  const [documents, setDocuments] = useState<RequiredDocumentSetting[]>([]);
  const [globalDeadline, setGlobalDeadline] = useState<DocumentDeadlineType>('before_approval');
  const [deadlineHours, setDeadlineHours] = useState<number>(48);
  const [openGroups, setOpenGroups] = useState<string[]>(['Identity & Legal']);

  // Initialize documents when component mounts or category changes
  useEffect(() => {
    if (formData.category && formData.mode === 'rent') {
      const defaults = DEFAULT_DOCUMENTS_BY_CATEGORY[formData.category] || [];
      
      // Create settings for all document types
      const allDocTypes: DocumentType[] = DOCUMENT_GROUPS.flatMap(g => g.documents);
      const initialDocs: RequiredDocumentSetting[] = allDocTypes.map(docType => ({
        document_type: docType,
        is_required: defaults.includes(docType),
        deadline_type: globalDeadline,
        deadline_offset_hours: globalDeadline === 'after_approval_deadline' ? deadlineHours : undefined,
      }));
      
      setDocuments(initialDocs);
    }
  }, [formData.category]);

  // Sync documents to form data when they change
  useEffect(() => {
    const enabledDocs = documents.filter(d => d.is_required);
    updateField('required_documents' as any, enabledDocs);
  }, [documents]);

  const toggleDocument = (docType: DocumentType) => {
    setDocuments(prev =>
      prev.map(d =>
        d.document_type === docType
          ? { ...d, is_required: !d.is_required }
          : d
      )
    );
  };

  const updateGlobalDeadline = (deadline: DocumentDeadlineType) => {
    setGlobalDeadline(deadline);
    setDocuments(prev =>
      prev.map(d => ({
        ...d,
        deadline_type: deadline,
        deadline_offset_hours: deadline === 'after_approval_deadline' ? deadlineHours : undefined,
      }))
    );
  };

  const updateDeadlineHours = (hours: number) => {
    setDeadlineHours(hours);
    if (globalDeadline === 'after_approval_deadline') {
      setDocuments(prev =>
        prev.map(d => ({
          ...d,
          deadline_offset_hours: hours,
        }))
      );
    }
  };

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev =>
      prev.includes(groupLabel)
        ? prev.filter(g => g !== groupLabel)
        : [...prev, groupLabel]
    );
  };

  const enabledCount = documents.filter(d => d.is_required).length;

  // Only show for rental listings
  if (formData.mode !== 'rent') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Document Requirements
          </h3>
          <p className="text-muted-foreground">
            Document verification is only available for rental listings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Required Documents & Verification</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          Specify which documents renters must provide and when they must be submitted.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">
              {enabledCount === 0
                ? 'No documents required'
                : `${enabledCount} document${enabledCount > 1 ? 's' : ''} required`}
            </p>
            <p className="text-muted-foreground">
              These documents are required from renters to complete or confirm a booking. You choose what's required and when.
            </p>
          </div>
        </div>
      </div>

      {/* Deadline Selection */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h4 className="font-medium">When are documents required?</h4>
        </div>

        <RadioGroup
          value={globalDeadline}
          onValueChange={(value) => updateGlobalDeadline(value as DocumentDeadlineType)}
          className="space-y-3"
        >
          {(Object.keys(DEADLINE_TYPE_LABELS) as DocumentDeadlineType[]).map((deadline) => (
            <div key={deadline} className="flex items-start gap-3">
              <RadioGroupItem value={deadline} id={deadline} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={deadline} className="font-medium cursor-pointer">
                  {DEADLINE_TYPE_LABELS[deadline]}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {DEADLINE_TYPE_DESCRIPTIONS[deadline]}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {globalDeadline === 'after_approval_deadline' && (
          <div className="flex items-center gap-3 pt-2 pl-6">
            <Label htmlFor="deadline_hours" className="text-sm whitespace-nowrap">
              Submit at least
            </Label>
            <Input
              id="deadline_hours"
              type="number"
              min="1"
              max="168"
              value={deadlineHours}
              onChange={(e) => updateDeadlineHours(parseInt(e.target.value) || 48)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">hours before booking start</span>
          </div>
        )}
      </div>

      {/* Document Categories */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Select Required Documents
        </h4>

        {DOCUMENT_GROUPS.map((group) => {
          const groupDocs = documents.filter(d =>
            group.documents.includes(d.document_type)
          );
          const enabledInGroup = groupDocs.filter(d => d.is_required).length;
          const isOpen = openGroups.includes(group.label);

          return (
            <Collapsible
              key={group.label}
              open={isOpen}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-between p-4 h-auto rounded-xl border',
                    isOpen ? 'bg-muted border-border' : 'border-border bg-card hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{group.label}</span>
                    {enabledInGroup > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-primary/15 text-primary rounded-full font-medium">
                        {enabledInGroup} selected
                      </span>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-2">
                <div className="space-y-2 pl-2">
                  {group.documents.map((docType) => {
                    const doc = documents.find(d => d.document_type === docType);
                    const isEnabled = doc?.is_required || false;

                    return (
                      <div
                        key={docType}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                          isEnabled
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'border-border bg-card hover:border-primary/50'
                        )}
                      >
                        <Switch
                          id={docType}
                          checked={isEnabled}
                          onCheckedChange={() => toggleDocument(docType)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={docType}
                            className="font-medium cursor-pointer"
                          >
                            {DOCUMENT_TYPE_LABELS[docType]}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {DOCUMENT_TYPE_DESCRIPTIONS[docType]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Renter Message Preview */}
      {enabledCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Message shown to renters
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            "This rental requires document verification. Please be prepared to upload the required documents
            {globalDeadline === 'before_booking_request' && ' before submitting your booking request'}
            {globalDeadline === 'before_approval' && ' before your booking can be approved'}
            {globalDeadline === 'after_approval_deadline' && ` at least ${deadlineHours} hours before your booking starts`}
            ."
          </p>
        </div>
      )}
    </div>
  );
};
