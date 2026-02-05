import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ValidatedInput, validators } from '@/components/ui/validated-input';
import NextStepHint from '@/components/shared/NextStepHint';
import InfoPopover from '@/components/shared/InfoPopover';
import { User, MapPin, Phone, Building2 } from 'lucide-react';

// US States list
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export interface BuyerInfo {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PurchaseStepInfoProps {
  buyerInfo: BuyerInfo;
  updateBuyerInfo: <K extends keyof BuyerInfo>(field: K, value: BuyerInfo[K]) => void;
  deliveryInstructions: string;
  setDeliveryInstructions: (value: string) => void;
  fulfillmentSelected: 'pickup' | 'delivery' | 'vendibook_freight';
  // Validation
  fieldErrors: Record<string, string | undefined>;
  touchedFields: Set<string>;
  setTouchedFields: (fields: Set<string>) => void;
  // Navigation
  onBack: () => void;
  onContinue: () => void;
}

const PurchaseStepInfo = ({
  buyerInfo,
  updateBuyerInfo,
  deliveryInstructions,
  setDeliveryInstructions,
  fulfillmentSelected,
  fieldErrors,
  touchedFields,
  setTouchedFields,
  onBack,
  onContinue,
}: PurchaseStepInfoProps) => {
  const handleFieldTouch = (field: string) => {
    setTouchedFields(new Set([...touchedFields, field]));
  };

  const showDeliveryInstructions = fulfillmentSelected === 'delivery' || fulfillmentSelected === 'vendibook_freight';

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Your information</h2>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          Used for receipts, coordination, and delivery scheduling.
          <InfoPopover title="Why we need this">
            <p>Sellers and VendiBook support use this to coordinate pickup/delivery and resolve issues.</p>
            <p className="mt-2">Your information is kept private and only shared with parties involved in this transaction.</p>
          </InfoPopover>
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Personal Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Personal Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ValidatedInput
              id="firstName"
              label="First Name"
              value={buyerInfo.firstName}
              onChange={(value) => updateBuyerInfo('firstName', value)}
              placeholder="John"
              error={fieldErrors.firstName}
              touched={touchedFields.has('firstName')}
              onBlur={() => handleFieldTouch('firstName')}
              required
            />
            <ValidatedInput
              id="lastName"
              label="Last Name"
              value={buyerInfo.lastName}
              onChange={(value) => updateBuyerInfo('lastName', value)}
              placeholder="Smith"
              error={fieldErrors.lastName}
              touched={touchedFields.has('lastName')}
              onBlur={() => handleFieldTouch('lastName')}
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="businessName" className="text-sm text-muted-foreground">
                Business Name (optional)
              </Label>
            </div>
            <Input
              id="businessName"
              value={buyerInfo.businessName}
              onChange={(e) => updateBuyerInfo('businessName', e.target.value)}
              placeholder="Your Company LLC"
              className="h-10"
            />
          </div>
        </div>

        {/* Contact Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Contact</h3>
          </div>

          <ValidatedInput
            id="email"
            label="Email Address"
            type="email"
            value={buyerInfo.email}
            onChange={(value) => updateBuyerInfo('email', value)}
            placeholder="john@example.com"
            error={fieldErrors.email}
            touched={touchedFields.has('email')}
            onBlur={() => handleFieldTouch('email')}
            required
          />

          <ValidatedInput
            id="phone"
            label="Phone Number"
            type="tel"
            value={buyerInfo.phone}
            onChange={(value) => updateBuyerInfo('phone', value)}
            placeholder="(555) 123-4567"
            error={fieldErrors.phone}
            touched={touchedFields.has('phone')}
            onBlur={() => handleFieldTouch('phone')}
            formatPhone
            maxLength={14}
            required
            helperText="Used to contact you about this purchase"
          />
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Your Address</h3>
          </div>

          <ValidatedInput
            id="address1"
            label="Address Line 1"
            value={buyerInfo.address1}
            onChange={(value) => updateBuyerInfo('address1', value)}
            placeholder="123 Main Street"
            error={fieldErrors.address1}
            touched={touchedFields.has('address1')}
            onBlur={() => handleFieldTouch('address1')}
            required
          />

          <div className="space-y-1">
            <Label htmlFor="address2" className="text-sm text-muted-foreground">
              Address Line 2 (optional)
            </Label>
            <Input
              id="address2"
              value={buyerInfo.address2}
              onChange={(e) => updateBuyerInfo('address2', e.target.value)}
              placeholder="Apt, Suite, Unit, etc."
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <ValidatedInput
                id="city"
                label="City"
                value={buyerInfo.city}
                onChange={(value) => updateBuyerInfo('city', value)}
                placeholder="Austin"
                error={fieldErrors.city}
                touched={touchedFields.has('city')}
                onBlur={() => handleFieldTouch('city')}
                required
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="state" className="text-sm text-muted-foreground block mb-1">
                State <span className="text-destructive">*</span>
              </Label>
              <select
                id="state"
                value={buyerInfo.state}
                onChange={(e) => updateBuyerInfo('state', e.target.value)}
                onBlur={() => handleFieldTouch('state')}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  touchedFields.has('state') && fieldErrors.state 
                    ? 'border-destructive focus-visible:ring-destructive' 
                    : 'border-input'
                }`}
              >
                <option value="">-</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              {touchedFields.has('state') && fieldErrors.state && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.state}</p>
              )}
            </div>
            <div className="col-span-2">
              <ValidatedInput
                id="zipCode"
                label="ZIP Code"
                value={buyerInfo.zipCode}
                onChange={(value) => updateBuyerInfo('zipCode', value)}
                placeholder="78701"
                error={fieldErrors.zipCode}
                touched={touchedFields.has('zipCode')}
                onBlur={() => handleFieldTouch('zipCode')}
                maxLength={10}
                required
              />
            </div>
          </div>
        </div>

        {/* Delivery Instructions */}
        {showDeliveryInstructions && (
          <div className="space-y-2">
            <Label htmlFor="deliveryInstructions" className="text-sm font-medium block">
              Delivery Instructions (optional)
            </Label>
            <Textarea
              id="deliveryInstructions"
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="Gate code, parking instructions, best time to deliver, etc."
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        {/* Shipping Contact Notice for Freight */}
        {fulfillmentSelected === 'vendibook_freight' && (
          <div className="p-4 border border-primary/30 bg-primary/5 rounded-xl">
            <h4 className="text-sm font-semibold text-foreground mb-2">Shipping Contact</h4>
            <p className="text-xs text-muted-foreground">
              We'll use this email and phone to schedule your freight delivery within 2 business days after payment.
            </p>
          </div>
        )}
      </div>

      {/* Next Step Hint */}
      <NextStepHint text="Choose your delivery method next." />

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          Back
        </Button>
        <Button onClick={onContinue} className="flex-1" size="lg">
          Continue to Delivery
        </Button>
      </div>
    </div>
  );
};

export default PurchaseStepInfo;
