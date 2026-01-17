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
import { saveGuestDraft, generateDraftToken } from '@/lib/guestDraft';

type QuickStartStep = 'category' | 'mode' | 'location' | 'created';

interface QuickStartData {
  category: ListingCategory | null;
  mode: ListingMode | null;
  location: string;
}

const categoryOptions = [
  { value: 'food_truck' as ListingCategory, label: 'Food Truck', icon: Truck },
  { value: 'food_trailer' as ListingCategory, label: 'Food Trailer', icon: Truck },
  { value: 'ghost_kitchen' as ListingCategory, label: 'Ghost Kitchen', icon: Building2 },
  { value: 'vendor_lot' as ListingCategory, label: 'Vendor Lot', icon: MapPin },
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
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${position.coords.longitude},${position.coords.latitude}.json?access_token=pk.eyJ1IjoidmVuZGlib29rIiwiYSI6ImNtNjU2aGxnazBpNDkya3NjdWp6dzl4dG8ifQ.example`
            );
            // Fallback to coordinates if geocoding fails
            setData(prev => ({ 
              ...prev, 
              location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
            }));
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

      // Generate guest token for anonymous draft OR use user id
      const guestToken = user ? null : generateDraftToken();

      // Create minimal draft listing (anonymous or authenticated)
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          host_id: user?.id || null, // null for guest drafts
          guest_draft_token: guestToken, // token for guest claiming
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

      // Save guest draft token in localStorage for later claiming
      if (guestToken && listing) {
        saveGuestDraft(listing.id, guestToken);
      }

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
          <Button onClick={handleContinueSetup} className="flex-1" size="lg">
            Continue setup
          </Button>
          <Button onClick={handleSaveForLater} variant="outline" className="flex-1" size="lg">
            Save for later
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((num) => (
          <React.Fragment key={num}>
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                num < stepNumber
                  ? "bg-primary text-primary-foreground"
                  : num === stepNumber
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {num < stepNumber ? <Check className="w-4 h-4" /> : num}
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
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">What are you listing?</h1>
            <p className="text-muted-foreground">Choose one to get started.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {categoryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleCategorySelect(option.value)}
                  className={cn(
                    "p-6 rounded-xl border-2 text-center transition-all hover:border-primary hover:bg-primary/5",
                    data.category === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <span className="font-medium text-foreground">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Mode */}
      {step === 'mode' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Rent or sell?</h1>
            <p className="text-muted-foreground">You can change this later.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleModeSelect(option.value)}
                  className={cn(
                    "p-6 rounded-xl border-2 text-center transition-all hover:border-primary hover:bg-primary/5",
                    data.mode === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <span className="font-medium text-foreground block mb-1">{option.label}</span>
                  <span className="text-sm text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={() => setStep('category')} className="mt-4">
            ← Back
          </Button>
        </div>
      )}

      {/* Step: Location */}
      {step === 'location' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Where is it located?</h1>
            <p className="text-muted-foreground">City, state, or zip code.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="e.g., Los Angeles, CA"
                  value={data.location}
                  onChange={handleLocationChange}
                  className="pl-10"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="text-sm text-primary hover:underline"
            >
              Use my current location
            </button>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setStep('mode')}>
                ← Back
              </Button>
              <Button 
                onClick={handleCreateDraft} 
                disabled={isCreating}
                className="flex-1"
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
            {/* Guest note */}
            {!user && (
              <p className="text-xs text-muted-foreground text-center">
                You can finish as a guest. Sign-in required to publish.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
