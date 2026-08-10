import { useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { trackEvent } from '@/lib/analytics';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import SignupIntentDialog from '@/components/auth/SignupIntentDialog';

interface SaveSearchButtonProps {
  category?: string;
  mode?: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
  minPrice?: number;
  maxPrice?: number;
  instantBookOnly?: boolean;
  amenities?: string[];
}

export const SaveSearchButton = ({
  category,
  mode,
  locationText,
  latitude,
  longitude,
  radiusMiles,
  minPrice,
  maxPrice,
  instantBookOnly,
  amenities,
}: SaveSearchButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { savedSearches, saveSearch, isSaving } = useSavedSearches();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Check if this search is already saved
  const isAlreadySaved = savedSearches.some(s => 
    s.category === category &&
    s.mode === mode &&
    s.location_text === locationText
  );

  const handleSaveSearch = () => {
    if (!user) {
      setShowLoginPrompt(true);
      trackEvent({
        category: 'Search',
        action: 'save_search_login_prompt',
      });
      return;
    }

    saveSearch({
      category: category || undefined,
      mode: mode || undefined,
      location_text: locationText || undefined,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      radius_miles: radiusMiles || 25,
      min_price: minPrice && minPrice > 0 ? minPrice : undefined,
      max_price: maxPrice && maxPrice !== Infinity ? maxPrice : undefined,
      instant_book_only: instantBookOnly || false,
      amenities: amenities || [],
      frequency: 'weekly',
    });

    trackEvent({
      category: 'Search',
      action: 'search_saved',
      label: category || 'all',
      metadata: { location: locationText, mode },
    });
  };

  if (isAlreadySaved) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-primary"
        disabled
      >
        <BellRing className="h-4 w-4" />
        <span className="hidden sm:inline">Alerts on</span>
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleSaveSearch}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Get alerts</span>
      </Button>

      <SignupIntentDialog
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        intent="save_search"
      />
    </>
  );
};

export default SaveSearchButton;
