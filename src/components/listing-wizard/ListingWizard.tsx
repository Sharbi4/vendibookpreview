import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Send, Loader2, Cloud, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useListingForm } from '@/hooks/useListingForm';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS } from '@/types/listing';
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

import { WizardProgress } from './WizardProgress';
import { StepHelpTips } from './StepHelpTips';
import { StepListingType } from './StepListingType';
import { StepDetails } from './StepDetails';
import { StepLocation } from './StepLocation';
import { StepPricing } from './StepPricing';
import { StepRequiredDocuments } from './StepRequiredDocuments';
import { StepPhotos, VideoUploadProgress } from './StepPhotos';
import { StepReview } from './StepReview';
import { StripeConnectModal } from './StripeConnectModal';
import { PublishSuccessModal } from './PublishSuccessModal';
import { StripeConnectBanner } from './StripeConnectBanner';
import { ListingPreviewModal } from './ListingPreviewModal';

const STEPS = ['Type', 'Details', 'Location', 'Pricing', 'Documents', 'Photos', 'Review'];

interface PublishedListing {
  id: string;
  title: string;
  coverImageUrl: string | null;
  category: string;
  mode: string;
  address: string | null;
  priceDaily: number | null;
  priceWeekly: number | null;
  priceSale: number | null;
}

export const ListingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    formData,
    currentStep,
    updateField,
    updateCategory,
    toggleStaticLocation,
    nextStep,
    prevStep,
    goToStep,
    validateStep,
    canPublish,
    isMobileAsset,
    isStaticLocation,
    isCategoryStaticLocation,
  } = useListingForm();

  const {
    isOnboardingComplete,
    isLoading: isStripeLoading,
    isConnecting,
    connectStripe,
    refreshStatus,
  } = useStripeConnect();

  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [publishedListing, setPublishedListing] = useState<PublishedListing | null>(null);
  const [dismissedTips, setDismissedTips] = useState<Set<number>>(new Set());
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<VideoUploadProgress[]>([]);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const hasUnsavedChanges = useRef(false);
  const isNavigatingAway = useRef(false);
  const lastSavedData = useRef<string>('');

  // Check if user has made progress
  const hasProgress = formData.mode || formData.category || formData.title || 
    formData.description || formData.images.length > 0;

  // Serialize form data for comparison (excluding images which can't be easily serialized)
  const getSerializedFormData = useCallback(() => {
    const { images, ...rest } = formData;
    return JSON.stringify(rest);
  }, [formData]);

  // Update unsaved changes ref
  useEffect(() => {
    const currentData = getSerializedFormData();
    hasUnsavedChanges.current = hasProgress && !showSuccessModal && currentData !== lastSavedData.current;
  }, [hasProgress, showSuccessModal, getSerializedFormData]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!user || !formData.mode || !formData.category || showSuccessModal) {
      return;
    }

    const currentData = getSerializedFormData();
    if (currentData === lastSavedData.current) {
      return; // No changes to save
    }

    setIsAutoSaving(true);
    try {
      const draftData = {
        host_id: user.id,
        mode: formData.mode,
        category: formData.category,
        status: 'draft' as const,
        title: formData.title || 'Untitled Draft',
        description: formData.description || '',
        fulfillment_type: formData.fulfillment_type || 'on_site',
        address: formData.address || null,
        price_daily: formData.price_daily ? parseFloat(formData.price_daily) : null,
        price_weekly: formData.price_weekly ? parseFloat(formData.price_weekly) : null,
        price_sale: formData.price_sale ? parseFloat(formData.price_sale) : null,
        highlights: formData.highlights || [],
        amenities: formData.amenities || [],
        pickup_location_text: formData.pickup_location_text || null,
        delivery_fee: formData.delivery_fee ? parseFloat(formData.delivery_fee) : null,
        delivery_radius_miles: formData.delivery_radius_miles ? parseInt(formData.delivery_radius_miles) : null,
        pickup_instructions: formData.pickup_instructions || null,
        delivery_instructions: formData.delivery_instructions || null,
        access_instructions: formData.access_instructions || null,
        hours_of_access: formData.hours_of_access || null,
        location_notes: formData.location_notes || null,
        available_from: formData.available_from || null,
        available_to: formData.available_to || null,
        instant_book: formData.mode === 'rent' ? formData.instant_book : false,
      };

      if (draftId) {
        // Update existing draft
        const { error } = await supabase
          .from('listings')
          .update(draftData as any)
          .eq('id', draftId);
        
        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('listings')
          .insert(draftData as any)
          .select('id')
          .single();
        
        if (error) throw error;
        if (data) {
          setDraftId(data.id);
        }
      }

      lastSavedData.current = currentData;
      setLastAutoSaved(new Date());
      hasUnsavedChanges.current = false;
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [user, formData, draftId, showSuccessModal, getSerializedFormData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasProgress || showSuccessModal) return;

    const interval = setInterval(() => {
      performAutoSave();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [hasProgress, showSuccessModal, performAutoSave]);

  // Browser beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current && !showSuccessModal) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showSuccessModal]);

  // React Router navigation blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges.current && 
      !showSuccessModal &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Show exit dialog when blocker is triggered
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowExitDialog(true);
    }
  }, [blocker.state]);

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleCancelExit = () => {
    setShowExitDialog(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  const handleSaveAndExit = async () => {
    if (!user || !formData.mode || !formData.category) {
      toast({
        title: 'Cannot save draft',
        description: 'Please complete at least the listing type to save.',
        variant: 'destructive',
      });
      handleCancelExit();
      return;
    }

    setIsSaving(true);
    try {
      // Minimal draft save
      const { error } = await supabase
        .from('listings')
        .insert({
          host_id: user.id,
          mode: formData.mode,
          category: formData.category,
          status: 'draft',
          title: formData.title || 'Untitled Draft',
          description: formData.description || '',
          fulfillment_type: formData.fulfillment_type || 'on_site',
        } as any);

      if (error) throw error;

      toast({
        title: 'Draft saved!',
        description: 'Your progress has been saved. Continue from your dashboard.',
      });
      
      hasUnsavedChanges.current = false;
      setShowExitDialog(false);
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImages = async (listingId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of formData.images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      urls.push(publicUrl);
    }
    
    return urls;
  };

  const uploadVideos = async (listingId: string): Promise<string[]> => {
    const urls: string[] = [];
    const videos = formData.videos;
    
    // Initialize progress state
    setVideoUploadProgress(
      videos.map(file => ({
        fileName: file.name,
        progress: 0,
        status: 'pending' as const,
      }))
    );
    setIsUploadingVideos(true);
    
    for (let i = 0; i < videos.length; i++) {
      const file = videos[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Update status to uploading
      setVideoUploadProgress(prev => 
        prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploading' as const } : item
        )
      );

      try {
        // Use XMLHttpRequest for progress tracking
        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setVideoUploadProgress(prev => 
                prev.map((item, idx) => 
                  idx === i ? { ...item, progress: percentComplete } : item
                )
              );
            }
          });

          xhr.addEventListener('load', async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const { data: { publicUrl } } = supabase.storage
                .from('listing-videos')
                .getPublicUrl(fileName);
              
              setVideoUploadProgress(prev => 
                prev.map((item, idx) => 
                  idx === i ? { ...item, progress: 100, status: 'complete' as const } : item
                )
              );
              
              resolve(publicUrl);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          // Get the upload URL from Supabase
          const { data: { session } } = supabase.auth.getSession() as any;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const uploadUrl = `${supabaseUrl}/storage/v1/object/listing-videos/${fileName}`;

          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`);
          xhr.setRequestHeader('x-upsert', 'true');
          xhr.send(file);
        });

        urls.push(url);
      } catch (error) {
        console.error('Error uploading video:', error);
        setVideoUploadProgress(prev => 
          prev.map((item, idx) => 
            idx === i ? { ...item, status: 'error' as const } : item
          )
        );
        // Continue with other videos even if one fails
      }
    }
    
    setIsUploadingVideos(false);
    return urls;
  };

  // Check if Stripe Connect is required (only if card payments are enabled for sale listings)
  const requiresStripeConnect = formData.mode === 'rent' || 
    (formData.mode === 'sale' && formData.accept_card_payment);

  const saveListing = async (publish: boolean) => {
    if (!user) {
      toast({ title: 'Please sign in', variant: 'destructive' });
      return;
    }

    if (publish && requiresStripeConnect && !isOnboardingComplete) {
      setShowStripeModal(true);
      return;
    }

    if (publish && !canPublish()) {
      toast({ 
        title: 'Cannot publish', 
        description: 'Please complete all required fields.',
        variant: 'destructive' 
      });
      return;
    }

    setIsSaving(true);

    try {
      // Geocode address to get coordinates
      let latitude: number | null = null;
      let longitude: number | null = null;
      const addressToGeocode = formData.address || formData.pickup_location_text;
      
      if (addressToGeocode) {
        try {
          const { data: geoData } = await supabase.functions.invoke('geocode-location', {
            body: { query: addressToGeocode, limit: 1 },
          });
          if (geoData?.results?.length > 0) {
            const [lng, lat] = geoData.results[0].center;
            latitude = lat;
            longitude = lng;
          }
        } catch (geoError) {
          console.warn('Failed to geocode address:', geoError);
        }
      }

      // Create listing first to get ID for image uploads
      const listingData = {
        host_id: user.id,
        mode: formData.mode!,
        category: formData.category!,
        status: publish ? 'published' : 'draft',
        title: formData.title,
        description: formData.description,
        highlights: formData.highlights,
        amenities: formData.amenities || [],
        fulfillment_type: formData.fulfillment_type || 'on_site',
        pickup_location_text: formData.pickup_location_text || null,
        address: formData.address || null,
        delivery_fee: formData.delivery_fee ? parseFloat(formData.delivery_fee) : null,
        delivery_radius_miles: formData.delivery_radius_miles ? parseInt(formData.delivery_radius_miles) : null,
        pickup_instructions: formData.pickup_instructions || null,
        delivery_instructions: formData.delivery_instructions || null,
        access_instructions: formData.access_instructions || null,
        hours_of_access: formData.hours_of_access || null,
        location_notes: formData.location_notes || null,
        price_daily: formData.price_daily ? parseFloat(formData.price_daily) : null,
        price_weekly: formData.price_weekly ? parseFloat(formData.price_weekly) : null,
        price_sale: formData.price_sale ? parseFloat(formData.price_sale) : null,
        available_from: formData.available_from || null,
        available_to: formData.available_to || null,
        published_at: publish ? new Date().toISOString() : null,
        latitude,
        longitude,
        // Instant Book (for rentals)
        instant_book: formData.mode === 'rent' ? formData.instant_book : false,
        // Security deposit for rentals
        deposit_amount: formData.mode === 'rent' && formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        // Vendibook freight fields (for sales)
        vendibook_freight_enabled: formData.mode === 'sale' ? formData.vendibook_freight_enabled : false,
        freight_payer: formData.mode === 'sale' && formData.vendibook_freight_enabled ? formData.freight_payer : 'buyer',
        // Item dimensions for freight estimates
        weight_lbs: formData.weight_lbs ? parseFloat(formData.weight_lbs) : null,
        length_inches: formData.length_inches ? parseFloat(formData.length_inches) : null,
        width_inches: formData.width_inches ? parseFloat(formData.width_inches) : null,
        height_inches: formData.height_inches ? parseFloat(formData.height_inches) : null,
        freight_category: formData.freight_category || null,
        // Payment method preferences (for sales)
        accept_cash_payment: formData.mode === 'sale' ? formData.accept_cash_payment : false,
        accept_card_payment: formData.mode === 'sale' ? formData.accept_card_payment : true,
      };

      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert(listingData as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload images and videos
      let coverImageUrl: string | null = null;
      let imageUrls: string[] = [];
      let videoUrls: string[] = [];

      if (formData.images.length > 0) {
        imageUrls = await uploadImages(listing.id);
        coverImageUrl = imageUrls[0] || null;
      }

      if (formData.videos.length > 0) {
        videoUrls = await uploadVideos(listing.id);
      }

      // Update listing with media URLs
      if (imageUrls.length > 0 || videoUrls.length > 0) {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            cover_image_url: coverImageUrl,
            image_urls: imageUrls,
            video_urls: videoUrls,
          } as any)
          .eq('id', listing.id);

        if (updateError) throw updateError;
      }

      // Save required documents for rental listings
      if (formData.mode === 'rent' && formData.required_documents && formData.required_documents.length > 0) {
        const docsToInsert = formData.required_documents.map(doc => ({
          listing_id: listing.id,
          document_type: doc.document_type,
          is_required: doc.is_required,
          deadline_type: doc.deadline_type,
          deadline_offset_hours: doc.deadline_offset_hours || null,
          description: doc.description || null,
        }));

        const { error: docsError } = await supabase
          .from('listing_required_documents' as any)
          .insert(docsToInsert);

        if (docsError) {
          console.error('Error saving required documents:', docsError);
          // Don't fail the whole listing save, just log the error
        }
      }

      if (publish) {
        // Format price for email
        const formatPrice = () => {
          if (formData.mode === 'rent') {
            if (formData.price_daily) return `$${formData.price_daily}/day`;
            if (formData.price_weekly) return `$${formData.price_weekly}/week`;
          }
          if (formData.price_sale) return `$${parseFloat(formData.price_sale).toLocaleString()}`;
          return 'Contact for price';
        };

        // Send listing live email (fire and forget)
        supabase.functions.invoke('send-listing-live-email', {
          body: {
            hostEmail: user.email,
            hostName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'there',
            listingTitle: formData.title,
            listingId: listing.id,
            listingImageUrl: coverImageUrl,
            listingPrice: formatPrice(),
            category: CATEGORY_LABELS[formData.category as keyof typeof CATEGORY_LABELS] || formData.category,
          },
        }).then(({ error }) => {
          if (error) console.error('Failed to send listing live email:', error);
          else console.log('Listing live email sent successfully');
        });

        // Set published listing for success modal
        setPublishedListing({
          id: listing.id,
          title: formData.title,
          coverImageUrl: coverImageUrl,
          category: formData.category!,
          mode: formData.mode!,
          address: formData.address || null,
          priceDaily: formData.price_daily ? parseFloat(formData.price_daily) : null,
          priceWeekly: formData.price_weekly ? parseFloat(formData.price_weekly) : null,
          priceSale: formData.price_sale ? parseFloat(formData.price_sale) : null,
        });
        setShowSuccessModal(true);
      } else {
        toast({
          title: 'Draft Saved',
          description: 'You can continue editing later.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      toast({
        title: 'Error saving listing',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewListing = () => {
    if (publishedListing) {
      navigate(`/listing/${publishedListing.id}`);
    }
  };

  const handleCloseSuccessModal = (open: boolean) => {
    if (!open) {
      navigate('/dashboard');
    }
    setShowSuccessModal(open);
  };

  const handleStripeConnect = async () => {
    try {
      await connectStripe();
      setShowStripeModal(false);
      // Refresh status after user returns
      setTimeout(refreshStatus, 2000);
    } catch (error) {
      toast({
        title: 'Error connecting Stripe',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepListingType
            formData={formData}
            updateField={updateField}
            updateCategory={updateCategory}
          />
        );
      case 2:
        return (
          <StepDetails
            formData={formData}
            updateField={updateField}
          />
        );
      case 3:
        return (
          <StepLocation
            formData={formData}
            updateField={updateField}
            isMobileAsset={isMobileAsset}
            isStaticLocation={isStaticLocation}
            isCategoryStaticLocation={isCategoryStaticLocation}
            onToggleStaticLocation={toggleStaticLocation}
          />
        );
      case 4:
        return (
          <StepPricing
            formData={formData}
            updateField={updateField}
          />
        );
      case 5:
        return (
          <StepRequiredDocuments
            formData={formData}
            updateField={updateField}
          />
        );
      case 6:
        return (
          <StepPhotos
            formData={formData}
            updateField={updateField}
            videoUploadProgress={videoUploadProgress}
            isUploadingVideos={isUploadingVideos}
          />
        );
      case 7:
        return (
          <StepReview
            formData={formData}
            canPublish={canPublish()}
            isStripeConnected={isOnboardingComplete}
            requiresStripeConnect={requiresStripeConnect}
          />
        );
      default:
        return null;
    }
  };

  const completedSteps = Array.from({ length: 7 }, (_, i) => i + 1)
    .filter(step => step < currentStep && validateStep(step));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              {/* Auto-save status indicator */}
              {hasProgress && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isAutoSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : lastAutoSaved ? (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-green-500" />
                      <span className="hidden sm:inline">
                        Saved {lastAutoSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="sm:hidden">Saved</span>
                    </>
                  ) : draftId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span>Draft</span>
                    </>
                  ) : null}
                </div>
              )}
              <h1 className="font-semibold">Create Listing</h1>
            </div>
          </div>
          {/* Stripe Connect Status Banner - Early awareness */}
          <StripeConnectBanner className="mb-4" variant="compact" />
          <WizardProgress
            currentStep={currentStep}
            steps={STEPS}
            onStepClick={goToStep}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Contextual help tips */}
        <StepHelpTips
          currentStep={currentStep}
          mode={formData.mode}
          dismissed={dismissedTips.has(currentStep)}
          onDismiss={() => setDismissedTips(prev => new Set([...prev, currentStep]))}
        />
        
        <div className="bg-card rounded-2xl shadow-sm border p-6 md:p-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {/* Preview button - show when there's enough content */}
            {(formData.title || formData.description) && (
              <Button
                variant="ghost"
                onClick={() => setShowPreviewModal(true)}
                className="text-muted-foreground"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep === 7 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => saveListing(false)}
                  disabled={isSaving || !formData.mode || !formData.category}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
                <Button
                  onClick={() => saveListing(true)}
                  disabled={isSaving || !canPublish() || (requiresStripeConnect && !isOnboardingComplete)}
                  title={requiresStripeConnect && !isOnboardingComplete ? 'Connect Stripe to publish' : undefined}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {requiresStripeConnect && !isOnboardingComplete ? 'Connect Stripe to Publish' : 'Publish'}
                </Button>
              </>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <StripeConnectModal
        open={showStripeModal}
        onOpenChange={setShowStripeModal}
        onConnect={handleStripeConnect}
        isConnecting={isConnecting}
      />

      <PublishSuccessModal
        open={showSuccessModal}
        onOpenChange={handleCloseSuccessModal}
        listing={publishedListing}
        onViewListing={handleViewListing}
      />

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your progress?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save your listing as a draft before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelExit}>
              Keep editing
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleConfirmExit}
              className="sm:order-first"
            >
              Leave without saving
            </Button>
            <AlertDialogAction 
              onClick={handleSaveAndExit}
              disabled={isSaving || !formData.mode || !formData.category}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save & exit
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Listing Preview Modal */}
      <ListingPreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        listing={{
          title: formData.title,
          description: formData.description,
          category: formData.category!,
          mode: formData.mode as 'rent' | 'sale',
          images: formData.images.map(file => URL.createObjectURL(file)),
          priceDaily: formData.price_daily,
          priceWeekly: formData.price_weekly,
          priceSale: formData.price_sale,
          address: formData.address,
          pickupLocationText: formData.pickup_location_text,
          highlights: formData.highlights || [],
          amenities: formData.amenities || [],
          instantBook: formData.instant_book,
          fulfillmentType: formData.fulfillment_type,
          deliveryFee: formData.delivery_fee,
          deliveryRadiusMiles: formData.delivery_radius_miles,
        }}
      />
    </div>
  );
};
