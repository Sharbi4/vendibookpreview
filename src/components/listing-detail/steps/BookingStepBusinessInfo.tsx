import { ArrowRight, ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

export interface BusinessInfoData {
  businessName: string;
  licenseType: string;
  licenseTypeOther?: string;
  businessDescription: string;
  employeesFullTime: string;
  employeesPartTime: string;
  hasWorkersComp: string; // 'yes' | 'no'
  isCertifiedManager: string; // 'yes' | 'no'
  productsToPrepare: string;
  equipmentToUse: string;
}

export const emptyBusinessInfo: BusinessInfoData = {
  businessName: '',
  licenseType: '',
  licenseTypeOther: '',
  businessDescription: '',
  employeesFullTime: '',
  employeesPartTime: '',
  hasWorkersComp: '',
  isCertifiedManager: '',
  productsToPrepare: '',
  equipmentToUse: '',
};

interface BookingStepBusinessInfoProps {
  data: BusinessInfoData;
  onChange: (data: BusinessInfoData) => void;
  onContinue: () => void;
  onBack: () => void;
}

const BookingStepBusinessInfo = ({
  data,
  onChange,
  onContinue,
  onBack,
}: BookingStepBusinessInfoProps) => {
  const handleChange = (field: keyof BusinessInfoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const isValid =
    data.businessName.trim() &&
    data.licenseType &&
    data.businessDescription &&
    data.hasWorkersComp &&
    data.isCertifiedManager &&
    data.productsToPrepare;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Business Details</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The host requires some information about your operation to ensure compliance.
        </p>
      </div>

      <div className="space-y-6">
        {/* SECTION ONE */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Section 1: Business Information
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name *</Label>
            <Input
              id="business-name"
              placeholder="Your business or company name"
              value={data.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
            />
          </div>
          
          <div className="space-y-3">
            <Label>1. Business license type</Label>
            <RadioGroup
              value={data.licenseType}
              onValueChange={(val) => handleChange('licenseType', val)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {[
                'Limited food manufacturing',
                'Catering',
                'Mobile food unit',
                'Temporary food services',
                'Other',
              ].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={`license-${type}`} />
                  <Label htmlFor={`license-${type}`} className="font-normal cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {data.licenseType === 'Other' && (
              <Input
                placeholder="Please specify..."
                value={data.licenseTypeOther || ''}
                onChange={(e) => handleChange('licenseTypeOther', e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-desc">2. Briefly describe your business, its products and markets</Label>
            <Textarea
              id="business-desc"
              placeholder="Describe your business operations..."
              value={data.businessDescription}
              onChange={(e) => handleChange('businessDescription', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ft-employees">3. Full-time Employees</Label>
              <Input
                id="ft-employees"
                type="number"
                min="0"
                placeholder="0"
                value={data.employeesFullTime}
                onChange={(e) => handleChange('employeesFullTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-employees">Part-time Employees</Label>
              <Input
                id="pt-employees"
                type="number"
                min="0"
                placeholder="0"
                value={data.employeesPartTime}
                onChange={(e) => handleChange('employeesPartTime', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>4. If you have employees, do you have worker's compensation insurance?</Label>
            <RadioGroup
              value={data.hasWorkersComp}
              onValueChange={(val) => handleChange('hasWorkersComp', val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="wc-yes" />
                <Label htmlFor="wc-yes" className="font-normal cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="wc-no" />
                <Label htmlFor="wc-no" className="font-normal cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>5. Are you a certified food protection manager?</Label>
            <RadioGroup
              value={data.isCertifiedManager}
              onValueChange={(val) => handleChange('isCertifiedManager', val)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="cfm-yes" />
                <Label htmlFor="cfm-yes" className="font-normal cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="cfm-no" />
                <Label htmlFor="cfm-no" className="font-normal cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <Separator />

        {/* SECTION TWO */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Section 2: Kitchen Use
          </h3>

          <div className="space-y-2">
            <Label htmlFor="products">6. Describe the products you intend to prepare</Label>
            <Textarea
              id="products"
              placeholder="List specific items you will be cooking or prepping..."
              value={data.productsToPrepare}
              onChange={(e) => handleChange('productsToPrepare', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">7. List the kitchen equipment you intend to use</Label>
            <Textarea
              id="equipment"
              placeholder="e.g., 60qt Mixer, Convection Oven, Walk-in Cooler..."
              value={data.equipmentToUse}
              onChange={(e) => handleChange('equipmentToUse', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onContinue} 
          disabled={!isValid}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BookingStepBusinessInfo;
