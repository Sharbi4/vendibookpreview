import React from 'react';
import { Eye, Camera, FileText, DollarSign, MapPin, Shield, CreditCard, Check, Calendar } from 'lucide-react';
import { ListingFormData } from '@/types/listing';
import { ListingCardPreview } from './ListingCardPreview';
import { PublishChecklist, createChecklistItems } from './PublishChecklist';

interface WizardPreviewSidebarProps {
  formData: ListingFormData;
  previewImageUrls: string[];
  currentStep: number;
  isStripeConnected: boolean;
  onStepClick?: (stepId: string) => void;
}

// Map checklist item IDs to wizard steps
const STEP_ID_TO_STEP_NUMBER: Record<string, number> = {
  'photos': 6,
  'headline': 2,
  'includes': 2,
  'pricing': 3,
  'availability': 3,
  'location': 4,
  'documents': 5,
  'stripe': 7,
  'review': 7,
};

const STEP_NUMBER_TO_STEP_ID: Record<number, string> = {
  1: 'type',
  2: 'headline',
  3: 'pricing',
  4: 'location',
  5: 'documents',
  6: 'photos',
  7: 'review',
};

export const WizardPreviewSidebar: React.FC<WizardPreviewSidebarProps> = ({
  formData,
  previewImageUrls,
  currentStep,
  isStripeConnected,
  onStepClick,
}) => {
  const isRental = formData.mode === 'rent';
  const totalImages = formData.images.length + formData.existingImages.length;
  
  // Build checklist items from form state
  const checklistItems = createChecklistItems({
    hasPhotos: totalImages >= 3,
    hasPricing: isRental 
      ? parseFloat(formData.price_daily) > 0
      : parseFloat(formData.price_sale) > 0,
    hasAvailability: !!(formData.available_from || formData.available_to),
    hasDescription: formData.description.length >= 20 && formData.title.length >= 5,
    hasLocation: !!(formData.address || formData.pickup_location_text),
    hasStripe: isStripeConnected,
    isRental,
    photoCount: totalImages,
    priceSet: isRental 
      ? formData.price_daily ? `$${formData.price_daily}/day` : undefined
      : formData.price_sale ? `$${parseFloat(formData.price_sale).toLocaleString()}` : undefined,
    descriptionLength: formData.description.length,
    locationSet: formData.pickup_location_text || formData.address?.split(',')[0] || undefined,
    requiresStripe: isRental || formData.accept_card_payment,
    hasDocuments: true, // Documents are optional
    documentsCount: 0,
  }, STEP_NUMBER_TO_STEP_ID[currentStep] || 'type');

  const handleItemClick = (itemId: string) => {
    const stepNumber = STEP_ID_TO_STEP_NUMBER[itemId];
    if (stepNumber && onStepClick) {
      onStepClick(itemId);
    }
  };

  return (
    <div className="sticky top-24 space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Eye className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Live Preview</span>
      </div>
      
      {/* Live Preview Card */}
      <div className="pointer-events-none">
        <ListingCardPreview
          listing={{
            title: formData.title,
            mode: formData.mode,
            category: formData.category,
            images: previewImageUrls,
            priceDaily: formData.price_daily,
            priceWeekly: formData.price_weekly,
            priceSale: formData.price_sale,
            address: formData.address,
            pickupLocationText: formData.pickup_location_text,
            amenities: formData.amenities || [],
            instantBook: formData.instant_book,
            fulfillmentType: formData.fulfillment_type,
            deliveryFee: formData.delivery_fee,
            deliveryRadiusMiles: formData.delivery_radius_miles,
          }}
        />
      </div>

      {/* Publish Checklist */}
      <PublishChecklist 
        items={checklistItems}
        onItemClick={handleItemClick}
        hidePublishButton={true}
      />
    </div>
  );
};
