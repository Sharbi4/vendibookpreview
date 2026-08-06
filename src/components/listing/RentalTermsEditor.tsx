import React, { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useRentalTerms } from '@/hooks/useRentalTerms';
import { rentalGroupsForCategory, RentalTermsGroup } from '@/lib/listings/rentalTerms';
import type { SpecField } from '@/lib/listings/readiness';

interface Props {
  listingId: string;
  category?: string | null;
  initialSection?: string | null;
}

const Field: React.FC<{
  field: SpecField;
  value: unknown;
  onChange: (v: unknown) => void;
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
        <SelectTrigger className="text-base"><SelectValue placeholder="Select an option" /></SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
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
  return (
    <Input
      className="text-base"
      type={field.type === 'number' ? 'number' : 'text'}
      inputMode={field.type === 'number' ? 'decimal' : 'text'}
      placeholder={field.placeholder}
      value={(value as string | number | undefined) ?? ''}
      onChange={(e) =>
        onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
      }
    />
  );
};

const GroupCard: React.FC<{
  group: RentalTermsGroup;
  terms: Record<string, unknown>;
  saving: boolean;
  defaultOpen: boolean;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
}> = ({ group, terms, saving, defaultOpen, onSave }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const seed: Record<string, unknown> = {};
    for (const f of group.fields) seed[f.key] = terms[f.key];
    setDraft(seed);
    setDirty(false);
  }, [terms, group]);

  const filled = group.fields.filter(
    (f) => draft[f.key] !== undefined && draft[f.key] !== '' && draft[f.key] !== null,
  ).length;

  const handleSave = async () => {
    setError(null);
    const ok = await onSave(draft);
    if (!ok) {
      setError('Could not save these terms. Your changes are still here — try again.');
      return;
    }
    setDirty(false);
    toast({ title: `${group.title} saved`, description: 'Renters see these terms on your listing.' });
    setOpen(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left">
          <div className="min-w-0">
            <span className="font-medium text-foreground">{group.title}</span>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{group.blurb}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span>{filled}/{group.fields.length}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t border-border/60 p-4">
            {group.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                {field.type !== 'boolean' && (
                  <Label className="flex items-center gap-1.5 text-sm">
                    {field.label}
                    {field.unit && <span className="text-muted-foreground">({field.unit})</span>}
                    {field.help && <InfoTooltip content={field.help} />}
                  </Label>
                )}
                <Field
                  field={field}
                  value={draft[field.key]}
                  onChange={(v) => { setDraft((d) => ({ ...d, [field.key]: v })); setDirty(true); }}
                />
              </div>
            ))}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 bg-background/95 py-2 backdrop-blur">
              <p className="text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : 'Saved'}</p>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {error ? 'Retry save' : 'Save section'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

/** Rental branch: rates, allowances, rules and inspection expectations. */
export const RentalTermsEditor: React.FC<Props> = ({ listingId, category, initialSection }) => {
  const { terms, loading, saving, saveGroup } = useRentalTerms(listingId);
  const groups = rentalGroupsForCategory(category);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rental terms…
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-card/60 p-5">
        <h2 className="text-lg font-semibold text-foreground">Rental terms</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clear terms mean fewer questions before a booking and fewer disagreements after one.
        </p>
      </div>
      {groups.map((group) => (
        <GroupCard
          key={group.key}
          group={group}
          terms={terms}
          saving={saving}
          defaultOpen={
            group.key === initialSection ||
            // The dashboard next-action card deep-links to the branch as a whole.
            (initialSection === 'rental_terms' && group.key === groups[0].key)
          }
          onSave={saveGroup}
        />
      ))}
    </section>
  );
};

export default RentalTermsEditor;
