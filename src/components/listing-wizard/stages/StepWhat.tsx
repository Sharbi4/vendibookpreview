import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FieldHelp } from '@/components/common/FieldHelp';
import { VisibilityLabel } from '@/components/common/VisibilityLabel';
import { FIELD_HELP } from '@/lib/listings/fieldHelp';
import {
  CONDITION_OPTIONS,
  READINESS_OPTIONS,
  getCategoryBasics,
} from '@/lib/listings/stages';
import type { ListingCategory } from '@/types/listing';
import { CATEGORY_LABELS } from '@/types/listing';

export interface StepWhatValues {
  modelYear: string;
  kitchenBuildYear: string;
  kitchenBuildYearUnknown: boolean;
  condition: string;
  operationalStatus: string;
  lengthInches: string;
  widthInches: string;
  heightInches: string;
}

export interface StepWhatProps {
  category: ListingCategory;
  mode: 'rent' | 'sale';
  values: StepWhatValues;
  onChange: (patch: Partial<StepWhatValues>) => void;
}

/**
 * Stage 1 — WHAT. Category-aware basics only. Deep specifications are collected
 * after publishing through the readiness system, never here.
 */
export const StepWhat: React.FC<StepWhatProps> = ({ category, mode, values, onChange }) => {
  const basics = getCategoryBasics(category);
  const readinessOptions = READINESS_OPTIONS[basics.readiness];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">What are you listing?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the option that best describes your equipment so we can ask only the questions
          that apply to it.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium">
            {CATEGORY_LABELS[category]} · {mode === 'sale' ? 'For sale' : 'For rent'}
          </span>
          <VisibilityLabel kind="public" />
        </div>
      </div>

      {(basics.modelYear || basics.kitchenBuildYear) && (
        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h3 className="text-sm font-semibold">Years</h3>

          {basics.modelYear && (
            <div className="space-y-1.5">
              <Label htmlFor="listing-model-year" className="flex items-center gap-1">
                Vehicle / trailer model year
                <FieldHelp label={FIELD_HELP.modelYear.label}>
                  {FIELD_HELP.modelYear.text}
                </FieldHelp>
              </Label>
              <Input
                id="listing-model-year"
                inputMode="numeric"
                placeholder="e.g. 2016"
                className="text-base"
                value={values.modelYear}
                onChange={(e) => onChange({ modelYear: e.target.value.replace(/[^0-9]/g, '') })}
              />
            </div>
          )}

          {basics.kitchenBuildYear && (
            <div className="space-y-1.5">
              <Label htmlFor="listing-kitchen-year" className="flex items-center gap-1">
                Kitchen build / conversion year
                <FieldHelp label={FIELD_HELP.kitchenBuildYear.label}>
                  {FIELD_HELP.kitchenBuildYear.text}
                </FieldHelp>
              </Label>
              <Input
                id="listing-kitchen-year"
                inputMode="numeric"
                placeholder="e.g. 2021"
                className="text-base"
                disabled={values.kitchenBuildYearUnknown}
                value={values.kitchenBuildYearUnknown ? '' : values.kitchenBuildYear}
                onChange={(e) =>
                  onChange({ kitchenBuildYear: e.target.value.replace(/[^0-9]/g, '') })
                }
              />
              <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
                <Checkbox
                  checked={values.kitchenBuildYearUnknown}
                  onCheckedChange={(c) =>
                    onChange({
                      kitchenBuildYearUnknown: c === true,
                      ...(c === true ? { kitchenBuildYear: '' } : {}),
                    })
                  }
                />
                Not sure
              </label>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <Label className="flex items-center gap-1 text-sm font-semibold">
          Condition
          <FieldHelp label={FIELD_HELP.condition.label}>{FIELD_HELP.condition.text}</FieldHelp>
        </Label>
        <RadioGroup
          id="listing-condition"
          value={values.condition}
          onValueChange={(v) => onChange({ condition: v })}
          className="grid gap-2 sm:grid-cols-2"
        >
          {CONDITION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`condition-${opt.value}`}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50"
            >
              <RadioGroupItem id={`condition-${opt.value}`} value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <Label className="flex items-center gap-1 text-sm font-semibold">
          Operational status
          <FieldHelp label={FIELD_HELP.operationalStatus.label}>
            {FIELD_HELP.operationalStatus.text}
          </FieldHelp>
        </Label>
        <RadioGroup
          id="listing-operational-status"
          value={values.operationalStatus}
          onValueChange={(v) => onChange({ operationalStatus: v })}
          className="grid gap-2"
        >
          {readinessOptions.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`readiness-${opt.value}`}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50"
            >
              <RadioGroupItem id={`readiness-${opt.value}`} value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </section>

      {basics.dimensions && (
        <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Basic dimensions</h3>
            <VisibilityLabel kind="optional" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['lengthInches', 'Length (in)'],
                ['widthInches', 'Width (in)'],
                ['heightInches', 'Height (in)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`dim-${key}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`dim-${key}`}
                  inputMode="numeric"
                  className="text-base"
                  value={values[key]}
                  onChange={(e) => onChange({ [key]: e.target.value.replace(/[^0-9.]/g, '') })}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StepWhat;
