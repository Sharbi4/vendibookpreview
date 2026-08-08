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
import { cn } from '@/lib/utils';
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
  /** Set after a failed "Continue" attempt so missing answers turn red. */
  showErrors?: boolean;
}

const errorRing = 'border-destructive ring-1 ring-destructive/40';

const FieldError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-medium text-destructive">{children}</p>
);

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
  showErrors = false,
}) => {
  const titled = isTitledAsset(category, mode);

  const titleMissing = showErrors && titled && !values.titleStatus;
  const lienMissing = showErrors && titled && !values.hasLien;
  const problemsMissing =
    showErrors && !values.noKnownProblems && values.knownProblems.length === 0;
  const includedMissing = showErrors && values.includedItems.trim().length < 3;
  const exclusionsMissing = showErrors && !values.photosExclusionsAnswered;

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

          <div
            id="listing-title-status"
            className={cn('space-y-2 rounded-lg p-2 -m-2', titleMissing && errorRing)}
          >
            <Label className="flex items-center gap-1 text-sm">
              Title status
              <RequiredMark />
              <FieldHelp label={FIELD_HELP.titleStatus.label}>
                {FIELD_HELP.titleStatus.text}
              </FieldHelp>
            </Label>
            <RadioGroup
              value={values.titleStatus}
              onValueChange={(v) => onChange({ titleStatus: v })}
              className="grid gap-2 sm:grid-cols-2"
            >
              {TITLE_STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`title-${opt.value}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50',
                    titleMissing && 'border-destructive/60',
                  )}
                >
                  <RadioGroupItem id={`title-${opt.value}`} value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
            {titleMissing && <FieldError>Select the title status to continue.</FieldError>}
          </div>

          <div
            id="listing-lien"
            className={cn('space-y-2 rounded-lg p-2 -m-2', lienMissing && errorRing)}
          >
            <Label className="flex items-center gap-1 text-sm">
              Lien disclosure
              <RequiredMark />
              <FieldHelp label={FIELD_HELP.lien.label}>{FIELD_HELP.lien.text}</FieldHelp>
            </Label>
            <RadioGroup
              value={values.hasLien}
              onValueChange={(v) => onChange({ hasLien: v })}
              className="grid gap-2"
            >
              {LIEN_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`lien-${opt.value}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50',
                    lienMissing && 'border-destructive/60',
                  )}
                >
                  <RadioGroupItem id={`lien-${opt.value}`} value={opt.value} />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
            {lienMissing && <FieldError>Answer the lien question to continue.</FieldError>}
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
        className={cn(
          'space-y-4 rounded-xl border border-border bg-card/40 p-4',
          problemsMissing && errorRing,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-1 text-sm font-semibold">
            Known problems
            <RequiredMark />
            <FieldHelp label={FIELD_HELP.knownIssues.label}>
              {FIELD_HELP.knownIssues.text}
            </FieldHelp>
          </Label>
          <VisibilityLabel kind="public" />
        </div>
        <p className="text-xs text-muted-foreground">
          Either confirm there are no known problems, or tick every area that needs work and
          explain it. Pick <strong>Other</strong> for anything that isn't listed.
        </p>

        <label
          className={cn(
            'flex items-center gap-2 rounded-lg border border-border p-3 text-sm',
            problemsMissing && 'border-destructive/60',
          )}
        >
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

        {/*
          The explanation box lives directly under the problem it belongs to.
          Sellers previously ticked a problem, saw a "add an explanation"
          error, and could not find the box because it rendered far below the
          checkbox grid.
        */}
        <div className="grid gap-2 sm:grid-cols-2">
          {KNOWN_PROBLEM_CATEGORIES.map((opt) => {
            const problem = values.knownProblems.find((p) => p.category === opt.value);
            const selected = Boolean(problem);
            const noteMissing =
              showErrors && !values.noKnownProblems && selected && (problem?.note ?? '').trim().length < 3;
            return (
              <div
                key={opt.value}
                className={cn(
                  'rounded-lg border border-border p-3 text-sm',
                  selected && 'sm:col-span-2 bg-muted/20',
                  (problemsMissing || noteMissing) && 'border-destructive/60',
                )}
              >
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={selected}
                    disabled={values.noKnownProblems}
                    onCheckedChange={(c) => toggleProblem(opt.value, c === true)}
                  />
                  {opt.label}
                </label>

                {selected && (
                  <div className="mt-3 space-y-1.5">
                    <Label
                      htmlFor={`known-problem-${opt.value}`}
                      className="flex items-center gap-1 text-xs"
                    >
                      Briefly explain: {opt.label}
                      <RequiredMark />
                    </Label>
                    <Textarea
                      id={`known-problem-${opt.value}`}
                      rows={2}
                      className={cn('text-base', noteMissing && errorRing)}
                      placeholder="What is wrong, and what would it take to fix?"
                      value={problem?.note ?? ''}
                      onChange={(e) => setNote(opt.value, e.target.value)}
                    />
                    {noteMissing && (
                      <FieldError>Add a short explanation for this problem.</FieldError>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {problemsMissing && (
          <FieldError>
            Choose “No known problems” or select at least one problem area to continue.
          </FieldError>
        )}

        {(() => {
          // Any stored problem whose category is no longer in the preset list
          // still needs its explanation box, otherwise it becomes unfixable.
          const orphans = values.knownProblems.filter(
            (p) => !KNOWN_PROBLEM_CATEGORIES.some((k) => k.value === p.category),
          );
          return orphans.map((p) => {
            const noteMissing = showErrors && (p.note ?? '').trim().length < 3;
            return (
              <div key={p.category} className="space-y-1.5">
                <Label
                  htmlFor={`known-problem-${p.category}`}
                  className="flex items-center gap-1 text-xs"
                >
                  Briefly explain: {p.category}
                  <RequiredMark />
                </Label>
                <Textarea
                  id={`known-problem-${p.category}`}
                  rows={2}
                  className={cn('text-base', noteMissing && errorRing)}
                  placeholder="What is wrong, and what would it take to fix?"
                  value={p.note ?? ''}
                  onChange={(e) => setNote(p.category, e.target.value)}
                />
                {noteMissing && <FieldError>Add a short explanation for this problem.</FieldError>}
              </div>
            );
          });
        })()}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="listing-included-items" className="flex items-center gap-1 text-sm font-semibold">
            What is included in the price
            <RequiredMark />
            <FieldHelp label={FIELD_HELP.itemsIncluded.label}>
              {FIELD_HELP.itemsIncluded.text}
            </FieldHelp>
          </Label>
          <VisibilityLabel kind="public" />
        </div>
        <Textarea
          id="listing-included-items"
          rows={3}
          className={cn('text-base', includedMissing && errorRing)}
          placeholder="e.g. flat top, 6-burner range, fryer, prep tables, 7kW generator, propane tanks"
          value={values.includedItems}
          onChange={(e) => onChange({ includedItems: e.target.value })}
        />
        {includedMissing && (
          <FieldError>Describe what the buyer receives for the advertised price.</FieldError>
        )}

        <div
          id="listing-photo-exclusions"
          className={cn('space-y-2 border-t border-border pt-4', exclusionsMissing && 'rounded-lg p-2')}
        >
          <Label className="flex items-center gap-1 text-sm font-semibold">
            Is anything shown in the photos not included?
            <RequiredMark />
          </Label>
          <RadioGroup
            value={exclusionChoice}
            onValueChange={(v) => {
              setExclusionChoice(v as 'no' | 'yes');
              onChange({
                photosExclusionsAnswered: true,
                photosExclusionsNote: v === 'no' ? '' : values.photosExclusionsNote,
              });
            }}
            className="grid gap-2 sm:grid-cols-2"
          >
            <label
              htmlFor="photo-excl-no"
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50',
                exclusionsMissing && 'border-destructive/60',
              )}
            >
              <RadioGroupItem id="photo-excl-no" value="no" />
              No — everything shown is included
            </label>
            <label
              htmlFor="photo-excl-yes"
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50',
                exclusionsMissing && 'border-destructive/60',
              )}
            >
              <RadioGroupItem id="photo-excl-yes" value="yes" />
              Yes — some items are excluded
            </label>
          </RadioGroup>
          {exclusionsMissing && <FieldError>Pick one answer to continue.</FieldError>}
          {exclusionChoice === 'yes' && (
            <Textarea
              rows={2}
              className="text-base"
              placeholder="List anything visible in the photos that the buyer does not receive."
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
