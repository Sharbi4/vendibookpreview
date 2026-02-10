import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Store, Building2, MapPin, Tag, ShoppingBag, MapPinned, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ListingCategory, ListingMode, CATEGORY_LABELS } from '@/types/listing';
import { cn } from '@/lib/utils';
import { trackDraftCreated, trackEvent } from '@/lib/analytics';

type QuickStartStep = 'category' | 'mode' | 'location' | 'created';

interface QuickStartData {
  category: ListingCategory | null;
  mode: ListingMode | null;
  location: string;
}

const categoryOptions = [
  { value: 'food_truck' as ListingCategory, label: 'Food Truck', icon: Truck },
  { value: 'food_trailer' as ListingCategory, label: 'Food Trailer', icon: Truck },
  { value: 'ghost_kitchen' as ListingCategory, label: 'Shared Kitchen', icon: Building2 },
  { value: 'vendor_lot' as ListingCategory, label: 'Vendor Space', icon: MapPin },
];

const modeOptions = [
  { value: 'rent' as ListingMode, label: 'For Rent', icon: Tag, description: 'Rent by day or week' },
  { value: 'sale' as ListingMode, label: 'For Sale', icon: ShoppingBag, description: 'Sell to a new owner' },
];

export const QuickStartWizard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [step, setStep] = useState<QuickStartStep>('category');
  const [data, setData] = useState<QuickStartData>({
    category: null,
    mode: null,
    location: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const handleCategorySelect = (category: ListingCategory) => {
    setData(prev => ({ ...prev, category }));
    setStep('mode');
  };

  const handleModeSelect = (mode: ListingMode) => {
    setData(prev => ({ ...prev, mode }));
    setStep('location');
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(prev => ({ ...prev, location: e.target.value }));
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Use the geocode-location edge function for reverse geocoding
            const { data: geocodeData } = await supabase.functions.invoke('geocode-location', {
              body: { 
                query: `${position.coords.latitude},${position.coords.longitude}`,
                limit: 1 
              }
            });
            
            if (geocodeData?.results?.[0]?.placeName) {
              setData(prev => ({ 
                ...prev, 
                location: geocodeData.results[0].placeName 
              }));
            } else {
              // Fallback to coordinates if geocoding fails
              setData(prev => ({ 
                ...prev, 
                location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
              }));
            }
          } catch {
            setData(prev => ({ 
              ...prev, 
              location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
            }));
          }
        },
        () => {
          toast({ title: 'Could not get location', variant: 'destructive' });
        }
      );
    }
  };

  const handleCreateDraft = async () => {
    if (!data.category || !data.mode) return;

    // User must be authenticated to create a listing
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to create a listing.',
        variant: 'destructive',
      });
      navigate('/auth?redirect=/list');
      return;
    }

    setIsCreating(true);

    try {
      // Geocode location
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      if (data.location) {
        try {
          const { data: geoData } = await supabase.functions.invoke('geocode-location', {
            body: { query: data.location, limit: 1 },
          });
          if (geoData?.results?.length > 0) {
            const [lng, lat] = geoData.results[0].center;
            latitude = lat;
            longitude = lng;
          }
        } catch (geoError) {
          console.warn('Failed to geocode:', geoError);
        }
      }

      // If authenticated user, ensure they have host role before creating listing
      if (user) {
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'host')
          .maybeSingle();

        if (!existingRole) {
          await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'host' });
        }
      }

      // Create draft listing (user is authenticated at this point)
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          host_id: user.id,
          guest_draft_token: null, // No longer supporting guest drafts
          mode: data.mode,
          category: data.category,
          status: 'draft',
          title: `My ${CATEGORY_LABELS[data.category]}`,
          description: '',
          fulfillment_type: data.category === 'ghost_kitchen' || data.category === 'vendor_lot' ? 'on_site' : 'pickup',
          address: data.location || null,
          pickup_location_text: data.location || null,
          latitude,
          longitude,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setCreatedListingId(listing.id);
      setStep('created');
      
      // Track analytics event
      trackDraftCreated(data.category || undefined);
      
    } catch (error) {
      console.error('Error creating draft:', error);
      toast({
        title: 'Error creating draft',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleContinueSetup = () => {
    if (createdListingId) {
      navigate(`/create-listing/${createdListingId}`);
    }
  };

  const handleSaveForLater = () => {
    navigate('/dashboard');
  };

  const stepNumber = step === 'category' ? 1 : step === 'mode' ? 2 : step === 'location' ? 3 : 3;

  // Created confirmation screen
  if (step === 'created') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Draft created!</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Now add photos and pricing to publish your listing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button onClick={handleContinueSetup} variant="dark-shine" className="flex-1" size="lg">
            Continue setup
          </Button>
          <Button onClick={handleSaveForLater} variant="dark-shine" className="flex-1" size="lg">
            Save for later
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        {[1, 2, 3].map((num) => (
          <React.Fragment key={num}>
            <div
              className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors",
                num < stepNumber
                  ? "bg-primary text-primary-foreground"
                  : num === stepNumber
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {num < stepNumber ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : num}
            </div>
            {num < 3 && (
              <div
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  num < stepNumber ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step: Category */}
      {step === 'category' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            {/* Header */}
            <div className="relative bg-muted/30 border-b border-border px-4 sm:px-6 py-4 sm:py-5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">What are you listing?</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Choose one to get started.</p>
            </div>
            {/* Content */}
            <div className="relative bg-card p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {categoryOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = data.category === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleCategorySelect(option.value)}
                      className={cn(
                        "relative overflow-hidden p-4 sm:p-5 rounded-2xl border-0 shadow-xl text-center transition-all bg-card/80 backdrop-blur-sm",
                        isSelected
                          ? "ring-2 ring-primary"
                          : "hover:shadow-2xl"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center",
                        isSelected
                          ? "bg-primary"
                          : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Mode */}
      {step === 'mode' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            {/* Header */}
            <div className="relative bg-muted/30 border-b border-border px-4 sm:px-6 py-4 sm:py-5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Rent or sell?</h1>
              <p className="text-sm sm:text-base text-muted-foreground">You can change this later.</p>
            </div>
            {/* Content */}
            <div className="relative bg-card p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {modeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = data.mode === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleModeSelect(option.value)}
                      className={cn(
                        "relative overflow-hidden p-4 sm:p-5 rounded-2xl border-0 shadow-xl text-center transition-all bg-card/80 backdrop-blur-sm",
                        isSelected
                          ? "ring-2 ring-primary"
                          : "hover:shadow-2xl"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center",
                        isSelected
                          ? "bg-primary"
                          : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="font-semibold text-foreground block mb-1 text-sm sm:text-base">{option.label}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setStep('category')} className="mt-2">
            ← Back
          </Button>
        </div>
      )}

      {/* Step: Location */}
      {step === 'location' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            {/* Header */}
            <div className="relative bg-muted/30 border-b border-border px-4 sm:px-6 py-4 sm:py-5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Where is it located?</h1>
              <p className="text-sm sm:text-base text-muted-foreground">City, state, or zip code.</p>
            </div>
            {/* Content */}
            <div className="relative bg-card p-4 sm:p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="font-medium text-sm sm:text-base">Location</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <MapPinned className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="location"
                      placeholder="e.g., Los Angeles, CA"
                      value={data.location}
                      onChange={handleLocationChange}
                      className="pl-14 h-11 sm:h-12 border border-border focus:border-primary text-sm sm:text-base"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="text-xs sm:text-sm text-primary hover:underline font-medium"
                >
                  Use my current location
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" onClick={() => setStep('mode')} size="sm" className="text-xs sm:text-sm">
                ← Back
              </Button>
              <Button 
                variant="dark-shine"
                onClick={handleCreateDraft} 
                disabled={isCreating}
                className="flex-1 shadow-lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Start Listing'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
