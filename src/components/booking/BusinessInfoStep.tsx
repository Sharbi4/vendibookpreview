import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Building2,
  ChefHat,
  Users,
  Utensils,
  BadgeCheck,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { InsuranceEducationCard } from '@/components/booking/InsuranceEducationCard';

/**
 * Data shape is unchanged for backward compatibility with existing
 * booking_requests rows. `hasLiabilityInsurance` stays boolean; the tri-state
 * answer is stored alongside it in `liabilityInsuranceAnswer`.
 */
export interface BusinessInfoData {
  licenseType: string;
  licenseTypeOther?: string;
  hasFoodHandlersCert: boolean;
  hasKitchenManagerCert: boolean;
  hasLiabilityInsurance: boolean;
  /** 'yes' | 'no' | 'unsure' — optional, added without breaking old records. */
  liabilityInsuranceAnswer?: 'yes' | 'no' | 'unsure';
  employeeCount: string;
  intendedUse: string;
  equipmentNeeded: string;
  cuisineType: string;
  additionalNotes?: string;
}

interface BusinessInfoStepProps {
  businessInfo: BusinessInfoData | null;
  onBusinessInfoChange: (info: BusinessInfoData) => void;
  onComplete: () => void;
  disabled?: boolean;
  /** Listing category — drives kitchen vs. truck/trailer wording. */
  category?: string;
}

const LICENSE_TYPES = [
  { value: 'none', label: 'No business license' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'cottage_food', label: 'Cottage Food License' },
  { value: 'other', label: 'Other' },
];

const EMPLOYEE_COUNTS = [
  { value: 'just_me', label: 'Just me' },
  { value: '2-3', label: '2–3 people' },
  { value: '4-6', label: '4–6 people' },
  { value: '7+', label: '7+ people' },
];

const INSURANCE_ANSWERS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
] as const;

function copyForCategory(category?: string) {
  const mobile = category === 'food_truck' || category === 'food_trailer';
  const noun = category === 'food_trailer' ? 'trailer' : mobile ? 'truck' : 'kitchen';
  return {
    mobile,
    noun,
    intro: `Help the host understand your business and how you'll use the ${noun}.`,
    staffing: mobile
      ? `How many people will be working with the ${noun}?`
      : 'How many people will be working in the kitchen?',
    use: mobile
      ? `What will you be using the ${noun} for?`
      : 'What will you be using the kitchen for?',
    usePlaceholder: mobile
      ? 'Describe how you will operate (e.g., weekend events, catering orders, festival service...)'
      : 'Describe your cooking activities (e.g., meal prep for delivery app, catering orders, food truck commissary...)',
  };
}

/**
 * Question-by-question business & use wizard. One logical question group per
 * slide — never a single giant form.
 */
export const BusinessInfoStep = ({
  businessInfo,
  onBusinessInfoChange,
  onComplete,
  disabled,
  category,
}: BusinessInfoStepProps) => {
  const copy = useMemo(() => copyForCategory(category), [category]);
  const [slide, setSlide] = useState(0);
  const [formData, setFormData] = useState<BusinessInfoData>(
    businessInfo || {
      licenseType: '',
      licenseTypeOther: '',
      hasFoodHandlersCert: false,
      hasKitchenManagerCert: false,
      hasLiabilityInsurance: false,
      liabilityInsuranceAnswer: undefined,
      employeeCount: '',
      intendedUse: '',
      equipmentNeeded: '',
      cuisineType: '',
      additionalNotes: '',
    },
  );

  const updateField = <K extends keyof BusinessInfoData>(field: K, value: BusinessInfoData[K]) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onBusinessInfoChange(updated);
  };

  const slides = ['intro', 'license', 'certs', 'insurance', 'staffing', 'use', 'extras'] as const;
  const current = slides[slide];

  const canAdvance = (() => {
    switch (current) {
      case 'license':
        return Boolean(
          formData.licenseType && (formData.licenseType !== 'other' || formData.licenseTypeOther?.trim()),
        );
      case 'insurance':
        return Boolean(formData.liabilityInsuranceAnswer);
      case 'staffing':
        return Boolean(formData.employeeCount);
      case 'use':
        return Boolean(formData.cuisineType.trim() && formData.intendedUse.trim());
      default:
        return true;
    }
  })();

  const isLast = slide === slides.length - 1;

  const next = () => {
    if (isLast) onComplete();
    else setSlide((s) => Math.min(s + 1, slides.length - 1));
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {slides.map((s, i) => (
          <span
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= slide ? 'bg-primary' : 'bg-border',
            )}
          />
        ))}
      </div>

      {current === 'intro' && (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            Tell the host about your business
          </h3>
          <p className="text-sm text-muted-foreground">{copy.intro}</p>
          <p className="text-sm text-muted-foreground">
            A few short questions — about a minute.
          </p>
        </div>
      )}

      {current === 'license' && (
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            What type of business license do you have?
          </Label>
          <RadioGroup
            value={formData.licenseType}
            onValueChange={(val) => updateField('licenseType', val)}
            className="grid gap-2 sm:grid-cols-2"
          >
            {LICENSE_TYPES.map((type) => (
              <div key={type.value} className="relative">
                <RadioGroupItem value={type.value} id={`license-${type.value}`} className="peer sr-only" />
                <Label
                  htmlFor={`license-${type.value}`}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all',
                    'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                    'hover:border-primary/50 border-border',
                  )}
                >
                  <span className="text-sm">{type.label}</span>
                  {formData.licenseType === type.value && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {formData.licenseType === 'other' && (
            <Input
              placeholder="Please specify your license type"
              value={formData.licenseTypeOther || ''}
              onChange={(e) => updateField('licenseTypeOther', e.target.value)}
            />
          )}
        </div>
      )}

      {current === 'certs' && (
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Do you have any of these certifications?
          </Label>
          <p className="text-sm text-muted-foreground">Select all that apply — it's fine if you have none.</p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 rounded-xl border border-border p-3.5">
              <Checkbox
                id="foodHandlers"
                checked={formData.hasFoodHandlersCert}
                onCheckedChange={(checked) => updateField('hasFoodHandlersCert', checked === true)}
              />
              <Label htmlFor="foodHandlers" className="text-sm cursor-pointer">
                Food Handler's Certificate / ServSafe
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-xl border border-border p-3.5">
              <Checkbox
                id="kitchenManager"
                checked={formData.hasKitchenManagerCert}
                onCheckedChange={(checked) => updateField('hasKitchenManagerCert', checked === true)}
              />
              <Label htmlFor="kitchenManager" className="text-sm cursor-pointer">
                Kitchen Manager Certification
              </Label>
            </div>
          </div>
        </div>
      )}

      {current === 'insurance' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Do you currently have Commercial General Liability Insurance?
            </Label>
            <RadioGroup
              value={formData.liabilityInsuranceAnswer ?? ''}
              onValueChange={(val) => {
                const answer = val as 'yes' | 'no' | 'unsure';
                const updated = {
                  ...formData,
                  liabilityInsuranceAnswer: answer,
                  hasLiabilityInsurance: answer === 'yes',
                };
                setFormData(updated);
                onBusinessInfoChange(updated);
              }}
              className="grid grid-cols-3 gap-2"
            >
              {INSURANCE_ANSWERS.map((opt) => (
                <div key={opt.value} className="relative">
                  <RadioGroupItem value={opt.value} id={`ins-${opt.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`ins-${opt.value}`}
                    className={cn(
                      'flex items-center justify-center rounded-xl border p-3.5 cursor-pointer transition-all text-sm',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                      'hover:border-primary/50 border-border',
                    )}
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {(formData.liabilityInsuranceAnswer === 'no' ||
              formData.liabilityInsuranceAnswer === 'unsure') && <InsuranceEducationCard />}
          </div>
        </div>
      )}

      {current === 'staffing' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {copy.staffing}
            </Label>
            <RadioGroup
              value={formData.employeeCount}
              onValueChange={(val) => updateField('employeeCount', val)}
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {EMPLOYEE_COUNTS.map((count) => (
                <div key={count.value} className="relative">
                  <RadioGroupItem value={count.value} id={`employees-${count.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`employees-${count.value}`}
                    className={cn(
                      'flex items-center justify-center rounded-xl border p-3.5 cursor-pointer transition-all text-center text-sm',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                      'hover:border-primary/50 border-border',
                    )}
                  >
                    {count.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      )}

      {current === 'use' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cuisineType" className="text-base font-semibold flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-primary" />
              What type of cuisine will you be preparing?
            </Label>
            <Input
              id="cuisineType"
              placeholder="e.g., Mexican, BBQ, Vegan, Desserts..."
              value={formData.cuisineType}
              onChange={(e) => updateField('cuisineType', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intendedUse" className="text-base font-semibold flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              {copy.use}
            </Label>
            <Textarea
              id="intendedUse"
              placeholder={copy.usePlaceholder}
              value={formData.intendedUse}
              onChange={(e) => updateField('intendedUse', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}

      {current === 'extras' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="equipment" className="text-base font-semibold">
              What equipment will you need to use? <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="equipment"
              placeholder="List any specific equipment (ovens, grills, mixers, etc.)"
              value={formData.equipmentNeeded}
              onChange={(e) => updateField('equipmentNeeded', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold">
              Any additional information for the host?{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Anything else the host should know..."
              value={formData.additionalNotes || ''}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      )}

      {!canAdvance && slide > 0 && (
        <p className="text-sm text-muted-foreground">Select an answer above to continue.</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        {slide > 0 && (
          <Button variant="outline" onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={disabled}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <Button onClick={next} disabled={disabled || !canAdvance} variant="dark-shine" className="flex-1">
          {isLast ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Continue
            </>
          ) : (
            <>
              {slide === 0 ? 'Get started' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BusinessInfoStep;
