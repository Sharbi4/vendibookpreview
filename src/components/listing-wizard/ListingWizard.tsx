import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useListingForm } from '@/hooks/useListingForm';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS } from '@/types/listing';

import { WizardProgress } from './WizardProgress';
import { StepListingType } from './StepListingType';
import { StepDetails } from './StepDetails';
import { StepLocation } from './StepLocation';
import { StepPricing } from './StepPricing';
import { StepRequiredDocuments } from './StepRequiredDocuments';
import { StepPhotos } from './StepPhotos';
import { StepReview } from './StepReview';
import { StripeConnectModal } from './StripeConnectModal';
import { PublishSuccessModal } from './PublishSuccessModal';

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
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedListing, setPublishedListing] = useState<PublishedListing | null>(null);

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

  const saveListing = async (publish: boolean) => {
    if (!user) {
      toast({ title: 'Please sign in', variant: 'destructive' });
      return;
    }

    if (publish && !isOnboardingComplete) {
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
      };

      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert(listingData as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload images and get the final cover URL
      let coverImageUrl: string | null = null;
      if (formData.images.length > 0) {
        const imageUrls = await uploadImages(listing.id);
        coverImageUrl = imageUrls[0] || null;
        
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            cover_image_url: coverImageUrl,
            image_urls: imageUrls,
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
          />
        );
      case 7:
        return (
          <StepReview
            formData={formData}
            canPublish={canPublish()}
            isStripeConnected={isOnboardingComplete}
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
            <h1 className="font-semibold">Create Listing</h1>
          </div>
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
        <div className="bg-card rounded-2xl shadow-sm border p-6 md:p-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isSaving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

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
                  disabled={isSaving || !canPublish() || !isOnboardingComplete}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Publish
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
    </div>
  );
};
