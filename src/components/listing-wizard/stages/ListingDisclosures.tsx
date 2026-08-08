import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FieldHelp } from '@/components/common/FieldHelp';
import { VisibilityLabel } from '@/components/common/VisibilityLabel';
import { RequiredMark, RequiredLegend } from '@/components/common/RequiredMark';
import { FIELD_HELP } from '@/lib/listings/fieldHelp';
import {
  KNOWN_PROBLEM_CATEGORIES,
  LIEN_OPTIONS,
  TITLE_STATUS_OPTIONS,
  isTitledAsset,
  type KnownProblem,
} from '@/lib/listings/stages';
import type { ListingCategory } from '@/types/listing';

export interface DisclosureValues {
  titleStatus: string;
  hasLien: string;
  noKnownProblems: boolean;
  knownProblems: KnownProblem[];
  includedItems: string;
  photosExclusionsAnswered: boolean;
  photosExclusionsNote: string;
  priceNegotiable: boolean;
  acceptsOffers: boolean;
  minOfferAmount: string;
}

export interface ListingDisclosuresProps {
  category: ListingCategory;
  mode: 'rent' | 'sale';
  values: DisclosureValues;
  onChange: (patch: Partial<DisclosureValues>) => void;
  /** Private VIN / serial — stored on listing_ownership_details only. */
  vinSerial?: string;
  vinUnavailable?: boolean;
  onVinChange?: (patch: { vinSerial?: string; vinUnavailable?: boolean }) => void;
}

/**
 * Stage 3 sections that carry legal/disclosure weight: title + lien (titled
 * sale assets only), known-problem disclosure, inclusions, and the required
 * "anything in the photos not included?" answer.
 *
 * Full VIN, title numbers, lienholder details and ownership documents are
 * deliberately NOT collected here — only the status-level disclosure is.
 */
export const ListingDisclosures: React.FC<ListingDisclosuresProps> = ({
  category,
  mode,
  values,
  onChange,
  vinSerial = '',
  vinUnavailable = false,
  onVinChange,
}) => {
  const titled = isTitledAsset(category, mode);

  const toggleProblem = (value: string, checked: boolean) => {
    if (checked) {
      onChange({
        noKnownProblems: false,
        knownProblems: [...values.knownProblems, { category: value, note: '', photo_url: null }],
      });
    } else {
      onChange({ knownProblems: values.knownProblems.filter((p) => p.category !== value) });
    }
  };

  const setNote = (value: string, note: string) => {
    onChange({
      knownProblems: values.knownProblems.map((p) =>
        p.category === value ? { ...p, note } : p,
      ),
    });
  };

  return (
    <div className="space-y-6">
      {titled && (
        <section className="space-y-5 rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Title and ownership</h3>
            <VisibilityLabel kind="public" />
          </div>
          <p className="text-xs text-muted-foreground">
            Only the status below is shown publicly. Do not enter a VIN, title number or
            lienholder details anywhere in your listing.
          </p>
          <RequiredLegend />

          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm">
              Title status
              <RequiredMark />
              <FieldHelp label={FIELD_HELP.titleStatus.label}>
                {FIELD_HELP.titleStatus.text}
              </FieldHelp>
            </Label>
            <RadioGroup
              id="listing-title-status"
              value={values.titleStatus}
              onValueChange={(v) => onChange({ titleStatus: v })}
              className="grid gap-2 sm:grid-cols-2"
            >
              {TITLE_STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`title-${opt.value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50"
                >
                  <RadioGroupItem id={`title-${opt.value}`} value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm">
              Lien disclosure
              <RequiredMark />
              <FieldHelp label={FIELD_HELP.lien.label}>{FIELD_HELP.lien.text}</FieldHelp>
            </Label>
            <RadioGroup
              id="listing-lien"
              value={values.hasLien}
              onValueChange={(v) => onChange({ hasLien: v })}
              className="grid gap-2"
            >
              {LIEN_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`lien-${opt.value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50"
                >
                  <RadioGroupItem id={`lien-${opt.value}`} value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {onVinChange && (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Provide VIN or serial number</Label>
                <VisibilityLabel kind="paperwork" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={vinUnavailable}
                  onCheckedChange={(c) =>
                    onVinChange({ vinUnavailable: c === true, ...(c === true ? { vinSerial: '' } : {}) })
                  }
                />
                No VIN available
              </label>
              {!vinUnavailable && (
                <Input
                  id="listing-vin-serial"
                  className="text-base"
                  placeholder="VIN or serial number"
                  value={vinSerial}
                  onChange={(e) => onVinChange({ vinSerial: e.target.value })}
                  onBlur={(e) => onVinChange({ vinSerial: e.target.value.trim().toUpperCase() })}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Optional, and never shown on your public listing or in search. It <strong>is</strong>{' '}
                printed on the financing purchase sheet / pro forma invoice when a buyer generates
                one, and it may be shared with the lender and on sale paperwork. It never affects
                publishing.
              </p>
            </div>
          )}
        </section>
      )}

      <section
        id="listing-known-problems"
        className="space-y-4 rounded-xl border border-border bg-card/40 p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-1 text-sm font-semibold">
            Known problems
            <FieldHelp label={FIELD_HELP.knownIssues.label}>
              {FIELD_HELP.knownIssues.text}
            </FieldHelp>
          </Label>
          <VisibilityLabel kind="public" />
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
          <Checkbox
            checked={values.noKnownProblems}
            onCheckedChange={(c) =>
              onChange({
                noKnownProblems: c === true,
                ...(c === true ? { knownProblems: [] } : {}),
              })
            }
          />
          No known problems
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          {KNOWN_PROBLEM_CATEGORIES.map((opt) => {
            const selected = values.knownProblems.some((p) => p.category === opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <Checkbox
                  checked={selected}
                  disabled={values.noKnownProblems}
                  onCheckedChange={(c) => toggleProblem(opt.value, c === true)}
                />
                {opt.label}
              </label>
            );
          })}
        </div>

        {values.knownProblems.map((p) => {
          const meta = KNOWN_PROBLEM_CATEGORIES.find((k) => k.value === p.category);
          return (
            <div key={p.category} className="space-y-1.5">
              <Label htmlFor={`known-problem-${p.category}`} className="text-xs">
                Briefly explain: {meta?.label ?? p.category}
              </Label>
              <Textarea
                id={`known-problem-${p.category}`}
                rows={2}
                className="text-base"
                placeholder="What is wrong, and what would it take to fix?"
                value={p.note}
                onChange={(e) => setNote(p.category, e.target.value)}
              />
            </div>
          );
        })}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="listing-included-items" className="flex items-center gap-1 text-sm font-semibold">
            What is included in the price
            <FieldHelp label={FIELD_HELP.itemsIncluded.label}>
              {FIELD_HELP.itemsIncluded.text}
            </FieldHelp>
          </Label>
          <VisibilityLabel kind="public" />
        </div>
        <Textarea
          id="listing-included-items"
          rows={3}
          className="text-base"
          placeholder="e.g. flat top, 6-burner range, fryer, prep tables, 7kW generator, propane tanks"
          value={values.includedItems}
          onChange={(e) => onChange({ includedItems: e.target.value })}
        />

        <div className="space-y-2 border-t border-border pt-4">
          <Label className="text-sm font-semibold">
            Is anything shown in the photos not included?
          </Label>
          <RadioGroup
            id="listing-photo-exclusions"
            value={
              values.photosExclusionsAnswered
                ? values.photosExclusionsNote.trim()
                  ? 'yes'
                  : 'no'
                : ''
            }
            onValueChange={(v) =>
              onChange({
                photosExclusionsAnswered: true,
                photosExclusionsNote: v === 'no' ? '' : values.photosExclusionsNote,
              })
            }
            className="grid gap-2 sm:grid-cols-2"
          >
            <label
              htmlFor="photo-excl-no"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50"
            >
              <RadioGroupItem id="photo-excl-no" value="no" />
              No — everything shown is included
            </label>
            <label
              htmlFor="photo-excl-yes"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50"
            >
              <RadioGroupItem id="photo-excl-yes" value="yes" />
              Yes — some items are excluded
            </label>
          </RadioGroup>
          {values.photosExclusionsAnswered && (
            <Textarea
              rows={2}
              className="text-base"
              placeholder="List anything visible in the photos that the buyer does not receive (leave blank if everything is included)."
              value={values.photosExclusionsNote}
              onChange={(e) => onChange({ photosExclusionsNote: e.target.value })}
            />
          )}
        </div>
      </section>

      {mode === 'sale' && (
        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h3 className="text-sm font-semibold">Offers</h3>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.priceNegotiable}
              onCheckedChange={(c) => onChange({ priceNegotiable: c === true })}
            />
            <span className="flex items-center gap-1">
              Price is negotiable
              <FieldHelp label={FIELD_HELP.priceNegotiable.label}>
                {FIELD_HELP.priceNegotiable.text}
              </FieldHelp>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.acceptsOffers}
              onCheckedChange={(c) =>
                onChange({
                  acceptsOffers: c === true,
                  ...(c === true ? {} : { minOfferAmount: '' }),
                })
              }
            />
            Accept offers from buyers
          </label>
          {values.acceptsOffers && (
            <div className="space-y-1.5">
              <Label htmlFor="listing-min-offer" className="flex items-center gap-1 text-sm">
                Private minimum offer
                <FieldHelp label={FIELD_HELP.minimumOffer.label}>
                  {FIELD_HELP.minimumOffer.text}
                </FieldHelp>
              </Label>
              <Input
                id="listing-min-offer"
                inputMode="decimal"
                className="text-base"
                placeholder="$"
                value={values.minOfferAmount}
                onChange={(e) =>
                  onChange({ minOfferAmount: e.target.value.replace(/[^0-9.]/g, '') })
                }
              />
              <VisibilityLabel kind="private" />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ListingDisclosures;
