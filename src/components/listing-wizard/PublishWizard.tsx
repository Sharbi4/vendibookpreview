import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, ExternalLink, Check, Camera, DollarSign, FileText, Calendar, CreditCard, ChevronRight, Save, Sparkles, TrendingUp, TrendingDown, Target, Wallet, Info, Banknote, Zap, RotateCcw, Plus, X, Package, Scale, Ruler, MapPin, Truck, Building2, Eye, AlertCircle, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, ListingCategory, FreightPayer, AMENITIES_BY_CATEGORY, FREIGHT_CATEGORY_LABELS, FreightCategory, FulfillmentType, isMobileAsset, isStaticLocation as isStaticLocationFn, MODE_LABELS } from '@/types/listing';
import {
  DocumentType,
  DocumentDeadlineType,
  RequiredDocumentSetting,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DEADLINE_TYPE_LABELS,
  DEADLINE_TYPE_DESCRIPTIONS,
  DOCUMENT_GROUPS,
  DEFAULT_DOCUMENTS_BY_CATEGORY,
} from '@/types/documents';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { AvailabilityStep } from './AvailabilityStep';
import { PublishChecklist, createChecklistItems } from './PublishChecklist';
import { PublishSuccessModal } from './PublishSuccessModal';
import { ListingPreviewModal } from './ListingPreviewModal';
import { AuthGateModal } from './AuthGateModal';
import { getGuestDraft, clearGuestDraft } from '@/lib/guestDraft';
import { cn } from '@/lib/utils';
import { FreightSettingsCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ProofNotaryCard } from './ProofNotaryCard';
import stripeWordmark from '@/assets/stripe-wordmark-blurple.png';
import {
  calculateRentalFees,
  calculateSaleFees,
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT,
} from '@/lib/commissions';

type PublishStep = 'photos' | 'pricing' | 'details' | 'location' | 'availability' | 'documents' | 'stripe' | 'review';

interface ListingData {
  id: string;
  mode: 'rent' | 'sale';
  category: ListingCategory;
  title: string;
  description: string;
  address: string | null;
  pickup_location_text: string | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  available_from: string | null;
  available_to: string | null;
  instant_book: boolean;
  deposit_amount: number | null;
  vendibook_freight_enabled: boolean;
  freight_payer: FreightPayer;
  accept_card_payment: boolean;
  accept_cash_payment: boolean;
  proof_notary_enabled: boolean;
  highlights: string[] | null;
  amenities: string[] | null;
  weight_lbs: number | null;
  length_inches: number | null;
  width_inches: number | null;
  height_inches: number | null;
  freight_category: string | null;
  // Location & fulfillment fields
  fulfillment_type: FulfillmentType | null;
  delivery_fee: number | null;
  delivery_radius_miles: number | null;
  pickup_instructions: string | null;
  delivery_instructions: string | null;
  access_instructions: string | null;
  hours_of_access: string | null;
  location_notes: string | null;
  is_static_location?: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface RentalSuggestions {
  daily_low: number;
  daily_suggested: number;
  daily_high: number;
  weekly_low: number;
  weekly_suggested: number;
  weekly_high: number;
  reasoning: string;
}

interface SaleSuggestions {
  sale_low: number;
  sale_suggested: number;
  sale_high: number;
  reasoning: string;
}

export const PublishWizard: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnboardingComplete, isLoading: isStripeLoading, connectStripe, isConnecting } = useStripeConnect();

  const [step, setStep] = useState<PublishStep>('photos');
  const [listing, setListing] = useState<ListingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isGuestDraft, setIsGuestDraft] = useState(false);
  const [isClaimingDraft, setIsClaimingDraft] = useState(false);

  // Form fields
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDaily, setPriceDaily] = useState('');
  const [priceWeekly, setPriceWeekly] = useState('');
  const [priceSale, setPriceSale] = useState('');
  const [instantBook, setInstantBook] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  
  // New pricing fields
  const [vendibookFreightEnabled, setVendibookFreightEnabled] = useState(false);
  const [freightPayer, setFreightPayer] = useState<FreightPayer>('buyer');
  const [acceptCardPayment, setAcceptCardPayment] = useState(true);
  const [acceptCashPayment, setAcceptCashPayment] = useState(false);
  const [proofNotaryEnabled, setProofNotaryEnabled] = useState(false);
  
  // AI suggestions state
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [rentalSuggestions, setRentalSuggestions] = useState<RentalSuggestions | null>(null);
  const [saleSuggestions, setSaleSuggestions] = useState<SaleSuggestions | null>(null);

  // Details step state
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [originalDescription, setOriginalDescription] = useState<string | null>(null);
  const [showOptimized, setShowOptimized] = useState(false);
  
  // Dimensions state (for sale listings)
  const [weightLbs, setWeightLbs] = useState('');
  const [lengthInches, setLengthInches] = useState('');
  const [widthInches, setWidthInches] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [freightCategory, setFreightCategory] = useState<FreightCategory | null>(null);

  // Location step state
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | null>(null);
  const [pickupLocationText, setPickupLocationText] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryRadiusMiles, setDeliveryRadiusMiles] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [hoursOfAccess, setHoursOfAccess] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [isStaticLocation, setIsStaticLocation] = useState(false);
  const [pickupCoordinates, setPickupCoordinates] = useState<[number, number] | null>(null);

  // Availability step state
  const [availableFrom, setAvailableFrom] = useState<string | null>(null);
  const [availableTo, setAvailableTo] = useState<string | null>(null);

  // Required documents step state (for rentals)
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentSetting[]>([]);
  const [globalDeadline, setGlobalDeadline] = useState<DocumentDeadlineType>('before_approval');
  const [deadlineHours, setDeadlineHours] = useState<number>(48);
  const [openDocGroups, setOpenDocGroups] = useState<string[]>(['Identity & Legal']);

  // Auto-save guest draft fields (title, description, pricing) periodically
  // This uses RLS policy "Allow guest draft updates with token"
  const saveGuestDraftFields = async () => {
    if (!isGuestDraft || !listing || !listingId) return;
    
    const guestDraft = getGuestDraft();
    if (!guestDraft || guestDraft.listingId !== listingId) return;

    try {
      const safeParsePrice = (value: string): number | null => {
        if (!value || !value.trim()) return null;
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      };

      const updateData: Record<string, unknown> = {
        title: title || listing.title,
        description: description || listing.description,
        highlights: highlights.length > 0 ? highlights : (listing.highlights || []),
        amenities: amenities.length > 0 ? amenities : (listing.amenities || []),
        // Dimensions
        weight_lbs: parseFloat(weightLbs) || listing.weight_lbs || null,
        length_inches: parseFloat(lengthInches) || listing.length_inches || null,
        width_inches: parseFloat(widthInches) || listing.width_inches || null,
        height_inches: parseFloat(heightInches) || listing.height_inches || null,
        freight_category: freightCategory || listing.freight_category || null,
      };

      // Add pricing based on mode
      if (listing.mode === 'sale') {
        updateData.price_sale = safeParsePrice(priceSale);
        updateData.vendibook_freight_enabled = vendibookFreightEnabled;
        updateData.freight_payer = freightPayer;
        updateData.accept_card_payment = acceptCardPayment;
        updateData.accept_cash_payment = acceptCashPayment;
        updateData.proof_notary_enabled = proofNotaryEnabled;
      } else {
        updateData.price_daily = safeParsePrice(priceDaily);
        updateData.price_weekly = safeParsePrice(priceWeekly);
        updateData.instant_book = instantBook;
        updateData.deposit_amount = safeParsePrice(depositAmount);
      }

      // Add location fields
      const categoryIsStatic = isStaticLocationFn(listing.category);
      const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation) ? 'on_site' : (fulfillmentType || listing.fulfillment_type || 'pickup');
      
      updateData.fulfillment_type = effectiveFulfillmentType;
      updateData.pickup_location_text = pickupLocationText || listing.pickup_location_text || null;
      updateData.address = address || listing.address || null;
      updateData.delivery_fee = parseFloat(deliveryFee) || listing.delivery_fee || null;
      updateData.delivery_radius_miles = parseFloat(deliveryRadiusMiles) || listing.delivery_radius_miles || null;
      updateData.pickup_instructions = pickupInstructions || listing.pickup_instructions || null;
      updateData.delivery_instructions = deliveryInstructions || listing.delivery_instructions || null;
      updateData.access_instructions = accessInstructions || listing.access_instructions || null;
      updateData.hours_of_access = hoursOfAccess || listing.hours_of_access || null;
      updateData.location_notes = locationNotes || listing.location_notes || null;

      // Availability
      updateData.available_from = availableFrom || listing.available_from || null;
      updateData.available_to = availableTo || listing.available_to || null;

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId);

      if (error) {
        console.warn('Guest draft auto-save failed:', error.message);
      } else {
        console.log('Guest draft auto-saved successfully');
      }
    } catch (err) {
      console.warn('Guest draft auto-save error:', err);
    }
  };

  // Auto-save guest draft on step change and periodically (every 30s)
  useEffect(() => {
    if (!isGuestDraft || !listing) return;

    // Save when step changes
    saveGuestDraftFields();

    // Set up periodic auto-save
    const interval = setInterval(() => {
      saveGuestDraftFields();
    }, 30000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isGuestDraft, listing?.id]);

  // Also save guest draft when user is about to leave the page
  useEffect(() => {
    if (!isGuestDraft || !listing) return;

    const handleBeforeUnload = () => {
      saveGuestDraftFields();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuestDraft, listing?.id, title, description, priceSale, priceDaily, priceWeekly]);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return;

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error || !data) {
        toast({ title: 'Listing not found', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      // Check if this is a guest draft (no host_id but has guest_draft_token)
      const guestDraft = getGuestDraft();
      if (!data.host_id && guestDraft?.listingId === listingId) {
        setIsGuestDraft(true);
      }

      setListing(data as unknown as ListingData);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPriceDaily(data.price_daily?.toString() || '');
      setPriceWeekly(data.price_weekly?.toString() || '');
      setPriceSale(data.price_sale?.toString() || '');
      setInstantBook(data.instant_book || false);
      setDepositAmount(data.deposit_amount?.toString() || '');
      setExistingImages(data.image_urls || []);
      setVendibookFreightEnabled(data.vendibook_freight_enabled || false);
      setFreightPayer((data.freight_payer as FreightPayer) || 'buyer');
      setAcceptCardPayment(data.accept_card_payment ?? true);
      setAcceptCashPayment(data.accept_cash_payment ?? false);
      setProofNotaryEnabled(data.proof_notary_enabled ?? false);
      // Set details step fields
      setHighlights(data.highlights || []);
      setAmenities(data.amenities || []);
      setWeightLbs(data.weight_lbs?.toString() || '');
      setLengthInches(data.length_inches?.toString() || '');
      setWidthInches(data.width_inches?.toString() || '');
      setHeightInches(data.height_inches?.toString() || '');
      setFreightCategory((data.freight_category as FreightCategory) || null);
      // Set location step fields
      setFulfillmentType((data.fulfillment_type as FulfillmentType) || null);
      setPickupLocationText(data.pickup_location_text || '');
      setAddress(data.address || '');
      setDeliveryFee(data.delivery_fee?.toString() || '');
      setDeliveryRadiusMiles(data.delivery_radius_miles?.toString() || '');
      setPickupInstructions(data.pickup_instructions || '');
      setDeliveryInstructions(data.delivery_instructions || '');
      setAccessInstructions(data.access_instructions || '');
      setHoursOfAccess(data.hours_of_access || '');
      setLocationNotes(data.location_notes || '');
      // Determine if it's a static location (either by category or toggled)
      const categoryIsStatic = isStaticLocationFn(data.category as ListingCategory);
      setIsStaticLocation(categoryIsStatic || (data.fulfillment_type === 'on_site'));
      // Availability fields
      setAvailableFrom(data.available_from || null);
      setAvailableTo(data.available_to || null);

      // Load required documents for rental listings
      if (data.mode === 'rent') {
        const { data: docsData } = await supabase
          .from('listing_required_documents')
          .select('*')
          .eq('listing_id', listingId);

        if (docsData && docsData.length > 0) {
          // Map existing documents
          const loadedDocs: RequiredDocumentSetting[] = docsData.map(d => ({
            document_type: d.document_type as DocumentType,
            is_required: d.is_required,
            deadline_type: d.deadline_type as DocumentDeadlineType,
            deadline_offset_hours: d.deadline_offset_hours || undefined,
            description: d.description || undefined,
          }));
          setRequiredDocuments(loadedDocs);
          // Set global deadline from first document
          if (docsData[0]) {
            setGlobalDeadline(docsData[0].deadline_type as DocumentDeadlineType);
            if (docsData[0].deadline_offset_hours) {
              setDeadlineHours(docsData[0].deadline_offset_hours);
            }
          }
        } else {
          // Initialize with defaults based on category
          const defaults = DEFAULT_DOCUMENTS_BY_CATEGORY[data.category as ListingCategory] || [];
          const allDocTypes: DocumentType[] = DOCUMENT_GROUPS.flatMap(g => g.documents);
          const initialDocs: RequiredDocumentSetting[] = allDocTypes.map(docType => ({
            document_type: docType,
            is_required: defaults.includes(docType),
            deadline_type: 'before_approval' as DocumentDeadlineType,
            deadline_offset_hours: undefined,
          }));
          setRequiredDocuments(initialDocs);
        }
      }

      setIsLoading(false);
    };

    fetchListing();
  }, [listingId, navigate, toast]);

  // Claim guest draft when user signs in
  const handleAuthSuccess = async (userId: string) => {
    if (!listing || !listingId) return;

    setIsClaimingDraft(true);

    // Supabase auth can take a beat to persist the session after sign-up.
    // If we run the claim immediately, the DB request may still be anonymous and fail RLS.
    const waitForSessionUser = async (): Promise<boolean> => {
      for (let i = 0; i < 10; i++) {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUserId = sessionData.session?.user?.id;
        if (sessionUserId && sessionUserId === userId) return true;
        await new Promise((r) => setTimeout(r, 200));
      }
      return false;
    };

    const hasSession = await waitForSessionUser();
    if (!hasSession) {
      setIsClaimingDraft(false);
      toast({
        title: 'Please sign in to claim your draft',
        description: "Your account was created, but you're not signed in yet. Please sign in and we'll claim the draft automatically.",
        variant: 'destructive',
      });
      return;
    }

    const guestDraft = getGuestDraft();
    if (!guestDraft || guestDraft.listingId !== listingId) {
      setIsClaimingDraft(false);
      return;
    }

    try {
      // Helper to safely parse currency / formatted strings
      const safeParsePrice = (value: string): number | null => {
        if (!value || !value.trim()) return null;
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      };

      // Determine effective fulfillment type
      const categoryIsStatic = isStaticLocationFn(listing.category);
      const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation)
        ? 'on_site'
        : (fulfillmentType || listing.fulfillment_type || 'pickup');

      // Build the update payload with ALL current in-memory form data
      // This ensures title, description, photos, prices etc. are not lost during auth
      const updateData: any = {
        // Claim ownership
        host_id: userId,
        guest_draft_token: null,

        // Details - preserve user's edits
        title: title || listing.title,
        description: description || listing.description,
        highlights: highlights.length > 0 ? highlights : (listing.highlights || []),
        amenities: amenities.length > 0 ? amenities : (listing.amenities || []),

        // Dimensions (for sale listings)
        weight_lbs: parseFloat(weightLbs) || listing.weight_lbs || null,
        length_inches: parseFloat(lengthInches) || listing.length_inches || null,
        width_inches: parseFloat(widthInches) || listing.width_inches || null,
        height_inches: parseFloat(heightInches) || listing.height_inches || null,
        freight_category: freightCategory || listing.freight_category || null,

        // Location
        fulfillment_type: effectiveFulfillmentType,
        pickup_location_text: pickupLocationText || listing.pickup_location_text || null,
        address: address || listing.address || null,
        delivery_fee: parseFloat(deliveryFee) || listing.delivery_fee || null,
        delivery_radius_miles: parseFloat(deliveryRadiusMiles) || listing.delivery_radius_miles || null,
        pickup_instructions: pickupInstructions || listing.pickup_instructions || null,
        delivery_instructions: deliveryInstructions || listing.delivery_instructions || null,
        access_instructions: accessInstructions || listing.access_instructions || null,
        hours_of_access: hoursOfAccess || listing.hours_of_access || null,
        location_notes: locationNotes || listing.location_notes || null,

        // Availability
        available_from: availableFrom || listing.available_from || null,
        available_to: availableTo || listing.available_to || null,

        // Existing images (new uploads require auth so we only save existingImages here)
        image_urls: existingImages.length > 0 ? existingImages : (listing.image_urls || []),
        cover_image_url: existingImages.length > 0 ? existingImages[0] : (listing.cover_image_url || null),
      };

      // Add pricing fields based on mode
      if (listing.mode === 'sale') {
        updateData.price_sale = safeParsePrice(priceSale) || listing.price_sale || null;
        updateData.vendibook_freight_enabled = vendibookFreightEnabled;
        updateData.freight_payer = freightPayer;
        updateData.accept_card_payment = acceptCardPayment;
        updateData.accept_cash_payment = acceptCashPayment;
        updateData.proof_notary_enabled = proofNotaryEnabled;
      } else {
        updateData.price_daily = safeParsePrice(priceDaily) || listing.price_daily || null;
        updateData.price_weekly = safeParsePrice(priceWeekly) || listing.price_weekly || null;
        updateData.instant_book = instantBook;
        updateData.deposit_amount = safeParsePrice(depositAmount) || listing.deposit_amount || null;
      }

      // Claim the draft and persist all in-memory form data
      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId)
        .eq('guest_draft_token', guestDraft.token);

      if (error) throw error;

      // Update local listing state with persisted data
      setListing(prev => prev ? { ...prev, ...updateData } : null);

      // Clear localStorage
      clearGuestDraft();
      setIsGuestDraft(false);
      setShowAuthModal(false);

      toast({
        title: 'Draft claimed!',
        description: 'Your listing and all changes are now saved to your account.',
      });
    } catch (error) {
      console.error('Error claiming draft:', error);
      toast({
        title: 'Error claiming draft',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClaimingDraft(false);
    }
  };

  // For guest drafts, save data to DB before progressing
  // Auth is only required for publishing, not for step navigation
  const handleGuestStepSave = async () => {
    if (isGuestDraft && !user) {
      // Save guest draft fields to database (RLS allows this with token)
      await saveGuestDraftFields();
    }
  };

  // Allow guests to navigate steps freely; auth is gated at publish
  const handleDetailsSave = async () => {
    if (isGuestDraft && !user) {
      // Save guest draft data and proceed to next step
      await saveGuestDraftFields();
      // Move to next step manually
      const isRentalListing = listing?.mode === 'rent';
      const skipStripeStep = listing?.mode === 'sale' && !acceptCardPayment;
      const baseSteps: PublishStep[] = isRentalListing
        ? ['photos', 'pricing', 'availability', 'details', 'location', 'documents', 'stripe', 'review']
        : ['photos', 'pricing', 'details', 'location', 'stripe', 'review'];
      const steps = skipStripeStep ? baseSteps.filter(s => s !== 'stripe') : baseSteps;
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
      return;
    }
    // Proceed with normal save for authenticated users
    await saveStep();
  };

  // Calculate payout estimates
  const rentalPayoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(priceDaily) || 0;
    const weeklyPrice = parseFloat(priceWeekly) || 0;
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
    };
  }, [priceDaily, priceWeekly]);

  const estimatedFreightCost = 500; // Placeholder
  
  const salePayoutEstimate = useMemo(() => {
    const salePriceNum = parseFloat(priceSale) || 0;
    if (salePriceNum <= 0) return null;
    
    const isSellerPaidFreight = vendibookFreightEnabled && freightPayer === 'seller';
    const freightCost = vendibookFreightEnabled ? estimatedFreightCost : 0;
    
    return calculateSaleFees(salePriceNum, freightCost, isSellerPaidFreight);
  }, [priceSale, vendibookFreightEnabled, freightPayer]);

  const getLocation = () => {
    if (listing?.address) return listing.address;
    if (listing?.pickup_location_text) return listing.pickup_location_text;
    return '';
  };

  const handleGetSuggestions = async () => {
    if (!title || !listing?.category) {
      toast({
        title: 'Missing information',
        description: 'Please add a title and category first to get pricing suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: {
          title: title,
          category: listing.category,
          location: getLocation(),
          mode: listing.mode,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (listing.mode === 'rent') {
        setRentalSuggestions(data as RentalSuggestions);
      } else {
        setSaleSuggestions(data as SaleSuggestions);
      }

      toast({
        title: 'Suggestions ready!',
        description: 'AI pricing suggestions have been generated based on your listing details.',
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: 'Could not get suggestions',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applyRentalSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!rentalSuggestions) return;
    
    const dailyKey = `daily_${type}` as keyof RentalSuggestions;
    const weeklyKey = `weekly_${type}` as keyof RentalSuggestions;
    
    setPriceDaily(String(rentalSuggestions[dailyKey]));
    setPriceWeekly(String(rentalSuggestions[weeklyKey]));
  };

  const applySaleSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!saleSuggestions) return;
    
    const key = `sale_${type}` as keyof SaleSuggestions;
    setPriceSale(String(saleSuggestions[key]));
  };

  // AI Description Optimization
  const optimizeDescription = async () => {
    if (!description || description.trim().length < 10) {
      toast({
        title: 'Description too short',
        description: 'Please write at least 10 characters to optimize.',
        variant: 'destructive',
      });
      return;
    }

    setIsOptimizing(true);
    setOriginalDescription(description);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-description', {
        body: {
          rawDescription: description,
          category: listing?.category,
          mode: listing?.mode,
          title: title,
        },
      });

      if (error) throw error;

      if (data?.optimizedDescription) {
        setDescription(data.optimizedDescription);
        setShowOptimized(true);
        toast({
          title: 'Description optimized!',
          description: 'Your listing description has been professionally rewritten.',
        });
      }
    } catch (error) {
      console.error('Error optimizing description:', error);
      toast({
        title: 'Optimization failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const revertDescription = () => {
    if (originalDescription) {
      setDescription(originalDescription);
      setOriginalDescription(null);
      setShowOptimized(false);
      toast({
        title: 'Description reverted',
        description: 'Your original description has been restored.',
      });
    }
  };

  // Highlights management
  const addHighlight = () => {
    if (newHighlight.trim() && highlights.length < 6) {
      setHighlights(prev => [...prev, newHighlight.trim()]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index));
  };

  const handleHighlightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHighlight();
    }
  };

  // Amenities management
  const toggleAmenity = (amenityId: string) => {
    setAmenities(prev => {
      if (prev.includes(amenityId)) {
        return prev.filter(a => a !== amenityId);
      }
      return [...prev, amenityId];
    });
  };

  // Get amenities for the selected category
  const categoryAmenities = listing?.category
    ? AMENITIES_BY_CATEGORY[listing.category as ListingCategory]
    : [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user) {
      throw new Error('Please sign in to upload photos.');
    }
    if (!listingId) {
      throw new Error('Missing listing id.');
    }

    const urls: string[] = [...existingImages];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`[Upload] Uploading image ${i + 1}/${images.length}: ${file.name} (${file.size} bytes)`);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) {
        console.error(`[Upload] Failed to upload ${file.name}:`, uploadError);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      console.log(`[Upload] Successfully uploaded ${file.name}`, uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      urls.push(publicUrl);
    }

    return urls;
  };

  const saveStep = async () => {
    if (!listing) return;
    setIsSaving(true);

    try {
      let updateData: any = {};

      if (step === 'photos') {
        if (images.length > 0) {
          // Guest drafts can access the wizard without auth, but uploads require auth.
          if (!user) {
            if (isGuestDraft) {
              setShowAuthModal(true);
            }
            toast({
              title: 'Sign in to upload photos',
              description: 'Please sign in to add photos to this listing.',
              variant: 'destructive',
            });
            setIsSaving(false);
            return;
          }

          const imageUrls = await uploadImages();
          updateData = {
            image_urls: imageUrls,
            cover_image_url: imageUrls[0] || null,
          };
          setExistingImages(imageUrls);
          setImages([]);
        }
        // Allow proceeding without photos (guests can add later after auth)
      } else if (step === 'pricing') {
        // Helper function to safely parse price values
        const safeParsePrice = (value: string): number | null => {
          if (!value || !value.trim()) return null;
          const cleaned = value.replace(/[^0-9.]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) || parsed <= 0 ? null : parsed;
        };
        
        if (listing.mode === 'sale') {
          updateData = {
            price_sale: safeParsePrice(priceSale),
            vendibook_freight_enabled: vendibookFreightEnabled,
            freight_payer: freightPayer,
            accept_card_payment: acceptCardPayment,
            accept_cash_payment: acceptCashPayment,
            proof_notary_enabled: proofNotaryEnabled,
          };
        } else {
          updateData = {
            price_daily: safeParsePrice(priceDaily),
            price_weekly: safeParsePrice(priceWeekly),
            instant_book: instantBook,
            deposit_amount: safeParsePrice(depositAmount),
          };
        }
      } else if (step === 'details') {
        updateData = {
          title,
          description,
          highlights,
          amenities,
          weight_lbs: parseFloat(weightLbs) || null,
          length_inches: parseFloat(lengthInches) || null,
          width_inches: parseFloat(widthInches) || null,
          height_inches: parseFloat(heightInches) || null,
          freight_category: freightCategory,
        };
      } else if (step === 'location') {
        // Determine if category-based static or manually toggled
        const categoryIsStatic = isStaticLocationFn(listing.category);
        const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation) ? 'on_site' : (fulfillmentType || 'pickup');

        updateData = {
          fulfillment_type: effectiveFulfillmentType,
          pickup_location_text: pickupLocationText || null,
          address: address || null,
          delivery_fee: parseFloat(deliveryFee) || null,
          delivery_radius_miles: parseFloat(deliveryRadiusMiles) || null,
          pickup_instructions: pickupInstructions || null,
          delivery_instructions: deliveryInstructions || null,
          access_instructions: accessInstructions || null,
          hours_of_access: hoursOfAccess || null,
          location_notes: locationNotes || null,
        };
      } else if (step === 'availability') {
        updateData = {
          available_from: availableFrom || null,
          available_to: availableTo || null,
        };
      } else if (step === 'documents') {
        // Save required documents to the database
        const enabledDocs = requiredDocuments.filter(d => d.is_required);
        
        // Delete existing documents first
        await supabase
          .from('listing_required_documents')
          .delete()
          .eq('listing_id', listing.id);

        // Insert new documents
        if (enabledDocs.length > 0) {
          const docsToInsert = enabledDocs.map(doc => ({
            listing_id: listing.id,
            document_type: doc.document_type,
            is_required: true,
            deadline_type: doc.deadline_type,
            deadline_offset_hours: doc.deadline_offset_hours || null,
            description: doc.description || null,
          }));

          const { error: insertError } = await supabase
            .from('listing_required_documents')
            .insert(docsToInsert);

          if (insertError) throw insertError;
        }
        // No listing update needed, just proceed to next step
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', listing.id);

        if (error) throw error;

        // Update local state
        setListing(prev => prev ? { ...prev, ...updateData } : null);
      }

      // Move to next step - rental listings have availability and documents steps
      // Skip stripe step if card payment is not enabled (cash-only sales)
      const isRentalListing = listing.mode === 'rent';
      const skipStripeStep = listing.mode === 'sale' && !acceptCardPayment;
      const baseSteps: PublishStep[] = isRentalListing
        ? ['photos', 'pricing', 'availability', 'details', 'location', 'documents', 'stripe', 'review']
        : ['photos', 'pricing', 'details', 'location', 'stripe', 'review'];
      const steps = skipStripeStep ? baseSteps.filter(s => s !== 'stripe') : baseSteps;
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error saving',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    // Stripe is only required if card payment is enabled
    const stripeRequired = acceptCardPayment;
    if (!listing) return;

    // Validate all required fields before publishing
    const validationErrors = getValidationErrors();
    if (validationErrors.length > 0) {
      toast({
        title: 'Cannot publish yet',
        description: validationErrors[0], // Show first error
        variant: 'destructive',
      });
      return;
    }

    if (stripeRequired && !isOnboardingComplete) {
      toast({
        title: 'Connect Stripe to receive payments',
        description: 'You need to complete Stripe onboarding before publishing.',
        variant: 'destructive',
      });
      return;
    }

    // Helper to safely parse currency / formatted strings
    const safeParsePrice = (value: string): number | null => {
      if (!value || !value.trim()) return null;
      const cleaned = value.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    setIsSaving(true);

    try {
      // Persist ALL current in-memory fields before publishing.
      // Users can jump directly to Review; without this, the DB may still contain placeholders.
      let imageUrlsToSave = existingImages;
      if (images.length > 0) {
        // Uploading requires auth.
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({
            title: 'Sign in to upload photos',
            description: 'Please sign in to add photos to this listing.',
            variant: 'destructive',
          });
          return;
        }

        imageUrlsToSave = await uploadImages();
        setExistingImages(imageUrlsToSave);
        setImages([]);
      }

      // Determine if category-based static or manually toggled
      const categoryIsStatic = isStaticLocationFn(listing.category);
      const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation)
        ? 'on_site'
        : (fulfillmentType || 'pickup');

      const baseUpdateData: any = {
        // Media
        image_urls: imageUrlsToSave,
        cover_image_url: imageUrlsToSave?.[0] || null,

        // Details
        title,
        description,
        highlights,
        amenities,
        weight_lbs: parseFloat(weightLbs) || null,
        length_inches: parseFloat(lengthInches) || null,
        width_inches: parseFloat(widthInches) || null,
        height_inches: parseFloat(heightInches) || null,
        freight_category: freightCategory,

        // Location
        fulfillment_type: effectiveFulfillmentType,
        pickup_location_text: pickupLocationText || null,
        address: address || null,
        delivery_fee: parseFloat(deliveryFee) || null,
        delivery_radius_miles: parseFloat(deliveryRadiusMiles) || null,
        pickup_instructions: pickupInstructions || null,
        delivery_instructions: deliveryInstructions || null,
        access_instructions: accessInstructions || null,
        hours_of_access: hoursOfAccess || null,
        location_notes: locationNotes || null,

        // Availability (optional)
        available_from: availableFrom || null,
        available_to: availableTo || null,
      };

      const pricingUpdateData: any = listing.mode === 'sale'
        ? {
            price_sale: safeParsePrice(priceSale),
            vendibook_freight_enabled: vendibookFreightEnabled,
            freight_payer: freightPayer,
            accept_card_payment: acceptCardPayment,
            accept_cash_payment: acceptCashPayment,
            proof_notary_enabled: proofNotaryEnabled,
          }
        : {
            price_daily: safeParsePrice(priceDaily),
            price_weekly: safeParsePrice(priceWeekly),
            instant_book: instantBook,
            deposit_amount: safeParsePrice(depositAmount),
          };

      // If Proof Notary is enabled for a sale listing, redirect to checkout for the $45 fee.
      // IMPORTANT: persist everything first; webhook will publish after payment.
      if (listing.mode === 'sale' && proofNotaryEnabled) {
        const { error: persistError } = await supabase
          .from('listings')
          .update({ ...baseUpdateData, ...pricingUpdateData })
          .eq('id', listing.id);

        if (persistError) throw persistError;

        // Get session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast({ title: 'Please sign in to continue', variant: 'destructive' });
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-notary-checkout', {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: { listing_id: listing.id },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No checkout URL returned');

        const newWindow = window.open(data.url, '_blank');
        if (!newWindow) window.location.href = data.url;

        return; // Exit early - webhook will handle publishing after payment
      }

      // Standard publish flow (no notary fee)
      const { error } = await supabase
        .from('listings')
        .update({
          ...baseUpdateData,
          ...pricingUpdateData,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      // Track analytics
      console.log('[ANALYTICS] Listing published', { listingId: listing.id });

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error publishing:', error);
      toast({
        title: 'Error publishing',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      await connectStripe();
    } catch (error) {
      toast({ title: 'Error connecting Stripe', variant: 'destructive' });
    }
  };

  // TOS agreement state for publish confirmation
  const [tosAgreed, setTosAgreed] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Checklist state - with proper validation
  const totalPhotoCount = existingImages.length + images.length;
  // Stripe is only required if card payment is enabled (not cash-only)
  const requiresStripe = acceptCardPayment;
  const enabledDocsCount = requiredDocuments.filter(d => d.is_required).length;

  // Helper to properly validate price input
  const isValidPrice = (value: string): boolean => {
    if (!value || !value.trim()) return false;
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0;
  };

  // Minimum description length
  const MIN_DESCRIPTION_LENGTH = 50;
  const MIN_TITLE_LENGTH = 5;

  const hasPricing = listing?.mode === 'sale' 
    ? isValidPrice(priceSale) 
    : isValidPrice(priceDaily);
  
  const hasValidTitle = title.trim().length >= MIN_TITLE_LENGTH;
  const hasValidDescription = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const hasDescription = hasValidTitle && hasValidDescription;

  const checklistState = {
    hasPhotos: totalPhotoCount >= 3,
    hasPricing,
    hasAvailability: true, // Optional
    hasDescription,
    hasLocation: listing ? (
      isStaticLocationFn(listing.category) || isStaticLocation
        ? !!(address && accessInstructions)
        : !!(fulfillmentType && pickupLocationText)
    ) : false,
    hasStripe: isOnboardingComplete,
    isRental: listing?.mode === 'rent',
    photoCount: totalPhotoCount,
    requiresStripe, // Pass whether Stripe is required
    hasDocuments: true, // Documents step is optional, always "complete"
    documentsCount: enabledDocsCount,
    descriptionLength: description.trim().length,
    priceSet: listing?.mode === 'sale' 
      ? (isValidPrice(priceSale) ? `$${parseFloat(priceSale.replace(/[^0-9.]/g, '')).toLocaleString()}` : undefined)
      : (isValidPrice(priceDaily) ? `$${parseFloat(priceDaily.replace(/[^0-9.]/g, ''))}/day` : undefined),
  };

  const checklistItems = createChecklistItems(checklistState, step);
  const canPublish = checklistItems.filter(i => i.required).every(i => i.completed);

  // Collect validation errors for publish attempt
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (totalPhotoCount < 3) errors.push(`Add at least 3 photos (currently ${totalPhotoCount})`);
    if (!hasPricing) errors.push(listing?.mode === 'sale' ? 'Set a sale price greater than $0' : 'Set a daily rate greater than $0');
    if (!hasValidTitle) errors.push(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
    if (!hasValidDescription) errors.push(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters (currently ${description.trim().length})`);
    if (!checklistState.hasLocation) errors.push('Complete the location and logistics section');
    if (requiresStripe && !isOnboardingComplete) errors.push('Connect Stripe to receive payments');
    return errors;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Claiming draft overlay */}
      {isClaimingDraft && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Saving your draft...</p>
          <p className="text-sm text-muted-foreground">Syncing your changes to your account</p>
        </div>
      )}
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Save & exit
            </button>
            <h1 className="font-semibold">
              {CATEGORY_LABELS[listing.category]} · {listing.mode === 'rent' ? 'For Rent' : 'For Sale'}
            </h1>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar Checklist - Desktop */}
          <div className="hidden lg:block">
            <PublishChecklist
              items={checklistItems}
              onItemClick={(id) => setStep(id as PublishStep)}
              className="sticky top-24"
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Mobile Checklist */}
            <div className="lg:hidden mb-6">
              <PublishChecklist
                items={checklistItems}
                onItemClick={(id) => setStep(id as PublishStep)}
              />
            </div>

            <div className="bg-card rounded-2xl shadow-sm border p-6 md:p-8">
              {/* Step: Photos */}
              {step === 'photos' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Add photos</h2>
                    <p className="text-muted-foreground">Upload at least 3 photos. 5+ recommended.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {existingImages.map((url, index) => (
                      <div key={`existing-${index}`} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {images.map((file, index) => (
                      <div key={`new-${index}`} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Add photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <Button onClick={saveStep} disabled={isSaving || (existingImages.length + images.length) < 3}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Step: Pricing */}
              {step === 'pricing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Set your price</h2>
                    <p className="text-muted-foreground">
                      {listing.mode === 'sale' ? 'Enter your asking price.' : 'Set daily and weekly rates.'}
                    </p>
                  </div>

                  {/* AI Suggestions Button */}
                  <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse pointer-events-none" />
                    <div className="relative flex items-start gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">AI Pricing Assistant</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Get smart pricing suggestions based on your listing title, category, and location.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleGetSuggestions}
                          disabled={isLoadingSuggestions}
                          className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
                        >
                          {isLoadingSuggestions ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing market...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Get AI Suggestions
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {listing.mode === 'sale' ? (
                    <>
                      {/* Sale Suggestions Display */}
                      {saleSuggestions && (
                        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Suggested Pricing
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => applySaleSuggestion('low')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingDown className="w-3 h-3" />
                                Quick Sale
                              </div>
                              <div className="font-semibold text-foreground">${saleSuggestions.sale_low.toLocaleString()}</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applySaleSuggestion('suggested')}
                              className="p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-primary text-xs mb-1">
                                <Target className="w-3 h-3" />
                                Recommended
                              </div>
                              <div className="font-semibold text-foreground">${saleSuggestions.sale_suggested.toLocaleString()}</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applySaleSuggestion('high')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingUp className="w-3 h-3" />
                                Premium
                              </div>
                              <div className="font-semibold text-foreground">${saleSuggestions.sale_high.toLocaleString()}</div>
                            </button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground italic">
                            {saleSuggestions.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Sale Price Input */}
                      <div className="space-y-2">
                        <Label htmlFor="priceSale" className="text-base font-medium">
                          Asking Price <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative max-w-sm">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="priceSale"
                            type="number"
                            placeholder="0"
                            value={priceSale}
                            onChange={(e) => setPriceSale(e.target.value)}
                            className={cn(
                              "pl-8 text-xl",
                              priceSale && !isValidPrice(priceSale) && "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                        </div>
                        {priceSale && !isValidPrice(priceSale) && (
                          <p className="text-sm text-destructive">Please enter a valid price greater than $0</p>
                        )}
                      </div>

                      {/* Payout Estimate for Sales */}
                      {salePayoutEstimate && (
                        <div className="bg-card rounded-xl p-4 border border-border max-w-md">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-muted rounded-xl">
                              <Wallet className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-foreground">
                                  {vendibookFreightEnabled && freightPayer === 'seller' 
                                    ? 'Seller Payout Estimate (Free Shipping)' 
                                    : 'Estimated Payout'}
                                </h4>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Item price:</span>
                                <span className="text-sm text-foreground">
                                  {formatCurrency(salePayoutEstimate.salePrice)}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground">Platform commission:</span>
                                <span className="text-sm text-destructive">
                                  -{formatCurrency(salePayoutEstimate.sellerFee)}
                                </span>
                              </div>
                              
                              {salePayoutEstimate.freightDeduction > 0 && (
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm text-muted-foreground">Freight (seller-paid):</span>
                                  <span className="text-sm text-destructive">
                                    -{formatCurrency(salePayoutEstimate.freightDeduction)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                                <span className="text-sm font-medium text-foreground">Estimated payout:</span>
                                <span className="font-semibold text-primary text-lg">
                                  {formatCurrency(salePayoutEstimate.sellerReceives)}
                                </span>
                              </div>
                              
                              <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>Platform fee is {SALE_SELLER_FEE_PERCENT}% of the sale price</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Method Options */}
                      <div className="pt-6 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Accepted Payment Methods</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select how buyers can pay for your item. You can enable both options.
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                            <Checkbox
                              id="accept_card_payment"
                              checked={acceptCardPayment}
                              onCheckedChange={(checked) => setAcceptCardPayment(!!checked)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="accept_card_payment"
                                className="flex items-center gap-2 text-base font-medium cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4 text-primary" />
                                Pay by Card (Online)
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Accept secure online payments via Stripe. Funds are deposited to your connected Stripe account after sale confirmation.
                              </p>
                              {acceptCardPayment && (
                                <div className="mt-2 p-2 bg-primary/5 rounded text-xs text-muted-foreground">
                                  <Info className="w-3 h-3 inline mr-1" />
                                  Requires Stripe Connect setup to receive payments.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                            <Checkbox
                              id="accept_cash_payment"
                              checked={acceptCashPayment}
                              onCheckedChange={(checked) => setAcceptCashPayment(!!checked)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="accept_cash_payment"
                                className="flex items-center gap-2 text-base font-medium cursor-pointer"
                              >
                                <Banknote className="w-4 h-4 text-green-600" />
                                Pay in Person
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Accept cash or other payments at pickup/delivery. You'll arrange payment directly with the buyer.
                              </p>
                            </div>
                          </div>

                          {!acceptCardPayment && !acceptCashPayment && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <p className="text-sm text-destructive flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Please select at least one payment method.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Freight Settings */}
                      <div className="pt-6 border-t">
                        <FreightSettingsCard
                          enabled={vendibookFreightEnabled}
                          payer={freightPayer}
                          onEnabledChange={(enabled) => setVendibookFreightEnabled(enabled)}
                          onPayerChange={(payer) => setFreightPayer(payer)}
                        />
                      </div>

                      {/* Proof Notary Add-On */}
                      <div className="pt-6 border-t">
                        <ProofNotaryCard
                          enabled={proofNotaryEnabled}
                          onEnabledChange={(enabled) => setProofNotaryEnabled(enabled)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Rental Suggestions Display */}
                      {rentalSuggestions && (
                        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Suggested Pricing
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => applyRentalSuggestion('low')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingDown className="w-3 h-3" />
                                Budget
                              </div>
                              <div className="font-semibold text-foreground">${rentalSuggestions.daily_low}/day</div>
                              <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_low}/week</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applyRentalSuggestion('suggested')}
                              className="p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-primary text-xs mb-1">
                                <Target className="w-3 h-3" />
                                Recommended
                              </div>
                              <div className="font-semibold text-foreground">${rentalSuggestions.daily_suggested}/day</div>
                              <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_suggested}/week</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applyRentalSuggestion('high')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingUp className="w-3 h-3" />
                                Premium
                              </div>
                              <div className="font-semibold text-foreground">${rentalSuggestions.daily_high}/day</div>
                              <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_high}/week</div>
                            </button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground italic">
                            {rentalSuggestions.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Rental Pricing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="priceDaily" className="text-base font-medium">
                            Daily Rate <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              id="priceDaily"
                              type="number"
                              placeholder="0"
                              value={priceDaily}
                              onChange={(e) => setPriceDaily(e.target.value)}
                              className={cn(
                                "pl-8 text-lg",
                                priceDaily && !isValidPrice(priceDaily) && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                          </div>
                          {priceDaily && !isValidPrice(priceDaily) && (
                            <p className="text-sm text-destructive">Enter a valid daily rate greater than $0</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priceWeekly" className="text-base font-medium">Weekly Rate (optional)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              id="priceWeekly"
                              type="number"
                              placeholder="0"
                              value={priceWeekly}
                              onChange={(e) => setPriceWeekly(e.target.value)}
                              className="pl-8 text-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payout Estimate for Rentals */}
                      {(rentalPayoutEstimates.daily || rentalPayoutEstimates.weekly) && (
                        <div className="bg-card rounded-xl p-4 border border-border">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-muted rounded-xl">
                              <Wallet className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-2">Estimated Payout</h4>
                              <div className="space-y-2">
                                {rentalPayoutEstimates.daily && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Daily rental:</span>
                                    <div className="text-right">
                                      <span className="font-semibold text-primary">
                                        {formatCurrency(rentalPayoutEstimates.daily.hostReceives)}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({formatCurrency(rentalPayoutEstimates.daily.hostFee)} fee)
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {rentalPayoutEstimates.weekly && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Weekly rental:</span>
                                    <div className="text-right">
                                      <span className="font-semibold text-primary">
                                        {formatCurrency(rentalPayoutEstimates.weekly.hostReceives)}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({formatCurrency(rentalPayoutEstimates.weekly.hostFee)} fee)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>Platform fee is {RENTAL_HOST_FEE_PERCENT}% of the rental price</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Instant Book Toggle */}
                      <div className="pt-4 border-t">
                        <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 pointer-events-none" />
                          <div className="relative flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md">
                                <Zap className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">Instant Book</h4>
                                  <InfoTooltip 
                                    content="When enabled, renters can book and pay immediately. Documents are still reviewed - if rejected, the booking is cancelled and payment is fully refunded." 
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Allow renters to book immediately without waiting for approval.
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={instantBook}
                              onCheckedChange={(checked) => setInstantBook(checked)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Security Deposit */}
                      <div className="pt-4 border-t">
                        <div className="bg-card rounded-xl p-4 border border-border">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-muted rounded-xl">
                              <Wallet className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground">Security Deposit</h4>
                                <InfoTooltip 
                                  content="A refundable security deposit is charged at booking and returned after the rental ends without damage or delays." 
                                />
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Protect your equipment with a refundable deposit. Returned in full if no damage or late returns.
                              </p>
                              
                              <div className="space-y-2">
                                <Label htmlFor="depositAmount" className="text-sm">Deposit Amount (Optional)</Label>
                                <div className="relative max-w-xs">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input
                                    id="depositAmount"
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Leave blank for no deposit. Typical deposits are $200-$1,000 depending on equipment value.
                                </p>
                              </div>

                              {parseFloat(depositAmount) > 0 && (
                                <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                                  <p className="text-xs text-muted-foreground">
                                    <strong className="text-primary">How it works:</strong> The ${parseFloat(depositAmount).toLocaleString()} deposit is charged when the booking is confirmed. 
                                    After the rental ends, you can release the deposit in full or deduct for any damage/late fees.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep('photos')}>Back</Button>
                    <Button 
                      onClick={saveStep} 
                      disabled={isSaving || (listing.mode === 'sale' ? (!isValidPrice(priceSale) || (!acceptCardPayment && !acceptCashPayment)) : !isValidPrice(priceDaily))}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Availability (Rental only) */}
              {step === 'availability' && listing.mode === 'rent' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Set availability</h2>
                    <p className="text-muted-foreground">
                      Control when your listing is available for bookings.
                    </p>
                  </div>

                  <AvailabilityStep
                    listingId={listing.id}
                    availableFrom={availableFrom}
                    availableTo={availableTo}
                    onAvailableFromChange={setAvailableFrom}
                    onAvailableToChange={setAvailableTo}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep('pricing')}>Back</Button>
                    <Button onClick={saveStep} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Details */}
              {step === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Add details</h2>
                    <p className="text-muted-foreground">
                      {listing.mode === 'rent' ? 'Help renters understand your listing.' : 'Help buyers understand your listing.'}
                    </p>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="title" className="text-base font-medium">
                        Listing Title <span className="text-destructive">*</span>
                      </Label>
                      <span className={cn(
                        "text-sm",
                        title.trim().length < MIN_TITLE_LENGTH ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {title.length}/80
                      </span>
                    </div>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                      placeholder="e.g., 2022 Fully Equipped Taco Truck"
                      className={cn(
                        "text-lg",
                        title.length > 0 && title.trim().length < MIN_TITLE_LENGTH && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {title.length > 0 && title.trim().length < MIN_TITLE_LENGTH ? (
                      <p className="text-sm text-destructive">
                        Title must be at least {MIN_TITLE_LENGTH} characters ({MIN_TITLE_LENGTH - title.trim().length} more needed)
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Make it catchy and descriptive. Include key details like year, type, or specialty.
                      </p>
                    )}
                  </div>

                  {/* Description with AI Optimize */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="description" className="text-base font-medium">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        {showOptimized && originalDescription && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={revertDescription}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Revert
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={optimizeDescription}
                          disabled={isOptimizing || !description || description.length < 10}
                          className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40"
                        >
                          {isOptimizing ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Optimizing...
                            </>
                          ) : showOptimized ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-green-500" />
                              Optimized
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Optimize
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (showOptimized) setShowOptimized(false);
                      }}
                      placeholder="Describe your listing in detail. What makes it special? What equipment is included? What's the condition?"
                      rows={6}
                      className={cn(
                        "resize-none",
                        description.length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {description.length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH ? (
                          <p className="text-sm text-destructive">
                            Description must be at least {MIN_DESCRIPTION_LENGTH} characters ({MIN_DESCRIPTION_LENGTH - description.trim().length} more needed)
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Be detailed! {listing.mode === 'rent' ? 'Renters' : 'Buyers'} want to know everything about your asset.
                          </p>
                        )}
                      </div>
                      <span className={cn(
                        "text-sm whitespace-nowrap",
                        description.trim().length < MIN_DESCRIPTION_LENGTH ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {description.trim().length}/{MIN_DESCRIPTION_LENGTH}+ chars
                      </span>
                    </div>
                    
                    {!showOptimized && description.length >= 10 && description.trim().length >= MIN_DESCRIPTION_LENGTH && (
                      <p className="text-xs text-muted-foreground/70">
                        ✨ Tip: Click AI Optimize for a professional rewrite
                      </p>
                    )}
                  </div>

                  {/* Amenities - Category specific */}
                  {categoryAmenities.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">What's Included</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select all features and amenities that come with your listing.
                        </p>
                      </div>
                      
                      <div className="space-y-6">
                        {categoryAmenities.map((group) => (
                          <div key={group.label} className="space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground">{group.label}</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {group.items.map((item) => (
                                <label
                                  key={item.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                    amenities.includes(item.id)
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                  }`}
                                >
                                  <Checkbox
                                    checked={amenities.includes(item.id)}
                                    onCheckedChange={() => toggleAmenity(item.id)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <span className="text-sm">{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {amenities.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {amenities.length} item{amenities.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  )}

                  {/* Item Dimensions - Only for sale listings with mobile assets */}
                  {listing.mode === 'sale' && (listing.category === 'food_truck' || listing.category === 'food_trailer') && (
                    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <Label className="text-base font-medium">Item Dimensions</Label>
                        <InfoTooltip content="Provide accurate dimensions for freight cost estimates. This helps buyers understand shipping costs." />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        These dimensions are used to calculate accurate freight estimates for buyers.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* Weight */}
                        <div className="space-y-2">
                          <Label htmlFor="weight_lbs" className="flex items-center gap-1.5 text-sm">
                            <Scale className="h-3.5 w-3.5" />
                            Weight (lbs)
                          </Label>
                          <Input
                            id="weight_lbs"
                            type="number"
                            min="0"
                            step="1"
                            value={weightLbs}
                            onChange={(e) => setWeightLbs(e.target.value)}
                            placeholder="e.g., 5000"
                          />
                        </div>

                        {/* Freight Category */}
                        <div className="space-y-2">
                          <Label htmlFor="freight_category" className="flex items-center gap-1.5 text-sm">
                            <Package className="h-3.5 w-3.5" />
                            Freight Type
                          </Label>
                          <select
                            id="freight_category"
                            value={freightCategory || ''}
                            onChange={(e) => setFreightCategory(e.target.value as FreightCategory || null)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">Select type</option>
                            {Object.entries(FREIGHT_CATEGORY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {/* Length */}
                        <div className="space-y-2">
                          <Label htmlFor="length_inches" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Length (in)
                          </Label>
                          <Input
                            id="length_inches"
                            type="number"
                            min="0"
                            step="1"
                            value={lengthInches}
                            onChange={(e) => setLengthInches(e.target.value)}
                            placeholder="e.g., 240"
                          />
                        </div>

                        {/* Width */}
                        <div className="space-y-2">
                          <Label htmlFor="width_inches" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Width (in)
                          </Label>
                          <Input
                            id="width_inches"
                            type="number"
                            min="0"
                            step="1"
                            value={widthInches}
                            onChange={(e) => setWidthInches(e.target.value)}
                            placeholder="e.g., 96"
                          />
                        </div>

                        {/* Height */}
                        <div className="space-y-2">
                          <Label htmlFor="height_inches" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Height (in)
                          </Label>
                          <Input
                            id="height_inches"
                            type="number"
                            min="0"
                            step="1"
                            value={heightInches}
                            onChange={(e) => setHeightInches(e.target.value)}
                            placeholder="e.g., 120"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Typical food truck dimensions are 16-26 ft long (192-312 in), 7-8 ft wide (84-96 in), and 8-10 ft tall (96-120 in).
                      </p>
                    </div>
                  )}

                  {/* Highlights */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Key Highlights (Optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Add up to 6 bullet points to showcase the best features.
                    </p>
                    
                    {highlights.length > 0 && (
                      <ul className="space-y-2">
                        {highlights.map((highlight, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                          >
                            <span className="flex-1">{highlight}</span>
                            <button
                              type="button"
                              onClick={() => removeHighlight(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {highlights.length < 6 && (
                      <div className="flex gap-2">
                        <Input
                          value={newHighlight}
                          onChange={(e) => setNewHighlight(e.target.value)}
                          onKeyDown={handleHighlightKeyDown}
                          placeholder="e.g., Brand new refrigeration system"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={addHighlight}
                          disabled={!newHighlight.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(listing.mode === 'rent' ? 'availability' : 'pricing')}>Back</Button>
                      <Button onClick={handleDetailsSave} disabled={isSaving || !title || !description}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {!user && isGuestDraft ? 'Save & Continue' : 'Continue'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    {/* Guest reminder */}
                    {!user && isGuestDraft && (
                      <p className="text-xs text-muted-foreground text-center">
                        Sign-in required to save your details.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Location */}
              {step === 'location' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Location & Fulfillment</h2>
                    <p className="text-muted-foreground">
                      {isStaticLocationFn(listing.category) 
                        ? 'Tell customers how to access your location.'
                        : 'Set up how customers can get your asset.'}
                    </p>
                  </div>

                  {/* Static Location Toggle - Only for mobile assets (show regardless of current state) */}
                  {isMobileAsset(listing.category) && (
                    <div className="p-4 bg-muted/50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                          <div>
                            <Label htmlFor="static-toggle" className="text-base font-medium cursor-pointer">
                              Static Location
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              This asset is parked at a fixed location (e.g., permanently stationed at a venue, lot, or property)
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="static-toggle"
                          checked={isStaticLocation}
                          onCheckedChange={(checked) => {
                            setIsStaticLocation(checked);
                            if (checked) {
                              setFulfillmentType('on_site');
                            } else {
                              setFulfillmentType('pickup');
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Static Location (Ghost Kitchen, Vendor Lot) or Mobile Asset with Static Toggle */}
                  {(isStaticLocationFn(listing.category) || isStaticLocation) ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-muted rounded-xl flex items-start gap-3">
                        <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          {isStaticLocationFn(listing.category)
                            ? 'This is a fixed on-site location. Customers will come to this address.'
                            : 'This asset is at a fixed location. Customers will come to pick it up.'}
                        </p>
                      </div>

                      {/* Full Address */}
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-base font-medium">Full Address *</Label>
                        <Textarea
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Main Street, Suite 100, City, State ZIP"
                          rows={2}
                        />
                      </div>

                      {/* Access Instructions */}
                      <div className="space-y-2">
                        <Label htmlFor="access_instructions" className="text-base font-medium">Access Instructions *</Label>
                        <Textarea
                          id="access_instructions"
                          value={accessInstructions}
                          onChange={(e) => setAccessInstructions(e.target.value)}
                          placeholder="How do guests access the space? Any gate codes, parking instructions, or check-in procedures?"
                          rows={3}
                        />
                      </div>

                      {/* Hours of Access */}
                      <div className="space-y-2">
                        <Label htmlFor="hours_of_access" className="text-base font-medium">Hours of Access (Optional)</Label>
                        <Input
                          id="hours_of_access"
                          value={hoursOfAccess}
                          onChange={(e) => setHoursOfAccess(e.target.value)}
                          placeholder="e.g., 6 AM - 10 PM daily"
                        />
                      </div>

                      {/* Location Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="location_notes" className="text-base font-medium">Additional Notes (Optional)</Label>
                        <Textarea
                          id="location_notes"
                          value={locationNotes}
                          onChange={(e) => setLocationNotes(e.target.value)}
                          placeholder="Utilities included, parking availability, nearby amenities..."
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Mobile Asset - Not Static */
                    <div className="space-y-6">

                      {/* Fulfillment Type */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Fulfillment Options *</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { value: 'pickup' as FulfillmentType, label: 'Pickup Only', icon: <MapPin className="w-5 h-5" />, description: 'Buyer/renter picks up from your location' },
                            { value: 'delivery' as FulfillmentType, label: 'Delivery Only', icon: <Truck className="w-5 h-5" />, description: 'You deliver to their location' },
                            { value: 'both' as FulfillmentType, label: 'Pickup + Delivery', icon: <Package className="w-5 h-5" />, description: 'Offer both options' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFulfillmentType(option.value)}
                              className={cn(
                                "p-4 rounded-xl border-2 text-left transition-all",
                                fulfillmentType === option.value
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-muted-foreground"
                              )}
                            >
                              <div className={cn(
                                "mb-2",
                                fulfillmentType === option.value ? "text-primary" : "text-muted-foreground"
                              )}>
                                {option.icon}
                              </div>
                              <h4 className={cn(
                                "font-medium text-sm",
                                fulfillmentType === option.value ? "text-primary" : "text-foreground"
                              )}>
                                {option.label}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pickup Location */}
                      {(fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="pickup_location_text" className="text-base font-medium">Pickup Location *</Label>
                            <LocationSearchInput
                              value={pickupLocationText}
                              onChange={(value) => setPickupLocationText(value)}
                              onLocationSelect={(location) => {
                                if (location) {
                                  setPickupCoordinates(location.coordinates);
                                } else {
                                  setPickupCoordinates(null);
                                }
                              }}
                              selectedCoordinates={pickupCoordinates}
                              placeholder="City, State (e.g., Austin, TX)"
                            />
                            <p className="text-sm text-muted-foreground">
                              Enter a general area. Exact address shared after booking.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pickup_instructions" className="text-base font-medium">Pickup Instructions (Optional)</Label>
                            <Textarea
                              id="pickup_instructions"
                              value={pickupInstructions}
                              onChange={(e) => setPickupInstructions(e.target.value)}
                              placeholder="Any special instructions for pickup?"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      {/* Delivery Options */}
                      {(fulfillmentType === 'delivery' || fulfillmentType === 'both') && (
                        <>
                          {fulfillmentType === 'delivery' && (
                            <div className="space-y-2">
                              <Label htmlFor="delivery_base_location" className="text-base font-medium">Your Base Location *</Label>
                              <LocationSearchInput
                                value={pickupLocationText}
                                onChange={(value) => setPickupLocationText(value)}
                                onLocationSelect={(location) => {
                                  if (location) {
                                    setPickupCoordinates(location.coordinates);
                                  } else {
                                    setPickupCoordinates(null);
                                  }
                                }}
                                selectedCoordinates={pickupCoordinates}
                                placeholder="City, State (e.g., Austin, TX)"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="delivery_fee" className="text-base font-medium">Delivery Fee (Optional)</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  id="delivery_fee"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={deliveryFee}
                                  onChange={(e) => setDeliveryFee(e.target.value)}
                                  placeholder="0.00"
                                  className="pl-7"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="delivery_radius_miles" className="text-base font-medium">Delivery Radius (Optional)</Label>
                              <div className="relative">
                                <Input
                                  id="delivery_radius_miles"
                                  type="number"
                                  min="0"
                                  value={deliveryRadiusMiles}
                                  onChange={(e) => setDeliveryRadiusMiles(e.target.value)}
                                  placeholder="50"
                                  className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">miles</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="delivery_instructions" className="text-base font-medium">Delivery Instructions (Optional)</Label>
                            <Textarea
                              id="delivery_instructions"
                              value={deliveryInstructions}
                              onChange={(e) => setDeliveryInstructions(e.target.value)}
                              placeholder="Any special requirements for delivery?"
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
                    <Button 
                      onClick={saveStep} 
                      disabled={isSaving || (
                        (isStaticLocationFn(listing.category) || isStaticLocation) 
                          ? !address || !accessInstructions
                          : !fulfillmentType || !pickupLocationText
                      )}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Required Documents (Rental only) */}
              {step === 'documents' && listing.mode === 'rent' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Required Documents</h2>
                    </div>
                    <p className="text-muted-foreground">
                      Specify which documents renters must provide and when they must be submitted.
                    </p>
                  </div>

                  {/* Info Banner */}
                  <div className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-foreground font-medium mb-1">
                          {enabledDocsCount === 0
                            ? 'No documents required'
                            : `${enabledDocsCount} document${enabledDocsCount > 1 ? 's' : ''} required`}
                        </p>
                        <p className="text-muted-foreground">
                          These documents are required from renters to complete or confirm a booking.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deadline Selection */}
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">When are documents required?</h4>
                    </div>

                    <RadioGroup
                      value={globalDeadline}
                      onValueChange={(value) => {
                        const deadline = value as DocumentDeadlineType;
                        setGlobalDeadline(deadline);
                        setRequiredDocuments(prev =>
                          prev.map(d => ({
                            ...d,
                            deadline_type: deadline,
                            deadline_offset_hours: deadline === 'after_approval_deadline' ? deadlineHours : undefined,
                          }))
                        );
                      }}
                      className="space-y-3"
                    >
                      {(Object.keys(DEADLINE_TYPE_LABELS) as DocumentDeadlineType[]).map((deadline) => (
                        <div key={deadline} className="flex items-start gap-3">
                          <RadioGroupItem value={deadline} id={deadline} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={deadline} className="font-medium cursor-pointer">
                              {DEADLINE_TYPE_LABELS[deadline]}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {DEADLINE_TYPE_DESCRIPTIONS[deadline]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>

                    {globalDeadline === 'after_approval_deadline' && (
                      <div className="flex items-center gap-3 pt-2 pl-6">
                        <Label htmlFor="deadline_hours" className="text-sm whitespace-nowrap">
                          Submit at least
                        </Label>
                        <Input
                          id="deadline_hours"
                          type="number"
                          min="1"
                          max="168"
                          value={deadlineHours}
                          onChange={(e) => {
                            const hours = parseInt(e.target.value) || 48;
                            setDeadlineHours(hours);
                            setRequiredDocuments(prev =>
                              prev.map(d => ({
                                ...d,
                                deadline_offset_hours: hours,
                              }))
                            );
                          }}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">hours before booking start</span>
                      </div>
                    )}
                  </div>

                  {/* Document Groups */}
                  <div className="space-y-3">
                    {DOCUMENT_GROUPS.map((group) => {
                      const groupDocs = requiredDocuments.filter(d => 
                        group.documents.includes(d.document_type)
                      );
                      const enabledInGroup = groupDocs.filter(d => d.is_required).length;
                      const isOpen = openDocGroups.includes(group.label);

                      return (
                        <Collapsible
                          key={group.label}
                          open={isOpen}
                          onOpenChange={() => {
                            setOpenDocGroups(prev =>
                              prev.includes(group.label)
                                ? prev.filter(g => g !== group.label)
                                : [...prev, group.label]
                            );
                          }}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{group.label}</span>
                                {enabledInGroup > 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {enabledInGroup} selected
                                  </span>
                                )}
                              </div>
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-2 pl-4">
                              {group.documents.map((docType) => {
                                const doc = requiredDocuments.find(d => d.document_type === docType);
                                return (
                                  <div
                                    key={docType}
                                    className={cn(
                                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                      doc?.is_required
                                        ? "border-primary/30 bg-primary/5"
                                        : "border-border bg-card"
                                    )}
                                  >
                                    <Switch
                                      checked={doc?.is_required || false}
                                      onCheckedChange={() => {
                                        setRequiredDocuments(prev =>
                                          prev.map(d =>
                                            d.document_type === docType
                                              ? { ...d, is_required: !d.is_required }
                                              : d
                                          )
                                        );
                                      }}
                                    />
                                    <div className="flex-1">
                                      <Label className="font-medium cursor-pointer">
                                        {DOCUMENT_TYPE_LABELS[docType]}
                                      </Label>
                                      <p className="text-sm text-muted-foreground">
                                        {DOCUMENT_TYPE_DESCRIPTIONS[docType]}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('location')}>Back</Button>
                    <Button onClick={saveStep} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Stripe - Only shown if card payment is enabled */}
              {step === 'stripe' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Connect Stripe</h2>
                    <p className="text-muted-foreground">
                      {acceptCardPayment ? 'Required to receive card payments.' : 'Optional for cash-only listings.'}
                    </p>
                  </div>

                  {!acceptCardPayment && (
                    <div className="relative overflow-hidden rounded-xl p-4 border-2 border-muted bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-muted rounded-xl flex items-center justify-center">
                          <Banknote className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Cash-only listing</p>
                          <p className="text-sm text-muted-foreground">Stripe is not required since you're only accepting in-person payments.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {acceptCardPayment && (
                    isOnboardingComplete ? (
                      <div className="relative overflow-hidden rounded-xl p-4 border-2 border-[#635bff]/30 bg-[#635bff]/5">
                        <div className="relative flex items-center gap-3">
                          <div className="p-2.5 bg-[#635bff] rounded-xl shadow-md flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex items-center gap-2">
                            <img src={stripeWordmark} alt="Stripe" className="h-5 w-auto" />
                            <span className="font-semibold text-foreground">connected</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-auto">You're ready to receive payments</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-xl p-6 border-2 border-[#635bff]/30 bg-[#635bff]/5 text-center">
                        <div className="relative">
                          <div className="w-14 h-14 mx-auto mb-4 bg-[#635bff] rounded-xl shadow-md flex items-center justify-center">
                            <img src={stripeWordmark} alt="Stripe" className="h-6 w-auto brightness-0 invert" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">Set up payouts</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Connect to get paid from your listings when you receive bookings or sales.
                          </p>
                          <Button 
                            onClick={handleStripeConnect} 
                            disabled={isConnecting}
                            className="bg-[#635bff] hover:bg-[#5147e6] text-white border-0 shadow-md"
                          >
                            {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            <img src={stripeWordmark} alt="" className="h-4 w-auto brightness-0 invert mr-2" />
                            Connect Stripe
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(listing.mode === 'rent' ? 'documents' : 'location')}>Back</Button>
                    <Button 
                      onClick={() => setStep('review')} 
                      disabled={acceptCardPayment && !isOnboardingComplete}
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {step === 'review' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Review your listing</h2>
                    <p className="text-muted-foreground">Here's how your listing will appear to shoppers.</p>
                  </div>

                  {/* Full Listing Preview Card */}
                  <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-lg">
                    {/* Cover Image */}
                    {existingImages.length > 0 && (
                      <div className="aspect-video relative">
                        <img src={existingImages[0]} alt="" className="w-full h-full object-cover" />
                        {existingImages.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-2.5 py-1 rounded-full">
                            +{existingImages.length - 1} photos
                          </div>
                        )}
                        {/* Mode & Category Badges */}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={cn(
                            "px-3 py-1 text-xs font-medium rounded-full backdrop-blur-sm",
                            listing.mode === 'rent'
                              ? "bg-blue-500/90 text-white"
                              : "bg-green-500/90 text-white"
                          )}>
                            {MODE_LABELS[listing.mode]}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5 space-y-4">
                      {/* Title & Price Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {CATEGORY_LABELS[listing.category]}
                          </span>
                          <h3 className="font-bold text-xl text-foreground mt-1">{title || 'Untitled Listing'}</h3>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-primary">
                            {listing.mode === 'sale'
                              ? `$${parseFloat(priceSale || '0').toLocaleString()}`
                              : `$${parseFloat(priceDaily || '0').toLocaleString()}`}
                          </div>
                          {listing.mode === 'rent' && (
                            <div className="text-sm text-muted-foreground">per day</div>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      {(address || pickupLocationText) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{address || pickupLocationText}</span>
                        </div>
                      )}

                      {/* Description Preview */}
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {description || 'No description provided.'}
                      </p>

                      {/* Highlights */}
                      {highlights.length > 0 && (
                        <div className="pt-3 border-t border-border">
                          <div className="flex flex-wrap gap-2">
                            {highlights.slice(0, 4).map((highlight, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                <Check className="w-3 h-3" />
                                {highlight}
                              </span>
                            ))}
                            {highlights.length > 4 && (
                              <span className="text-xs text-muted-foreground">+{highlights.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fulfillment Info */}
                      <div className="pt-3 border-t border-border flex flex-wrap gap-3">
                        {instantBook && listing.mode === 'rent' && (
                          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                            <Zap className="w-4 h-4" />
                            <span className="font-medium">Instant Book</span>
                          </div>
                        )}
                        {fulfillmentType && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            {fulfillmentType === 'delivery' ? <Truck className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            <span>{fulfillmentType === 'pickup' ? 'Pickup only' : fulfillmentType === 'delivery' ? 'Delivery available' : fulfillmentType === 'both' ? 'Pickup & Delivery' : 'On-site'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Missing Requirements Warning */}
                  {!canPublish && (
                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Cannot publish yet</p>
                          <p className="text-sm text-destructive/80 mt-0.5">
                            Complete all required checklist items before publishing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stripe Connect Panel */}
                  {!isOnboardingComplete && (
                    <div className="p-5 rounded-xl border-2 border-[#635bff]/30 bg-[#635bff]/5">
                      <div className="flex items-start gap-3">
                        <img src={stripeWordmark} alt="Stripe" className="w-12 h-auto mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            Connect to get paid from your listings
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            To go live and receive payments, you need to connect your Stripe account. Takes about 2 minutes.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={handleStripeConnect} disabled={isConnecting} className="bg-[#635bff] hover:bg-[#5147e6] text-white">
                              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Connect Stripe (2 min)
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
                              <Save className="w-4 h-4 mr-1" />
                              Save Draft
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ready to Publish Message */}
                  {canPublish && isOnboardingComplete && (
                    <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
                      <div className="relative flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Your listing is ready!</p>
                          <p className="text-sm text-muted-foreground">Review the preview above and publish when you're ready.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setStep('stripe')}>Back</Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowPreviewModal(true)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview as Shopper
                    </Button>
                    <Button 
                      onClick={() => setShowPublishDialog(true)} 
                      disabled={isSaving || !canPublish || !isOnboardingComplete}
                      className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Publish Listing
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Publish your listing?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Your listing will be visible to all shoppers on VendiBook and you'll start receiving 
                  {listing?.mode === 'rent' ? ' booking requests' : ' purchase inquiries'}.
                </p>
                
                {/* TOS Checkbox */}
                <div className="relative overflow-hidden rounded-xl p-3 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
                  <div className="relative flex items-start gap-3">
                    <Checkbox
                      id="tos-agreement"
                      checked={tosAgreed}
                      onCheckedChange={(checked) => setTosAgreed(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="tos-agreement" className="text-sm text-foreground cursor-pointer leading-relaxed">
                      I agree to VendiBook's{' '}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                        Terms of Service
                      </Link>{' '}
                      and confirm this listing accurately represents my asset.
                    </label>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTosAgreed(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={!tosAgreed || isSaving}
              className={cn(
                "bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md",
                !tosAgreed && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Yes, publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishSuccessModal
        open={showSuccessModal}
        onOpenChange={(open) => {
          if (!open) navigate('/dashboard');
          setShowSuccessModal(open);
        }}
        listing={listing ? {
          id: listing.id,
          title,
          coverImageUrl: existingImages[0] || null,
          category: listing.category,
          mode: listing.mode,
          address: listing.address,
          priceDaily: parseFloat(priceDaily) || null,
          priceWeekly: parseFloat(priceWeekly) || null,
          priceSale: parseFloat(priceSale) || null,
        } : null}
        onViewListing={() => navigate(`/listing/${listing?.id}`)}
      />

      {/* Auth Gate Modal */}
      <AuthGateModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={handleAuthSuccess}
        draftId={listingId}
      />

      {/* Listing Preview Modal */}
      {listing && (
        <ListingPreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          listing={{
            title,
            description,
            category: listing.category,
            mode: listing.mode,
            images: existingImages,
            priceDaily,
            priceWeekly,
            priceSale,
            address,
            pickupLocationText,
            highlights,
            amenities,
            instantBook,
            fulfillmentType,
            deliveryFee,
            deliveryRadiusMiles,
            depositAmount,
            weightLbs,
            lengthInches,
            widthInches,
            heightInches,
            hoursOfAccess,
            availableFrom: availableFrom || undefined,
            availableTo: availableTo || undefined,
            acceptCardPayment,
            acceptCashPayment,
          }}
          host={user ? {
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
            avatar: user.user_metadata?.avatar_url || null,
            memberSince: user.created_at || new Date().toISOString(),
            isVerified: false,
          } : undefined}
        />
      )}
    </div>
  );
};
