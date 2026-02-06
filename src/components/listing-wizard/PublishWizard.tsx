import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Loader2, Send, ExternalLink, Check, Camera, DollarSign, 
  FileText, Calendar, CreditCard, ChevronRight, Save, Sparkles, 
  TrendingUp, TrendingDown, Target, Wallet, Info, Banknote, Zap, 
  RotateCcw, Plus, X, Package, Scale, Ruler, MapPin, Truck, 
  Building2, Eye, AlertCircle, Shield, Clock, ChevronDown as ChevronDownIcon, 
  ChevronUp, GripVertical, Star, Type, ListChecks, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { RentalAvailabilityStep } from './RentalAvailabilityStep';
import { PublishSuccessModal } from './PublishSuccessModal';
import { ListingPreviewModal } from './ListingPreviewModal';
import { AuthGateModal } from './AuthGateModal';
import { getGuestDraft, clearGuestDraft } from '@/lib/guestDraft';
import { cn } from '@/lib/utils';
import { FreightSettingsCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import stripeIcon from '@/assets/stripe-icon.png';
import {
  calculateRentalFees,
  calculateSaleFees,
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT,
} from '@/lib/commissions';

// --- Types ---
type PublishStep = 'photos' | 'headline' | 'includes' | 'pricing' | 'details' | 'location' | 'availability' | 'documents' | 'stripe' | 'review';

// Step order for linear flow
const STEP_ORDER_RENTAL: PublishStep[] = ['photos', 'headline', 'details', 'includes', 'pricing', 'availability', 'location', 'documents', 'stripe', 'review'];
const STEP_ORDER_SALE: PublishStep[] = ['photos', 'headline', 'details', 'includes', 'pricing', 'location', 'stripe', 'review'];

const STEP_LABELS: Record<PublishStep, string> = {
  photos: 'Photos',
  headline: 'Headline',
  includes: 'Amenities',
  pricing: 'Pricing',
  details: 'Details',
  location: 'Location',
  availability: 'Availability',
  documents: 'Documents',
  stripe: 'Payments',
  review: 'Review',
};

interface ListingData {
  id: string;
  mode: 'rent' | 'sale';
  category: ListingCategory;
  status: 'draft' | 'published' | 'paused';
  published_at: string | null;
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
  total_slots?: number | null;
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

// --- Main Component ---
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
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Form fields
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [photoDraggedIndex, setPhotoDraggedIndex] = useState<number | null>(null);
  const [photoDragOverIndex, setPhotoDragOverIndex] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDaily, setPriceDaily] = useState('');
  const [priceWeekly, setPriceWeekly] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('');
  const [priceSale, setPriceSale] = useState('');
  const [instantBook, setInstantBook] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  
  // Pricing fields
  const [vendibookFreightEnabled, setVendibookFreightEnabled] = useState(false);
  const [freightPayer, setFreightPayer] = useState<FreightPayer>('buyer');
  const [acceptCardPayment, setAcceptCardPayment] = useState(true);
  const [acceptCashPayment, setAcceptCashPayment] = useState(false);
  const [proofNotaryEnabled, setProofNotaryEnabled] = useState(false);
  const [featuredEnabled, setFeaturedEnabled] = useState(false);
  
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
  
  // Dimensions state
  const [weightLbs, setWeightLbs] = useState('');
  const [totalSlots, setTotalSlots] = useState(1);
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

  // Required documents step state
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentSetting[]>([]);
  const [globalDeadline, setGlobalDeadline] = useState<DocumentDeadlineType>('before_approval');
  const [deadlineHours, setDeadlineHours] = useState<number>(48);
  const [openDocGroups, setOpenDocGroups] = useState<string[]>(['Identity & Legal']);

  // Get step order based on listing mode
  const getStepOrder = useCallback(() => {
    if (!listing) return STEP_ORDER_RENTAL;
    const baseSteps = listing.mode === 'rent' ? STEP_ORDER_RENTAL : STEP_ORDER_SALE;
    // Skip stripe step if cash-only
    if (listing.mode === 'sale' && !acceptCardPayment) {
      return baseSteps.filter(s => s !== 'stripe');
    }
    return baseSteps;
  }, [listing, acceptCardPayment]);

  const stepOrder = getStepOrder();
  const currentStepIndex = stepOrder.indexOf(step);
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100;

  // --- Fetch Listing ---
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

      const guestDraft = getGuestDraft();
      if (!data.host_id && guestDraft?.listingId === listingId) {
        setIsGuestDraft(true);
      }

      setListing(data as unknown as ListingData);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPriceDaily(data.price_daily?.toString() || '');
      setPriceWeekly(data.price_weekly?.toString() || '');
      setPriceMonthly((data as any).price_monthly?.toString() || '');
      setPriceSale(data.price_sale?.toString() || '');
      setInstantBook(data.instant_book || false);
      setDepositAmount(data.deposit_amount?.toString() || '');
      setExistingImages(data.image_urls || []);
      setExistingVideos(((data as any).video_urls as string[] | null) || []);
      setVendibookFreightEnabled(data.vendibook_freight_enabled || false);
      setFreightPayer((data.freight_payer as FreightPayer) || 'buyer');
      setAcceptCardPayment(data.accept_card_payment ?? true);
      setAcceptCashPayment(data.accept_cash_payment ?? false);
      setProofNotaryEnabled(data.proof_notary_enabled ?? false);
      setFeaturedEnabled((data as any).featured_enabled ?? false);
      setHighlights(data.highlights || []);
      setAmenities(data.amenities || []);
      setWeightLbs(data.weight_lbs?.toString() || '');
      setLengthInches(data.length_inches?.toString() || '');
      setWidthInches(data.width_inches?.toString() || '');
      setHeightInches(data.height_inches?.toString() || '');
      setFreightCategory((data.freight_category as FreightCategory) || null);
      setTotalSlots(data.total_slots || 1);
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
      const categoryIsStatic = isStaticLocationFn(data.category as ListingCategory);
      setIsStaticLocation(categoryIsStatic || (data.fulfillment_type === 'on_site'));
      setAvailableFrom(data.available_from || null);
      setAvailableTo(data.available_to || null);

      // Load required documents for rental listings
      if (data.mode === 'rent') {
        const { data: docsData } = await supabase
          .from('listing_required_documents')
          .select('*')
          .eq('listing_id', listingId);

        if (docsData && docsData.length > 0) {
          const loadedDocs: RequiredDocumentSetting[] = docsData.map(d => ({
            document_type: d.document_type as DocumentType,
            is_required: d.is_required,
            deadline_type: d.deadline_type as DocumentDeadlineType,
            deadline_offset_hours: d.deadline_offset_hours || undefined,
            description: d.description || undefined,
          }));
          setRequiredDocuments(loadedDocs);
          if (docsData[0]) {
            setGlobalDeadline(docsData[0].deadline_type as DocumentDeadlineType);
            if (docsData[0].deadline_offset_hours) {
              setDeadlineHours(docsData[0].deadline_offset_hours);
            }
          }
        } else {
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

  // --- Validation ---
  const isValidPrice = (value: string): boolean => {
    if (!value || !value.trim()) return false;
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed > 0;
  };

  const MIN_DESCRIPTION_LENGTH = 50;
  const MIN_TITLE_LENGTH = 5;
  const totalPhotoCount = existingImages.length + images.length;
  const requiresStripe = acceptCardPayment;
  const enabledDocsCount = requiredDocuments.filter(d => d.is_required).length;

  const hasPricing = listing?.mode === 'sale' 
    ? isValidPrice(priceSale) 
    : isValidPrice(priceDaily);
  
  const hasValidTitle = title.trim().length >= MIN_TITLE_LENGTH;
  const hasValidDescription = description.trim().length >= MIN_DESCRIPTION_LENGTH;
  const hasDescription = hasValidTitle && hasValidDescription;

  const hasLocation = listing ? (
    isStaticLocationFn(listing.category) || isStaticLocation
      ? !!(address && accessInstructions)
      : !!(fulfillmentType && pickupLocationText)
  ) : false;

  const canPublish = totalPhotoCount >= 3 && hasPricing && hasDescription && hasLocation && (!requiresStripe || isOnboardingComplete);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (totalPhotoCount < 3) errors.push(`Add at least 3 photos (currently ${totalPhotoCount})`);
    if (!hasPricing) errors.push(listing?.mode === 'sale' ? 'Set a sale price greater than $0' : 'Set a daily rate greater than $0');
    if (!hasValidTitle) errors.push(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
    if (!hasValidDescription) errors.push(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters (currently ${description.trim().length})`);
    if (!hasLocation) errors.push('Complete the location and logistics section');
    if (requiresStripe && !isOnboardingComplete) errors.push('Connect Stripe to receive payments');
    return errors;
  };

  // --- Payout Estimates ---
  const rentalPayoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(priceDaily) || 0;
    const weeklyPrice = parseFloat(priceWeekly) || 0;
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
    };
  }, [priceDaily, priceWeekly]);

  const estimatedFreightCost = 500;
  
  const salePayoutEstimate = useMemo(() => {
    const salePriceNum = parseFloat(priceSale) || 0;
    if (salePriceNum <= 0) return null;
    const isSellerPaidFreight = vendibookFreightEnabled && freightPayer === 'seller';
    const freightCost = vendibookFreightEnabled ? estimatedFreightCost : 0;
    return calculateSaleFees(salePriceNum, freightCost, isSellerPaidFreight);
  }, [priceSale, vendibookFreightEnabled, freightPayer]);

  // --- Image Upload ---
  const uploadImages = async (): Promise<string[]> => {
    if (!user || images.length === 0) return existingImages;

    const uploadedUrls: string[] = [...existingImages];

    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${listingId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const uploadVideos = async (): Promise<string[]> => {
    if (!user || videos.length === 0) return existingVideos;

    const uploadedUrls: string[] = [...existingVideos];

    for (const file of videos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${listingId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  // --- Save Step ---
  const saveStep = async () => {
    if (!listing || !listingId) return;

    const safeParsePrice = (value: string): number | null => {
      if (!value || !value.trim()) return null;
      const cleaned = value.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    setIsSaving(true);

    try {
      let imageUrlsToSave = existingImages;
      let videoUrlsToSave = existingVideos;

      if (images.length > 0) {
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({
            title: 'Sign in to upload media',
            description: 'Please sign in to add photos or videos to this listing.',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
        imageUrlsToSave = await uploadImages();
        setExistingImages(imageUrlsToSave);
        setImages([]);
      }

      if (videos.length > 0) {
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({
            title: 'Sign in to upload media',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
        videoUrlsToSave = await uploadVideos();
        setExistingVideos(videoUrlsToSave);
        setVideos([]);
      }

      const categoryIsStatic = isStaticLocationFn(listing.category);
      const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation)
        ? 'on_site'
        : (fulfillmentType || 'pickup');

      const updateData: any = {
        image_urls: imageUrlsToSave,
        cover_image_url: imageUrlsToSave?.[0] || null,
        video_urls: videoUrlsToSave,
        title,
        description,
        highlights,
        amenities,
        weight_lbs: parseFloat(weightLbs) || null,
        length_inches: parseFloat(lengthInches) || null,
        width_inches: parseFloat(widthInches) || null,
        height_inches: parseFloat(heightInches) || null,
        freight_category: freightCategory,
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
        available_from: availableFrom || null,
        available_to: availableTo || null,
        total_slots: totalSlots,
      };

      if (listing.mode === 'sale') {
        updateData.price_sale = safeParsePrice(priceSale);
        updateData.vendibook_freight_enabled = vendibookFreightEnabled;
        updateData.freight_payer = freightPayer;
        updateData.accept_card_payment = acceptCardPayment;
        updateData.accept_cash_payment = acceptCashPayment;
        updateData.proof_notary_enabled = proofNotaryEnabled;
        updateData.featured_enabled = featuredEnabled;
      } else {
        updateData.price_daily = safeParsePrice(priceDaily);
        updateData.price_weekly = safeParsePrice(priceWeekly);
        updateData.instant_book = instantBook;
        updateData.deposit_amount = safeParsePrice(depositAmount);
        updateData.featured_enabled = featuredEnabled;
      }

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId);

      if (error) throw error;

      // Save required documents for rentals
      if (listing.mode === 'rent' && step === 'documents') {
        await supabase
          .from('listing_required_documents')
          .delete()
          .eq('listing_id', listingId);

        const docsToInsert = requiredDocuments.filter(d => d.is_required).map(d => ({
          listing_id: listingId,
          document_type: d.document_type,
          is_required: d.is_required,
          deadline_type: d.deadline_type,
          deadline_offset_hours: d.deadline_offset_hours,
          description: d.description,
        }));

        if (docsToInsert.length > 0) {
          await supabase
            .from('listing_required_documents')
            .insert(docsToInsert);
        }
      }

      // Move to next step
      if (currentStepIndex < stepOrder.length - 1) {
        setStep(stepOrder[currentStepIndex + 1]);
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

  // --- Publish ---
  const handlePublish = async () => {
    if (!listing || !listingId || !canPublish) return;

    const safeParsePrice = (value: string): number | null => {
      if (!value || !value.trim()) return null;
      const cleaned = value.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    setIsSaving(true);

    try {
      let imageUrlsToSave = existingImages;
      let videoUrlsToSave = existingVideos;

      if (images.length > 0) {
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({ title: 'Sign in to upload media', variant: 'destructive' });
          return;
        }
        imageUrlsToSave = await uploadImages();
        setExistingImages(imageUrlsToSave);
        setImages([]);
      }

      if (videos.length > 0) {
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({ title: 'Sign in to upload media', variant: 'destructive' });
          return;
        }
        videoUrlsToSave = await uploadVideos();
        setExistingVideos(videoUrlsToSave);
        setVideos([]);
      }

      const categoryIsStatic = isStaticLocationFn(listing.category);
      const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation)
        ? 'on_site'
        : (fulfillmentType || 'pickup');

      const baseUpdateData: any = {
        image_urls: imageUrlsToSave,
        cover_image_url: imageUrlsToSave?.[0] || null,
        video_urls: videoUrlsToSave,
        title,
        description,
        highlights,
        amenities,
        weight_lbs: parseFloat(weightLbs) || null,
        length_inches: parseFloat(lengthInches) || null,
        width_inches: parseFloat(widthInches) || null,
        height_inches: parseFloat(heightInches) || null,
        freight_category: freightCategory,
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
            featured_enabled: featuredEnabled,
          }
        : {
            price_daily: safeParsePrice(priceDaily),
            price_weekly: safeParsePrice(priceWeekly),
            price_monthly: safeParsePrice(priceMonthly),
            instant_book: instantBook,
            deposit_amount: safeParsePrice(depositAmount),
            featured_enabled: featuredEnabled,
          };

      // Handle Proof Notary checkout
      if (listing.mode === 'sale' && proofNotaryEnabled) {
        const { error: persistError } = await supabase
          .from('listings')
          .update({ ...baseUpdateData, ...pricingUpdateData })
          .eq('id', listing.id);

        if (persistError) throw persistError;

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast({ title: 'Please sign in to continue', variant: 'destructive' });
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-notary-checkout', {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          body: { listing_id: listing.id },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No checkout URL returned');

        const newWindow = window.open(data.url, '_blank');
        if (!newWindow) window.location.href = data.url;
        return;
      }

      // Handle Featured Listing checkout
      const listingAlreadyFeatured = !!(listing as any).featured_at;
      if (featuredEnabled && !listingAlreadyFeatured) {
        const { error: persistError } = await supabase
          .from('listings')
          .update({ ...baseUpdateData, ...pricingUpdateData })
          .eq('id', listing.id);

        if (persistError) throw persistError;

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast({ title: 'Please sign in to continue', variant: 'destructive' });
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-featured-checkout', {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          body: { listing_id: listing.id },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No checkout URL returned');

        const newWindow = window.open(data.url, '_blank');
        if (!newWindow) window.location.href = data.url;
        return;
      }

      // Standard publish
      const isFirstTimePublish = !listing.published_at;
      
      const { error } = await supabase
        .from('listings')
        .update({
          ...baseUpdateData,
          ...pricingUpdateData,
          status: 'published',
          ...(isFirstTimePublish ? { published_at: new Date().toISOString() } : {}),
        })
        .eq('id', listing.id);

      if (error) throw error;

      if (isFirstTimePublish) {
        supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'new_listing',
            data: {
              listing_id: listing.id,
              title: listing.title,
              category: listing.category,
              mode: listing.mode,
              host_id: user?.id,
            },
          },
        }).catch(err => console.error('Admin notification error:', err));
      }

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

  // --- Auth Handlers ---
  const handleAuthSuccess = async (userId: string) => {
    if (!listing || !listingId) return;
    setIsClaimingDraft(true);

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
      toast({ title: 'Please sign in to claim your draft', variant: 'destructive' });
      return;
    }

    const guestDraft = getGuestDraft();
    if (!guestDraft || guestDraft.listingId !== listingId) {
      setIsClaimingDraft(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('listings')
        .update({ host_id: userId, guest_draft_token: null })
        .eq('id', listingId)
        .eq('guest_draft_token', guestDraft.token);

      if (error) throw error;

      clearGuestDraft();
      setIsGuestDraft(false);
      setShowAuthModal(false);
      toast({ title: 'Draft claimed!', description: 'Your listing is now saved to your account.' });
    } catch (error) {
      console.error('Error claiming draft:', error);
      toast({ title: 'Error claiming draft', variant: 'destructive' });
    } finally {
      setIsClaimingDraft(false);
    }
  };

  // --- Image Handlers ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Photo drag-and-drop
  const allPhotos = useMemo(() => {
    return [
      ...existingImages.map((url, i) => ({ type: 'existing' as const, url, index: i })),
      ...images.map((file, i) => ({ type: 'new' as const, file, index: i })),
    ];
  }, [existingImages, images]);

  const handlePhotoDragStart = (e: React.DragEvent, globalIndex: number) => {
    setPhotoDraggedIndex(globalIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhotoDragEnd = () => {
    setPhotoDraggedIndex(null);
    setPhotoDragOverIndex(null);
  };

  const handlePhotoDragOver = (e: React.DragEvent, globalIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setPhotoDragOverIndex(globalIndex);
  };

  const handlePhotoDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (photoDraggedIndex === null || photoDraggedIndex === targetIndex) {
      setPhotoDraggedIndex(null);
      setPhotoDragOverIndex(null);
      return;
    }

    const reordered = [...allPhotos];
    const [moved] = reordered.splice(photoDraggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const newExisting: string[] = [];
    const newImages: File[] = [];
    reordered.forEach(item => {
      if (item.type === 'existing') {
        newExisting.push(item.url);
      } else {
        newImages.push(item.file);
      }
    });

    setExistingImages(newExisting);
    setImages(newImages);
    setPhotoDraggedIndex(null);
    setPhotoDragOverIndex(null);
  };

  // --- Highlights ---
  const addHighlight = () => {
    if (newHighlight.trim() && highlights.length < 6) {
      setHighlights(prev => [...prev, newHighlight.trim()]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    setHighlights(prev => prev.filter((_, i) => i !== index));
  };

  // --- Amenities ---
  const toggleAmenity = (amenityId: string) => {
    setAmenities(prev => {
      if (prev.includes(amenityId)) {
        return prev.filter(a => a !== amenityId);
      }
      return [...prev, amenityId];
    });
  };

  const categoryAmenities = listing?.category
    ? AMENITIES_BY_CATEGORY[listing.category as ListingCategory]
    : [];

  // --- AI Suggestions ---
  const handleGetSuggestions = async () => {
    if (!title || !listing?.category) {
      toast({ title: 'Missing information', description: 'Please add a title first.', variant: 'destructive' });
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: {
          title,
          category: listing.category,
          location: address || pickupLocationText || '',
          mode: listing.mode,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (listing.mode === 'rent') {
        setRentalSuggestions(data as RentalSuggestions);
      } else {
        setSaleSuggestions(data as SaleSuggestions);
      }

      toast({ title: 'Suggestions ready!' });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({ title: 'Could not get suggestions', variant: 'destructive' });
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

  // --- AI Description Optimization ---
  const optimizeDescription = async () => {
    if (!description || description.trim().length < 10) {
      toast({ title: 'Description too short', variant: 'destructive' });
      return;
    }

    setIsOptimizing(true);
    setOriginalDescription(description);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-description', {
        body: { rawDescription: description, category: listing?.category, mode: listing?.mode, title },
      });

      if (error) throw error;
      if (data?.optimizedDescription) {
        setDescription(data.optimizedDescription);
        setShowOptimized(true);
        toast({ title: 'Description optimized!' });
      }
    } catch (error) {
      console.error('Error optimizing description:', error);
      toast({ title: 'Optimization failed', variant: 'destructive' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const revertDescription = () => {
    if (originalDescription) {
      setDescription(originalDescription);
      setOriginalDescription(null);
      setShowOptimized(false);
    }
  };

  // --- Stripe ---
  const handleStripeConnect = async () => {
    try {
      await connectStripe();
    } catch (error) {
      toast({ title: 'Error connecting Stripe', variant: 'destructive' });
    }
  };

  // --- Navigation ---
  const handleNext = async () => {
    if (step === 'review') {
      setShowPublishDialog(true);
      return;
    }
    await saveStep();
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setStep(stepOrder[currentStepIndex - 1]);
    } else {
      navigate('/dashboard');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'photos':
        return totalPhotoCount >= 1;
      case 'headline':
        return hasValidTitle && description.length >= 10;
      case 'pricing':
        return hasPricing;
      case 'location':
        return hasLocation;
      case 'stripe':
        return !requiresStripe || isOnboardingComplete;
      default:
        return true;
    }
  };

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your draft...</p>
      </div>
    );
  }

  if (!listing) return null;

  // --- Render ---
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Claiming draft overlay */}
      {isClaimingDraft && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Saving your draft...</p>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-16 border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 px-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Save & Exit</span>
        </Button>
        
        {/* Progress Dots */}
        <div className="flex gap-1.5">
          {stepOrder.map((s, i) => (
            <button
              key={s}
              onClick={() => i <= currentStepIndex && setStep(s)}
              disabled={i > currentStepIndex}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentStepIndex ? "bg-primary w-6" : i < currentStepIndex ? "bg-primary/40 w-2 hover:bg-primary/60 cursor-pointer" : "bg-muted w-2"
              )}
            />
          ))}
        </div>

        <div className="w-20 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(true)}>
            <Eye className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 container max-w-xl mx-auto px-4 py-8 md:py-12 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step: Photos */}
            {step === 'photos' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Showcase your asset</h2>
                  <p className="text-muted-foreground text-lg mt-2">High-quality photos increase bookings by 40%.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {allPhotos.map((item, globalIndex) => {
                    const isDragging = photoDraggedIndex === globalIndex;
                    const isDragOver = photoDragOverIndex === globalIndex;
                    const isCover = globalIndex === 0;
                    const imgSrc = item.type === 'existing' ? item.url : URL.createObjectURL(item.file);

                    return (
                      <div
                        key={item.type === 'existing' ? `existing-${item.index}` : `new-${item.index}`}
                        draggable
                        onDragStart={(e) => handlePhotoDragStart(e, globalIndex)}
                        onDragEnd={handlePhotoDragEnd}
                        onDragOver={(e) => handlePhotoDragOver(e, globalIndex)}
                        onDrop={(e) => handlePhotoDrop(e, globalIndex)}
                        className={cn(
                          "relative aspect-[4/3] rounded-xl overflow-hidden border-2 group cursor-move transition-all",
                          isDragging && "opacity-50 scale-95",
                          isDragOver && "border-primary border-dashed bg-primary/5",
                          isCover ? "border-primary" : "border-border"
                        )}
                      >
                        <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <button
                          onClick={() => item.type === 'existing' ? removeExistingImage(item.index) : removeImage(item.index)}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-5 h-5 text-white drop-shadow" />
                        </div>
                        {isCover && (
                          <span className="absolute bottom-2 left-2 text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Upload button */}
                  <label className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium text-muted-foreground">Add Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  {totalPhotoCount < 3 ? (
                    <span className="text-destructive">Minimum 3 photos required ({3 - totalPhotoCount} more needed)</span>
                  ) : (
                    <span className="text-emerald-600">✓ {totalPhotoCount} photos uploaded</span>
                  )}
                </p>
              </div>
            )}

            {/* Step: Headline */}
            {step === 'headline' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">The basics</h2>
                  <p className="text-muted-foreground text-lg mt-2">Give your listing a clear title and description.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-base font-medium">Listing Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-14 text-lg px-4 rounded-xl border-border/60 focus:border-primary"
                      placeholder="e.g. Downtown Commercial Kitchen"
                    />
                    <p className="text-xs text-muted-foreground">
                      {title.length < MIN_TITLE_LENGTH && <span className="text-destructive">Min {MIN_TITLE_LENGTH} characters</span>}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base font-medium">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={8}
                      className="resize-none p-4 text-base rounded-xl border-border/60 focus:border-primary"
                      placeholder="Describe the equipment, location features, and what makes it special..."
                    />
                    <div className="flex justify-between items-center pt-1">
                      <span className={cn("text-xs", description.length < MIN_DESCRIPTION_LENGTH ? "text-destructive" : "text-muted-foreground")}>
                        {description.length}/{MIN_DESCRIPTION_LENGTH} min characters
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={optimizeDescription}
                        disabled={isOptimizing || description.length < 10}
                        className="h-8 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        {isOptimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        AI Optimize
                      </Button>
                    </div>
                    {showOptimized && originalDescription && (
                      <Button variant="ghost" size="sm" onClick={revertDescription} className="text-xs gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Revert to original
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Details (Highlights) */}
            {step === 'details' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Key highlights</h2>
                  <p className="text-muted-foreground text-lg mt-2">Add up to 6 bullet points to showcase the best features.</p>
                </div>

                {highlights.length > 0 && (
                  <ul className="space-y-2">
                    {highlights.map((highlight, index) => (
                      <li key={index} className="flex items-center gap-2 p-3 bg-muted rounded-xl">
                        <Check className="w-4 h-4 text-primary shrink-0" />
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
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                      placeholder="e.g., Brand new refrigeration system"
                      className="flex-1 h-12 rounded-xl"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addHighlight} disabled={!newHighlight.trim()} className="h-12 w-12 rounded-xl">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                )}

                {highlights.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    💡 Tip: Highlights like "Recently inspected" or "Low mileage" can increase interest.
                  </p>
                )}
              </div>
            )}

            {/* Step: Includes (Amenities) */}
            {step === 'includes' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">What's included</h2>
                  <p className="text-muted-foreground text-lg mt-2">Select all amenities and equipment that come with this listing.</p>
                </div>

                <div className="space-y-6">
                  {categoryAmenities.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <h4 className="font-medium text-foreground">{group.label}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleAmenity(item.id)}
                            className={cn(
                              "p-3 rounded-xl text-left text-sm font-medium transition-all border-2",
                              amenities.includes(item.id)
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-muted-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {amenities.includes(item.id) && <Check className="w-4 h-4 shrink-0" />}
                              <span>{item.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Pricing */}
            {step === 'pricing' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Set your rates</h2>
                  <p className="text-muted-foreground text-lg mt-2">You control your pricing. Change it anytime.</p>
                </div>

                {/* AI Suggestions */}
                <div className="relative overflow-hidden rounded-2xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">AI Pricing Assistant</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Get smart pricing suggestions based on your listing.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleGetSuggestions}
                        disabled={isLoadingSuggestions}
                        className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0"
                      >
                        {isLoadingSuggestions ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" /> Get Suggestions</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Suggestions Display */}
                {listing.mode === 'rent' && rentalSuggestions && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Suggested Pricing
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {(['low', 'suggested', 'high'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => applyRentalSuggestion(type)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-all",
                            type === 'suggested' ? "border-2 border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="text-xs text-muted-foreground mb-1 capitalize">{type === 'suggested' ? 'Recommended' : type === 'low' ? 'Budget' : 'Premium'}</div>
                          <div className="font-semibold">${rentalSuggestions[`daily_${type}` as keyof RentalSuggestions]}/day</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {listing.mode === 'sale' && saleSuggestions && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Suggested Pricing
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {(['low', 'suggested', 'high'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => applySaleSuggestion(type)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-all",
                            type === 'suggested' ? "border-2 border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="text-xs text-muted-foreground mb-1 capitalize">{type === 'suggested' ? 'Recommended' : type === 'low' ? 'Quick Sale' : 'Premium'}</div>
                          <div className="font-semibold">${saleSuggestions[`sale_${type}` as keyof SaleSuggestions]?.toLocaleString()}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Inputs */}
                {listing.mode === 'rent' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-base">Daily Rate *</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                          <Input
                            type="number"
                            value={priceDaily}
                            onChange={(e) => setPriceDaily(e.target.value)}
                            className="h-16 pl-9 text-2xl font-bold rounded-xl"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base">Weekly Rate</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                          <Input
                            type="number"
                            value={priceWeekly}
                            onChange={(e) => setPriceWeekly(e.target.value)}
                            className="h-16 pl-9 text-2xl font-bold rounded-xl"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">Monthly Rate</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                        <Input
                          type="number"
                          value={priceMonthly}
                          onChange={(e) => setPriceMonthly(e.target.value)}
                          className="h-16 pl-9 text-2xl font-bold rounded-xl"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Optional. Offer a discount for month-long rentals.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-base">Asking Price *</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                      <Input
                        type="number"
                        value={priceSale}
                        onChange={(e) => setPriceSale(e.target.value)}
                        className="h-16 pl-9 text-2xl font-bold rounded-xl"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {/* Payout Estimate */}
                {listing.mode === 'rent' && rentalPayoutEstimates.daily && (
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Estimated Payout</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">After {RENTAL_HOST_FEE_PERCENT}% platform fee:</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(rentalPayoutEstimates.daily.hostReceives)}/day</span>
                    </div>
                  </div>
                )}

                {listing.mode === 'sale' && salePayoutEstimate && (
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Estimated Payout</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">After {SALE_SELLER_FEE_PERCENT}% platform fee:</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(salePayoutEstimate.sellerReceives)}</span>
                    </div>
                  </div>
                )}

                {/* Instant Book */}
                {listing.mode === 'rent' && (
                  <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Instant Book</h4>
                        <p className="text-sm text-muted-foreground">Allow guests to book without manual approval.</p>
                      </div>
                    </div>
                    <Switch checked={instantBook} onCheckedChange={setInstantBook} />
                  </div>
                )}

                {/* Payment Methods (Sale only) */}
                {listing.mode === 'sale' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Payment Methods
                    </h4>
                    <div className="space-y-3">
                      <div className={cn("p-4 rounded-xl border-2 transition-colors", acceptCardPayment ? "border-primary bg-primary/5" : "border-border")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-primary" />
                            <div>
                              <span className="font-medium">Pay by Card (Online)</span>
                              <p className="text-sm text-muted-foreground">Secure Stripe payments</p>
                            </div>
                          </div>
                          <Checkbox checked={acceptCardPayment} onCheckedChange={(c) => setAcceptCardPayment(!!c)} />
                        </div>
                      </div>
                      <div className={cn("p-4 rounded-xl border-2 transition-colors", acceptCashPayment ? "border-primary bg-primary/5" : "border-border")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Banknote className="w-5 h-5 text-green-600" />
                            <div>
                              <span className="font-medium">Pay in Person</span>
                              <p className="text-sm text-muted-foreground">Cash or direct payment</p>
                            </div>
                          </div>
                          <Checkbox checked={acceptCashPayment} onCheckedChange={(c) => setAcceptCashPayment(!!c)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: Availability (Rental only) */}
            {step === 'availability' && listing.mode === 'rent' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Availability</h2>
                  <p className="text-muted-foreground text-lg mt-2">Set when your listing is available for bookings.</p>
                </div>

                <RentalAvailabilityStep
                  listingId={listingId!}
                  listingMode="rent"
                  priceDaily={parseFloat(priceDaily) || null}
                  priceHourly={null}
                  onPriceHourlyChange={() => {}}
                  onSettingsChange={() => {}}
                  availableFrom={availableFrom}
                  onAvailableFromChange={setAvailableFrom}
                  availableTo={availableTo}
                  onAvailableToChange={setAvailableTo}
                />
              </div>
            )}

            {/* Step: Location */}
            {step === 'location' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Location</h2>
                  <p className="text-muted-foreground text-lg mt-2">
                    {isStaticLocationFn(listing.category) ? 'Tell customers how to access your location.' : 'Set up how customers can get your asset.'}
                  </p>
                </div>

                {/* Static Location Toggle for Mobile Assets */}
                {isMobileAsset(listing.category) && (
                  <div className="p-4 bg-muted/50 rounded-xl border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <Label htmlFor="static-toggle" className="font-medium cursor-pointer">Static Location</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            This asset is parked at a fixed location
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="static-toggle"
                        checked={isStaticLocation}
                        onCheckedChange={(checked) => {
                          setIsStaticLocation(checked);
                          if (checked) setFulfillmentType('on_site');
                          else setFulfillmentType('pickup');
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Static Location Fields */}
                {(isStaticLocationFn(listing.category) || isStaticLocation) ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Full Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 text-muted-foreground w-5 h-5" />
                        <Textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="pl-10 resize-none min-h-[80px] rounded-xl"
                          placeholder="123 Main St, City, State ZIP"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">Access Instructions *</Label>
                      <Textarea
                        value={accessInstructions}
                        onChange={(e) => setAccessInstructions(e.target.value)}
                        className="min-h-[100px] rounded-xl"
                        placeholder="Gate codes, parking info, or how to find the unit..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">Hours of Access</Label>
                      <Input
                        value={hoursOfAccess}
                        onChange={(e) => setHoursOfAccess(e.target.value)}
                        className="h-12 rounded-xl"
                        placeholder="e.g., 6 AM - 10 PM daily"
                      />
                    </div>
                  </div>
                ) : (
                  /* Mobile Asset - Fulfillment Options */
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Fulfillment Options *</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { value: 'pickup' as FulfillmentType, label: 'Pickup Only', icon: <MapPin className="w-5 h-5" />, desc: 'Buyer picks up from you' },
                          { value: 'delivery' as FulfillmentType, label: 'Delivery Only', icon: <Truck className="w-5 h-5" />, desc: 'You deliver to them' },
                          { value: 'both' as FulfillmentType, label: 'Pickup + Delivery', icon: <Package className="w-5 h-5" />, desc: 'Offer both options' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFulfillmentType(option.value)}
                            className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                              fulfillmentType === option.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                            )}
                          >
                            <div className={cn(fulfillmentType === option.value ? "text-primary" : "text-muted-foreground")}>
                              {option.icon}
                            </div>
                            <div>
                              <h4 className={cn("font-medium", fulfillmentType === option.value ? "text-primary" : "text-foreground")}>
                                {option.label}
                              </h4>
                              <p className="text-sm text-muted-foreground">{option.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pickup Location */}
                    {(fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Pickup Location *</Label>
                        <LocationSearchInput
                          value={pickupLocationText}
                          onChange={(value) => setPickupLocationText(value)}
                          onLocationSelect={(location) => {
                            if (location) setPickupCoordinates(location.coordinates);
                            else setPickupCoordinates(null);
                          }}
                          selectedCoordinates={pickupCoordinates}
                          placeholder="City, State (e.g., Austin, TX)"
                        />
                        <p className="text-sm text-muted-foreground">
                          Exact address shared after booking.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step: Documents (Rental only) */}
            {step === 'documents' && listing.mode === 'rent' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Required Documents</h2>
                  <p className="text-muted-foreground text-lg mt-2">Specify which documents renters must provide.</p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {enabledDocsCount === 0 ? 'No documents required' : `${enabledDocsCount} document${enabledDocsCount > 1 ? 's' : ''} required`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Documents help verify renters and protect your assets.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Groups */}
                <div className="space-y-3">
                  {DOCUMENT_GROUPS.map((group) => {
                    const groupDocs = requiredDocuments.filter(d => group.documents.includes(d.document_type));
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
                            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />}
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
                                    doc?.is_required ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                                  )}
                                >
                                  <Switch
                                    checked={doc?.is_required || false}
                                    onCheckedChange={() => {
                                      setRequiredDocuments(prev =>
                                        prev.map(d =>
                                          d.document_type === docType ? { ...d, is_required: !d.is_required } : d
                                        )
                                      );
                                    }}
                                  />
                                  <div className="flex-1">
                                    <Label className="font-medium cursor-pointer">{DOCUMENT_TYPE_LABELS[docType]}</Label>
                                    <p className="text-sm text-muted-foreground">{DOCUMENT_TYPE_DESCRIPTIONS[docType]}</p>
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
              </div>
            )}

            {/* Step: Stripe */}
            {step === 'stripe' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Get Paid</h2>
                  <p className="text-muted-foreground text-lg mt-2">
                    {acceptCardPayment ? 'Connect Stripe to receive card payments.' : 'Stripe is optional for cash-only listings.'}
                  </p>
                </div>

                {!acceptCardPayment && (
                  <div className="rounded-2xl p-6 border-2 border-muted bg-muted/30 text-center">
                    <Banknote className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">Cash-only listing</h3>
                    <p className="text-sm text-muted-foreground">
                      Stripe is not required since you're only accepting in-person payments.
                    </p>
                  </div>
                )}

                {acceptCardPayment && (
                  isOnboardingComplete ? (
                    <div className="rounded-2xl p-6 border border-border bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <img src={stripeIcon} alt="Stripe" className="h-6 w-6 object-cover rounded-md" />
                            <span className="font-semibold text-foreground">Connected</span>
                          </div>
                          <p className="text-sm text-muted-foreground">You're ready to receive payments</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-8 border border-border bg-muted/30 text-center">
                      <img src={stripeIcon} alt="Stripe" className="w-16 h-16 mx-auto mb-4 rounded-xl object-cover" />
                      <h3 className="font-semibold text-foreground mb-2">Set up payouts</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Connect to receive payments when you get bookings or sales.
                      </p>
                      <Button
                        onClick={handleStripeConnect}
                        disabled={isConnecting}
                        className="bg-[#635bff] hover:bg-[#5147e6] text-white border-0 shadow-md h-12 px-6"
                      >
                        {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        <img src={stripeIcon} alt="" className="h-5 w-5 object-cover rounded mr-2" />
                        Connect Stripe
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Step: Review */}
            {step === 'review' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight">Ready to publish?</h2>
                  <p className="text-muted-foreground text-lg mt-2">Review your listing before going live.</p>
                </div>

                {/* Validation Status */}
                <div className="space-y-3">
                  {[
                    { label: 'Photos', ok: totalPhotoCount >= 3, detail: `${totalPhotoCount} uploaded` },
                    { label: 'Title & Description', ok: hasDescription, detail: hasDescription ? '✓ Complete' : 'Missing details' },
                    { label: 'Pricing', ok: hasPricing, detail: hasPricing ? '✓ Set' : 'Required' },
                    { label: 'Location', ok: hasLocation, detail: hasLocation ? '✓ Set' : 'Required' },
                    { label: 'Stripe', ok: !requiresStripe || isOnboardingComplete, detail: !requiresStripe ? 'Not required' : isOnboardingComplete ? '✓ Connected' : 'Required' },
                  ].map((item) => (
                    <div key={item.label} className={cn("p-4 rounded-xl border flex items-center justify-between", item.ok ? "border-emerald-200 bg-emerald-50" : "border-destructive/30 bg-destructive/5")}>
                      <div className="flex items-center gap-3">
                        {item.ok ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span className={cn("text-sm", item.ok ? "text-emerald-600" : "text-destructive")}>{item.detail}</span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="bg-card rounded-2xl border p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Listing Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category</span>
                      <p className="font-medium">{CATEGORY_LABELS[listing.category]}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mode</span>
                      <p className="font-medium">{listing.mode === 'rent' ? 'For Rent' : 'For Sale'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Title</span>
                      <p className="font-medium">{title || 'Untitled'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price</span>
                      <p className="font-medium">
                        {listing.mode === 'sale'
                          ? (priceSale ? `$${parseFloat(priceSale).toLocaleString()}` : 'Not set')
                          : (priceDaily ? `$${priceDaily}/day` : 'Not set')}
                      </p>
                    </div>
                  </div>
                </div>

                {!canPublish && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                    <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Cannot publish yet
                    </h4>
                    <ul className="text-sm text-destructive space-y-1">
                      {getValidationErrors().map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="container max-w-xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            className="flex-1 sm:flex-none sm:w-32 rounded-xl h-12"
          >
            {currentStepIndex === 0 ? 'Exit' : 'Back'}
          </Button>

          <Button
            variant="default"
            size="lg"
            onClick={handleNext}
            disabled={isSaving || !canProceed()}
            className="flex-1 sm:w-full sm:max-w-xs rounded-xl h-12 text-base font-semibold shadow-xl shadow-primary/20"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {step === 'review' ? 'Publish Listing' : 'Continue'}
          </Button>
        </div>
      </div>

      {/* Mobile Step Menu */}
      <div className="fixed bottom-24 right-4 z-40 lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="rounded-full h-12 w-12 shadow-lg bg-background border-primary/20">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Listing Steps</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-1">
              {stepOrder.map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    if (i <= currentStepIndex) {
                      setStep(s);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                  disabled={i > currentStepIndex}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between",
                    step === s ? "bg-primary/10 text-primary" : i <= currentStepIndex ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>{STEP_LABELS[s]}</span>
                  {i < currentStepIndex && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Publish your listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Your listing will go live and be visible to potential {listing.mode === 'rent' ? 'renters' : 'buyers'}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-3 py-4">
            <Checkbox
              id="tos"
              checked={tosAgreed}
              onCheckedChange={(checked) => setTosAgreed(!!checked)}
            />
            <label htmlFor="tos" className="text-sm text-muted-foreground cursor-pointer leading-snug">
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="text-primary underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/host-terms" target="_blank" className="text-primary underline">Host Agreement</Link>.
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={!tosAgreed || isSaving || !canPublish}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Publish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <PublishSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        listing={{
          id: listingId!,
          title,
          coverImageUrl: existingImages[0] || null,
          category: listing.category,
          mode: listing.mode,
          address: address || pickupLocationText || null,
          priceDaily: parseFloat(priceDaily) || null,
          priceWeekly: parseFloat(priceWeekly) || null,
          priceSale: parseFloat(priceSale) || null,
        }}
        onViewListing={() => navigate(`/listing/${listingId}`)}
      />

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
          address: address || '',
          pickupLocationText: pickupLocationText || '',
          highlights,
          amenities,
          instantBook,
          fulfillmentType: fulfillmentType,
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
      />

      <AuthGateModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};
