import React, { useEffect, useState } from 'react';
import { Lock, Loader2, FileText, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOwnershipDetails, useOwnershipDocuments, OwnershipPrivateValues } from '@/hooks/useOwnershipDetails';
import { buildOwnershipPublicSummary } from '@/lib/listings/publicSummary';

interface Props {
  listingId: string;
  hostId?: string | null;
  /** Persists the derived public summary onto listing_specs.ownership_public. */
  onSavePublicSummary: (summary: Record<string, unknown>) => Promise<boolean>;
}

const TITLE_STATUS = [
  'Clean title in hand', 'Title pending', 'Salvage or rebuilt title', 'Bill of sale only',
  'Manufacturer certificate of origin', 'Not sure',
];

/**
 * Ownership and documents.
 *
 * Everything captured here is private: identifiers, owner names, lienholder
 * details and uploads stay in an owner-only table and a private bucket. Buyers
 * only ever see the summarized facts derived on save.
 */
const normalizeVin = (v?: string | null) => {
  const trimmed = (v ?? '').trim().toUpperCase();
  return trimmed.length ? trimmed : null;
};

export const OwnershipDetailsForm: React.FC<Props> = ({ listingId, hostId, onSavePublicSummary }) => {
  const { values, loading, saving, save } = useOwnershipDetails(listingId, hostId);
  const { docs, busy, upload, remove, openSigned } = useOwnershipDocuments(listingId, hostId);
  const [draft, setDraft] = useState<OwnershipPrivateValues>({});
  const [vinMode, setVinMode] = useState<'provide' | 'none'>('provide');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setDraft(values);
    setVinMode(values.vin_serial ? 'provide' : vinMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const set = (key: keyof OwnershipPrivateValues, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    setError(null);
    const next: OwnershipPrivateValues = {
      ...draft,
      vin_serial: vinMode === 'none' ? null : normalizeVin(draft.vin_serial),
    };
    const ok = await save(next);
    if (!ok) {
      setError('We could not save your ownership details. Nothing was published. Try again.');
      return;
    }
    await onSavePublicSummary(buildOwnershipPublicSummary(next));
    toast({
      title: 'Ownership details saved',
      description: 'Only a short summary such as title status is shown publicly.',
    });
  };


  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ownership details…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Private to you. Buyers only see a short summary such as “Clean title”, “Lien disclosed”
          or “Documentation available”. Identifiers, owner information, lienholder details and
          uploaded documents are never shown publicly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm">Titled owner</Label>
          <Input className="text-base" value={draft.titled_owner ?? ''} onChange={(e) => set('titled_owner', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Title name type</Label>
          <Select value={draft.title_name_type ?? ''} onValueChange={(v) => set('title_name_type', v)}>
            <SelectTrigger className="text-base"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['Individual', 'Business entity', 'Joint', 'Not sure'].map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Title state</Label>
          <Input className="text-base" value={draft.title_state ?? ''} onChange={(e) => set('title_state', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm">
            Title status
            <InfoTooltip content="How the unit is currently titled. This is your statement, not a VendiBook verification." />
          </Label>
          <Select value={draft.title_status ?? ''} onValueChange={(v) => set('title_status', v)}>
            <SelectTrigger className="text-base"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {TITLE_STATUS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="flex items-center gap-1.5 text-sm">
            VIN or serial number
            <InfoTooltip content="Stored privately. Never displayed on your public listing." />
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={vinMode === 'provide' ? 'default' : 'outline'}
              onClick={() => setVinMode('provide')}
              aria-pressed={vinMode === 'provide'}
            >
              Provide VIN or serial number
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vinMode === 'none' ? 'default' : 'outline'}
              onClick={() => {
                setVinMode('none');
                set('vin_serial', null);
              }}
              aria-pressed={vinMode === 'none'}
            >
              No VIN available
            </Button>
          </div>
          {vinMode === 'provide' && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="vin-serial" className="text-sm">VIN or serial number</Label>
              <Input
                id="vin-serial"
                className="text-base uppercase"
                value={draft.vin_serial ?? ''}
                onChange={(e) => set('vin_serial', e.target.value)}
                onBlur={(e) => set('vin_serial', normalizeVin(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Optional, but providing it helps identify the equipment and may speed financing review.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Manufacturer plate</Label>
          <Input className="text-base" value={draft.manufacturer_plate ?? ''} onChange={(e) => set('manufacturer_plate', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Title number</Label>
          <Input className="text-base" value={draft.title_number ?? ''} onChange={(e) => set('title_number', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Lienholder name</Label>
          <Input className="text-base" value={draft.lien_holder_name ?? ''} onChange={(e) => set('lien_holder_name', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        {([
          ['authority_to_sell', 'I have authority to sell this unit'],
          ['active_lien', 'There is an active lien'],
          ['lien_release_available', 'Lien release available'],
          ['documents_available', 'Documentation available on request'],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <span className="text-sm text-foreground">{label}</span>
            <Switch checked={Boolean(draft[key])} onCheckedChange={(v) => set(key, v)} />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Notes for serious buyers</Label>
        <Textarea
          className="text-base"
          value={draft.ownership_notes ?? ''}
          onChange={(e) => set('ownership_notes', e.target.value)}
        />
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-sm">
            <Lock className="h-3.5 w-3.5" /> Private documents
          </Label>
          <Button asChild size="sm" variant="outline" disabled={busy}>
            <label className="cursor-pointer">
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
              <input
                type="file" className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const ok = await upload(file);
                  if (!ok) toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
                  e.target.value = '';
                }}
              />
            </label>
          </Button>
        </div>
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Title, lien release, service records. Shared only through short-lived private links.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((doc) => (
              <li key={doc.path} className="flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left text-foreground hover:underline"
                  onClick={() => openSigned(doc.path)}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.name}</span>
                </button>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove document" onClick={() => remove(doc.path)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-border/60 bg-background/95 px-1 py-3 backdrop-blur">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {error ? 'Retry save' : 'Save ownership details'}
        </Button>
      </div>
    </div>
  );
};

export default OwnershipDetailsForm;
