import React, { useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SpecSuggestion } from '@/hooks/useSpecSuggestions';
import { SPEC_SECTIONS } from '@/lib/listings/readiness';

interface Props {
  suggestions: SpecSuggestion[];
  loading: boolean;
  generating: boolean;
  onGenerate: () => Promise<boolean>;
  onAccept: (suggestion: SpecSuggestion, value: unknown) => Promise<boolean>;
  onReject: (suggestion: SpecSuggestion) => Promise<boolean>;
}

const labelFor = (section: string, field: string) => {
  const s = SPEC_SECTIONS.find((x) => x.key === section);
  const f = s?.fields.find((x) => x.key === field);
  return { section: s?.title ?? section, field: f?.label ?? field };
};

const SuggestionRow: React.FC<{
  suggestion: SpecSuggestion;
  onAccept: Props['onAccept'];
  onReject: Props['onReject'];
}> = ({ suggestion, onAccept, onReject }) => {
  const [value, setValue] = useState(String(suggestion.suggested_value ?? ''));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const labels = labelFor(suggestion.section, suggestion.field);

  const act = async (accept: boolean) => {
    setBusy(true);
    const ok = accept ? await onAccept(suggestion, value) : await onReject(suggestion);
    setBusy(false);
    if (!ok) toast({ title: 'Could not save', description: 'Please try again.', variant: 'destructive' });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {labels.section}
        </span>
        <span className="text-sm font-medium text-foreground">{labels.field}</span>
        <Badge variant="secondary" className="text-[11px]">
          {typeof suggestion.confidence === 'number'
            ? `${Math.round(suggestion.confidence * 100)}% match — please confirm`
            : 'Please confirm'}
        </Badge>
      </div>

      {editing ? (
        <Input
          className="mt-3 text-base"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`${labels.field} value`}
        />
      ) : (
        <p className="mt-2 text-sm text-foreground">{value || '—'}</p>
      )}

      {suggestion.source_text && (
        <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs italic text-muted-foreground">
          From your description: “{suggestion.source_text}”
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => act(true)}>
          {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
          Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          {editing ? 'Done editing' : 'Edit'}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(false)}>
          <X className="mr-2 h-3.5 w-3.5" />
          Not correct
        </Button>
      </div>
    </div>
  );
};

/**
 * Seller-confirmation gate for AI-parsed facts. Nothing here is public until
 * the seller confirms it, one item at a time.
 */
export const SpecSuggestionsPanel: React.FC<Props> = ({
  suggestions,
  loading,
  generating,
  onGenerate,
  onAccept,
  onReject,
}) => (
  <section className="space-y-3">
    <div className="rounded-xl border border-border/60 bg-card/60 p-5">
      <h2 className="text-lg font-semibold text-foreground">Suggested details from your description</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We read what you already wrote and drafted structured details. Confirm, edit or remove each
        one — nothing appears on your listing until you confirm it.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        disabled={generating}
        onClick={() => onGenerate()}
      >
        {generating && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {suggestions.length ? 'Look again' : 'Review suggested details'}
      </Button>
    </div>

    {loading ? (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading suggestions…
      </div>
    ) : (
      suggestions.map((s) => (
        <SuggestionRow key={s.id} suggestion={s} onAccept={onAccept} onReject={onReject} />
      ))
    )}
  </section>
);

export default SpecSuggestionsPanel;
