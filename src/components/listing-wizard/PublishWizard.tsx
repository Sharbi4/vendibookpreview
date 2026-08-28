import { inchesToFeet, feetToInches, formatDimensionSummary } from '@/lib/listings/dimensions';
import { productCheckoutUrl, hostedCheckoutUrl } from '@/lib/payments/hostedCheckout';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send, ExternalLink, Check, Camera, DollarSign, FileText, Calendar, CreditCard, ChevronRight, Save, TrendingUp, TrendingDown, Target, Wallet, Info, Banknote, Zap, RotateCcw, Plus, X, Package, Scale, Ruler, MapPin, Truck, Building2, Eye, AlertCircle, Shield, Clock, ChevronDown, ChevronUp, GripVertical, Type, ListChecks } from 'lucide-react';
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
  AlertDialogTitle} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { publishListingIdempotent } from '@/lib/listings/publishListing';
import {
  buildLocationColumns,
  structuredLocationChanged,
  resolveListingCoordinates,
  type GeoCandidate,
  type StructuredLocationInput,
} from '@/lib/listings/locationPersistence';
import { saveWizardDraft, loadWizardDraft, clearWizardDraft, hasContent, mergeCached } from '@/lib/listings/wizardDraftCache';

import { reportError } from '@/lib/errorReporter';
import { parseEdgeError } from '@/lib/edgeErrors';
import { usePremiumUpsell, isPremiumError, featureFromParsed } from '@/hooks/usePremiumUpsell';
import { PremiumChip } from '@/components/monetization/PremiumChip';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useProBoostCredit, useRedeemProBoostCredit } from '@/hooks/useProBoostCredit';

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
  DEFAULT_DOCUMENTS_BY_CATEGORY} from '@/types/documents';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { AvailabilityStep } from './AvailabilityStep';
import { RentalAvailabilityStep } from './RentalAvailabilityStep';
import { PublishChecklist, createChecklistItems } from './PublishChecklist';
import { MembershipInlinePanel } from './MembershipInlinePanel';
import { PublishSuccessModal } from './PublishSuccessModal';
import { ListingPreviewModal } from './ListingPreviewModal';
import { ListingLimitReachedModal } from './ListingLimitReachedModal';
import { useListingQuota } from '@/hooks/useListingQuota';
import { AuthGateModal } from './AuthGateModal';
import { getGuestDraft, clearGuestDraft } from '@/lib/guestDraft';
import { cn } from '@/lib/utils';
import { FreightSettingsCard } from '@/components/freight';
import { FeaturedListingCard } from './FeaturedListingCard';
import { ListingQualityGate } from './ListingQualityGate';
import { ListingHealthScoreCard } from './ListingHealthScoreCard';
import { AdditionalSellerSupportCards } from '@/components/monetization/AdditionalSellerSupportCards';
import VerifiedSellerCTA from '@/components/verification/VerifiedSellerCTA';


import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ConsentModal } from '@/components/consent/ConsentModal';
import { DOCUMENT_TYPES, CONSENT_TRIGGERS } from '@/lib/legalDocuments';
import {
  calculateRentalFees,
  calculateSaleFees,
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT} from '@/lib/commissions';
import { isListingFeatured } from '@/lib/featured';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { trackLeadEvent } from '@/lib/leadTracking';
import { PrimaryActionBar } from '@/components/journey';
import {
  getStageRequirements,
  parseKnownProblems,
  isTitledAsset,
  requiresSaleDimensions,
  MIN_GUIDED_PHOTOS,
} from '@/lib/listings/stages';
import { StepWhat, type StepWhatValues } from './stages/StepWhat';
import { ListingDisclosures, type DisclosureValues } from './stages/ListingDisclosures';
import { PhotoGuidance } from './stages/PhotoGuidance';
import { PrivacySummary } from './stages/PrivacySummary';
import { MissingRequirementsAlert } from './MissingRequirementsAlert';

import {
  PublishAttestations,
  emptyAttestations,
  allAttested,
  publishAcceptanceText,
  type AttestationKey,
} from './stages/PublishAttestations';

import { PayPalMonogram, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import {
  EQUINOX_DISCLOSURE_TEXT,
  EQUINOX_DISCLOSURE_VERSION,
  isFinanceableSaleListing,
} from '@/lib/financing/disclosure';

type PublishStep = 'basics' | 'photos' | 'headline' | 'includes' | 'pricing' | 'details' | 'location' | 'availability' | 'documents' | 'review';


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
  price_monthly: number | null;
  price_sale: number | null;
  available_from: string | null;
  available_to: string | null;
  instant_book: boolean;
  deposit_amount: number | null;
  vendibook_freight_enabled: boolean;
  freight_payer: FreightPayer;
  accept_card_payment: boolean; // Legacy Stripe column — read-only history, never written here
  accept_cash_payment: boolean;
  accept_paypal_checkout: boolean;
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
  featured_enabled?: boolean | null;
  featured_at?: string | null;
  featured_expires_at?: string | null;
  pending_featured_payment?: unknown;
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

/**
 * Categories where a VIN / serial is meaningful. Used only to decide whether
 * to show the optional VIN control — it never gates publishing.
 */
const TITLED_SALE_CATEGORIES = ['food_truck', 'food_trailer'];
const isTitledSaleCategory = (l: { mode?: string | null; category?: string | null } | null) =>
  !!l && l.mode === 'sale' && TITLED_SALE_CATEGORIES.includes(String(l.category));

export const PublishWizard: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const premiumUpsell = usePremiumUpsell();
  // Canonical Vendibook Pro entitlement — AI writing/pricing assistance is a
  // Pro benefit. Publishing itself NEVER depends on this.
  const hostEntitlements = useHostEntitlements();
  const aiAssistUnlocked = hostEntitlements.hasAtLeast('pro');
  const { data: proBoostCredit } = useProBoostCredit();
  const redeemBoostCredit = useRedeemProBoostCredit();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Payouts are manual (Vendibook pays sellers directly), so there is no
  // seller payment-account onboarding and nothing here can block publishing.
  const isOnboardingComplete = true;
  const isConnecting = false;

  const VALID_STEPS: PublishStep[] = ['basics', 'photos', 'headline', 'includes', 'pricing', 'details', 'location', 'availability', 'documents', 'review'];
  const initialStep = (() => {
    const s = searchParams.get('step');
    return s && (VALID_STEPS as string[]).includes(s) ? (s as PublishStep) : 'basics';
  })();
  const [step, setStep] = useState<PublishStep>(initialStep);
  const [stageValues, setStageValues] = useState<StepWhatValues>({
    modelYear: '',
    kitchenBuildYear: '',
    kitchenBuildYearUnknown: false,
    condition: '',
    operationalStatus: '',
    lengthInches: '',
    widthInches: '',
    heightInches: '',
  });
  const [disclosures, setDisclosures] = useState<DisclosureValues>({
    titleStatus: '',
    hasLien: '',
    noKnownProblems: false,
    knownProblems: [],
    includedItems: '',
    photosExclusionsAnswered: false,
    photosExclusionsNote: '',
    priceNegotiable: false,
    acceptsOffers: false,
    minOfferAmount: '',
  });
  const [attestations, setAttestations] = useState<Record<AttestationKey, boolean>>(emptyAttestations());
  const [listing, setListing] = useState<ListingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveExiting, setIsSaveExiting] = useState(false);
  // Re-entrancy guards: double-clicks and the periodic guest auto-save must
  // never stack concurrent writes — queued requests contend on the client
  // connection and duplicate network calls, compounding the "Saving…" stall.
  const saveInFlightRef = useRef(false);
  const guestSaveBusyRef = useRef(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isGuestDraft, setIsGuestDraft] = useState(false);
  const [isClaimingDraft, setIsClaimingDraft] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const quota = useListingQuota();

  // Turns on inline red validation after a failed "Continue" attempt.
  const [showStepErrors, setShowStepErrors] = useState(false);
  // Every requirement still missing on the current step, surfaced at the top
  // of the card after a failed Continue/Publish attempt.
  const [stepBlockers, setStepBlockers] = useState<string[]>([]);

  // Scroll to top when step changes
  useEffect(() => {
    setShowStepErrors(false);
    setStepBlockers([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  /**
   * Blocks navigation when a step still has required answers missing:
   * lists them at the top of the step, highlights the fields in red,
   * scrolls to the summary and toasts.
   */
  const guardNext = (blockers: string[], firstFieldId: string | null, proceed: () => void) => () => {
    if (blockers.length > 0) {
      setShowStepErrors(true);
      setStepBlockers(blockers);
      toast({
        title:
          blockers.length === 1
            ? '1 required field is missing'
            : `${blockers.length} required fields are missing`,
        description: blockers.join(' · '),
        variant: 'destructive',
      });
      requestAnimationFrame(() => {
        const summary = document.getElementById('wizard-missing-required');
        if (summary) {
          summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (firstFieldId) {
          document
            .getElementById(firstFieldId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }
    setStepBlockers([]);
    proceed();
  };



  // Keep ?step= in sync with the wizard position so leaving for an upgrade
  // (or a refresh) always returns the seller to the exact same screen.
  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    if (next.get('step') === step) return;
    next.set('step', step);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Handle returns from PayPal Checkout (featured / membership).
  // - Restore the step the user was on via ?step= (validated above).
  // - Show cancel/success toasts.
  // - Invalidate entitlement caches so any newly-unlocked features go live in
  //   this session without a manual refresh.
  // - Strip our own params via replace so a page refresh doesn't re-fire toasts.
  useEffect(() => {
    const unlocked = searchParams.get('unlocked');
    const featuredCancelled = searchParams.get('featured_cancelled') === 'true';
    const membershipCancelled = searchParams.get('membership_cancelled') === 'true';

    if (!unlocked && !featuredCancelled && !membershipCancelled) return;

    const refreshEntitlements = () => {
      queryClient.invalidateQueries({ queryKey: ['host-entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['listing-quota'] });
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['tool-access'] });
    };

    if (unlocked) {
      refreshEntitlements();
      // Give the webhook a brief window to provision, then refresh again so
      // gated controls flip from locked → live without user action.
      const t1 = window.setTimeout(refreshEntitlements, 1500);
      const t2 = window.setTimeout(refreshEntitlements, 4000);
      toast({
        title: 'Pro unlocked 🎉',
        description: 'Your new plan is active — premium tools are live on this account.',
      });
      // best-effort cleanup handled by cleanup below
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      [t1, t2];
    }
    if (featuredCancelled) {
      toast({
        title: 'Boost cancelled',
        description: 'Your listing is still saved. You can add the Featured boost later.',
      });
    }

    if (membershipCancelled) {
      toast({
        title: 'Membership cancelled',
        description: 'No worries — publishing is free. You can upgrade anytime.',
      });
    }

    // Strip handled params but preserve ?step= so a refresh keeps position.
    const next = new URLSearchParams(searchParams);
    ['unlocked', 'featured_cancelled', 'notary_cancelled', 'membership_cancelled'] // notary_cancelled cleaned for legacy links
      .forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Refetch entitlements when the tab regains focus — covers the new-tab
  // Checkout pattern where success lands in the other tab.
  useEffect(() => {
    const onFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['host-entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['listing-quota'] });
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['tool-access'] });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [queryClient]);


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
  
  // New pricing fields
  const [vendibookFreightEnabled, setVendibookFreightEnabled] = useState(false);
  const [freightPayer, setFreightPayer] = useState<FreightPayer>('buyer');
  const [acceptPayPalCheckout, setAcceptPayPalCheckout] = useState(true);
  const [acceptCashPayment, setAcceptCashPayment] = useState(false);
  const [featuredEnabled, setFeaturedEnabled] = useState(false);
  const featuredBoostPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);

  // ─── Buyer financing is automatic on every published for-sale listing ───
  // (no seller opt-in, no disclosure checkbox)
  // Separate, always-unchecked-by-default consent to put the full VIN/serial on
  // the private, server-generated purchase sheet.
  // VIN / serial lives only in the private listing_ownership_details row.
  const [vinSerial, setVinSerial] = useState('');
  const [vinUnavailable, setVinUnavailable] = useState(false);
  // Seller phone lives on the private profile — never in public listing text.
  const [sellerPhone, setSellerPhone] = useState('');


  /**
   * VIN / serial is private data: it is stored only on
   * listing_ownership_details, never on `listings`, and never blocks publish.
   * The row's NOT NULL title_status is filled from the already-selected
   * listing title status so the existing DB constraint is satisfied.
   */
  const persistVinSerial = useCallback(async () => {
    if (!user?.id || !listing?.id) return;
    if (!isTitledSaleCategory(listing)) return;
    const normalized = vinUnavailable ? null : vinSerial.trim().toUpperCase() || null;
    try {
      const { data: existing, error: readError } = await supabase
        .from('listing_ownership_details')
        .select('id, title_status')
        .eq('listing_id', listing.id)
        .maybeSingle();
      if (readError) throw readError;

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('listing_ownership_details')
          .update({ vin_serial: normalized })
          .eq('id', existing.id);
        if (updateError) throw updateError;
        return;
      }

      // The row's title_status is NOT NULL and constrained. Never invent an
      // invalid "unknown"; if the seller hasn't answered yet there is simply
      // nothing to insert — VIN is optional and must never block anything.
      const titleStatus = disclosures.titleStatus?.trim();
      if (!titleStatus) return;

      const { error: insertError } = await supabase.from('listing_ownership_details').insert({
        listing_id: listing.id,
        host_id: user.id,
        title_status: titleStatus,
        vin_serial: normalized,
      });
      if (insertError) throw insertError;
    } catch (err) {
      console.error('Failed to save VIN / serial', err);
      toast({
        title: "We couldn't save your VIN / serial",
        description:
          'It is optional and does not block publishing — you can add it later from the listing editor.',
      });
    }
  }, [user?.id, listing, vinSerial, vinUnavailable, disclosures.titleStatus, toast]);


  const saveSellerPhone = useCallback(async () => {
    if (!user?.id) return;
    const phone = sellerPhone.trim();
    if (!phone) return;
    try {
      await supabase.from('profiles').update({ phone_number: phone }).eq('id', user.id);
    } catch (err) {
      console.error('Failed to save seller phone', err);
    }
  }, [user?.id, sellerPhone]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled && data?.phone_number) setSellerPhone((prev) => prev || data.phone_number || '');
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);


  // Hydrate the private VIN / serial from the owner-only ownership row.
  useEffect(() => {
    if (!listing?.id || !isTitledSaleCategory(listing)) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('listing_ownership_details')
        .select('vin_serial')
        .eq('listing_id', listing.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const vin = (data.vin_serial ?? '').trim();
      setVinSerial(vin);
      setVinUnavailable(!vin);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);
  
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
  
  // Total slots for Vendor Spaces (multi-slot capacity)
  const [totalSlots, setTotalSlots] = useState(1);
  const [slotNames, setSlotNames] = useState<string[]>([]);
  const [lengthInches, setLengthInches] = useState('');
  const [widthInches, setWidthInches] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [freightCategory, setFreightCategory] = useState<FreightCategory | null>(null);

  // Location step state
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | null>(null);
  const [pickupLocationText, setPickupLocationText] = useState('');
  const [address, setAddress] = useState('');
  // Structured address fields
  const [streetAddress, setStreetAddress] = useState('');
  const [aptSuite, setAptSuite] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('');
  const [locZipCode, setLocZipCode] = useState('');
  
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryRadiusMiles, setDeliveryRadiusMiles] = useState('');
  const [deliveryFeeType, setDeliveryFeeType] = useState<'flat' | 'per_mile'>('flat');
  const [pickupInstructions, setPickupInstructions] = useState('');
  // Towing & handoff (rental mobile assets)
  const [hitchBallSize, setHitchBallSize] = useState('');
  const [couplerType, setCouplerType] = useState('');
  const [trailerPlugType, setTrailerPlugType] = useState('');
  const [renterProvidesTowVehicle, setRenterProvidesTowVehicle] = useState<'yes' | 'no' | ''>('');
  const [towVehicleRequirement, setTowVehicleRequirement] = useState('');
  const [returnInstructions, setReturnInstructions] = useState('');
  /** Host-stated towing/handoff columns saved on `listings`. Explicit facts only. */
  const towingHandoffColumns = () => ({
    hitch_ball_size: hitchBallSize.trim() || null,
    coupler_type: couplerType.trim() || null,
    trailer_plug_type: trailerPlugType.trim() || null,
    renter_provides_tow_vehicle:
      renterProvidesTowVehicle === 'yes' ? true : renterProvidesTowVehicle === 'no' ? false : null,
    tow_vehicle_requirement: towVehicleRequirement.trim() || null,
    return_instructions: returnInstructions.trim() || null,
  });
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [hoursOfAccess, setHoursOfAccess] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [isStaticLocation, setIsStaticLocation] = useState(false);

  // Availability step state
  const [availableFrom, setAvailableFrom] = useState<string | null>(null);
  const [availableTo, setAvailableTo] = useState<string | null>(null);
  
  // Hourly/Daily booking settings (for RentalAvailabilityStep)
  const [priceHourly, setPriceHourly] = useState<number | null>(null);
  const [hourlyEnabled, setHourlyEnabled] = useState(false);
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [minHours, setMinHours] = useState(1);
  const [maxHours, setMaxHours] = useState(24);
  const [bufferTimeMins, setBufferTimeMins] = useState(0);
  const [minNoticeHours, setMinNoticeHours] = useState(0);
  const [hourlySchedule, setHourlySchedule] = useState<Record<string, any> | null>(null);
  const [rentalMinDays, setRentalMinDays] = useState(1);
  const [hourlySpecialPricing, setHourlySpecialPricing] = useState<Record<string, any> | null>(null);
  const [availabilityStepValid, setAvailabilityStepValid] = useState(true);

  // Required documents step state (for rentals)
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentSetting[]>([]);
  const [globalDeadline, setGlobalDeadline] = useState<DocumentDeadlineType>('before_approval');
  const [deadlineHours, setDeadlineHours] = useState<number>(48);
  const [openDocGroups, setOpenDocGroups] = useState<string[]>(['Identity & Legal']);

  // ─── Never lose typed input ───────────────────────────────────────────────
  // Everything the seller types is mirrored to a local per-listing cache, so
  // stepping back and forth, refreshing, or returning from a payment page
  // always restores the exact answers they already gave.
  const [draftRestored, setDraftRestored] = useState(false);

  const draftSnapshot = useMemo(
    () => ({
      stageValues,
      disclosures,
      attestations,
      title,
      description,
      priceDaily,
      priceWeekly,
      priceMonthly,
      priceSale,
      priceHourly,
      depositAmount,
      instantBook,
      highlights,
      amenities,
      weightLbs,
      lengthInches,
      widthInches,
      heightInches,
      totalSlots,
      slotNames,
      freightCategory,
      vendibookFreightEnabled,
      freightPayer,
      acceptPayPalCheckout,
      acceptCashPayment,
      vinSerial,
      vinUnavailable,
      sellerPhone,
      fulfillmentType,
      pickupLocationText,
      address,
      streetAddress,
      aptSuite,
      locCity,
      locState,
      locZipCode,
      deliveryFee,
      deliveryRadiusMiles,
      deliveryFeeType,
      pickupInstructions,
      hitchBallSize,
      couplerType,
      trailerPlugType,
      renterProvidesTowVehicle,
      towVehicleRequirement,
      returnInstructions,
      deliveryInstructions,
      accessInstructions,
      hoursOfAccess,
      locationNotes,
      isStaticLocation,
      availableFrom,
      availableTo,
      hourlyEnabled,
      dailyEnabled,
      minHours,
      maxHours,
      bufferTimeMins,
      minNoticeHours,
      hourlySchedule,
      rentalMinDays,
      hourlySpecialPricing,
      requiredDocuments,
      globalDeadline,
      deadlineHours,
    }),
    [
      stageValues, disclosures, attestations, title, description, priceDaily, priceWeekly,
      priceMonthly, priceSale, priceHourly, depositAmount, instantBook, highlights, amenities,
      weightLbs, lengthInches, widthInches, heightInches, totalSlots, slotNames, freightCategory,
      vendibookFreightEnabled, freightPayer, acceptPayPalCheckout, acceptCashPayment,
      vinSerial, vinUnavailable, sellerPhone, fulfillmentType,
      pickupLocationText, address, streetAddress, aptSuite, locCity, locState, locZipCode,
      deliveryFee, deliveryRadiusMiles, deliveryFeeType, pickupInstructions, deliveryInstructions,
      hitchBallSize, couplerType, trailerPlugType, renterProvidesTowVehicle, towVehicleRequirement,
      returnInstructions,
      accessInstructions, hoursOfAccess, locationNotes, isStaticLocation, availableFrom, availableTo,
      hourlyEnabled, dailyEnabled, minHours, maxHours, bufferTimeMins, minNoticeHours, hourlySchedule,
      rentalMinDays, hourlySpecialPricing, requiredDocuments, globalDeadline, deadlineHours,
    ],
  );

  type WizardDraftSnapshot = typeof draftSnapshot;

  // Restore once, right after the listing row finished loading.
  useEffect(() => {
    if (isLoading || draftRestored || !listingId) return;
    setDraftRestored(true);
    const cached = loadWizardDraft<Partial<WizardDraftSnapshot>>(listingId);
    if (!cached) return;

    const apply = <T,>(value: T | undefined, setter: (v: T) => void) => {
      if (hasContent(value)) setter(value as T);
    };

    if (cached.stageValues) setStageValues((prev) => mergeCached(prev, cached.stageValues));
    if (cached.disclosures) setDisclosures((prev) => mergeCached(prev, cached.disclosures));
    if (cached.attestations) setAttestations((prev) => mergeCached(prev, cached.attestations));

    apply(cached.title, setTitle);
    apply(cached.description, setDescription);
    apply(cached.priceDaily, setPriceDaily);
    apply(cached.priceWeekly, setPriceWeekly);
    apply(cached.priceMonthly, setPriceMonthly);
    apply(cached.priceSale, setPriceSale);
    apply(cached.priceHourly, setPriceHourly);
    apply(cached.depositAmount, setDepositAmount);
    apply(cached.instantBook, setInstantBook);
    apply(cached.highlights, setHighlights);
    apply(cached.amenities, setAmenities);
    apply(cached.weightLbs, setWeightLbs);
    apply(cached.lengthInches, setLengthInches);
    apply(cached.widthInches, setWidthInches);
    apply(cached.heightInches, setHeightInches);
    apply(cached.slotNames, setSlotNames);
    apply(cached.freightCategory, setFreightCategory);
    apply(cached.vendibookFreightEnabled, setVendibookFreightEnabled);
    apply(cached.freightPayer, setFreightPayer);
    apply(cached.vinSerial, setVinSerial);
    apply(cached.vinUnavailable, setVinUnavailable);
    apply(cached.sellerPhone, setSellerPhone);
    apply(cached.fulfillmentType, setFulfillmentType);
    apply(cached.pickupLocationText, setPickupLocationText);
    apply(cached.address, setAddress);
    apply(cached.streetAddress, setStreetAddress);
    apply(cached.aptSuite, setAptSuite);
    apply(cached.locCity, setLocCity);
    apply(cached.locState, setLocState);
    apply(cached.locZipCode, setLocZipCode);
    apply(cached.deliveryFee, setDeliveryFee);
    apply(cached.deliveryRadiusMiles, setDeliveryRadiusMiles);
    apply(cached.deliveryFeeType, setDeliveryFeeType);
    apply(cached.pickupInstructions, setPickupInstructions);
    apply(cached.hitchBallSize, setHitchBallSize);
    apply(cached.couplerType, setCouplerType);
    apply(cached.trailerPlugType, setTrailerPlugType);
    apply(cached.renterProvidesTowVehicle, setRenterProvidesTowVehicle);
    apply(cached.towVehicleRequirement, setTowVehicleRequirement);
    apply(cached.returnInstructions, setReturnInstructions);
    apply(cached.deliveryInstructions, setDeliveryInstructions);
    apply(cached.accessInstructions, setAccessInstructions);
    apply(cached.hoursOfAccess, setHoursOfAccess);
    apply(cached.locationNotes, setLocationNotes);
    apply(cached.availableFrom, setAvailableFrom);
    apply(cached.availableTo, setAvailableTo);
    apply(cached.hourlyEnabled, setHourlyEnabled);
    apply(cached.hourlySchedule, setHourlySchedule);
    apply(cached.hourlySpecialPricing, setHourlySpecialPricing);
    apply(cached.requiredDocuments, setRequiredDocuments);
    apply(cached.globalDeadline, setGlobalDeadline);
    if (typeof cached.dailyEnabled === 'boolean') setDailyEnabled(cached.dailyEnabled);
    if (typeof cached.isStaticLocation === 'boolean') setIsStaticLocation(cached.isStaticLocation);
    if (typeof cached.acceptPayPalCheckout === 'boolean') setAcceptPayPalCheckout(cached.acceptPayPalCheckout);
    if (typeof cached.acceptCashPayment === 'boolean') setAcceptCashPayment(cached.acceptCashPayment);
    if (typeof cached.totalSlots === 'number' && cached.totalSlots > 0) setTotalSlots(cached.totalSlots);
    if (typeof cached.minHours === 'number') setMinHours(cached.minHours);
    if (typeof cached.maxHours === 'number') setMaxHours(cached.maxHours);
    if (typeof cached.bufferTimeMins === 'number') setBufferTimeMins(cached.bufferTimeMins);
    if (typeof cached.minNoticeHours === 'number') setMinNoticeHours(cached.minNoticeHours);
    if (typeof cached.rentalMinDays === 'number') setRentalMinDays(cached.rentalMinDays);
    if (typeof cached.deadlineHours === 'number') setDeadlineHours(cached.deadlineHours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, draftRestored, listingId]);

  // Mirror every change to the cache (debounced) once restore has happened.
  useEffect(() => {
    if (!draftRestored || !listingId) return;
    const t = window.setTimeout(() => saveWizardDraft(listingId, draftSnapshot), 400);
    return () => window.clearTimeout(t);
  }, [draftSnapshot, draftRestored, listingId]);

  // Flush immediately if the tab is hidden or closed mid-edit.
  useEffect(() => {
    if (!draftRestored || !listingId) return;
    const flush = () => saveWizardDraft(listingId, draftSnapshot);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [draftSnapshot, draftRestored, listingId]);



  // Auto-save guest draft fields (title, description, pricing) periodically
  // This uses RLS policy "Allow guest draft updates with token"
  // Returns true when the draft row was actually persisted — Save & exit
  // relies on this to avoid leaving with unsaved changes.
  const saveGuestDraftFields = async (): Promise<boolean> => {
    if (!isGuestDraft || !listing || !listingId) return false;
    // Skip overlapping saves: the step-change effect, the 30s interval,
    // beforeunload and the Continue click can otherwise stack concurrent
    // invokes that duplicate writes and contend on the client connection.
    if (guestSaveBusyRef.current) return false;

    const guestDraft = getGuestDraft();
    if (!guestDraft || guestDraft.listingId !== listingId) return false;

    guestSaveBusyRef.current = true;
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
        freight_category: freightCategory || listing.freight_category || null};

      // Add pricing based on mode
      if (listing.mode === 'sale') {
        updateData.price_sale = safeParsePrice(priceSale);
        updateData.vendibook_freight_enabled = vendibookFreightEnabled;
        updateData.freight_payer = freightPayer;
        updateData.accept_paypal_checkout = acceptPayPalCheckout;
        updateData.accept_cash_payment = acceptCashPayment;
        // Paid entitlements (Featured boost) are NEVER written from the
        // browser. They are granted only by a verified PayPal capture or an
        // admin/complimentary path. The seller's selection lives in wizard state
        // and only decides whether checkout is offered after publishing.
      } else {
        updateData.price_daily = safeParsePrice(priceDaily);
        updateData.price_weekly = safeParsePrice(priceWeekly);
        updateData.price_monthly = safeParsePrice(priceMonthly);
        updateData.price_hourly = priceHourly || null;
        updateData.hourly_enabled = hourlyEnabled;
        updateData.daily_enabled = dailyEnabled;
        updateData.min_hours = minHours;
        updateData.max_hours = maxHours;
        updateData.buffer_time_mins = bufferTimeMins;
        updateData.min_notice_hours = minNoticeHours;
        updateData.hourly_schedule = hourlySchedule;
        updateData.hourly_special_pricing = hourlySpecialPricing;
        updateData.rental_min_days = rentalMinDays;
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
      (updateData as any).delivery_fee_type = deliveryFeeType;
      updateData.pickup_instructions = pickupInstructions || listing.pickup_instructions || null;
      Object.assign(updateData as any, towingHandoffColumns());
      updateData.delivery_instructions = deliveryInstructions || listing.delivery_instructions || null;
      updateData.access_instructions = accessInstructions || listing.access_instructions || null;
      updateData.hours_of_access = hoursOfAccess || listing.hours_of_access || null;
      updateData.location_notes = locationNotes || listing.location_notes || null;

      // Availability
      updateData.available_from = availableFrom || listing.available_from || null;
      updateData.available_to = availableTo || listing.available_to || null;

      // Guest drafts can no longer be updated via direct RLS — route through
      // the guest-draft-access edge function which validates the token.
      const guestDraft = getGuestDraft();
      const { error } = guestDraft && guestDraft.listingId === listingId
        ? await (async () => {
            const res = await supabase.functions.invoke('guest-draft-access', {
              body: { action: 'update', id: listingId, token: guestDraft.token, patch: updateData },
            });
            return { error: res.error as any };
          })()
        : await supabase
            .from('listings')
            .update(updateData)
            .eq('id', listingId);

      if (error) {
        console.warn('Guest draft auto-save failed:', (error as any).message);
        return false;
      }
      console.log('Guest draft auto-saved successfully');
      return true;
    } catch (err) {
      console.warn('Guest draft auto-save error:', err);
      return false;
    } finally {
      guestSaveBusyRef.current = false;
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

      let data: any = null;
      let error: any = null;

      const guestDraft = getGuestDraft();
      if (guestDraft && guestDraft.listingId === listingId) {
        // Guest path: use the token-validated edge function.
        const res = await supabase.functions.invoke('guest-draft-access', {
          body: { action: 'get', id: listingId, token: guestDraft.token },
        });
        data = (res.data as any)?.listing ?? null;
        error = res.error ?? (data ? null : new Error('not_found'));
      } else {
        const res = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();
        data = res.data;
        error = res.error;
      }

      if (error || !data) {
        toast({ title: 'Listing not found', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      // Check if this is a guest draft (no host_id but has guest_draft_token)
      if (!data.host_id && guestDraft?.listingId === listingId) {
        setIsGuestDraft(true);
      }

      setListing(data as unknown as ListingData);
      setTitle(data.title || '');
      setDescription(data.description || '');
      // Phase 2 — six-stage fields (all additive; legacy drafts hydrate to empty)
      setStageValues({
        modelYear: (data as any).year_built?.toString() || '',
        kitchenBuildYear: (data as any).kitchen_build_year?.toString() || '',
        kitchenBuildYearUnknown: (data as any).kitchen_build_year_unknown ?? false,
        condition: (data as any).condition || '',
        operationalStatus: (data as any).operational_status || '',
        lengthInches: data.length_inches?.toString() || '',
        widthInches: data.width_inches?.toString() || '',
        heightInches: data.height_inches?.toString() || '',
      });
      setDisclosures({
        titleStatus: (data as any).title_status || '',
        hasLien: (data as any).has_lien || '',
        noKnownProblems: (data as any).no_known_problems ?? false,
        knownProblems: parseKnownProblems((data as any).known_problems),
        includedItems: (data as any).included_items || '',
        photosExclusionsAnswered: (data as any).photos_exclusions_answered ?? false,
        photosExclusionsNote: (data as any).photos_exclusions_note || '',
        priceNegotiable: (data as any).price_negotiable ?? false,
        acceptsOffers: (data as any).accepts_offers ?? false,
        minOfferAmount: (data as any).min_offer_amount?.toString() || '',
      });

      setPriceDaily(data.price_daily?.toString() || '');
      setPriceWeekly(data.price_weekly?.toString() || '');
      setPriceMonthly(data.price_monthly?.toString() || '');
      setPriceSale(data.price_sale?.toString() || '');
      setInstantBook(data.instant_book || false);
      setDepositAmount(data.deposit_amount?.toString() || '');
      setExistingImages(data.image_urls || []);
      setExistingVideos(((data as any).video_urls as string[] | null) || []);
      setVendibookFreightEnabled(data.vendibook_freight_enabled || false);
      setFreightPayer((data.freight_payer as FreightPayer) || 'buyer');
      setAcceptPayPalCheckout(data.accept_paypal_checkout ?? true);
      setAcceptCashPayment(data.accept_cash_payment ?? false);
      setFeaturedEnabled((data as any).featured_enabled ?? false);
      // Set details step fields
      setHighlights(data.highlights || []);
      setAmenities(data.amenities || []);
      setWeightLbs(data.weight_lbs?.toString() || '');
      setLengthInches(data.length_inches?.toString() || '');
      setWidthInches(data.width_inches?.toString() || '');
      setHeightInches(data.height_inches?.toString() || '');
      setFreightCategory((data.freight_category as FreightCategory) || null);
      // Set total slots and slot names for vendor spaces
      setTotalSlots(data.total_slots || 1);
      setSlotNames((data as any).slot_names || []);
      // Set location step fields
      setFulfillmentType((data.fulfillment_type as FulfillmentType) || null);
      // Legacy drafts sometimes stored a phone number in the public pickup text.
      // Never hydrate that back into a public field.
      const legacyPickupText = data.pickup_location_text || '';
      const pickupLooksLikePhone = /^\(?\d{3}/.test(legacyPickupText.trim());
      setPickupLocationText(pickupLooksLikePhone ? '' : legacyPickupText);
      setAddress(data.address || '');

      // Prefer the structured columns; fall back to parsing legacy address text.
      const cityCol = ((data as any).city || '').trim();
      const stateCol = ((data as any).state || '').trim();
      const zipCol = ((data as any).postal_code || '').trim();
      if (cityCol) setLocCity(cityCol);
      if (stateCol) setLocState(stateCol);
      if (zipCol) setLocZipCode(zipCol);

      if (data.address) {
        const parts = data.address.split(',').map((p: string) => p.trim());
        // Last part might be "STATE ZIP" (ZIP optional for locality strings)
        const lastPart = parts[parts.length - 1] || '';
        const stateZipMatch = lastPart.match(/^([A-Z]{2})(?:\s+(\d{5}))?$/);
        if (parts.length === 2 && stateZipMatch) {
          // Quick Start locality like "Houston, TX" — hydrate city/state/ZIP
          // but NEVER treat the first segment as a street address.
          if (!cityCol) setLocCity(parts[0] || '');
          if (!stateCol) setLocState(stateZipMatch[1]);
          if (!zipCol && stateZipMatch[2]) setLocZipCode(stateZipMatch[2]);
        } else if (parts.length === 2) {
          // Legacy "Street, City" — keep the street, add a city fallback.
          setStreetAddress(parts[0] || '');
          if (!cityCol) setLocCity(parts[1] || '');
        } else if (parts.length >= 3) {
          setStreetAddress(parts[0] || '');
          if (!cityCol) setLocCity(parts[parts.length - 2] || '');
          if (stateZipMatch) {
            if (!stateCol) setLocState(stateZipMatch[1]);
            if (!zipCol && stateZipMatch[2]) setLocZipCode(stateZipMatch[2]);
          } else if (!stateCol) {
            setLocState(lastPart);
          }
        } else if (parts[0]) {
          setStreetAddress(parts[0]);
        }
      }
      setDeliveryFee(data.delivery_fee?.toString() || '');
      setDeliveryRadiusMiles(data.delivery_radius_miles?.toString() || '');
      setDeliveryFeeType(((data as any).delivery_fee_type === 'per_mile') ? 'per_mile' : 'flat');
      setPickupInstructions(data.pickup_instructions || '');
      const towSrc = data as any;
      setHitchBallSize(towSrc.hitch_ball_size || '');
      setCouplerType(towSrc.coupler_type || '');
      setTrailerPlugType(towSrc.trailer_plug_type || '');
      setRenterProvidesTowVehicle(
        towSrc.renter_provides_tow_vehicle === true ? 'yes' : towSrc.renter_provides_tow_vehicle === false ? 'no' : ''
      );
      setTowVehicleRequirement(towSrc.tow_vehicle_requirement || '');
      setReturnInstructions(towSrc.return_instructions || '');
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
      
      // Hourly/Daily booking settings
      setPriceHourly((data as any).price_hourly ?? null);
      setHourlyEnabled((data as any).hourly_enabled ?? false);
      setDailyEnabled((data as any).daily_enabled !== false);
      setMinHours((data as any).min_hours ?? 1);
      setMaxHours((data as any).max_hours ?? 24);
      setBufferTimeMins((data as any).buffer_time_mins ?? 0);
      setMinNoticeHours((data as any).min_notice_hours ?? 0);
      setHourlySchedule((data as any).hourly_schedule ?? null);
      setRentalMinDays((data as any).rental_min_days ?? 1);
      setHourlySpecialPricing((data as any).hourly_special_pricing ?? null);

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
            enabled: true,
            is_required: d.is_required,
            title: (d as any).title || undefined,
            instructions: (d as any).instructions || undefined,
            requirement_config: ((d as any).requirement_config ?? undefined),
            deadline_type: d.deadline_type as DocumentDeadlineType,
            deadline_offset_hours: d.deadline_offset_hours || undefined,
            description: d.description || undefined}));
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
            deadline_offset_hours: undefined}));
          setRequiredDocuments(initialDocs);
        }
      }

      // Resume where the seller left off. Only when the URL does not already
      // pin a step (deep links and post-payment returns keep their target).
      if (!searchParams.get('step')) {
        const d: any = data;
        const isRent = d.mode === 'rent';
        const hasBasics = !!d.condition && !!d.operational_status;
        const hasPhotos = Array.isArray(d.image_urls) && d.image_urls.length >= 3;
        const hasHeadline = !!d.title && !!d.description;
        const hasIncludes =
          typeof d.included_items === 'string' && d.included_items.trim().length >= 3;
        const hasPrice = isRent
          ? !!(d.price_daily || d.price_hourly || d.price_weekly || d.price_monthly)
          : !!d.price_sale;
        const hasLocation = !!(d.city && d.postal_code);
        const resume: PublishStep = !hasBasics
          ? 'basics'
          : !hasPhotos
            ? 'photos'
            : !hasHeadline
              ? 'headline'
              : !hasIncludes
                ? 'includes'
                : !hasPrice
                  ? 'pricing'
                  : !hasLocation
                    ? 'location'
                    : 'review';
        if (resume !== 'basics') setStep(resume);
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
        variant: 'destructive'});
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
        delivery_fee_type: deliveryFeeType,
        pickup_instructions: pickupInstructions || listing.pickup_instructions || null,
        ...towingHandoffColumns(),
        delivery_instructions: deliveryInstructions || listing.delivery_instructions || null,
        access_instructions: accessInstructions || listing.access_instructions || null,
        hours_of_access: hoursOfAccess || listing.hours_of_access || null,
        location_notes: locationNotes || listing.location_notes || null,

        // Structured location columns — persisted whenever the guest provided
        // them pre-auth so claiming the draft never drops the verified location.
        ...(locCity.trim() ? { city: locCity.trim() } : {}),
        ...(locState.trim() ? { state: locState.trim() } : {}),
        ...(locZipCode.trim() ? { postal_code: locZipCode.trim() } : {}),

        // Availability
        available_from: availableFrom || listing.available_from || null,
        available_to: availableTo || listing.available_to || null,

        // Existing images (new uploads require auth so we only save existingImages here)
        image_urls: existingImages.length > 0 ? existingImages : (listing.image_urls || []),
        cover_image_url: existingImages.length > 0 ? existingImages[0] : (listing.cover_image_url || null)};

      // Add pricing fields based on mode
      if (listing.mode === 'sale') {
        updateData.price_sale = safeParsePrice(priceSale) || listing.price_sale || null;
        updateData.vendibook_freight_enabled = vendibookFreightEnabled;
        updateData.freight_payer = freightPayer;
        updateData.accept_paypal_checkout = acceptPayPalCheckout;
        updateData.accept_cash_payment = acceptCashPayment;
        // Paid entitlements (Featured boost) are NEVER written from the
        // browser. They are granted only by a verified PayPal capture or an
        // admin/complimentary path. The seller's selection lives in wizard state
        // and only decides whether checkout is offered after publishing.
      } else {
        updateData.price_daily = safeParsePrice(priceDaily) || listing.price_daily || null;
        updateData.price_weekly = safeParsePrice(priceWeekly) || listing.price_weekly || null;
        updateData.price_monthly = safeParsePrice(priceMonthly) || listing.price_monthly || null;
        updateData.price_hourly = priceHourly || (listing as any).price_hourly || null;
        updateData.hourly_enabled = hourlyEnabled;
        updateData.daily_enabled = dailyEnabled;
        updateData.min_hours = minHours;
        updateData.max_hours = maxHours;
        updateData.buffer_time_mins = bufferTimeMins;
        updateData.min_notice_hours = minNoticeHours;
        updateData.hourly_schedule = hourlySchedule;
        updateData.hourly_special_pricing = hourlySpecialPricing;
        updateData.rental_min_days = rentalMinDays;
        updateData.instant_book = instantBook;
        updateData.deposit_amount = safeParsePrice(depositAmount) || listing.deposit_amount || null;
      }

      // Claim the draft via the token-validated edge function. host_id and
      // guest_draft_token clearing are handled server-side; strip them from
      // the client patch to avoid the allowlist rejecting the field.
      const { host_id: _hid, guest_draft_token: _gdt, ...patchForClaim } = updateData;
      const { error } = await (async () => {
        const res = await supabase.functions.invoke('guest-draft-access', {
          body: { action: 'claim', id: listingId, token: guestDraft.token, patch: patchForClaim },
        });
        return { error: (res.error as any) ?? ((res.data as any)?.error ? new Error((res.data as any).error) : null) };
      })();

      if (error) throw error;

      // Update local listing state with persisted data
      setListing(prev => prev ? { ...prev, ...updateData } : null);

      // Clear localStorage
      clearGuestDraft();
      setIsGuestDraft(false);
      setShowAuthModal(false);

      toast({
        title: 'Draft claimed!',
        description: 'Your listing and all changes are now saved to your account.'});
    } catch (error) {
      console.error('Error claiming draft:', error);
      toast({
        title: 'Error claiming draft',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'});
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
      // Save guest draft data and proceed to next step. Show progress on the
      // button and cap the wait so a stalled network call can never leave
      // Continue unresponsive — the local draft cache keeps every answer and
      // the 30s auto-save retries in the background.
      setIsSaving(true);
      try {
        await Promise.race([
          saveGuestDraftFields(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('guest-save-timeout')), 25000),
          ),
        ]);
      } catch (err) {
        console.warn('Guest save did not complete before continuing:', err);
      } finally {
        setIsSaving(false);
      }
      // Move to next step manually
      const isRentalListing = listing?.mode === 'rent';
      const steps: PublishStep[] = isRentalListing
        ? ['basics', 'photos', 'headline', 'includes', 'pricing', 'availability', 'location', 'documents', 'review']
        : ['basics', 'photos', 'headline', 'includes', 'pricing', 'location', 'review'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex === -1) {
        // Orphaned/legacy step (e.g. ?step=details): continue forward.
        setStep('includes');
      } else if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
      return;
    }
    // Proceed with normal save for authenticated users
    await saveStep();
  };

  // Save & exit: persist the current wizard state BEFORE leaving. Authed
  // drafts reuse saveStep (current-step fields + media uploads via the
  // existing upload path); guest drafts reuse saveGuestDraftFields. On
  // failure we stay on the page — the save helpers already surface why.
  const handleSaveAndExit = async () => {
    if (isSaveExiting || isSaving || saveInFlightRef.current) return;
    setIsSaveExiting(true);
    try {
      if (isGuestDraft && !user) {
        // If a background auto-save is mid-flight, give it a moment to finish
        // so the save below captures the latest in-memory edits.
        const waitStart = Date.now();
        while (guestSaveBusyRef.current && Date.now() - waitStart < 27000) {
          await new Promise((r) => window.setTimeout(r, 250));
        }
        const ok = await saveGuestDraftFields();
        if (ok) {
          navigate('/dashboard');
        } else {
          toast({
            title: "We couldn't save your draft",
            description: 'Your changes were not saved. Check your connection and try again — your answers are still on this page.',
            variant: 'destructive'});
        }
        return;
      }
      const ok = await saveStep();
      // saveStep already toasts on failure — only leave after a confirmed save.
      if (ok) navigate('/dashboard');
    } finally {
      setIsSaveExiting(false);
    }
  };

  // Calculate payout estimates
  const rentalPayoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(priceDaily) || 0;
    const weeklyPrice = parseFloat(priceWeekly) || 0;
    const monthlyPrice = parseFloat(priceMonthly) || 0;
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
      monthly: monthlyPrice > 0 ? calculateRentalFees(monthlyPrice) : null};
  }, [priceDaily, priceWeekly, priceMonthly]);

  const estimatedFreightCost = 500; // Placeholder

  const buildStructuredAddress = useCallback(() => {
    const stateZip = [locState.trim(), locZipCode.trim()].filter(Boolean).join(' ');
    return [streetAddress.trim(), aptSuite.trim(), locCity.trim(), stateZip]
      .filter(Boolean)
      .join(', ');
  }, [streetAddress, aptSuite, locCity, locState, locZipCode]);

  // Canonical geocoder (existing geocode-location edge function). Returns a
  // normalized candidate or null — confidence gating lives in
  // resolveListingCoordinates (result must anchor to the seller's ZIP/state).
  const geocodeListingAddress = useCallback(async (query: string): Promise<GeoCandidate | null> => {
    try {
      // Hard timeout: this call is awaited inside the location step's save
      // path, so a stalled geocode must never leave Continue stuck on
      // "Saving…". A timeout returns null → coords cleared, step still saves.
      const { data } = await Promise.race([
        supabase.functions.invoke('geocode-location', {
          body: { query, limit: 1 },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('geocode-location timed out')), 15000)
        ),
      ]);
      const r = data?.results?.[0];
      if (!r || !Array.isArray(r.center)) return null;
      return {
        lat: Number(r.center[1]),
        lng: Number(r.center[0]),
        placeName: String(r.placeName || ''),
        city: r.city,
        state: r.state,
      };
    } catch (err) {
      console.warn('[PublishWizard] geocode-location failed:', err);
      return null;
    }
  }, []);

  // Location columns for save/publish payloads. Structured fields always
  // persist; coordinates are only re-resolved and written when the location
  // actually changed (stale coords get cleared, never silently kept).
  const resolveLocationColumns = useCallback(async () => {
    const locInput: StructuredLocationInput = {
      streetAddress,
      aptSuite,
      city: locCity,
      state: locState,
      zipCode: locZipCode,
    };
    const changed = structuredLocationChanged(locInput, listing ?? {});
    const coords = changed ? await resolveListingCoordinates(locInput, geocodeListingAddress) : undefined;
    if (changed && !coords) {
      console.warn('[PublishWizard] location changed but no confident geocode — clearing stale coordinates');
    }
    return buildLocationColumns(locInput, listing ?? {}, {
      fallbackAddress: address,
      fallbackPickupText: pickupLocationText,
      coords: coords ?? null,
    });
  }, [streetAddress, aptSuite, locCity, locState, locZipCode, listing, address, pickupLocationText, geocodeListingAddress]);

  // For-sale listings that are delivery-only don't need a public pickup street address.
  const needsFullAddressForSale =
    listing?.mode !== 'sale' || fulfillmentType !== 'delivery';
  const streetAddressRequired =
    listing?.mode !== 'sale' ||
    isStaticLocationFn((listing?.category ?? '') as ListingCategory) ||
    isStaticLocation ||
    needsFullAddressForSale;

  const hasCompleteStructuredAddress = !!(
    (streetAddress.trim() || !streetAddressRequired) &&
    locCity.trim() &&
    locState.trim() &&
    locZipCode.trim()
  );
  
  const salePayoutEstimate = useMemo(() => {
    const salePriceNum = parseFloat(priceSale) || 0;
    if (salePriceNum <= 0) return null;
    
    const isSellerPaidFreight = vendibookFreightEnabled && freightPayer === 'seller';
    const freightCost = vendibookFreightEnabled ? estimatedFreightCost : 0;
    const isCashOnlySale = listing?.mode === 'sale' && acceptCashPayment && !acceptPayPalCheckout;
    
    return calculateSaleFees(salePriceNum, freightCost, isSellerPaidFreight, isCashOnlySale);
  }, [priceSale, vendibookFreightEnabled, freightPayer, listing?.mode, acceptCashPayment, acceptPayPalCheckout]);

  const getLocation = () => {
    if (listing?.address) return listing.address;
    if (listing?.pickup_location_text) return listing.pickup_location_text;
    return '';
  };

  const handleGetSuggestions = async () => {
    if (!aiAssistUnlocked) {
      premiumUpsell.show('pricepilot', 'wizard_pricing');
      return;
    }
    if (!title || !listing?.category) {
      toast({
        title: 'Missing information',
        description: 'Please add a title and category first to get pricing suggestions.',
        variant: 'destructive'});
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: {
          title: title,
          category: listing.category,
          location: getLocation(),
          mode: listing.mode}});

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (listing.mode === 'rent') {
        setRentalSuggestions(data as RentalSuggestions);
      } else {
        setSaleSuggestions(data as SaleSuggestions);
      }

      trackLeadEvent('ai_suggestion_viewed', {
        listing_id: listing?.id,
        surface: 'publish_wizard',
        suggestion_type: 'pricing',
        mode: listing?.mode,
      });

      toast({
        title: 'Suggestions ready!',
        description: 'AI pricing suggestions have been generated based on your listing details.'});
    } catch (error) {
      console.error('Error getting suggestions:', error);
      const parsed = await parseEdgeError(error);
      if (isPremiumError(parsed)) {
        premiumUpsell.show(featureFromParsed(parsed) ?? 'pricepilot', 'wizard_pricing');
      } else {
        toast({
          title: 'Could not get suggestions',
          description: parsed.message || 'Please try again later.',
          variant: 'destructive'});
      }
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
    trackLeadEvent('ai_suggestion_accepted', {
      listing_id: listing?.id,
      surface: 'publish_wizard',
      suggestion_type: 'pricing',
      variant: type,
      mode: 'rent',
      daily: rentalSuggestions[dailyKey],
      weekly: rentalSuggestions[weeklyKey],
    });
  };

  const applySaleSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!saleSuggestions) return;
    
    const key = `sale_${type}` as keyof SaleSuggestions;
    setPriceSale(String(saleSuggestions[key]));
    trackLeadEvent('ai_suggestion_accepted', {
      listing_id: listing?.id,
      surface: 'publish_wizard',
      suggestion_type: 'pricing',
      variant: type,
      mode: 'sale',
      price: saleSuggestions[key],
    });
  };

  // AI Description Optimization
  const optimizeDescription = async () => {
    if (!aiAssistUnlocked) {
      premiumUpsell.show('ai-description', 'wizard_description');
      return;
    }
    if (!description || description.trim().length < 10) {
      toast({
        title: 'Description too short',
        description: 'Please write at least 10 characters to optimize.',
        variant: 'destructive'});
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
          title: title}});

      if (error) throw error;

      if (data?.optimizedDescription) {
        setDescription(data.optimizedDescription);
        setShowOptimized(true);
        trackLeadEvent('ai_suggestion_viewed', {
          listing_id: listing?.id,
          surface: 'publish_wizard',
          suggestion_type: 'copy',
          field: 'description',
        });
        trackLeadEvent('ai_suggestion_accepted', {
          listing_id: listing?.id,
          surface: 'publish_wizard',
          suggestion_type: 'copy',
          field: 'description',
          auto_applied: true,
        });
        toast({
          title: 'Description optimized!',
          description: 'Your listing description has been professionally rewritten.'});
      }
    } catch (error) {
      console.error('Error optimizing description:', error);
      const parsed = await parseEdgeError(error);
      if (isPremiumError(parsed)) {
        premiumUpsell.show(featureFromParsed(parsed) ?? 'ai-description', 'wizard_description');
      } else {
        toast({
          title: 'Optimization failed',
          description: parsed.message || 'Please try again later.',
          variant: 'destructive'});
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const revertDescription = () => {
    if (originalDescription) {
      setDescription(originalDescription);
      setOriginalDescription(null);
      setShowOptimized(false);
      trackLeadEvent('ai_suggestion_rejected', {
        listing_id: listing?.id,
        surface: 'publish_wizard',
        suggestion_type: 'copy',
        field: 'description',
        reason: 'reverted',
      });
      toast({
        title: 'Description reverted',
        description: 'Your original description has been restored.'});
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
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('[PublishWizard] handleImageUpload - files selected:', newFiles.length, newFiles.map(f => f.name));
      setImages(prev => {
        const updated = [...prev, ...newFiles];
        console.log('[PublishWizard] images state updated, total:', updated.length);
        return updated;
      });
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('[PublishWizard] handleVideoUpload - files selected:', newFiles.length);
      setVideos(prev => [...prev, ...newFiles]);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index: number) => {
    setExistingVideos(prev => prev.filter((_, i) => i !== index));
  };

  // Photo drag-and-drop reordering
  const allPhotos = useMemo(() => {
    return [
      ...existingImages.map((url, i) => ({ type: 'existing' as const, url, index: i })),
      ...images.map((file, i) => ({ type: 'new' as const, file, index: i }))];
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

  const handlePhotoDragLeave = () => {
    setPhotoDragOverIndex(null);
  };

  const handlePhotoDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (photoDraggedIndex === null || photoDraggedIndex === targetIndex) {
      setPhotoDraggedIndex(null);
      setPhotoDragOverIndex(null);
      return;
    }

    // Reorder the combined array
    const reordered = [...allPhotos];
    const [moved] = reordered.splice(photoDraggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Split back into existing and new images
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

  const movePhotoToFirst = (globalIndex: number) => {
    if (globalIndex === 0) return;
    
    const reordered = [...allPhotos];
    const [moved] = reordered.splice(globalIndex, 1);
    reordered.unshift(moved);

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
  };

  const removePhotoByGlobalIndex = (globalIndex: number) => {
    const item = allPhotos[globalIndex];
    if (item.type === 'existing') {
      removeExistingImage(item.index);
    } else {
      removeImage(item.index);
    }
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
          contentType: file.type || 'image/jpeg'});

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

  const uploadVideos = async (): Promise<string[]> => {
    if (!user) {
      throw new Error('Please sign in to upload videos.');
    }
    if (!listingId) {
      throw new Error('Missing listing id.');
    }

    const urls: string[] = [...existingVideos];

    for (let i = 0; i < videos.length; i++) {
      const file = videos[i];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const fileName = `${user.id}/${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'video/mp4'});

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-videos')
        .getPublicUrl(fileName);

      urls.push(publicUrl);
    }

    return urls;
  };

  // Returns true when this step's fields were persisted (or nothing needed
  // writing), false on any failure — Save & exit uses this to avoid
  // navigating away with unsaved changes.
  const saveStep = async (): Promise<boolean> => {
    if (!listing || saveInFlightRef.current) return false;
    saveInFlightRef.current = true;
    setIsSaving(true);

    try {
      // Pre-flight session check with a hard cap. supabase-js serializes
      // every request through the auth token-refresh lock, and the
      // AbortSignal on the PATCH below only cancels the fetch itself — not
      // the lock wait — so a stalled token refresh would pin Continue on
      // "Saving…" for minutes (the reported ~2 minute stall). Surface it in
      // 10s as a retryable error; on success the token is freshly cached, so
      // the PATCH no longer queues behind a refresh.
      await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error('Your session check timed out. Tap Continue again — your answers are still on this page.'),
              ),
            10000,
          ),
        ),
      ]);

      let updateData: any = {};

      if (step === 'basics') {
        updateData = {
          year_built: stageValues.modelYear ? parseInt(stageValues.modelYear, 10) : null,
          kitchen_build_year: stageValues.kitchenBuildYear ? parseInt(stageValues.kitchenBuildYear, 10) : null,
          kitchen_build_year_unknown: stageValues.kitchenBuildYearUnknown,
          condition: stageValues.condition || null,
          operational_status: stageValues.operationalStatus || null,
          length_inches: stageValues.lengthInches ? parseFloat(stageValues.lengthInches) : null,
          width_inches: stageValues.widthInches ? parseFloat(stageValues.widthInches) : null,
          height_inches: stageValues.heightInches ? parseFloat(stageValues.heightInches) : null,
        };
      }

      if (step === 'photos') {

        const hasNewImages = images.length > 0;
        const hasNewVideos = videos.length > 0;

        if (hasNewImages || hasNewVideos) {
          // User should already be authenticated since we require auth before listing creation
          if (!user) {
            toast({
              title: 'Sign in required',
              description: 'Please sign in to continue.',
              variant: 'destructive'});
            setIsSaving(false);
            return false;
          }

          let imageUrls = existingImages;
          let videoUrls = existingVideos;

          if (hasNewImages) {
            imageUrls = await uploadImages();
            setExistingImages(imageUrls);
            setImages([]);
          }

          if (hasNewVideos) {
            videoUrls = await uploadVideos();
            setExistingVideos(videoUrls);
            setVideos([]);
          }

          updateData = {
            image_urls: imageUrls,
            cover_image_url: imageUrls[0] || null,
            video_urls: videoUrls};
        }
        // Allow proceeding without photos (guests can add later after auth)
      } else if (step === 'headline') {
        // Save title and description
        updateData = {
          title,
          description};
      } else if (step === 'includes') {
        // Save amenities, highlights and the Stage 3 disclosures
        updateData = {
          amenities,
          highlights,
          title_status: disclosures.titleStatus || null,
          has_lien: disclosures.hasLien || null,
          no_known_problems: disclosures.noKnownProblems,
          // known_problems is NOT NULL in the database — always write an array.
          known_problems: disclosures.knownProblems ?? [],
          included_items: disclosures.includedItems || null,
          photos_exclusions_answered: disclosures.photosExclusionsAnswered,
          photos_exclusions_note: disclosures.photosExclusionsNote || null,
          price_negotiable: disclosures.priceNegotiable,
          accepts_offers: disclosures.acceptsOffers,
          min_offer_amount: disclosures.minOfferAmount ? parseFloat(disclosures.minOfferAmount) : null,
          // Required sale dimensions are collected on this step for mobile
          // assets, so they must persist here too.
          length_inches: parseFloat(lengthInches) || null,
          width_inches: parseFloat(widthInches) || null,
          height_inches: parseFloat(heightInches) || null,
        };


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
            accept_paypal_checkout: acceptPayPalCheckout,
            accept_cash_payment: acceptCashPayment};

          await persistVinSerial();
        } else {
          updateData = {
            price_daily: safeParsePrice(priceDaily),
            price_weekly: safeParsePrice(priceWeekly),
            price_monthly: safeParsePrice(priceMonthly),
            instant_book: instantBook,
            deposit_amount: safeParsePrice(depositAmount)};
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
          freight_category: freightCategory};
      } else if (step === 'location') {
        // Determine if category-based static or manually toggled
        const categoryIsStatic = isStaticLocationFn(listing.category);
        const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation) ? 'on_site' : (fulfillmentType || 'pickup');

        updateData = {
          fulfillment_type: effectiveFulfillmentType,
          // Structured city/state/ZIP always persist; coordinates are
          // re-geocoded (or cleared) only when the location actually changed.
          ...(await resolveLocationColumns()),
          delivery_fee: parseFloat(deliveryFee) || null,
          delivery_radius_miles: parseFloat(deliveryRadiusMiles) || null,
          delivery_fee_type: deliveryFeeType,
          pickup_instructions: pickupInstructions || null,
          ...towingHandoffColumns(),
          delivery_instructions: deliveryInstructions || null,
          access_instructions: accessInstructions || null,
          hours_of_access: hoursOfAccess || null,
          location_notes: locationNotes || null};

        await saveSellerPhone();
      } else if (step === 'availability') {
        // Validate hourly schedule if hourly is enabled
        if (hourlyEnabled && !availabilityStepValid) {
          toast({
            title: 'Weekly schedule required',
            description: 'Please add operating hours for at least one day when hourly bookings are enabled.',
            variant: 'destructive'});
          setIsSaving(false);
          return false;
        }

        updateData = {
          available_from: availableFrom || null,
          available_to: availableTo || null,
          total_slots: ['vendor_lot', 'vendor_space', 'ghost_kitchen', 'food_truck', 'food_trailer'].includes(listing.category) ? totalSlots : 1,
          slot_names: slotNames.length > 0 ? slotNames : null,
          // Hourly/Daily booking settings
          price_hourly: priceHourly,
          hourly_enabled: hourlyEnabled,
          daily_enabled: dailyEnabled,
          min_hours: minHours,
          max_hours: maxHours,
          buffer_time_mins: bufferTimeMins,
          min_notice_hours: minNoticeHours,
          hourly_schedule: hourlySchedule,
          rental_min_days: rentalMinDays,
          hourly_special_pricing: hourlySpecialPricing};
      } else if (step === 'documents') {
        // Save required documents to the database
        // Enabled requirements include host-marked OPTIONAL ones — is_required
        // now means "blocks per its deadline rule", not "listed at all".
        const enabledDocs = requiredDocuments.filter(d => d.enabled ?? d.is_required);
        
        // Delete existing documents first — a failed delete must surface as
        // an error instead of silently stacking duplicate requirement rows.
        const { error: deleteDocsError } = await supabase
          .from('listing_required_documents')
          .delete()
          .eq('listing_id', listing.id);

        if (deleteDocsError) throw deleteDocsError;

        // Insert new documents
        if (enabledDocs.length > 0) {
          const docsToInsert = enabledDocs.map(doc => ({
            listing_id: listing.id,
            document_type: doc.document_type,
            is_required: doc.is_required !== false,
            deadline_type: doc.deadline_type,
            deadline_offset_hours: doc.deadline_offset_hours || null,
            description: doc.description || null,
            title: doc.title?.trim() || null,
            instructions: doc.instructions?.trim() || null,
            requirement_config: (doc.requirement_config ?? {}) as unknown as Record<string, never>}));

          const { error: insertError } = await supabase
            .from('listing_required_documents')
            .insert(docsToInsert);

          if (insertError) throw insertError;
        }
        // No listing update needed, just proceed to next step
      }

      if (Object.keys(updateData).length > 0) {
        // Hard timeout: a stalled request (flaky network, auth token-refresh
        // lock contention across tabs) must never leave the Continue button
        // stuck on "Saving…" forever.
        const controller = new AbortController();
        let savedCount = 0;
        const patchPromise = supabase
          .from('listings')
          .update(updateData)
          .eq('id', listing.id)
          .abortSignal(controller.signal)
          .select('id');
        let saveTimeoutId: number | undefined;
        const saveTimeoutPromise = new Promise<never>((_, reject) => {
          saveTimeoutId = window.setTimeout(() => {
            controller.abort();
            reject(new Error('Saving timed out. Check your connection and tap Continue again — your answers are still on this page.'));
          }, 25000);
        });
        // Promise.race is the guaranteed cap — AbortSignal alone cannot
        // interrupt supabase-js's internal token-refresh lock wait.
        let res: Awaited<typeof patchPromise>;
        try {
          res = await Promise.race([patchPromise, saveTimeoutPromise]);
        } finally {
          if (saveTimeoutId) window.clearTimeout(saveTimeoutId);
        }
        if (res.error) {
          throw res.error;
        }
        savedCount = Array.isArray(res.data) ? res.data.length : 0;

        if (savedCount === 0) {
          // PostgREST answered with zero rows: RLS silently rejected the write
          // (e.g. the session expired mid-wizard). With the old return=minimal
          // call this looked like a success and the wizard advanced without
          // saving — exactly the "Saving… but nothing saves" report.
          throw new Error('Your session may have expired. Sign in again, then tap Continue — your answers are still on this page.');
        }

        // Update local state
        setListing(prev => prev ? { ...prev, ...updateData } : null);
      }

      // Move to next step - rental listings have availability and documents steps
      const isRentalListing = listing.mode === 'rent';
      const steps: PublishStep[] = isRentalListing
        ? ['basics', 'photos', 'headline', 'includes', 'pricing', 'availability', 'location', 'documents', 'review']
        : ['basics', 'photos', 'headline', 'includes', 'pricing', 'location', 'review'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex === -1) {
        // Orphaned/legacy step (e.g. ?step=details): continue forward.
        setStep('includes');
      } else if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
      return true;
    } catch (error) {
      console.error('Error saving:', error);
      // Surface the real reason (constraint, policy, network) instead of a
      // generic message — sellers were stuck with no way to know what failed.
      const err = error as { message?: string; details?: string; hint?: string; code?: string } | null;
      const reason = [err?.message, err?.details, err?.hint].filter(Boolean).join(' — ');
      toast({
        title: "We couldn't save this step",
        description: reason
          ? `${reason}${err?.code ? ` (${err.code})` : ''}`
          : 'Your changes were not saved. Check your connection and try again.',
        variant: 'destructive'});
      return false;
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!listing) return;

    // Validate all required fields before publishing
    const validationErrors = getValidationErrors();
    if (validationErrors.length > 0) {
      toast({
        title: validationErrors.length === 1 ? 'Cannot publish yet' : `Cannot publish — ${validationErrors.length} items to fix`,
        description: validationErrors.map((e) => `• ${e}`).join('\n'),
        variant: 'destructive'});
      return;
    }


    // Identity verification is optional — it no longer blocks publishing.



    // Active-listing quota gate (grandfathered accounts are always unlimited).
    // Only blocks NEW publishes — already-published listings can always re-save.
    const isFirstTimePublishForQuota = !listing.published_at;
    if (
      isFirstTimePublishForQuota &&
      !quota.isLoading &&
      !quota.isGrandfathered &&
      !quota.isUnlimited &&
      quota.isAtLimit
    ) {
      setShowLimitModal(true);
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
      let videoUrlsToSave = existingVideos;
      if (images.length > 0) {
        // Uploading requires auth.
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({
            title: 'Sign in to upload media',
            description: 'Please sign in to add photos or videos to this listing.',
            variant: 'destructive'});
          return;
        }

        imageUrlsToSave = await uploadImages();
        setExistingImages(imageUrlsToSave);
        setImages([]);
      }

      if (videos.length > 0) {
        // Uploading requires auth.
        if (!user) {
          if (isGuestDraft) setShowAuthModal(true);
          toast({
            title: 'Sign in to upload media',
            description: 'Please sign in to add photos or videos to this listing.',
            variant: 'destructive'});
          return;
        }

        videoUrlsToSave = await uploadVideos();
        setExistingVideos(videoUrlsToSave);
        setVideos([]);
      }

      // Determine if category-based static or manually toggled
      const categoryIsStatic = isStaticLocationFn(listing.category);
      const effectiveFulfillmentType = (categoryIsStatic || isStaticLocation)
        ? 'on_site'
        : (fulfillmentType || 'pickup');
      // Structured location columns (city/state/ZIP always persist;
      // coordinates re-resolved only when the location changed).
      const locationColumns = await resolveLocationColumns();
      // Display-only address for notification emails (never persisted).
      const fullAddress = buildStructuredAddress() || address;

      // Seller phone belongs on the private profile, never on the listing.
      await saveSellerPhone();
      await persistVinSerial();

      const baseUpdateData: any = {
        // Media
        image_urls: imageUrlsToSave,
        cover_image_url: imageUrlsToSave?.[0] || null,
        video_urls: videoUrlsToSave,

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

        // Stage 1 basics (Review must never discard unsaved wizard state)
        year_built: stageValues.modelYear ? parseInt(stageValues.modelYear, 10) : null,
        kitchen_build_year: stageValues.kitchenBuildYear
          ? parseInt(stageValues.kitchenBuildYear, 10)
          : null,
        kitchen_build_year_unknown: stageValues.kitchenBuildYearUnknown,
        condition: stageValues.condition || null,
        operational_status: stageValues.operationalStatus || null,

        // Disclosures
        title_status: disclosures.titleStatus || null,
        has_lien: disclosures.hasLien || null,
        no_known_problems: disclosures.noKnownProblems,
        // known_problems is NOT NULL in the database — always write an array.
        known_problems: disclosures.knownProblems ?? [],
        included_items: disclosures.includedItems || null,
        photos_exclusions_answered: disclosures.photosExclusionsAnswered,
        photos_exclusions_note: disclosures.photosExclusionsNote || null,
        price_negotiable: disclosures.priceNegotiable,
        accepts_offers: disclosures.acceptsOffers,
        min_offer_amount: disclosures.minOfferAmount
          ? parseFloat(disclosures.minOfferAmount)
          : null,

        // Location
        fulfillment_type: effectiveFulfillmentType,
        ...locationColumns,
        delivery_fee: parseFloat(deliveryFee) || null,
        delivery_radius_miles: parseFloat(deliveryRadiusMiles) || null,
        delivery_fee_type: deliveryFeeType,
        pickup_instructions: pickupInstructions || null,
        ...towingHandoffColumns(),
        delivery_instructions: deliveryInstructions || null,
        access_instructions: accessInstructions || null,
        hours_of_access: hoursOfAccess || null,
        location_notes: locationNotes || null,

        // Availability (optional)
        available_from: availableFrom || null,
        available_to: availableTo || null};

      const pricingUpdateData: any = listing.mode === 'sale'
        ? {
            price_sale: safeParsePrice(priceSale),
            vendibook_freight_enabled: vendibookFreightEnabled,
            freight_payer: freightPayer,
            accept_paypal_checkout: acceptPayPalCheckout,
            accept_cash_payment: acceptCashPayment}
        : {
            price_daily: safeParsePrice(priceDaily),
            price_weekly: safeParsePrice(priceWeekly),
            price_monthly: safeParsePrice(priceMonthly),
            price_hourly: priceHourly || null,
            hourly_enabled: hourlyEnabled,
            daily_enabled: dailyEnabled,
            min_hours: minHours,
            max_hours: maxHours,
            buffer_time_mins: bufferTimeMins,
            min_notice_hours: minNoticeHours,
            hourly_schedule: hourlySchedule,
            hourly_special_pricing: hourlySpecialPricing,
            rental_min_days: rentalMinDays,
            instant_book: instantBook,
            deposit_amount: safeParsePrice(depositAmount)};

      // Proof Notary is a retired product — it is no longer sold from the
      // publish wizard. Legacy listings keep their historical flag read-only.

      // If Featured Listing is enabled and not already active/comped, redirect to the catalog-priced Featured Boost checkout.
      // Pending complimentary boosts are applied by the database trigger when status changes to published.
      const listingHasPendingFeatured = !!listing.pending_featured_payment;
      const listingAlreadyFeatured = isListingFeatured(listing);
      if (featuredEnabled && !listingAlreadyFeatured && !listingHasPendingFeatured) {
        // Publish FIRST so the boost checkout (which requires a published
        // listing) succeeds. If the user abandons payment the listing stays
        // published without the boost — correct fallback. Webhook flips
        // featured_enabled once payment clears.
        let isFirstTimePublishForBoost = false;
        try {
          const publishResult = await publishListingIdempotent(listing.id, {
            ...baseUpdateData,
            ...pricingUpdateData,
          });
          isFirstTimePublishForBoost = publishResult.firstPublish;
        } catch (persistError: any) {
          if (typeof persistError?.message === 'string' && persistError.message.includes('listing_publish_limit_reached')) {
            setShowLimitModal(true);
            setIsSaving(false);
            return;
          }
          throw persistError;
        }

        // Get session for auth
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast({ title: 'Please sign in to continue', variant: 'destructive' });
          return;
        }

        // The listing is live now — send the same first-publish confirmation
        // + admin alert the standard path sends, so the host is never left
        // wondering whether publishing worked while payment settles.
        if (isFirstTimePublishForBoost) {
          const boostPrice = priceSale
            ? `$${parseFloat(String(priceSale).replace(/[^0-9.]/g, '')).toLocaleString()}`
            : priceDaily ? `$${priceDaily}/day`
            : priceHourly ? `$${priceHourly}/hr`
            : 'Contact for price';

          supabase.functions.invoke('send-listing-live-email', {
            body: {
              hostEmail: user?.email,
              hostName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there',
              listingTitle: title,
              listingId: listing.id,
              listingImageUrl: imageUrlsToSave?.[0],
              coverImageUrl: imageUrlsToSave?.[0],
              listingPrice: boostPrice,
              category: listing.category,
              address: fullAddress,
              listingType:
                listing.mode === 'rent' ? 'rental' :
                listing.mode === 'sale' ? 'sale' :
                listing.mode === 'both' ? 'both' : 'rental',
            },
          }).catch(err => console.error('Listing live email error:', err));

          supabase.functions.invoke('send-admin-notification', {
            body: {
              type: 'new_listing',
              data: {
                listing_id: listing.id,
                title: listing.title,
                category: listing.category,
                mode: listing.mode,
                address: fullAddress,
                host_id: user?.id,
                host_name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
                host_email: user?.email,
              },
            },
          }).catch(err => console.error('Admin notification error:', err));
        }

        // Send the payer straight to checkout in THIS tab, and route both
        // outcomes back to the published-listing page so they always land on
        // a clear "your listing is live / boost is activating" confirmation.
        const publishedUrl = `/listing-published?listing_id=${listing.id}`;

        // Vendibook Pro members with an unused Featured Boost credit for the
        // current billing period redeem it instead of paying again.
        if (proBoostCredit) {
          try {
            await redeemBoostCredit.mutateAsync(listing.id);
            toast({
              title: 'Your listing is live 🎉',
              description: 'We applied your included Vendibook Pro Featured Boost.',
            });
            window.location.href = `${publishedUrl}&featured_paid=true`;
            return;
          } catch (creditError) {
            console.error('Boost credit redemption failed', creditError);
            // Fall through to the paid checkout — the listing is already live.
          }
        }

        const checkoutUrl = productCheckoutUrl(ACTIVE_PRODUCT_SLUGS.featuredBoost, listing.id, {
          success: `${publishedUrl}&featured_paid=true`,
          cancel: `${publishedUrl}&featured_cancelled=true`,
        });

        toast({
          title: 'Your listing is live 🎉',
          description: 'Finish the Featured boost checkout to pin it to the top of search.',
        });

        window.location.href = checkoutUrl;

        return; // Exit early - boost activates on payment capture

      }

      // Standard publish flow (no add-on fees)
      // Check if this is a first-time publish or an update to an existing published listing
      let isFirstTimePublish = false;
      {
        const publishResult = await publishListingIdempotent(listing.id, {
          ...baseUpdateData,
          ...pricingUpdateData,
        });
        isFirstTimePublish = publishResult.firstPublish;
      }



      // Track analytics - differentiate between new publish and update
      console.log(`[ANALYTICS] Listing ${isFirstTimePublish ? 'published' : 'updated'}`, { listingId: listing.id });

      // Only send host confirmation + admin notification for first-time publishes, not updates
      if (isFirstTimePublish) {
        const emailListingType =
          listing.mode === 'rent' ? 'rental' :
          listing.mode === 'sale' ? 'sale' :
          listing.mode === 'both' ? 'both' : 'rental';
        const formattedPrice = priceSale
          ? `$${parseFloat(String(priceSale).replace(/[^0-9.]/g, '')).toLocaleString()}`
          : priceDaily ? `$${priceDaily}/day`
          : priceHourly ? `$${priceHourly}/hr`
          : 'Contact for price';

        // Host "your listing is live" confirmation email (fire and forget)
        supabase.functions.invoke('send-listing-live-email', {
          body: {
            hostEmail: user?.email,
            hostName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there',
            listingTitle: title,
            listingId: listing.id,
            listingImageUrl: imageUrlsToSave?.[0],
            coverImageUrl: imageUrlsToSave?.[0],
            listingPrice: formattedPrice,
            category: listing.category,
            address: fullAddress,
            listingType: emailListingType,
          },
        }).catch(err => console.error('Listing live email error:', err));

        supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'new_listing',
            data: {
              listing_id: listing.id,
              title: listing.title,
              category: listing.category,
              mode: listing.mode,
              price_daily: priceDaily ? parseFloat(priceDaily.replace(/[^0-9.]/g, '')) : null,
              price_sale: priceSale ? parseFloat(priceSale.replace(/[^0-9.]/g, '')) : null,
              address: fullAddress,
              host_id: user?.id,
              host_name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
              host_email: user?.email}}}).catch(err => console.error('Admin notification error:', err));
      }


      // Published — the saved row is now the source of truth.
      clearWizardDraft(listingId);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error publishing:', error);
      const raw = error instanceof Error ? error.message : String(error);
      // Decode common Postgres/PostgREST errors into actionable copy.
      let title = 'Error publishing';
      let description = raw || 'Please try again.';
      if (/listing_publish_limit_reached/i.test(raw)) {
        setShowLimitModal(true);
        return;
      } else if (/row-level security|permission denied|not authorized|JWT|jwt/i.test(raw)) {
        title = 'Your session expired';
        description = 'Please sign in again, then click Publish once more. Your draft is saved.';
      } else if (/null value in column "([^"]+)"/i.test(raw)) {
        const col = raw.match(/null value in column "([^"]+)"/i)?.[1] ?? 'a required field';
        title = 'Missing required field';
        description = `Please fill in "${col}" before publishing.`;
      } else if (/violates check constraint/i.test(raw)) {
        title = 'A field has an invalid value';
        description = 'One of your inputs failed validation. Double-check your pricing, location and availability, then try again.';
      } else if (/network|fetch failed|failed to fetch/i.test(raw)) {
        title = 'Network problem';
        description = "Couldn't reach the server. Check your connection and try again — your draft is safe.";
      }
      toast({ title, description, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };


  // Publish confirmation + terms consent modal state
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Checklist state - with proper validation
  const totalPhotoCount = existingImages.length + images.length;
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

  const hasSalePaymentMethod = listing?.mode !== 'sale' || acceptPayPalCheckout || acceptCashPayment;
  const hasPriceAmount = listing?.mode === 'sale'
    ? isValidPrice(priceSale)
    : isValidPrice(priceDaily);
  const hasPricing = listing?.mode === 'sale'
    ? hasPriceAmount && hasSalePaymentMethod
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
        ? !!(hasCompleteStructuredAddress && accessInstructions)
        : !!(hasCompleteStructuredAddress && fulfillmentType)
    ) : false,
    isRental: listing?.mode === 'rent',
    photoCount: totalPhotoCount,
    hasDocuments: true, // Documents step is optional, always "complete"
    documentsCount: enabledDocsCount,
    descriptionLength: description.trim().length,
    priceSet: listing?.mode === 'sale' 
      ? (isValidPrice(priceSale) ? `$${parseFloat(priceSale.replace(/[^0-9.]/g, '')).toLocaleString()}` : undefined)
      : (isValidPrice(priceDaily) ? `$${parseFloat(priceDaily.replace(/[^0-9.]/g, ''))}/day` : undefined)};

  // Content requirements (single source of truth for the Phase 2 fields).
  // This never contains identity-verification, payout or merchant-onboarding gates.
  const stageMissing = listing
    ? getStageRequirements({
        mode: listing.mode,
        category: listing.category,
        condition: stageValues.condition || null,
        operationalStatus: stageValues.operationalStatus || null,
        titleStatus: disclosures.titleStatus || null,
        hasLien: disclosures.hasLien || null,
        noKnownProblems: disclosures.noKnownProblems,
        knownProblems: disclosures.knownProblems,
        includedItems: disclosures.includedItems || null,
        photosExclusionsAnswered: disclosures.photosExclusionsAnswered,
        lengthInches: parseFloat(lengthInches) || null,
        heightInches: parseFloat(heightInches) || null,
      })
    : [];

  // Per-step required answers. Steps can't be skipped while these are missing.
  const basicsMissing = stageMissing.filter((r) => r.step === 'basics');
  // Disclosure requirements are collected on the "What's included" step.
  const includesMissing = stageMissing.filter((r) => r.step === 'includes');

  // Launch Checklist is the single progress/navigation system; 'basics'
  // completion feeds its first item so sellers can jump back freely.
  const checklistItems = createChecklistItems(
    { ...checklistState, hasBasics: basicsMissing.length === 0 },
    step,
  );

  const stageRequirementsMet =
    checklistItems.filter(i => i.required).every(i => i.completed) && stageMissing.length === 0;
  const canPublish = stageRequirementsMet && allAttested(attestations);

  // Everything still standing between this draft and publishing, in plain
  // language, so the review step never shows an unexplained disabled button.
  const publishBlockers: string[] = [
    ...checklistItems
      .filter((i) => i.required && !i.completed)
      .map((i) => (i as any).label ?? (i as any).title ?? 'Incomplete step'),
    ...stageMissing.map((r) => r.label),
    ...(allAttested(attestations) ? [] : ['Confirm the statements at the bottom of this page']),
  ];


  const displayAddress = buildStructuredAddress() || address;

  // Collect validation errors for publish attempt
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (totalPhotoCount < 3) errors.push(`Add at least 3 photos (currently ${totalPhotoCount})`);
    if (!hasPriceAmount) errors.push(listing?.mode === 'sale' ? 'Set a sale price greater than $0' : 'Set a daily rate greater than $0');
    if (listing?.mode === 'sale' && !hasSalePaymentMethod) errors.push('Select at least one payment method: PayPal Checkout or Pay in Person');
    if (!hasValidTitle) errors.push(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
    if (!hasValidDescription) errors.push(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters (currently ${description.trim().length})`);
    if (!checklistState.hasLocation) errors.push('Complete the location and logistics section');
    for (const req of stageMissing) errors.push(req.label);
    return errors;
  };

  if (isLoading) {
    return (
      <div className="sale-light min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) return null;


  return (
    <div className="sale-light min-h-screen bg-background">
      {/* Claiming draft overlay */}
      {isClaimingDraft && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">Saving your draft...</p>
          <p className="text-sm text-muted-foreground">Syncing your changes to your account</p>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between gap-4">
            <button
              onClick={handleSaveAndExit}
              disabled={isSaveExiting || isSaving}
              className="inline-flex items-center gap-2 rounded-lg -ml-1 px-1 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:pointer-events-none"
            >
              {isSaveExiting || isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
              {isSaveExiting || isSaving ? 'Saving…' : 'Save & exit'}
            </button>
            <h1 className="text-sm font-semibold text-foreground truncate">
              {CATEGORY_LABELS[listing.category]} · {listing.mode === 'rent' ? 'For Rent' : 'For Sale'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Free to publish
            </span>
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
              onPublishClick={() => setShowPublishDialog(true)}
              className="sticky top-24"
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">

            {/* Mobile Checklist - hide publish button when on review step to avoid duplicate */}
            <div className="lg:hidden mb-6">
              <PublishChecklist
                items={checklistItems}
                onItemClick={(id) => setStep(id as PublishStep)}
                onPublishClick={() => setShowPublishDialog(true)}
                hidePublishButton={step === 'review'}
              />
            </div>

            <div className="bg-sale-card rounded-3xl p-6 md:p-8">
              <MissingRequirementsAlert blockers={stepBlockers} className="mb-6" />

              {/* Stage 1: What are you listing? */}
              {step === 'basics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">The basics</h2>
                    <p className="text-muted-foreground">
                      A few essentials so buyers can tell at a glance what this is.
                    </p>
                  </div>

                  <StepWhat
                    category={listing.category}
                    mode={listing.mode}
                    values={stageValues}
                    onChange={(patch) => setStageValues((prev) => ({ ...prev, ...patch }))}
                    showErrors={showStepErrors}
                  />


                  <PrimaryActionBar
                    sticky
                    primary={{
                      label: isSaving ? 'Saving…' : 'Continue',
                      onClick: guardNext(
                        basicsMissing.map((r) => r.label),
                        basicsMissing[0]?.fieldId ?? null,
                        handleDetailsSave,
                      ),
                      disabled: isSaving,
                    }}
                    blockers={basicsMissing.map((r) => r.label)}
                  />

                </div>
              )}

              {/* Step: Media */}
              {step === 'photos' && (

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Add media</h2>
                    <p className="text-muted-foreground">
                      Upload at least 3 photos. Videos are optional. <span className="font-medium text-foreground">Drag to reorder</span> — first image is your cover.
                    </p>
                  </div>

                  <PhotoGuidance
                    category={listing.category}
                    photoCount={totalPhotoCount}
                    hasDisclosedProblems={disclosures.knownProblems.length > 0}
                  />




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
                          onDragLeave={handlePhotoDragLeave}
                          onDrop={(e) => handlePhotoDrop(e, globalIndex)}
                          className={cn(
                            "relative aspect-[4/3] rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing transition-all",
                            isDragging && "opacity-50 scale-95",
                            isDragOver && "ring-2 ring-primary ring-offset-2"
                          )}
                        >
                          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                          
                          {/* Cover badge */}
                          {isCover && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Cover
                            </div>
                          )}

                          {/* Saved badge for existing images */}
                          {item.type === 'existing' && !isCover && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white rounded-md text-xs">
                              Saved
                            </div>
                          )}

                          {/* Drag handle */}
                          <div className="absolute top-2 right-10 p-1.5 rounded-lg bg-black/50 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Remove button */}
                          <button
                            onClick={() => removePhotoByGlobalIndex(globalIndex)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Make cover button */}
                          {!isCover && (
                            <button
                              onClick={() => movePhotoToFirst(globalIndex)}
                              className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white rounded-md text-xs font-medium opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/80 flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              Cover
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Add photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Videos (optional) */}
                  <div className="border-t pt-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Videos (optional)</h3>
                        <p className="text-sm text-muted-foreground">Add short walkthroughs to increase trust.</p>
                      </div>
                      <label className="shrink-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:opacity-90 h-10 px-4">
                        Add videos
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          multiple
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {(existingVideos.length > 0 || videos.length > 0) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {existingVideos.map((url, index) => (
                          <div key={url} className="relative aspect-video rounded-xl overflow-hidden group bg-muted">
                            <video src={url} className="w-full h-full object-cover" muted playsInline />
                            <button
                              type="button"
                              onClick={() => removeExistingVideo(index)}
                              className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {videos.map((file, index) => {
                          const preview = URL.createObjectURL(file);
                          return (
                            <div key={`${file.name}-${index}`} className="relative aspect-video rounded-xl overflow-hidden group bg-muted">
                              <video src={preview} className="w-full h-full object-cover" muted playsInline />
                              <button
                                type="button"
                                onClick={() => removeVideo(index)}
                                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No videos added yet</div>
                    )}
                  </div>

                  <PrimaryActionBar
                    sticky
                    helper="At least 3 photos are required to continue."
                    primary={{
                      label: isSaving ? 'Saving…' : 'Continue',
                      onClick: guardNext(
                        allPhotos.length < 3
                          ? [`Add at least 3 photos (currently ${allPhotos.length})`]
                          : [],
                        null,
                        isGuestDraft && !user ? handleDetailsSave : saveStep,
                      ),
                      disabled: isSaving,
                    }}
                  />

                </div>
              )}

              {/* Step: Headline & Description */}
              {step === 'headline' && (
                <div className="space-y-8">
                  {/* Page Header */}
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
                      <Type className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Let's create your listing</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Start with a catchy headline and detailed description that will attract {listing.mode === 'rent' ? 'renters' : 'buyers'}.
                    </p>
                  </div>

                  {/* Title Input */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="title" className="text-lg font-semibold">Listing Headline</Label>
                      <span className={cn(
                        "text-sm font-medium px-2 py-0.5 rounded-full",
                        title.length >= MIN_TITLE_LENGTH ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {title.length}/80
                      </span>
                    </div>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                      placeholder="e.g., 2022 Fully Equipped Taco Truck - Ready to Roll"
                      className="text-lg h-14"
                    />
                    <p className="text-sm text-muted-foreground">
                      💡 Include key details like year, type, specialty, or unique features.
                    </p>
                  </div>

                  {/* Description with AI Builder */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="description" className="text-lg font-semibold">Description</Label>
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
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (showOptimized) setShowOptimized(false);
                        }}
                        placeholder="Describe your listing in detail. What makes it special? What equipment is included? What's the condition?"
                        rows={8}
                        className="resize-none text-base"
                      />
                    </div>
                    
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Be detailed! {listing.mode === 'rent' ? 'Renters' : 'Buyers'} want to know everything about your asset.
                      </p>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                        description.length >= MIN_DESCRIPTION_LENGTH ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {description.length < MIN_DESCRIPTION_LENGTH ? `${MIN_DESCRIPTION_LENGTH - description.length} more chars needed` : '✓ Good length'}
                      </span>
                    </div>

                    {/* Write it for me Card */}
                    <div className="relative overflow-hidden rounded-xl p-4 border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-background">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/3 animate-pulse pointer-events-none" />
                      <div className="relative flex items-start gap-3">
                        <div className="p-2.5 bg-foreground rounded-xl shadow-md shrink-0">
                          
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                            AI Writing Assistant
                            <PremiumChip />
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {aiAssistUnlocked
                              ? 'Polish your description into professional, engaging copy you can still edit.'
                              : 'Included with Vendibook Pro. You can always write your description yourself — it is never required.'}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={optimizeDescription}
                            disabled={isOptimizing || (aiAssistUnlocked && (!description || description.length < 10))}
                            variant="dark-shine"
                          >
                            {isOptimizing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Optimizing...
                              </>
                            ) : showOptimized ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Optimized!
                              </>
                            ) : (
                              <>
                                
                                {aiAssistUnlocked ? 'Write it for me' : 'Unlock with Pro'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <PrimaryActionBar
                    sticky
                    secondary={{ label: 'Back', onClick: () => setStep('photos') }}
                    primary={{
                      label: isSaving ? 'Saving…' : 'Continue',
                      onClick: guardNext(
                        [
                          title.trim().length < MIN_TITLE_LENGTH &&
                            `Title must be at least ${MIN_TITLE_LENGTH} characters`,
                          description.trim().length < MIN_DESCRIPTION_LENGTH &&
                            `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
                        ].filter(Boolean) as string[],
                        null,
                        saveStep,
                      ),
                      disabled: isSaving,
                    }}
                  />

                </div>
              )}

              {/* Step: What's Included & Key Highlights */}
              {step === 'includes' && (
                <div className="space-y-8">
                  {/* Page Header */}
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
                      <ListChecks className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">What's Included?</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Select features and add highlights to showcase what makes your listing special.
                    </p>
                  </div>

                  {/* Amenities - Category specific */}
                  {categoryAmenities.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-lg font-semibold">Features & Amenities</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Select all that apply to your {CATEGORY_LABELS[listing.category].toLowerCase()}.
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
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                    amenities.includes(item.id)
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                                  )}
                                >
                                  <Checkbox
                                    checked={amenities.includes(item.id)}
                                    onCheckedChange={() => toggleAmenity(item.id)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <span className="text-sm font-medium">{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {amenities.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl">
                          <Check className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            {amenities.length} feature{amenities.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Highlights */}
                  <div className="space-y-4 pt-6 border-t">
                    <div>
                      <Label className="text-lg font-semibold">Key Highlights</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add up to 6 bullet points to showcase the best features. These appear prominently on your listing.
                      </p>
                    </div>
                    
                    {highlights.length > 0 && (
                      <ul className="space-y-2">
                        {highlights.map((highlight, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-3 p-3 bg-muted rounded-xl"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="flex-1 text-sm">{highlight}</span>
                            <button
                              type="button"
                              onClick={() => removeHighlight(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
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
                          variant="dark-shine"
                          size="icon"
                          onClick={addHighlight}
                          disabled={!newHighlight.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {highlights.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Highlights like "Recently inspected" or "Low mileage" can increase interest.
                      </p>
                    )}
                  </div>

                  {/* Required size for mobile assets sold on Vendibook.
                      These requirements are enforced on this step, so the
                      fields have to live here or Continue blocks with no
                      visible field to fix. */}
                  {requiresSaleDimensions(listing.mode, listing.category) && (
                    <div className="space-y-4 pt-6 border-t">
                      <div>
                        <Label className="text-lg font-semibold">Size</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Buyers use these to plan towing, parking and freight quotes.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="length_ft" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Length (ft) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="length_ft"
                            type="number"
                            min="0"
                            step="0.5"
                            value={inchesToFeet(parseFloat(lengthInches) || null)}
                            onChange={(e) => setLengthInches(String(feetToInches(e.target.value) ?? ''))}
                            placeholder="e.g., 20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="width_ft" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Width (ft) <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Input
                            id="width_ft"
                            type="number"
                            min="0"
                            step="0.5"
                            value={inchesToFeet(parseFloat(widthInches) || null)}
                            onChange={(e) => setWidthInches(String(feetToInches(e.target.value) ?? ''))}
                            placeholder="e.g., 8"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="height_ft" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Height (ft) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="height_ft"
                            type="number"
                            min="0"
                            step="0.5"
                            value={inchesToFeet(parseFloat(heightInches) || null)}
                            onChange={(e) => setHeightInches(String(feetToInches(e.target.value) ?? ''))}
                            placeholder="e.g., 10"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Shown to buyers as {formatDimensionSummary(
                          parseFloat(lengthInches) || null,
                          parseFloat(widthInches) || null,
                          parseFloat(heightInches) || null,
                        ) ?? 'Length × Width × Height once you fill these in'}.
                      </p>
                    </div>
                  )}



                  <ListingDisclosures
                    category={listing.category}
                    mode={listing.mode}
                    values={disclosures}
                    onChange={(patch) => setDisclosures((prev) => ({ ...prev, ...patch }))}
                    vinSerial={vinSerial}
                    vinUnavailable={vinUnavailable}
                    onVinChange={
                      isTitledSaleCategory(listing)
                        ? (patch) => {
                            if (patch.vinSerial !== undefined) setVinSerial(patch.vinSerial);
                            if (patch.vinUnavailable !== undefined) setVinUnavailable(patch.vinUnavailable);
                          }
                        : undefined
                    }
                    showErrors={showStepErrors}
                  />

                  <PrimaryActionBar
                    sticky
                    secondary={{ label: 'Back', onClick: () => setStep('headline') }}
                    primary={{
                      label: isSaving ? 'Saving…' : 'Continue',
                      onClick: guardNext(
                        includesMissing.map((r) => r.label),
                        includesMissing[0]?.fieldId ?? null,
                        saveStep,
                      ),
                      disabled: isSaving,
                    }}
                    blockers={includesMissing.map((r) => r.label)}
                  />

                </div>
              )}

              {/* Step: Pricing */}
              {step === 'pricing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Set your price</h2>
                    <p className="text-muted-foreground">
                      {listing.mode === 'sale' ? 'Enter your asking price.' : 'Set daily and weekly rates.'}
                    </p>
                  </div>

                  {/* AI Suggestions Button */}
                  <div className="relative overflow-hidden rounded-xl p-4 border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-background">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/3 animate-pulse pointer-events-none" />
                    <div className="relative flex items-start gap-3">
                      <div className="p-2.5 bg-foreground rounded-xl shadow-md">
                        
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          AI Pricing Assistant
                          <PremiumChip />
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {aiAssistUnlocked
                            ? 'Generate suggested pricing from category, title, and location. Suggestions are editable.'
                            : 'Included with Vendibook Pro. You can enter your price manually at any time.'}
                        </p>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleGetSuggestions}
                          disabled={isLoadingSuggestions}
                          variant="dark-shine"
                        >
                          {isLoadingSuggestions ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing market...
                            </>
                          ) : (
                            <>
                              
                              {aiAssistUnlocked ? 'Get Suggestions' : 'Unlock with Pro'}
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
                                <span className={cn(
                                  "text-sm",
                                  salePayoutEstimate.sellerFee > 0 ? "text-destructive" : "text-foreground"
                                )}>
                                  {salePayoutEstimate.sellerFee > 0 ? '-' : ''}{formatCurrency(salePayoutEstimate.sellerFee)}
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
                                <span>
                                  {acceptCashPayment && !acceptPayPalCheckout
                                    ? 'Pay in Person sales have no platform commission.'
                                    : `Platform fee is ${SALE_SELLER_FEE_PERCENT}% of the sale price for online PayPal payments`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Method Options */}
                      <div className="pt-6 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <PayPalMonogram className="h-5 w-5" />
                          <h3 className="text-lg font-semibold">How buyers can pay</h3>
                          <InfoTooltip
                            side="top"
                            align="start"
                            content={
                              <span className="block space-y-2">
                                <span className="block">
                                  <span className="font-medium">PayPal / Online Checkout:</span> Buyers
                                  pay securely through Vendibook. The applicable Vendibook seller fee is
                                  handled as part of the online transaction, and payout follows
                                  Vendibook's completion/payout process.
                                </span>
                                <span className="block">
                                  <span className="font-medium">Pay in Person:</span> You arrange payment
                                  directly with the buyer at pickup or delivery; Vendibook does not charge
                                  the online-sale commission on that pay-in-person transaction.
                                </span>
                              </span>
                            }
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select how buyers can pay for your item. You can enable both options.
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-start space-x-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors">
                            <Checkbox
                              id="accept_paypal_checkout"
                              checked={acceptPayPalCheckout}
                              onCheckedChange={(checked) => setAcceptPayPalCheckout(!!checked)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="accept_paypal_checkout"
                                className="flex items-center gap-2 text-base font-medium cursor-pointer"
                              >
                                <PayPalMonogram className="h-4 w-4" />
                                Pay online with PayPal
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Buyers check out securely with PayPal. Your sale proceeds are recorded to
                                your account and paid out to your payout details after the sale is confirmed.
                              </p>
                              {acceptPayPalCheckout && (
                                <div className="mt-2 p-2 bg-primary/5 rounded-lg text-xs text-muted-foreground">
                                  <Info className="w-3 h-3 inline mr-1" />
                                  Add your payout details in Settings so we know where to send your proceeds.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start space-x-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors">
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
                                <Banknote className="w-4 h-4 text-foreground" />
                                Pay in Person
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Accept cash or other payments at pickup/delivery. You'll arrange payment directly with the buyer.
                              </p>
                            </div>
                          </div>

                          {!acceptPayPalCheckout && !acceptCashPayment && (
                            <div className="p-3 bg-muted/50 border border-border rounded-xl">
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Please select at least one payment method.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Buyer financing — included on every published for-sale listing */}
                      {isFinanceableSaleListing({ ...listing, status: 'published' }) && (
                        <div className="pt-6 border-t">
                          <div className="flex items-center gap-2 mb-3">
                            <EquinoxFundingLogo className="h-6 w-auto" />
                            <h3 className="text-lg font-semibold">Buyer financing included</h3>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Buyers can apply for equipment financing through Equinox Funding on
                              every published for-sale listing. Nothing to turn on, and it never
                              changes how you get paid.
                            </p>
                            <div className="flex items-start gap-2 text-sm text-foreground">
                              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <span>Get paid within 24 hours once the financed sale is confirmed.</span>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {EQUINOX_DISCLOSURE_TEXT}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Freight Settings */}
                      <div className="pt-6 border-t">
                        <FreightSettingsCard
                          enabled={vendibookFreightEnabled}
                          payer={freightPayer}
                          onEnabledChange={(enabled) => setVendibookFreightEnabled(enabled)}
                          onPayerChange={(payer) => setFreightPayer(payer)}
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
                          <p className="text-xs text-muted-foreground">
                            Offer a discount for week-long rentals. Typically 10-20% off the daily rate × 7.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priceMonthly" className="text-base font-medium">Monthly Rate (optional)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              id="priceMonthly"
                              type="number"
                              placeholder="0"
                              value={priceMonthly}
                              onChange={(e) => setPriceMonthly(e.target.value)}
                              className="pl-8 text-lg"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Best value for long-term renters. Typically 30-40% off the daily rate × 30.
                          </p>
                        </div>
                      </div>

                      {/* Payout Estimate for Rentals */}
                      {(rentalPayoutEstimates.daily || rentalPayoutEstimates.weekly || rentalPayoutEstimates.monthly) && (
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
                                {rentalPayoutEstimates.monthly && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Monthly rental:</span>
                                    <div className="text-right">
                                      <span className="font-semibold text-primary">
                                        {formatCurrency(rentalPayoutEstimates.monthly.hostReceives)}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({formatCurrency(rentalPayoutEstimates.monthly.hostFee)} fee)
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
                        <div className="relative overflow-hidden rounded-xl p-4 border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-background">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/3 pointer-events-none" />
                          <div className="relative flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2.5 bg-foreground rounded-xl shadow-md">
                                <Zap className="w-5 h-5 text-background" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">Instant Book</h4>
                                  <InfoTooltip 
                                    content="When enabled, renters can book and pay immediately. Documents are still reviewed - if rejected, the booking is cancelled and payment is fully refunded." 
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Renters can book and pay immediately—no approval wait. Great for maximizing bookings, but you lose the chance to vet before confirming.
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
                                  content="A refundable security deposit is arranged directly between you and the renter — it isn't charged through Vendibook checkout. Set the amount here so renters know what to expect before they book." 
                                />
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Protect your equipment with a refundable deposit you collect and return directly with the renter.
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
                                <div className="mt-4 p-3 bg-muted rounded-xl border border-border">
                                  <p className="text-xs text-muted-foreground">
                                    <strong className="text-primary">How it works:</strong> The ${parseFloat(depositAmount).toLocaleString()} deposit is shown on your listing so renters know the expectation up front. 
                                    It isn't part of the Vendibook payment — you collect and refund it directly with the renter.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-4">
                    <PrimaryActionBar
                      sticky
                      secondary={{ label: 'Back', onClick: () => setStep('includes') }}
                      primary={{
                        label: isSaving ? 'Saving…' : 'Continue',
                        onClick: guardNext(
                          listing.mode === 'sale'
                            ? ([
                                !isValidPrice(priceSale) && 'An asking price',
                                !acceptPayPalCheckout && !acceptCashPayment && 'At least one way to get paid',
                              ].filter(Boolean) as string[])
                            : ([!isValidPrice(priceDaily) && 'A daily rate'].filter(Boolean) as string[]),
                          null,
                          saveStep,
                        ),
                        disabled: isSaving,
                      }}
                      blockers={
                        listing.mode === 'sale'
                          ? ([
                              !isValidPrice(priceSale) && 'An asking price',
                              !acceptPayPalCheckout && !acceptCashPayment && 'At least one way to get paid',
                            ].filter(Boolean) as string[])
                          : ([!isValidPrice(priceDaily) && 'A daily rate'].filter(Boolean) as string[])
                      }

                    />
                  </div>
                </div>
              )}

              {/* Step: Availability (Rental only) */}
              {step === 'availability' && listing.mode === 'rent' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Set availability</h2>
                    <p className="text-muted-foreground">
                      Control when your listing is available for bookings.
                    </p>
                  </div>

                  {/* Spaces Available - For categories with multiple slots */}
                  {['vendor_lot', 'vendor_space', 'ghost_kitchen', 'food_truck', 'food_trailer'].includes(listing.category) && (
                    <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <Label className="text-base font-medium">Spaces Available</Label>
                        <InfoTooltip content="How many vendors can book this location at the same time? This enables capacity-based availability." />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        If you have multiple units (e.g., 5 parking spots or 3 kitchen stations), renters can book the same dates until capacity is full.
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={totalSlots}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value) && value >= 1) {
                              setTotalSlots(value);
                              // Auto-resize slot names
                              setSlotNames(prev => {
                                if (value > prev.length) {
                                  const newNames = [...prev];
                                  for (let i = prev.length; i < value; i++) {
                                    newNames.push(`Slot ${i + 1}`);
                                  }
                                  return newNames;
                                }
                                return prev.slice(0, value);
                              });
                            }
                          }}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          space{totalSlots !== 1 ? 's' : ''} available
                        </span>
                      </div>
                      {totalSlots > 1 && (
                        <>
                          <p className="text-xs text-primary font-medium">
                            ✓ Multiple vendors can book the same dates
                          </p>
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <Label className="text-sm font-medium">Name Each Slot</Label>
                            <p className="text-xs text-muted-foreground">
                              Give each slot a unique name so renters can identify them.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Array.from({ length: totalSlots }, (_, i) => (
                                <Input
                                  key={i}
                                  value={slotNames[i] || `Slot ${i + 1}`}
                                  onChange={(e) => {
                                    const newNames = [...slotNames];
                                    while (newNames.length <= i) newNames.push(`Slot ${newNames.length + 1}`);
                                    newNames[i] = e.target.value;
                                    setSlotNames(newNames);
                                  }}
                                  placeholder={`Slot ${i + 1}`}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <RentalAvailabilityStep
                    listingId={listing.id}
                    listingMode={listing.mode}
                    availableFrom={availableFrom}
                    availableTo={availableTo}
                    priceDaily={listing.price_daily}
                    priceHourly={priceHourly ?? (listing as any).price_hourly}
                    onAvailableFromChange={setAvailableFrom}
                    onAvailableToChange={setAvailableTo}
                    onPriceHourlyChange={(price) => {
                      setPriceHourly(price);
                    }}
                    onSettingsChange={(settings) => {
                      setHourlyEnabled(settings.hourlyEnabled);
                      setDailyEnabled(settings.dailyEnabled);
                      setMinHours(settings.minHours);
                      setMaxHours(settings.maxHours);
                      setBufferTimeMins(settings.bufferTimeMins);
                      setMinNoticeHours(settings.minNoticeHours);
                      setHourlySchedule(settings.hourlySchedule ?? null);
                      setRentalMinDays(settings.rentalMinDays);
                    }}
                    onSpecialPricingChange={(pricing) => {
                      setHourlySpecialPricing(pricing ?? null);
                    }}
                    onValidationChange={setAvailabilityStepValid}
                  />

                  <div className="pt-4">
                    <PrimaryActionBar
                      sticky
                      secondary={{ label: 'Back', onClick: () => setStep('pricing') }}
                      primary={{
                        label: isSaving ? 'Saving…' : 'Continue',
                        onClick: saveStep,
                        disabled: isSaving,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step: Details */}
              {step === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Add details</h2>
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

                  {/* Description with Write it for me */}
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
                          variant="dark-shine"
                          size="sm"
                          onClick={optimizeDescription}
                          disabled={isOptimizing || (aiAssistUnlocked && (!description || description.length < 10))}
                        >
                          {isOptimizing ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Optimizing...
                            </>
                          ) : showOptimized ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-foreground" />
                              Optimized
                            </>
                          ) : (
                            <>
                              
                              {aiAssistUnlocked ? 'Write it for me' : 'Write it for me · Pro'}
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
                        description.trim().length < MIN_DESCRIPTION_LENGTH ? "text-destructive" : "text-foreground"
                      )}>
                        {description.trim().length}/{MIN_DESCRIPTION_LENGTH}+ chars
                      </span>
                    </div>
                    
                    {!showOptimized && description.length >= 10 && description.trim().length >= MIN_DESCRIPTION_LENGTH && (
                      <p className="text-xs text-muted-foreground/70">
                        {aiAssistUnlocked
                          ? 'Tip: tap “Write it for me” for a polished rewrite you can edit'
                          : 'Optional: “Write it for me” is a Vendibook Pro feature. Your own description publishes just fine.'}
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
                        Length and height are required for trucks, trailers and carts — buyers use
                        them to check clearance and we use them for freight estimates. Width is optional.
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
                          <Label htmlFor="length_ft" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Length (ft) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="length_ft"
                            type="number"
                            min="0"
                            step="0.5"
                            value={inchesToFeet(parseFloat(lengthInches) || null)}
                            onChange={(e) => setLengthInches(String(feetToInches(e.target.value) ?? ''))}
                            placeholder="e.g., 20"
                          />
                        </div>

                        {/* Width */}
                        <div className="space-y-2">
                          <Label htmlFor="width_ft" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Width (ft) <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Input
                            id="width_ft"
                            type="number"
                            min="0"
                            step="0.5"
                            value={inchesToFeet(parseFloat(widthInches) || null)}
                            onChange={(e) => setWidthInches(String(feetToInches(e.target.value) ?? ''))}
                            placeholder="e.g., 8"
                          />
                        </div>

                        {/* Height */}
                        <div className="space-y-2">
                          <Label htmlFor="height_ft" className="flex items-center gap-1.5 text-sm">
                            <Ruler className="h-3.5 w-3.5" />
                            Height (ft) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="height_ft"
                            type="number"
                            min="0"
                            step="0.5"
                            value={inchesToFeet(parseFloat(heightInches) || null)}
                            onChange={(e) => setHeightInches(String(feetToInches(e.target.value) ?? ''))}
                            placeholder="e.g., 10"
                          />
                        </div>
                      </div>

                      {(!(parseFloat(lengthInches) > 0) || !(parseFloat(heightInches) > 0)) && (
                        <p className="text-xs text-destructive">
                          Add the {[
                            !(parseFloat(lengthInches) > 0) ? 'length' : null,
                            !(parseFloat(heightInches) > 0) ? 'height' : null,
                          ].filter(Boolean).join(' and ')} in feet before publishing.
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Shown to buyers as {formatDimensionSummary(
                          parseFloat(lengthInches) || null,
                          parseFloat(widthInches) || null,
                          parseFloat(heightInches) || null,
                        ) ?? 'Length × Width × Height once you fill these in'}. Typical food trucks are 16–26 ft long, 7–8 ft wide and 8–10 ft tall.
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
                          variant="dark-shine"
                          size="icon"
                          onClick={addHighlight}
                          disabled={!newHighlight.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <PrimaryActionBar
                    sticky
                    helper={
                      !user && isGuestDraft
                        ? 'Sign-in required to save your details.'
                        : undefined
                    }
                    secondary={{ label: 'Back', onClick: () => setStep('photos') }}
                    primary={{
                      label: isSaving
                        ? 'Saving…'
                        : !user && isGuestDraft
                        ? 'Save & Continue'
                        : 'Continue',
                      onClick: handleDetailsSave,
                      disabled: isSaving || !title || !description,
                    }}
                  />
                </div>
              )}

              {/* Step: Location */}
              {step === 'location' && (
                <div className="flex flex-col gap-6">
                  <div className="order-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                      {listing.mode === 'sale' ? 'Pickup & delivery details' : 'Full Address & Fulfillment'}
                    </h2>
                    <p className="text-muted-foreground">
                      {listing.mode === 'sale'
                        ? 'Tell buyers how this changes hands. Only the city, state and ZIP are public — your full address stays private until a sale is confirmed.'
                        : 'Provide your complete address. It will only be shared after a booking is confirmed.'}
                    </p>
                  </div>

                  {/* Static Location Toggle - Only for mobile rentals */}
                  {isMobileAsset(listing.category) && listing.mode !== 'sale' && (
                    <div className="p-4 bg-muted/50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                          <div>
                            <Label htmlFor="static-toggle" className="text-base font-medium cursor-pointer">
                              Static Location
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              This asset is at a fixed location
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

                  {/* Structured Address Form */}
                  <div className="space-y-4 order-3">
                    <Label className="text-base font-semibold">
                      {listing.mode === 'sale'
                        ? (needsFullAddressForSale ? 'Pickup address *' : 'Where it is located *')
                        : 'Address *'}
                    </Label>
                    {listing.mode === 'sale' && !needsFullAddressForSale && (
                      <p className="text-sm text-muted-foreground -mt-2">
                        Delivery only — just the city, state and ZIP where the unit sits today.
                      </p>
                    )}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="street_address" className="text-sm font-medium">
                          {listing.mode === 'sale'
                            ? (needsFullAddressForSale ? 'Street address' : 'Street address (optional)')
                            : 'Address Line 1'}
                        </Label>
                        <Input
                          id="street_address"
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          placeholder="123 Main Street"
                          className={cn(!streetAddress.trim() && streetAddressRequired && "border-destructive/50")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apt_suite" className="text-sm font-medium">Address Line 2 (Optional)</Label>
                        <Input
                          id="apt_suite"
                          value={aptSuite}
                          onChange={(e) => setAptSuite(e.target.value)}
                          placeholder="Apt, Suite, Unit, etc."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="loc_city" className="text-sm font-medium">City</Label>
                          <Input
                            id="loc_city"
                            value={locCity}
                            onChange={(e) => setLocCity(e.target.value)}
                            placeholder="Austin"
                            className={cn(!locCity.trim() && "border-destructive/50")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loc_state" className="text-sm font-medium">State</Label>
                          <Input
                            id="loc_state"
                            value={locState}
                            onChange={(e) => setLocState(e.target.value.toUpperCase().slice(0, 2))}
                            placeholder="TX"
                            maxLength={2}
                            className={cn(!locState.trim() && "border-destructive/50")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="loc_zip" className="text-sm font-medium">ZIP Code</Label>
                          <Input
                            id="loc_zip"
                            value={locZipCode}
                            onChange={(e) => setLocZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                            placeholder="78701"
                            maxLength={5}
                            className={cn(!locZipCode.trim() && "border-destructive/50")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="loc_phone" className="text-sm font-medium">Phone Number</Label>
                          <Input
                            id="loc_phone"
                            type="tel"
                            value={sellerPhone}
                            onChange={(e) => setSellerPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                          />
                          <p className="text-xs text-muted-foreground">
                            Saved privately to your account — never shown on your public listing.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Validation */}
                    {((streetAddressRequired && !streetAddress.trim()) || !locCity.trim() || !locState.trim() || !locZipCode.trim()) && (
                      <p className="text-sm text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Please fill in all required address fields
                      </p>
                    )}

                    {/* Privacy Notes */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {listing.mode === 'sale'
                          ? 'Buyers only see your city, state and ZIP. Your street address and phone number stay private until a sale is confirmed.'
                          : 'Your full address and phone number are kept private until a booking is confirmed.'}
                      </p>
                    </div>
                  </div>

                  {/* Static Location extras */}
                  {(isStaticLocationFn(listing.category) || isStaticLocation) && (
                    <div className="space-y-4 order-4">
                      <div className="space-y-2">
                        <Label htmlFor="access_instructions" className="text-base font-medium">Access Instructions *</Label>
                        <Textarea
                          id="access_instructions"
                          value={accessInstructions}
                          onChange={(e) => setAccessInstructions(e.target.value)}
                          placeholder="Gate codes, parking instructions, check-in procedures..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hours_of_access" className="text-base font-medium">Hours of Access (Optional)</Label>
                        <Input
                          id="hours_of_access"
                          value={hoursOfAccess}
                          onChange={(e) => setHoursOfAccess(e.target.value)}
                          placeholder="e.g., 6 AM - 10 PM daily"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location_notes" className="text-base font-medium">Additional Notes (Optional)</Label>
                        <Textarea
                          id="location_notes"
                          value={locationNotes}
                          onChange={(e) => setLocationNotes(e.target.value)}
                          placeholder="Utilities, parking, nearby amenities..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fulfillment - for non-static mobile assets */}
                  {!(isStaticLocationFn(listing.category) || isStaticLocation) && (
                    <div className="space-y-6 order-2">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          {listing.mode === 'sale' ? 'How does the buyer get it? *' : 'Fulfillment Options *'}
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { value: 'pickup' as FulfillmentType, label: listing.mode === 'sale' ? 'Buyer picks up' : 'Pickup Only', icon: <MapPin className="w-5 h-5" />, description: listing.mode === 'sale' ? 'Buyer collects it from your address' : 'Buyer/renter picks up from your location' },
                            { value: 'delivery' as FulfillmentType, label: listing.mode === 'sale' ? 'I deliver it' : 'Delivery Only', icon: <Truck className="w-5 h-5" />, description: listing.mode === 'sale' ? 'You deliver to the buyer' : 'You deliver to their location' },
                            { value: 'both' as FulfillmentType, label: listing.mode === 'sale' ? 'Either one' : 'Pickup + Delivery', icon: <Package className="w-5 h-5" />, description: listing.mode === 'sale' ? 'Buyer chooses pickup or delivery' : 'Offer both options' }].map((option) => (
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

                      {(fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            {listing.mode === 'sale' ? 'Pickup notes (optional)' : 'Pickup Instructions (Optional)'}
                          </Label>
                          <Textarea
                            value={pickupInstructions}
                            onChange={(e) => setPickupInstructions(e.target.value)}
                            placeholder={listing.mode === 'sale'
                              ? 'Gate code, best hours, towing or loading help, what to bring…'
                              : 'Any special instructions for pickup?'}
                            rows={2}
                          />
                          <p className="text-xs text-muted-foreground">
                            Private. Your exact pickup address and these notes stay hidden — buyers only see the city, state and ZIP until they pay. The address unlocks for the buyer right after payment, when the next step is confirming pickup.
                          </p>
                        </div>
                      )}

                      {/* Towing & handoff — rental mobile assets */}
                      {listing.mode !== 'sale' &&
                        (listing.category === 'food_trailer' || listing.category === 'food_truck') &&
                        (fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
                        <div className="space-y-4 rounded-xl border border-border p-4">
                          <div>
                            <Label className="text-base font-medium">Towing &amp; handoff (optional)</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Renters see these before they book. Only fill in what you know — blanks show as
                              &ldquo;Ask host&rdquo;.
                            </p>
                          </div>

                          {listing.category === 'food_trailer' && (
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="space-y-1.5">
                                <Label className="text-sm">Coupler / hitch type</Label>
                                <Input
                                  value={couplerType}
                                  onChange={(e) => setCouplerType(e.target.value)}
                                  placeholder="Bumper pull"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Hitch ball size</Label>
                                <Input
                                  value={hitchBallSize}
                                  onChange={(e) => setHitchBallSize(e.target.value)}
                                  placeholder={'2 5/16"'}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm">Trailer plug</Label>
                                <Input
                                  value={trailerPlugType}
                                  onChange={(e) => setTrailerPlugType(e.target.value)}
                                  placeholder="7-pin"
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-sm">Does the renter bring their own tow vehicle?</Label>
                            <div className="flex gap-2">
                              {([
                                { value: 'yes' as const, label: 'Yes, renter tows' },
                                { value: 'no' as const, label: 'No, I tow or deliver' },
                              ]).map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() =>
                                    setRenterProvidesTowVehicle(
                                      renterProvidesTowVehicle === opt.value ? '' : opt.value
                                    )
                                  }
                                  className={cn(
                                    'px-4 py-2 rounded-lg border-2 text-sm transition-all',
                                    renterProvidesTowVehicle === opt.value
                                      ? 'border-primary bg-primary/5 text-primary'
                                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {renterProvidesTowVehicle === 'yes' && (
                            <div className="space-y-1.5">
                              <Label className="text-sm">Tow vehicle requirement (optional)</Label>
                              <Input
                                value={towVehicleRequirement}
                                onChange={(e) => setTowVehicleRequirement(e.target.value)}
                                placeholder="3/4 ton truck or better, 10,000 lb tow rating"
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <Label className="text-sm">Return instructions (optional)</Label>
                            <Textarea
                              value={returnInstructions}
                              onChange={(e) => setReturnInstructions(e.target.value)}
                              placeholder="Return by 6pm, cleaned out, tanks emptied, park in the same spot…"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}



                      {(fulfillmentType === 'delivery' || fulfillmentType === 'both') && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-base font-medium">How do you charge for delivery?</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {([
                                { value: 'flat' as const, label: 'Flat fee', hint: 'One price per delivery' },
                                { value: 'per_mile' as const, label: 'Per mile', hint: 'Rate × miles to the buyer' },
                              ]).map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setDeliveryFeeType(opt.value)}
                                  className={cn(
                                    'rounded-xl border p-3 text-left transition-all',
                                    deliveryFeeType === opt.value
                                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                      : 'border-border hover:border-primary/40'
                                  )}
                                >
                                  <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                                  <span className="block text-xs text-muted-foreground mt-0.5">{opt.hint}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-base font-medium">
                                {deliveryFeeType === 'per_mile' ? 'Rate per mile (optional)' : (listing.mode === 'sale' ? 'Delivery charge (optional)' : 'Delivery Fee (Optional)')}
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={deliveryFee}
                                  onChange={(e) => setDeliveryFee(e.target.value)}
                                  placeholder={deliveryFeeType === 'per_mile' ? '4.50' : '0.00'}
                                  className={deliveryFeeType === 'per_mile' ? 'pl-7 pr-16' : 'pl-7'}
                                />
                                {deliveryFeeType === 'per_mile' && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/mile</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-base font-medium">
                                {listing.mode === 'sale' ? 'Delivery radius (optional)' : 'Delivery Radius (Optional)'}
                              </Label>
                              <div className="relative">
                                <Input
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
                            <Label className="text-base font-medium">Delivery instructions (optional)</Label>
                            <Textarea
                              value={deliveryInstructions}
                              onChange={(e) => setDeliveryInstructions(e.target.value)}
                              placeholder="Any special requirements for delivery?"
                              rows={2}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            The buyer enters their own delivery address at checkout. We measure the distance from your location and
                            {deliveryFeeType === 'per_mile' ? ' multiply it by your per-mile rate.' : ' apply your flat delivery charge.'}
                            {' '}Addresses beyond your radius are flagged so you can approve or decline.
                          </p>

                        </>
                      )}

                    </div>
                  )}

                  <div className="order-last">
                    <PrimaryActionBar
                      sticky
                      secondary={{
                        label: 'Back',
                        onClick: () => setStep(listing.mode === 'rent' ? 'availability' : 'pricing'),
                      }}
                      primary={{
                        label: isSaving ? 'Saving…' : 'Continue',
                        onClick: guardNext(
                          [
                            streetAddressRequired && !streetAddress.trim() && 'Street address',
                            !locCity.trim() && 'City',
                            !locState.trim() && 'State',
                            !locZipCode.trim() && 'ZIP code',
                            isStaticLocationFn(listing.category) || isStaticLocation
                              ? !accessInstructions && 'Access instructions'
                              : !fulfillmentType && 'How it changes hands (pickup or delivery)',
                          ].filter(Boolean) as string[],
                          null,
                          saveStep,
                        ),
                        disabled: isSaving,
                      }}

                      blockers={[
                        streetAddressRequired && !streetAddress.trim() && 'Street address',
                        !locCity.trim() && 'City',
                        !locState.trim() && 'State',
                        !locZipCode.trim() && 'ZIP code',
                        isStaticLocationFn(listing.category) || isStaticLocation
                          ? !accessInstructions && 'Access instructions'
                          : !fulfillmentType && 'How it changes hands (pickup or delivery)',
                      ].filter(Boolean) as string[]}
                    />
                  </div>
                </div>
              )}

              {/* Step: Required Documents (Rental only) */}
              {step === 'documents' && listing.mode === 'rent' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <h2 className="text-2xl font-bold tracking-tight text-foreground">Required Documents</h2>
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
                            deadline_offset_hours: deadline === 'after_approval_deadline' ? deadlineHours : undefined}))
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
                                deadline_offset_hours: hours}))
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

                  <PrimaryActionBar
                    sticky
                    secondary={{ label: 'Back', onClick: () => setStep('location') }}
                    primary={{
                      label: isSaving ? 'Saving…' : 'Continue',
                      onClick: saveStep,
                      disabled: isSaving,
                    }}
                  />
                </div>
              )}

              {/* Step: Review */}
              {step === 'review' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Review your listing</h2>
                    <p className="text-muted-foreground">Here's how your listing will appear to shoppers.</p>
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Every sale and rental includes free online signatures — agreements handled for you.
                    </p>
                  </div>

                  <MembershipInlinePanel
                    returnTo={`/create-listing/${listing.id ?? ''}?step=review`}
                    listingId={listing.id ?? undefined}
                  />


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
                              ? "bg-foreground/90 text-background"
                              : "bg-foreground/90 text-background"
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
                      {(displayAddress || pickupLocationText) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{displayAddress || pickupLocationText}</span>
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
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
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

                  {/* Publish requirements checklist */}
                  <ListingQualityGate
                    hasPhotos={existingImages.length > 0}
                    photoCount={existingImages.length}
                    hasTitle={!!title?.trim()}
                    hasPrice={listing.mode === 'sale' ? parseFloat(priceSale || '0') > 0 : parseFloat(priceDaily || '0') > 0}
                    hasLocation={!!(displayAddress || pickupLocationText)}
                    mode={listing.mode as 'rent' | 'sale' | null}
                  />

                  {/* Missing listing details — actionable, jumps to the exact step */}
                  {stageMissing.length > 0 && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <p className="font-medium text-foreground">
                          {stageMissing.length === 1
                            ? '1 detail still needs an answer'
                            : `${stageMissing.length} details still need answers`}
                        </p>
                      </div>
                      <ul className="space-y-2">
                        {stageMissing.map((req) => (
                          <li key={req.fieldId} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">{req.label}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setStep(req.step as PublishStep)}
                            >
                              Fix this
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Persisted AI health score */}
                  <ListingHealthScoreCard listingId={listing?.id} />

                  {/* Missing Requirements Warning — names every outstanding item */}
                  {!canPublish && (
                    <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            Cannot publish yet — {publishBlockers.length}{' '}
                            {publishBlockers.length === 1 ? 'item is' : 'items are'} still required
                          </p>
                          <ul className="mt-2 space-y-1">
                            {publishBlockers.map((blocker) => (
                              <li key={blocker} className="flex items-start gap-2 text-sm text-foreground">
                                <span
                                  aria-hidden="true"
                                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                                />
                                <span>{blocker}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* Ready to Publish Message */}
                  {canPublish && (
                    <div className="relative overflow-hidden rounded-xl p-4 border border-border bg-gradient-to-br from-primary/5 via-primary/3 to-background">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/3 animate-pulse" />
                      <div className="relative flex items-center gap-3">
                        <div className="p-2.5 bg-foreground rounded-xl shadow-md flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-background" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Your listing is ready!</p>
                          <p className="text-sm text-muted-foreground">Review the preview above and publish when you're ready.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optional add-ons — never required to publish */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Optional upgrades
                    </p>
                    <VerifiedSellerCTA variant="success" />
                  </div>

                  {/* Public vs private summary + mandatory attestations */}

                  <PrivacySummary />

                  <PublishAttestations
                    value={attestations}
                    onChange={(key, checked) =>
                      setAttestations((prev) => ({ ...prev, [key]: checked }))
                    }
                  />

                  {/* Featured Listing upsell — final publish step (highest-conversion placement) */}
                  {stageRequirementsMet && !((listing as any)?.featured_at) && (

                    <FeaturedListingCard
                      enabled={featuredEnabled}
                      onEnabledChange={setFeaturedEnabled}
                    />
                  )}

                  {/* Seller Pro + White Glove upgrades — surfaced before publish */}
                  {canPublish && (
                    <AdditionalSellerSupportCards
                      listingId={listing?.id}
                      openInNewTab
                    />
                  )}

                  <PrimaryActionBar
                    sticky
                    secondary={{
                      label: 'Back',
                      onClick: () => setStep('location'),
                    }}
                    tertiary={{
                      label: 'Preview as Shopper',
                      onClick: () => setShowPreviewModal(true),
                    }}
                    primary={{
                      label: 'Publish Listing',
                      onClick: guardNext(publishBlockers, null, () => setShowPublishDialog(true)),
                      disabled: isSaving,
                    }}
                    blockers={publishBlockers}

                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="sale-light max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Publish your listing?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Your listing will be visible to all shoppers on VendiBook and you'll start receiving 
                  {listing?.mode === 'rent' ? ' booking requests' : ' purchase inquiries'}.
                </p>
                
                {/* Featured charge notice */}
                {featuredEnabled && !((listing as any)?.featured_at) && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      You'll be redirected to PayPal to pay{' '}
                      <strong>{featuredBoostPrice.label}</strong> for the Featured add-on
                      ({featuredBoostPrice.durationDays ?? 30} days).
                      Your listing publishes automatically the moment payment clears.
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  You'll be asked to review and accept VendiBook's{' '}
                  {listing?.mode === 'rent' ? 'Host / Renter Terms' : 'Seller Terms'} before your listing goes live.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="dark-shine"
              onClick={() => {
                setShowPublishDialog(false);
                setShowConsentModal(true);
              }}
              disabled={isSaving}
            >
              <Send className="w-4 h-4 mr-2" />
              Continue to terms
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms acceptance (non-preselected) */}
      <ConsentModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        documentType={listing?.mode === 'rent' ? DOCUMENT_TYPES.RENTER_TERMS : DOCUMENT_TYPES.SELLER_TERMS}
        trigger={CONSENT_TRIGGERS.PUBLISH_LISTING}
        acceptanceText={publishAcceptanceText(listing?.mode)}

        relatedIds={listing?.id ? { listing_id: listing.id } : undefined}
        intro="Review the terms that govern this listing. Your acceptance is recorded and dated."
        primaryLabel={isSaving ? 'Publishing…' : 'Accept and publish'}
        onAccept={async () => {
          await handlePublish();
        }}
      />


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
          address: displayAddress,
          priceDaily: parseFloat(priceDaily) || null,
          priceWeekly: parseFloat(priceWeekly) || null,
          priceSale: parseFloat(priceSale) || null} : null}
        paymentMethods={listing?.mode === 'sale' ? {
          paypalCheckout: acceptPayPalCheckout,
          payInPerson: acceptCashPayment} : null}
        readiness={[
          { label: 'Photos requirement met', met: checklistState.hasPhotos },
          { label: 'Title & description complete', met: hasDescription },
          { label: listing?.mode === 'sale' ? 'Valid sale price' : 'Valid daily rate', met: hasPriceAmount },
          { label: 'Location & logistics complete', met: checklistState.hasLocation },
          ...(listing?.mode === 'sale'
            ? [{ label: 'Payment method selected', met: hasSalePaymentMethod }]
            : []),
        ]}
        onViewListing={() => navigate(`/listing/${listing?.id}`)}
      />

      <ListingLimitReachedModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        tier={quota.tier}
        limit={quota.limit ?? 2}
        returnTo={typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : undefined}
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
            address: displayAddress,
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
            acceptPayPalCheckout,
            acceptCashPayment}}
          host={user ? {
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
            avatar: user.user_metadata?.avatar_url || null,
            memberSince: user.created_at || new Date().toISOString(),
            isVerified: false} : undefined}
        />
      )}
      {premiumUpsell.overlay}
    </div>

  );
};
