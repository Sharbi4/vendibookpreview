import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldHelp } from '@/components/common/FieldHelp';
import { VisibilityLabel } from '@/components/common/VisibilityLabel';
import { RequiredMark, RequiredLegend } from '@/components/common/RequiredMark';
import { FIELD_HELP } from '@/lib/listings/fieldHelp';
import { cn } from '@/lib/utils';
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
  /** Set after a failed "Continue" attempt so missing answers turn red. */
  showErrors?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 1 - 1960 + 1 }, (_, i) =>
  String(CURRENT_YEAR + 1 - i),
);

const errorRing = 'border-destructive ring-1 ring-destructive/40';

/**
 * Stage 1 — WHAT. Category-aware basics only. Deep specifications are collected
 * after publishing through the readiness system, never here.
 */
export const StepWhat: React.FC<StepWhatProps> = ({
  category,
  mode,
  values,
  onChange,
  showErrors = false,
}) => {
  const basics = getCategoryBasics(category);
  const readinessOptions = READINESS_OPTIONS[basics.readiness];

  const conditionMissing = showErrors && !values.condition;
  const statusMissing = showErrors && !values.operationalStatus;

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
        <RequiredLegend className="mt-3" />
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
              <Select
                value={values.modelYear || undefined}
                onValueChange={(v) => onChange({ modelYear: v })}
              >
                <SelectTrigger id="listing-model-year" className="text-base">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                value={values.kitchenBuildYearUnknown ? undefined : values.kitchenBuildYear || undefined}
                onValueChange={(v) => onChange({ kitchenBuildYear: v })}
                disabled={values.kitchenBuildYearUnknown}
              >
                <SelectTrigger id="listing-kitchen-year" className="text-base">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <section
        id="listing-condition"
        className={cn(
          'space-y-3 rounded-xl border border-border bg-card/40 p-4',
          conditionMissing && errorRing,
        )}
      >
        <Label className="flex items-center gap-1 text-sm font-semibold">
          Condition
          <RequiredMark />
          <FieldHelp label={FIELD_HELP.condition.label}>{FIELD_HELP.condition.text}</FieldHelp>
        </Label>
        <RadioGroup
          value={values.condition}
          onValueChange={(v) => onChange({ condition: v })}
          className="grid gap-2 sm:grid-cols-2"
        >
          {CONDITION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`condition-${opt.value}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50',
                conditionMissing && 'border-destructive/60',
              )}
            >
              <RadioGroupItem id={`condition-${opt.value}`} value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
        {conditionMissing && (
          <p className="text-xs font-medium text-destructive">Select the overall condition to continue.</p>
        )}
      </section>

      <section
        id="listing-operational-status"
        className={cn(
          'space-y-3 rounded-xl border border-border bg-card/40 p-4',
          statusMissing && errorRing,
        )}
      >
        <Label className="flex items-center gap-1 text-sm font-semibold">
          Operational status
          <RequiredMark />
          <FieldHelp label={FIELD_HELP.operationalStatus.label}>
            {FIELD_HELP.operationalStatus.text}
          </FieldHelp>
        </Label>
        <RadioGroup
          value={values.operationalStatus}
          onValueChange={(v) => onChange({ operationalStatus: v })}
          className="grid gap-2"
        >
          {readinessOptions.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`readiness-${opt.value}`}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-primary/50',
                statusMissing && 'border-destructive/60',
              )}
            >
              <RadioGroupItem id={`readiness-${opt.value}`} value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
        {statusMissing && (
          <p className="text-xs font-medium text-destructive">
            Pick one option so buyers know its current state.
          </p>
        )}
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
