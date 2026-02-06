import { useState } from 'react';
import { CheckCircle2, Building2, ChefHat, Users, Utensils, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface BusinessInfoData {
  licenseType: string;
  licenseTypeOther?: string;
  hasFoodHandlersCert: boolean;
  hasKitchenManagerCert: boolean;
  hasLiabilityInsurance: boolean;
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
}

const LICENSE_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'cottage_food', label: 'Cottage Food License' },
  { value: 'other', label: 'Other' },
];

const EMPLOYEE_COUNTS = [
  { value: 'just_me', label: 'Just me' },
  { value: '2-3', label: '2-3 people' },
  { value: '4-6', label: '4-6 people' },
  { value: '7+', label: '7+ people' },
];

export const BusinessInfoStep = ({
  businessInfo,
  onBusinessInfoChange,
  onComplete,
  disabled,
}: BusinessInfoStepProps) => {
  const [formData, setFormData] = useState<BusinessInfoData>(
    businessInfo || {
      licenseType: '',
      licenseTypeOther: '',
      hasFoodHandlersCert: false,
      hasKitchenManagerCert: false,
      hasLiabilityInsurance: false,
      employeeCount: '',
      intendedUse: '',
      equipmentNeeded: '',
      cuisineType: '',
      additionalNotes: '',
    }
  );

  const updateField = <K extends keyof BusinessInfoData>(field: K, value: BusinessInfoData[K]) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onBusinessInfoChange(updated);
  };

  const isComplete = 
    formData.licenseType && 
    (formData.licenseType !== 'other' || formData.licenseTypeOther) &&
    formData.employeeCount &&
    formData.intendedUse.trim().length > 0 &&
    formData.cuisineType.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* License Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          What type of business license do you have?
        </Label>
        <RadioGroup
          value={formData.licenseType}
          onValueChange={(val) => updateField('licenseType', val)}
          className="grid grid-cols-2 gap-2"
        >
          {LICENSE_TYPES.map((type) => (
            <div key={type.value} className="relative">
              <RadioGroupItem
                value={type.value}
                id={`license-${type.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`license-${type.value}`}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                  "hover:border-primary/50 border-border"
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
            className="mt-2"
          />
        )}
      </div>

      {/* Certifications */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Do you have any of these certifications?
        </Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="foodHandlers"
              checked={formData.hasFoodHandlersCert}
              onCheckedChange={(checked) => updateField('hasFoodHandlersCert', checked === true)}
            />
            <Label htmlFor="foodHandlers" className="text-sm cursor-pointer">
              Food Handler's Certificate / ServSafe
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="kitchenManager"
              checked={formData.hasKitchenManagerCert}
              onCheckedChange={(checked) => updateField('hasKitchenManagerCert', checked === true)}
            />
            <Label htmlFor="kitchenManager" className="text-sm cursor-pointer">
              Kitchen Manager Certification
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="liability"
              checked={formData.hasLiabilityInsurance}
              onCheckedChange={(checked) => updateField('hasLiabilityInsurance', checked === true)}
            />
            <Label htmlFor="liability" className="text-sm cursor-pointer">
              Commercial Liability Insurance
            </Label>
          </div>
        </div>
      </div>

      {/* Employee Count */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          How many people will be working in the kitchen?
        </Label>
        <RadioGroup
          value={formData.employeeCount}
          onValueChange={(val) => updateField('employeeCount', val)}
          className="grid grid-cols-4 gap-2"
        >
          {EMPLOYEE_COUNTS.map((count) => (
            <div key={count.value} className="relative">
              <RadioGroupItem
                value={count.value}
                id={`employees-${count.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`employees-${count.value}`}
                className={cn(
                  "flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                  "hover:border-primary/50 border-border"
                )}
              >
                <span className="text-xs">{count.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Cuisine Type */}
      <div className="space-y-2">
        <Label htmlFor="cuisineType" className="text-sm font-medium flex items-center gap-2">
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

      {/* Intended Use */}
      <div className="space-y-2">
        <Label htmlFor="intendedUse" className="text-sm font-medium flex items-center gap-2">
          <Utensils className="h-4 w-4 text-primary" />
          What will you be using the kitchen for?
        </Label>
        <Textarea
          id="intendedUse"
          placeholder="Describe your cooking activities (e.g., meal prep for delivery app, catering orders, food truck commissary...)"
          value={formData.intendedUse}
          onChange={(e) => updateField('intendedUse', e.target.value)}
          rows={3}
        />
      </div>

      {/* Equipment Needed */}
      <div className="space-y-2">
        <Label htmlFor="equipment" className="text-sm font-medium">
          What equipment will you need to use? (optional)
        </Label>
        <Textarea
          id="equipment"
          placeholder="List any specific equipment (ovens, grills, mixers, etc.)"
          value={formData.equipmentNeeded}
          onChange={(e) => updateField('equipmentNeeded', e.target.value)}
          rows={2}
        />
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">
          Any additional information for the host? (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="Anything else the host should know..."
          value={formData.additionalNotes || ''}
          onChange={(e) => updateField('additionalNotes', e.target.value)}
          rows={2}
        />
      </div>

      <Button
        onClick={onComplete}
        disabled={disabled || !isComplete}
        variant="dark-shine"
        className="w-full"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Continue
      </Button>
    </div>
  );
};
