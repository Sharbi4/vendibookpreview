import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
}> = ({ section, initial, confirmed, saving, defaultOpen = false, onSave }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState<Record<string, unknown>>(initial);
  const { toast } = useToast();

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const filledCount = sectionFilledCount(section, { [section.key]: draft });

  const handleSave = async () => {
    const ok = await onSave(draft);
    toast({
      title: ok ? `${section.title} saved` : 'Could not save',
      description: ok
        ? 'Your listing detail is updated. Buyers see it right away.'
        : 'Please try again in a moment.',
      variant: ok ? undefined : 'destructive',
    });
    if (ok) setOpen(false);
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
            <span>
              {filledCount}/{section.fields.length}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-border/60 p-4">
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
                  onChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))}
                />
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Leave anything blank you are not sure about.
              </p>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save section
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const ListingSpecsEditor: React.FC<ListingSpecsEditorProps> = ({
  listingId,
  category,
  mode,
  initialSection,
  header,
}) => {
  const { values, confirmedSections, readiness, loading, saving, saveSection } = useListingSpecs({
    listingId,
    category,
    mode,
  });

  const sections = sectionsForListing(category, mode);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listing details…
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {header}

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
            onSave={(v) => saveSection(section.key, v)}
          />
        ))}
      </div>
    </section>
  );
};

export default ListingSpecsEditor;
