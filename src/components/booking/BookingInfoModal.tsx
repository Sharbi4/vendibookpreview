import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  MapPin, 
  Shield, 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Car,
  Package,
  UtensilsCrossed,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export interface BookingUserInfo {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  agreedToTerms: boolean;
  acknowledgedInsurance: boolean;
}

interface BookingInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (info: BookingUserInfo) => void;
  initialData?: Partial<BookingUserInfo>;
}

type Step = 'info' | 'insurance' | 'terms';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'info', label: 'Your Info', icon: <User className="h-4 w-4" /> },
  { key: 'insurance', label: 'Insurance', icon: <Shield className="h-4 w-4" /> },
  { key: 'terms', label: 'Terms', icon: <FileText className="h-4 w-4" /> },
];

export function BookingInfoModal({
  open,
  onOpenChange,
  onComplete,
  initialData,
}: BookingInfoModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('info');
  const [formData, setFormData] = useState<BookingUserInfo>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    address1: initialData?.address1 || '',
    address2: initialData?.address2 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    agreedToTerms: false,
    acknowledgedInsurance: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingUserInfo, string>>>({});
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const tosScrollRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep('info');
      setHasScrolledToBottom(false);
      setErrors({});
    }
  }, [open]);

  const updateField = <K extends keyof BookingUserInfo>(field: K, value: BookingUserInfo[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateInfoStep = (): boolean => {
    const newErrors: Partial<Record<keyof BookingUserInfo, string>> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.address1.trim()) newErrors.address1 = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) {
      newErrors.zipCode = 'Invalid ZIP code format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateInsuranceStep = (): boolean => {
    if (!formData.acknowledgedInsurance) {
      setErrors({ acknowledgedInsurance: 'Please acknowledge the insurance information' });
      return false;
    }
    return true;
  };

  const validateTermsStep = (): boolean => {
    if (!hasScrolledToBottom) {
      setErrors({ agreedToTerms: 'Please scroll through and read the entire Terms of Service' });
      return false;
    }
    if (!formData.agreedToTerms) {
      setErrors({ agreedToTerms: 'You must agree to the Terms of Service to continue' });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'info') {
      if (validateInfoStep()) {
        setCurrentStep('insurance');
      }
    } else if (currentStep === 'insurance') {
      if (validateInsuranceStep()) {
        setCurrentStep('terms');
      }
    } else if (currentStep === 'terms') {
      if (validateTermsStep()) {
        onComplete(formData);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'insurance') setCurrentStep('info');
    else if (currentStep === 'terms') setCurrentStep('insurance');
  };

  const handleTosScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      if (errors.agreedToTerms === 'Please scroll through and read the entire Terms of Service') {
        setErrors(prev => ({ ...prev, agreedToTerms: undefined }));
      }
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Complete Your Booking</DialogTitle>
          <DialogDescription>
            Please provide the following information to proceed with your booking request.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  currentStep === step.key
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index < currentStepIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.icon
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Step 1: Personal Info */}
          {currentStep === 'info' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Personal Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="John"
                    className={cn(errors.firstName && 'border-destructive')}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Doe"
                    className={cn(errors.lastName && 'border-destructive')}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Address</h3>
              </div>

              <div>
                <Label htmlFor="address1">Street Address *</Label>
                <Input
                  id="address1"
                  value={formData.address1}
                  onChange={(e) => updateField('address1', e.target.value)}
                  placeholder="123 Main Street"
                  className={cn(errors.address1 && 'border-destructive')}
                />
                {errors.address1 && (
                  <p className="text-xs text-destructive mt-1">{errors.address1}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address2">Apt, Suite, Unit (optional)</Label>
                <Input
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => updateField('address2', e.target.value)}
                  placeholder="Apt 4B, Suite 100, etc."
                />
              </div>

              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="New York"
                    className={cn(errors.city && 'border-destructive')}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive mt-1">{errors.city}</p>
                  )}
                </div>
                <div className="col-span-1">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="NY"
                    maxLength={2}
                    className={cn(errors.state && 'border-destructive')}
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive mt-1">{errors.state}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    placeholder="10001"
                    className={cn(errors.zipCode && 'border-destructive')}
                  />
                  {errors.zipCode && (
                    <p className="text-xs text-destructive mt-1">{errors.zipCode}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Insurance Education */}
          {currentStep === 'insurance' && (
            <div className="space-y-4">
              <Alert className="bg-destructive/10 border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>Important:</strong> Vendibook does not provide insurance coverage. 
                  Please review the information below before proceeding.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Insurance You May Need
                </h3>

                <Card>
                  <CardContent className="pt-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">General Liability Insurance</h4>
                      <p className="text-xs text-muted-foreground">
                        Covers third-party bodily injury and property damage claims. Essential for food service operations.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 flex items-start gap-3">
                    <Car className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Commercial Auto Insurance</h4>
                      <p className="text-xs text-muted-foreground">
                        Required for operating food trucks/trailers on public roads. Personal auto policies typically don't cover commercial use.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 flex items-start gap-3">
                    <Package className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Equipment Insurance</h4>
                      <p className="text-xs text-muted-foreground">
                        Covers damage to or theft of rented equipment. May be required by hosts for high-value items.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 flex items-start gap-3">
                    <UtensilsCrossed className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Product Liability Insurance</h4>
                      <p className="text-xs text-muted-foreground">
                        Covers claims arising from food products you sell. Critical for any food service operation.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">Recommended Insurance Provider</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  FLIP (Food Liability Insurance Program) offers short-term liability insurance designed for food vendors.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.fliprogram.com" target="_blank" rel="noopener noreferrer" className="gap-1.5">
                    Learn More <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>

              <Button variant="link" asChild className="p-0 h-auto">
                <Link to="/insurance" target="_blank" className="text-sm gap-1">
                  View Full Insurance Information Page <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>

              <div className="pt-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="insuranceAck"
                    checked={formData.acknowledgedInsurance}
                    onCheckedChange={(checked) => {
                      updateField('acknowledgedInsurance', checked === true);
                      if (errors.acknowledgedInsurance) {
                        setErrors(prev => ({ ...prev, acknowledgedInsurance: undefined }));
                      }
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="insuranceAck" className="text-sm cursor-pointer">
                      I understand that Vendibook does not provide insurance and I am responsible for obtaining 
                      any required coverage before my rental period begins.
                    </Label>
                    {errors.acknowledgedInsurance && (
                      <p className="text-xs text-destructive">{errors.acknowledgedInsurance}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Terms of Service */}
          {currentStep === 'terms' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Terms of Service</h3>
              </div>

              <p className="text-sm text-muted-foreground">
                Please read through the entire Terms of Service below. You must scroll to the bottom before agreeing.
              </p>

              <div className="relative">
                <ScrollArea 
                  className="h-64 rounded-lg border bg-muted/30 p-4"
                  onScrollCapture={handleTosScroll}
                >
                  <div ref={tosScrollRef} className="space-y-4 text-sm text-muted-foreground">
                    <h4 className="font-semibold text-foreground">VendiBook Terms of Service</h4>
                    <p className="text-xs text-muted-foreground">Last Updated: December 13, 2025</p>
                    
                    <h5 className="font-medium text-foreground mt-4">1. Acceptance of Terms</h5>
                    <p>
                      By accessing or using VendiBook's platform, you agree to be bound by these Terms of Service 
                      and all applicable laws and regulations. If you do not agree with any of these terms, you are 
                      prohibited from using or accessing this platform.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">2. Booking and Rental Agreement</h5>
                    <p>
                      When you submit a booking request through VendiBook, you are entering into a rental agreement 
                      directly with the Host. VendiBook acts as an intermediary platform and is not a party to the 
                      rental agreement between you and the Host.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">3. Renter Responsibilities</h5>
                    <p>As a Renter, you agree to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide accurate and complete information during the booking process</li>
                      <li>Treat all rented equipment with care and return it in the same condition</li>
                      <li>Comply with all applicable laws, permits, and regulations</li>
                      <li>Obtain any required insurance coverage before the rental period</li>
                      <li>Report any damage or issues immediately to the Host</li>
                      <li>Use the equipment only for its intended purpose</li>
                    </ul>

                    <h5 className="font-medium text-foreground mt-4">4. Insurance Disclaimer</h5>
                    <p>
                      VendiBook does not provide insurance coverage for rentals. You are solely responsible for 
                      obtaining any insurance required by law, by the Host, or that you deem necessary to protect 
                      yourself from liability.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">5. Payment Terms</h5>
                    <p>
                      All payments are processed through Stripe. By making a payment, you authorize VendiBook to 
                      charge your payment method for the total rental amount plus any applicable fees. Refunds are 
                      subject to our cancellation policy and the Host's specific terms.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">6. Cancellation Policy</h5>
                    <p>
                      Cancellation terms vary by listing. Please review the Host's cancellation policy before 
                      booking. VendiBook's service fees may be non-refundable depending on the timing of cancellation.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">7. Limitation of Liability</h5>
                    <p>
                      VendiBook's liability is limited to the service fees paid. We are not liable for any damages, 
                      injuries, or losses arising from the use of rented equipment, Host negligence, or any 
                      disputes between Renters and Hosts.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">8. Dispute Resolution</h5>
                    <p>
                      Any disputes between Renters and Hosts should first be attempted to be resolved directly. 
                      VendiBook may offer mediation services but is not obligated to resolve disputes. Legal 
                      disputes shall be governed by the laws of the State of Delaware.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">9. Privacy</h5>
                    <p>
                      Your use of VendiBook is also governed by our Privacy Policy. By using our platform, you 
                      consent to the collection and use of your information as described therein.
                    </p>

                    <h5 className="font-medium text-foreground mt-4">10. Changes to Terms</h5>
                    <p>
                      VendiBook reserves the right to modify these Terms at any time. Continued use of the platform 
                      after changes constitutes acceptance of the new Terms.
                    </p>

                    <div className="pt-4 pb-2 text-center">
                      <p className="text-xs font-medium text-foreground">— End of Terms of Service —</p>
                    </div>
                  </div>
                </ScrollArea>
                
                {!hasScrolledToBottom && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none flex items-end justify-center pb-2">
                    <span className="text-xs text-muted-foreground animate-pulse">↓ Scroll to continue</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="termsAgree"
                  checked={formData.agreedToTerms}
                  disabled={!hasScrolledToBottom}
                  onCheckedChange={(checked) => {
                    updateField('agreedToTerms', checked === true);
                    if (errors.agreedToTerms) {
                      setErrors(prev => ({ ...prev, agreedToTerms: undefined }));
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="termsAgree" 
                    className={cn(
                      "text-sm cursor-pointer",
                      !hasScrolledToBottom && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    I have read and agree to the Terms of Service, Privacy Policy, and understand my responsibilities as a renter.
                  </Label>
                  {errors.agreedToTerms && (
                    <p className="text-xs text-destructive">{errors.agreedToTerms}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'info'}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} className="gap-1.5">
            {currentStep === 'terms' ? 'Complete' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
