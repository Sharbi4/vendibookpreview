import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ValidatedInput, validators } from '@/components/ui/validated-input';
import NextStepHint from '@/components/shared/NextStepHint';
import InfoPopover from '@/components/shared/InfoPopover';

interface PurchaseStepInfoProps {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
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
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  address,
  setAddress,
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
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to delivery
      </button>

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
      <div className="space-y-4">
        <ValidatedInput
          id="name"
          label="Full Name"
          value={name}
          onChange={setName}
          placeholder="John Smith"
          error={fieldErrors.name}
          touched={touchedFields.has('name')}
          onBlur={() => handleFieldTouch('name')}
          required
        />

        <ValidatedInput
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
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
          value={phone}
          onChange={setPhone}
          placeholder="(555) 123-4567"
          error={fieldErrors.phone}
          touched={touchedFields.has('phone')}
          onBlur={() => handleFieldTouch('phone')}
          required
        />

        <ValidatedInput
          id="address"
          label="Your Address"
          value={address}
          onChange={setAddress}
          placeholder="Your billing/contact address"
          error={fieldErrors.address}
          touched={touchedFields.has('address')}
          onBlur={() => handleFieldTouch('address')}
          required
        />

        {/* Delivery Instructions */}
        {showDeliveryInstructions && (
          <div>
            <Label htmlFor="deliveryInstructions" className="text-sm font-medium mb-2 block">
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
      <NextStepHint text="Review your order and agree to purchase terms." />

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full" size="lg">
        Continue to Review
      </Button>
    </div>
  );
};

export default PurchaseStepInfo;
