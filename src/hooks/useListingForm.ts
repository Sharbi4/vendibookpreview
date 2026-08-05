import { useState, useCallback, useMemo } from 'react';
import {
  ListingFormData,
  ListingCategory,
  isMobileAsset,
  isStaticLocation,
} from '@/types/listing';
import {
  GuidedStepId,
  computeFlow,
  validateGuidedStep,
  PUBLISH_GATED_STEPS,
} from '@/components/listing-wizard/guided/guidedFlow';

const initialFormData: ListingFormData = {
  mode: null,
  category: null,
  subcategory: null,
  title: '',
  description: '',
  highlights: [],
  amenities: [],
  fulfillment_type: null,
  is_static_location: false,
  pickup_location_text: '',
  address: '',
  // Structured address fields (Airbnb-style)
  country: 'United States - US',
  street_address: '',
  apt_suite: '',
  city: '',
  state: '',
  zip_code: '',
  show_precise_location: false,
  delivery_fee: '',
  delivery_radius_miles: '',
  pickup_instructions: '',
  delivery_instructions: '',
  access_instructions: '',
  hours_of_access: '',
  location_notes: '',
  price_hourly: '',
  price_daily: '',
  price_weekly: '',
  price_monthly: '',
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
  // Featured Listing add-on (for both rentals and sales)
  featured_enabled: false,
  // Multi-slot capacity for Vendor Spaces (default 1)
  total_slots: 1,
  slot_names: [],
  // Geocoded coordinates
  latitude: null,
  longitude: null,
  // Guided wizard specifications (public)
  year_built: '',
  make: '',
  model: '',
  condition: '',
  mileage: '',
  fuel_type: '',
  space_sqft: '',
  // Guided wizard ownership (private)
  title_status: '',
  lien_holder_name: '',
  ownership_notes: '',
};

export const useListingForm = () => {
  const [formData, setFormData] = useState<ListingFormData>(() => initialFormData);
  const [stepId, setStepId] = useState<GuidedStepId>('intent');
  /** Steps the user has attempted to leave — drives inline error reveal. */
  const [touchedSteps, setTouchedSteps] = useState<Set<GuidedStepId>>(new Set());

  /** The conditional path of screens for the current answers. */
  const flow = useMemo(() => computeFlow(formData), [formData]);

  const stepIndex = Math.max(0, flow.indexOf(stepId));
  const totalSteps = flow.length;

  const updateField = useCallback(<K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /** Bulk update so a single answer can set several derived fields at once. */
  const updateFields = useCallback((patch: Partial<ListingFormData>) => {
    setFormData(prev => ({ ...prev, ...patch }));
  }, []);

  const updateCategory = useCallback((category: ListingCategory) => {
    setFormData(prev => {
      const newData: ListingFormData = {
        ...prev,
        category,
        subcategory: null, // Reset subcategory when parent category changes
      };

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
    setFormData(prev => ({
      ...prev,
      is_static_location: isStatic,
      fulfillment_type: isStatic ? 'on_site' : null,
    }));
  }, []);

  const validateStep = useCallback(
    (id: GuidedStepId): boolean => validateGuidedStep(id, formData),
    [formData],
  );

  const markTouched = useCallback((id: GuidedStepId) => {
    setTouchedSteps(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  /** Advance along the conditional flow. Returns false when the step is invalid. */
  const nextStep = useCallback((): boolean => {
    markTouched(stepId);
    if (!validateGuidedStep(stepId, formData)) return false;

    const path = computeFlow(formData);
    const idx = path.indexOf(stepId);
    const next = path[idx + 1];
    if (next) setStepId(next);
    return true;
  }, [stepId, formData, markTouched]);

  const prevStep = useCallback(() => {
    const path = computeFlow(formData);
    const idx = path.indexOf(stepId);
    const prev = path[idx - 1];
    if (prev) setStepId(prev);
  }, [stepId, formData]);

  /** Jump to a step. Forward jumps are only allowed over already-valid steps. */
  const goToStep = useCallback((target: GuidedStepId) => {
    const path = computeFlow(formData);
    const targetIdx = path.indexOf(target);
    const currentIdx = path.indexOf(stepId);
    if (targetIdx === -1) return;
    if (targetIdx <= currentIdx) {
      setStepId(target);
      return;
    }
    for (let i = 0; i < targetIdx; i++) {
      if (!validateGuidedStep(path[i], formData)) return;
    }
    setStepId(target);
  }, [formData, stepId]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setStepId('intent');
    setTouchedSteps(new Set());
  }, []);

  const canPublish = useCallback((): boolean => {
    if (!formData.mode || !formData.category) return false;
    return PUBLISH_GATED_STEPS.every(id => validateGuidedStep(id, formData));
  }, [formData]);

  // Determine if showing static location UI (by category OR user toggle)
  const showStaticLocationUI = isStaticLocation(formData.category) || formData.is_static_location;

  return {
    formData,
    flow,
    stepId,
    stepIndex,
    totalSteps,
    touched: touchedSteps.has(stepId),
    updateField,
    updateFields,
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
