import { useState } from 'react';
import { MapPin, Truck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookingInfoModal, type BookingUserInfo } from '@/components/booking';
import type { FulfillmentType } from '@/types/listing';
import type { FulfillmentSelection } from '../BookingWizard';

interface BookingStepDetailsProps {
  isMobileAsset: boolean;
  fulfillmentType: FulfillmentType;
  fulfillmentSelected: FulfillmentSelection;
  onFulfillmentChange: (value: FulfillmentSelection) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (value: string) => void;
  deliveryFee: number | null | undefined;
  deliveryRadiusMiles: number | null | undefined;
  pickupLocation: string | null | undefined;
  message: string;
  onMessageChange: (value: string) => void;
  userInfo: BookingUserInfo | null;
  onUserInfoChange: (info: BookingUserInfo) => void;
  onContinue: () => void;
  onBack: () => void;
}

const BookingStepDetails = ({
  isMobileAsset,
  fulfillmentType,
  fulfillmentSelected,
  onFulfillmentChange,
  deliveryAddress,
  onDeliveryAddressChange,
  deliveryFee,
  deliveryRadiusMiles,
  pickupLocation,
  message,
  onMessageChange,
  userInfo,
  onUserInfoChange,
  onContinue,
  onBack,
}: BookingStepDetailsProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const fulfillmentOptions = isMobileAsset
    ? fulfillmentType === 'both'
      ? ['pickup', 'delivery']
      : [fulfillmentType]
    : ['on_site'];

  const canContinue = 
    userInfo?.agreedToTerms && 
    userInfo?.acknowledgedInsurance &&
    (fulfillmentSelected !== 'delivery' || deliveryAddress.trim());

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Booking details</h3>
        <p className="text-sm text-muted-foreground">How would you like to receive this?</p>
      </div>

      {/* Fulfillment selection - Mobile assets only */}
      {isMobileAsset && fulfillmentOptions.length > 1 && (
        <RadioGroup
          value={fulfillmentSelected}
          onValueChange={(val) => onFulfillmentChange(val as FulfillmentSelection)}
          className="space-y-2"
        >
          {fulfillmentOptions.includes('pickup') && (
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              fulfillmentSelected === 'pickup' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="pickup" id="step-pickup" />
              <Label htmlFor="step-pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Pickup</span>
              </Label>
            </div>
          )}
          {fulfillmentOptions.includes('delivery') && (
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              fulfillmentSelected === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="delivery" id="step-delivery" />
              <Label htmlFor="step-delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                <Truck className="h-4 w-4 text-primary" />
                <span>Delivery</span>
                {deliveryFee && (
                  <span className="text-xs text-muted-foreground ml-auto">+${deliveryFee}</span>
                )}
              </Label>
            </div>
          )}
        </RadioGroup>
      )}

      {/* Pickup info */}
      {fulfillmentSelected === 'pickup' && pickupLocation && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 inline mr-1.5 text-primary" />
            {pickupLocation}
          </p>
        </div>
      )}

      {/* Delivery address */}
      {fulfillmentSelected === 'delivery' && (
        <div>
          <Label htmlFor="delivery-address" className="text-sm font-medium mb-2 block">
            Delivery address
          </Label>
          <Input
            id="delivery-address"
            placeholder="Enter your address"
            value={deliveryAddress}
            onChange={(e) => onDeliveryAddressChange(e.target.value)}
          />
          {deliveryRadiusMiles && (
            <p className="text-xs text-muted-foreground mt-1">
              Available within {deliveryRadiusMiles} miles
            </p>
          )}
        </div>
      )}

      {/* Message */}
      <div>
        <Label htmlFor="message" className="text-sm font-medium mb-2 block">
          Message to host (optional)
        </Label>
        <Textarea
          id="message"
          placeholder="Tell them about your event or usage"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* User info */}
      <div>
        {userInfo?.agreedToTerms ? (
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {userInfo.firstName} {userInfo.lastName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfoModal(true)}
              className="text-xs h-7"
            >
              Edit
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowInfoModal(true)}
          >
            <UserCheck className="h-4 w-4" />
            Complete your information
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          variant="gradient" 
          onClick={onContinue} 
          className="flex-1"
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>

      {/* Info modal */}
      <BookingInfoModal
        open={showInfoModal}
        onOpenChange={setShowInfoModal}
        onComplete={(info) => {
          onUserInfoChange(info);
          setShowInfoModal(false);
        }}
        initialData={userInfo || undefined}
      />
    </div>
  );
};

export default BookingStepDetails;
