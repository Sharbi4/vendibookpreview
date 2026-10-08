import { useState } from 'react';
import { GraduationCap, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { normalizePartnerCode, trackCampusPartner } from '@/lib/campusPartnerAnalytics';

export interface AppliedPartnerCode {
  code: string;
  partnerName: string;
  /** Purchases: exact credit. Rentals: filled in from the server payment quote. */
  creditCents?: number;
}

interface Props {
  kind: 'rental' | 'purchase';
  listingId: string;
  applied: AppliedPartnerCode | null;
  onApply: (applied: AppliedPartnerCode | null) => void;
  /** Server message when the code was refused later (e.g. at payment). */
  externalError?: string | null;
  disabled?: boolean;
}

/**
 * Campus Partner code entry. Never clears the rest of checkout: an invalid
 * code only shows a message under this field.
 */
export default function CampusPartnerCodeField({ kind, listingId, applied, onApply, externalError, disabled }: Props) {
  const [value, setValue] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    const code = normalizePartnerCode(value);
    if (code.length < 3) { setError('Enter your Campus Partner code.'); return; }
    setChecking(true);
    setError(null);
    trackCampusPartner('partner_code_entered', { kind, code, listingId });
    try {
      const { data, error: fnError } = await supabase.functions.invoke('campus-partner-code', {
        body: { code, kind, listing_id: listingId },
      });
      if (fnError) {
        const parsed = await parseEdgeError(fnError);
        throw new Error(parsed?.message || "We couldn't check that code. Try again.");
      }
      if (!data?.valid) {
        trackCampusPartner('partner_code_invalid', { kind, code, listingId, reason: data?.reason });
        setError(data?.message || "That code isn't recognized.");
        return;
      }
      trackCampusPartner('partner_code_valid', { kind, code: data.code, listingId });
      onApply({ code: data.code, partnerName: data.partner_name, creditCents: data.credit_cents ?? undefined });
      setValue('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    if (applied) trackCampusPartner('partner_credit_removed', { kind, code: applied.code, listingId });
    onApply(null);
    setError(null);
  };

  if (applied) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5" role="status">
        <div className="flex items-start gap-2 text-sm">
          <GraduationCap className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">Campus Partner credit applied</p>
            <p className="text-xs text-muted-foreground">{applied.partnerName} · {applied.code}</p>
          </div>
        </div>
        <button type="button" onClick={remove} disabled={disabled} className="text-muted-foreground hover:text-foreground" aria-label="Remove Campus Partner code">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const shownError = error ?? externalError ?? null;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`campus-code-${kind}`} className="text-sm">
        School or partner code <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <div className="flex gap-2">
        <Input
          id={`campus-code-${kind}`}
          value={value}
          onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply(); } }}
          placeholder="e.g. SCHOOL27"
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: '16px' }}
          maxLength={40}
          autoComplete="off"
          disabled={disabled || checking}
          aria-invalid={!!shownError}
        />
        <Button type="button" variant="outline" onClick={apply} disabled={disabled || checking || !value.trim()}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {shownError ? <p role="alert" className="text-xs text-destructive">{shownError}</p> : null}
    </div>
  );
}
