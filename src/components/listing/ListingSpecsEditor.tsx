import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { Progress } from '@/components/ui/progress';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useListingSpecs } from '@/hooks/useListingSpecs';
import {
  READINESS_LABELS,
  SpecField,
  SpecSection,
  sectionFilledCount,
  sectionsForListing,
} from '@/lib/listings/readiness';
import ReadinessDisclaimer from '@/components/listing/ReadinessDisclaimer';

interface ListingSpecsEditorProps {
  listingId: string;
  category?: string | null;
  mode?: string | null;
  /** Section key to open on mount (deep link from a next-action card). */
  initialSection?: string | null;
  /** Optional slot rendered above the sections (e.g. AI suggestions). */
  header?: React.ReactNode;
}

const FieldInput: React.FC<{
  field: SpecField;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ field, value, onChange }) => {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
        <span className="text-sm text-foreground">{field.label}</span>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        className="text-base"
        placeholder={field.placeholder}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }


  if (field.type === 'select') {
    return (
      <Select value={(value as string) ?? ''} onValueChange={onChange}>
        <SelectTrigger className="text-base">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="text-base"
      inputMode={field.type === 'number' ? 'decimal' : 'text'}
      type={field.type === 'number' ? 'number' : 'text'}
      value={(value as string | number | undefined) ?? ''}
      placeholder={field.placeholder}
      onChange={(e) =>
        onChange(
          field.type === 'number'
            ? e.target.value === ''
              ? ''
              : Number(e.target.value)
            : e.target.value,
        )
      }
    />
  );
};

const SectionCard: React.FC<{
  section: SpecSection;
  initial: Record<string, unknown>;
  confirmed: boolean;
  saving: boolean;
  defaultOpen?: boolean;
  /** Replaces the generic field grid for custom sections (equipment, ownership). */
  customContent?: React.ReactNode;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}> = ({ section, initial, confirmed, saving, defaultOpen = false, customContent, onSave, onDirtyChange }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState<Record<string, unknown>>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setDraft(initial);
    setDirty(false);
  }, [initial]);

  const filledCount = sectionFilledCount(section, { [section.key]: draft });

  const markDirty = (next: Record<string, unknown>) => {
    setDraft(next);
    setDirty(true);
    onDirtyChange?.(true);
  };

  const handleSave = async () => {
    setError(null);
    const ok = await onSave(draft);
    if (!ok) {
      setError('Could not save. Your changes are still here — try again.');
      toast({
        title: 'Could not save',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }
    setDirty(false);
    onDirtyChange?.(false);
    toast({
      title: `${section.title} saved`,
      description: 'Your listing detail is updated. Buyers see it right away.',
    });
    setOpen(false);
  };


  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{section.title}</span>
              {confirmed && filledCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Check className="h-3 w-3" /> Added
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{section.blurb}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {section.fields.length > 0 && (
              <span>
                {filledCount}/{section.fields.length}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-border/60 p-4">
            {customContent ? (
              customContent
            ) : (
              <>
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    {field.type !== 'boolean' && (
                      <Label className="flex items-center gap-1.5 text-sm">
                        {field.label}
                        {field.unit && <span className="text-muted-foreground">({field.unit})</span>}
                        {field.help && <InfoTooltip content={field.help} />}
                      </Label>
                    )}
                    <FieldInput
                      field={field}
                      value={draft[field.key]}
                      onChange={(v) => markDirty({ ...draft, [field.key]: v })}
                    />
                  </div>
                ))}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="sticky bottom-0 flex items-center justify-between gap-3 bg-background/95 py-2 backdrop-blur">
                  <p className="text-xs text-muted-foreground">
                    {dirty ? 'Unsaved changes' : 'Leave anything blank you are not sure about.'}
                  </p>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    {error ? 'Retry save' : 'Save section'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>

      </div>
    </Collapsible>
  );
};

export const ListingSpecsEditor: React.FC<ListingSpecsEditorProps> = ({
  listingId,
  hostId,
  category,
  mode,
  initialSection,
  header,
}) => {
  const {
    values, confirmedSections, readiness, loading, saving, conflict, reload, saveSection,
  } = useListingSpecs({ listingId, category, mode });
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});

  const sections = sectionsForListing(category, mode);
  const hasUnsaved = Object.values(dirtySections).some(Boolean);

  // Unsaved-change warning (browser-level; section saves are independent).
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listing details…
      </div>
    );
  }

  const renderCustom = (section: SpecSection): React.ReactNode => {
    if (section.custom === 'equipment') {
      return (
        <EquipmentInventoryEditor
          value={values[section.key] ?? {}}
          saving={saving}
          onSave={(v) => saveSection(section.key, v)}
          onDirtyChange={(d) => setDirtySections((s) => ({ ...s, [section.key]: d }))}
        />
      );
    }
    if (section.custom === 'ownership') {
      return (
        <OwnershipDetailsForm
          listingId={listingId}
          hostId={hostId}
          onSavePublicSummary={(summary) => saveSection('ownership_public', summary)}
        />
      );
    }
    return undefined;
  };

  return (
    <section className="space-y-4">
      {header}

      {conflict && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm text-foreground">
            This listing was updated somewhere else. Reload before saving so you do not overwrite
            the newer details.
          </p>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Reload details
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add depth to your listing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your listing is already live. Every section you fill in answers a question a buyer
              would otherwise have to message you about.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {READINESS_LABELS[readiness.level]}
          </Badge>
        </div>
        <div className="mt-4 space-y-1.5">
          <Progress value={readiness.score} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {readiness.score}% of relevant details added
          </p>
        </div>
        <ReadinessDisclaimer className="mt-4" />
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <SectionCard
            key={section.key}
            section={section}
            initial={values[section.key] ?? {}}
            confirmed={confirmedSections.includes(section.key)}
            saving={saving}
            defaultOpen={section.key === initialSection}
            customContent={renderCustom(section)}
            onSave={(v) => saveSection(section.key, v)}
            onDirtyChange={(d) => setDirtySections((s) => ({ ...s, [section.key]: d }))}
          />
        ))}
      </div>
    </section>
  );
};


export default ListingSpecsEditor;
