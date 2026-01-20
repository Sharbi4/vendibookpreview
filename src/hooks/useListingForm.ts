import { useState, useCallback } from 'react';
import { ListingFormData, ListingMode, ListingCategory, FulfillmentType, isMobileAsset, isStaticLocation } from '@/types/listing';

const initialFormData: ListingFormData = {
  mode: null,
  category: null,
  title: '',
  description: '',
  highlights: [],
  amenities: [],
  fulfillment_type: null,
  is_static_location: false,
  pickup_location_text: '',
  address: '',
  delivery_fee: '',
  delivery_radius_miles: '',
  pickup_instructions: '',
  delivery_instructions: '',
  access_instructions: '',
  hours_of_access: '',
  location_notes: '',
  price_daily: '',
  price_weekly: '',
  price_sale: '',
  available_from: '',
  available_to: '',
  images: [],
  existingImages: [],
  videos: [],
  existingVideos: [],
  instant_book: false,
  deposit_amount: '',
  vendibook_freight_enabled: false,
  freight_payer: 'buyer',
  // Item dimensions for freight estimates
  weight_lbs: '',
  length_inches: '',
  width_inches: '',
  height_inches: '',
  freight_category: null,
  required_documents: [],
  // Payment method preferences (for sales) - both enabled by default
  accept_cash_payment: true,
  accept_card_payment: true,
  // Proof Notary add-on (for sales)
  proof_notary_enabled: false,
};

const TOTAL_STEPS = 7;

export const useListingForm = () => {
  const [formData, setFormData] = useState<ListingFormData>(() => {
    console.log('[useListingForm] Initializing form data - this should only happen once per mount');
    return initialFormData;
  });
  const [currentStep, setCurrentStep] = useState(1);

  const updateField = useCallback(<K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => {
    console.log('[useListingForm] updateField called:', field, 
      typeof value === 'string' ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : value
    );
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('[useListingForm] Form data updated, description length:', newData.description?.length || 0);
      return newData;
    });
  }, []);

  const updateCategory = useCallback((category: ListingCategory) => {
    setFormData(prev => {
      const newData = { ...prev, category };
      
      // Auto-set fulfillment type and static location for inherently static locations
      if (isStaticLocation(category)) {
        newData.fulfillment_type = 'on_site';
        newData.is_static_location = true;
      } else if (prev.fulfillment_type === 'on_site' && !prev.is_static_location) {
        newData.fulfillment_type = null;
      }
      
      return newData;
    });
  }, []);

  const toggleStaticLocation = useCallback((isStatic: boolean) => {
    setFormData(prev => {
      const newData = { ...prev, is_static_location: isStatic };
      
      if (isStatic) {
        newData.fulfillment_type = 'on_site';
      } else {
        newData.fulfillment_type = null;
      }
      
      return newData;
    });
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, TOTAL_STEPS)));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.mode && !!formData.category;
      case 2:
        // Title required (minimum 5 chars)
        return formData.title.trim().length >= 5 && formData.description.trim().length > 0;
      case 3:
        // Location required
        const isStatic = isStaticLocation(formData.category) || formData.is_static_location;
        if (isStatic) {
          return formData.address.trim().length > 0 && formData.access_instructions.trim().length > 0;
        }
        return !!formData.fulfillment_type && formData.pickup_location_text.trim().length > 0;
      case 4:
        // Price required, and for sales, at least one payment method
        if (formData.mode === 'sale') {
          const hasPaymentMethod = formData.accept_cash_payment || formData.accept_card_payment;
          return formData.price_sale.trim().length > 0 && parseFloat(formData.price_sale) > 0 && hasPaymentMethod;
        }
        return formData.price_daily.trim().length > 0 && parseFloat(formData.price_daily) > 0;
      case 5:
        // Documents step - always valid (documents are optional)
        return true;
      case 6:
        // Minimum 3 photos required for quality
        const totalPhotos = formData.images.length + formData.existingImages.length;
        return totalPhotos >= 3;
      case 7:
        return true;
      default:
        return false;
    }
  }, [formData]);

  const canPublish = useCallback((): boolean => {
    // Validate steps 1-6 (excluding review step 7)
    for (let i = 1; i <= 6; i++) {
      if (!validateStep(i)) return false;
    }
    return true;
  }, [validateStep]);

  // Determine if showing static location UI (by category OR user toggle)
  const showStaticLocationUI = isStaticLocation(formData.category) || formData.is_static_location;

  return {
    formData,
    currentStep,
    updateField,
    updateCategory,
    toggleStaticLocation,
    nextStep,
    prevStep,
    goToStep,
    resetForm,
    validateStep,
    canPublish,
    isMobileAsset: isMobileAsset(formData.category),
    isStaticLocation: showStaticLocationUI,
    isCategoryStaticLocation: isStaticLocation(formData.category),
  };
};
