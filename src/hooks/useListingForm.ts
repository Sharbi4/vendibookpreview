import { useState, useCallback } from 'react';
import { ListingFormData, ListingMode, ListingCategory, FulfillmentType, isMobileAsset, isStaticLocation } from '@/types/listing';

const initialFormData: ListingFormData = {
  mode: null,
  category: null,
  title: '',
  description: '',
  highlights: [],
  fulfillment_type: null,
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
};

export const useListingForm = () => {
  const [formData, setFormData] = useState<ListingFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);

  const updateField = useCallback(<K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateCategory = useCallback((category: ListingCategory) => {
    setFormData(prev => {
      const newData = { ...prev, category };
      
      // Auto-set fulfillment type for static locations
      if (isStaticLocation(category)) {
        newData.fulfillment_type = 'on_site';
      } else if (prev.fulfillment_type === 'on_site') {
        newData.fulfillment_type = null;
      }
      
      return newData;
    });
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 6));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, 6)));
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
        return formData.title.trim().length > 0 && formData.description.trim().length > 0;
      case 3:
        if (isStaticLocation(formData.category)) {
          return formData.address.trim().length > 0 && formData.access_instructions.trim().length > 0;
        }
        return !!formData.fulfillment_type && formData.pickup_location_text.trim().length > 0;
      case 4:
        if (formData.mode === 'sale') {
          return formData.price_sale.trim().length > 0 && parseFloat(formData.price_sale) > 0;
        }
        return formData.price_daily.trim().length > 0 && parseFloat(formData.price_daily) > 0;
      case 5:
        return formData.images.length > 0 || formData.existingImages.length > 0;
      case 6:
        return true;
      default:
        return false;
    }
  }, [formData]);

  const canPublish = useCallback((): boolean => {
    for (let i = 1; i <= 5; i++) {
      if (!validateStep(i)) return false;
    }
    return true;
  }, [validateStep]);

  return {
    formData,
    currentStep,
    updateField,
    updateCategory,
    nextStep,
    prevStep,
    goToStep,
    resetForm,
    validateStep,
    canPublish,
    isMobileAsset: isMobileAsset(formData.category),
    isStaticLocation: isStaticLocation(formData.category),
  };
};
