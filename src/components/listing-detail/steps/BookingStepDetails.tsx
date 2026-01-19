import { useState } from 'react';
import { MapPin, Truck, UserCheck, ArrowRight, MessageSquare, CheckCircle2 } from 'lucide-react';
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
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Booking Details</h3>
            <p className="text-sm text-muted-foreground">How would you like to receive this?</p>
          </div>
        </div>
      </div>

      {/* Fulfillment selection - Mobile assets only */}
      {isMobileAsset && fulfillmentOptions.length > 1 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
            Fulfillment Method
          </Label>
          <RadioGroup
            value={fulfillmentSelected}
            onValueChange={(val) => onFulfillmentChange(val as FulfillmentSelection)}
            className="space-y-2"
          >
            {fulfillmentOptions.includes('pickup') && (
              <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                fulfillmentSelected === 'pickup' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
              }`}>
                <RadioGroupItem value="pickup" id="step-pickup" />
                <Label htmlFor="step-pickup" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    fulfillmentSelected === 'pickup' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <MapPin className={`h-4 w-4 ${fulfillmentSelected === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <span className="font-medium block">Pickup</span>
                    <span className="text-xs text-muted-foreground">Collect from host location</span>
                  </div>
                </Label>
              </div>
            )}
            {fulfillmentOptions.includes('delivery') && (
              <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                fulfillmentSelected === 'delivery' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
              }`}>
                <RadioGroupItem value="delivery" id="step-delivery" />
                <Label htmlFor="step-delivery" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    fulfillmentSelected === 'delivery' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Truck className={`h-4 w-4 ${fulfillmentSelected === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium block">Delivery</span>
                    <span className="text-xs text-muted-foreground">Delivered to your location</span>
                  </div>
                  {deliveryFee && (
                    <span className="text-sm font-medium text-primary">+${deliveryFee}</span>
                  )}
                </Label>
              </div>
            )}
          </RadioGroup>
        </div>
      )}

      {/* Pickup info */}
      {fulfillmentSelected === 'pickup' && pickupLocation && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pickup Location</span>
              <p className="text-sm font-medium text-foreground mt-0.5">{pickupLocation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delivery address */}
      {fulfillmentSelected === 'delivery' && (
        <div>
          <Label htmlFor="delivery-address" className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
            Delivery Address
          </Label>
          <Input
            id="delivery-address"
            placeholder="Enter your full address"
            value={deliveryAddress}
            onChange={(e) => onDeliveryAddressChange(e.target.value)}
            className="h-12"
          />
          {deliveryRadiusMiles && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Available within {deliveryRadiusMiles} miles of listing location
            </p>
          )}
        </div>
      )}

      {/* Message */}
      <div>
        <Label htmlFor="message" className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" />
          Message to Host (Optional)
        </Label>
        <Textarea
          id="message"
          placeholder="Tell them about your event, business, or how you'll use this rental..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* User info */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
          Your Information
        </Label>
        {userInfo?.agreedToTerms ? (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {userInfo.firstName} {userInfo.lastName}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Information complete</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfoModal(true)}
              className="text-xs h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-200/50"
            >
              Edit
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-12 gap-2 border-2 border-dashed"
            onClick={() => setShowInfoModal(true)}
          >
            <UserCheck className="h-4 w-4" />
            Complete Your Information
          </Button>
        )}
      </div>

      {/* What's Next */}
      <div className="p-3 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-muted-foreground">
            <strong className="text-foreground">Next:</strong> Review and {userInfo?.agreedToTerms ? 'submit' : 'complete'} your booking
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12">
          Back
        </Button>
        <Button 
          variant="gradient" 
          onClick={onContinue} 
          className="flex-1 h-12"
          disabled={!canContinue}
        >
          Continue to Review
          <ArrowRight className="h-4 w-4 ml-2" />
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