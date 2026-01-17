import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import vendibookLogo from '@/assets/vendibook-logo.png';

const Activation = () => {
  const navigate = useNavigate();
  const { user, roles, isLoading, hasRole } = useAuth();
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Determine user's primary role
  const isSupply = hasRole('host');
  const isDemand = hasRole('shopper') || (!isSupply && !hasRole('shopper'));

  useEffect(() => {
    // Track activation page view
    if (user) {
      trackEvent({
        category: 'Activation',
        action: 'activation_page_viewed',
        label: isSupply ? 'supply' : 'demand',
      });
    }
  }, [user, isSupply]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const handleSearchListings = () => {
    trackEvent({
      category: 'Activation',
      action: 'search_started',
      label: location || 'no_location',
    });
    
    if (location) {
      navigate(`/search?location=${encodeURIComponent(location)}`);
    } else {
      navigate('/search');
    }
  };

  const handleCreateListing = () => {
    trackEvent({
      category: 'Activation',
      action: 'create_listing_started',
    });
    navigate('/list');
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get city/state
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const state = data.address?.state || '';
          setLocation(`${city}${city && state ? ', ' : ''}${state}`);
        } catch (error) {
          console.error('Geocoding error:', error);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src={vendibookLogo} 
              alt="Vendibook" 
              className="h-40 w-auto mx-auto mb-4 rounded-xl"
            />
          </div>

          {/* Activation Card */}
          <div className="bg-card rounded-2xl shadow-lg p-8">
            {isDemand && !isSupply ? (
              // Demand user activation
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                    <Search className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Find your perfect listing
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Enter a location to start browsing
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="City, state, or zip code"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-12 pr-12"
                    />
                    <button
                      onClick={handleUseLocation}
                      disabled={isLocating}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      title="Use my location"
                    >
                      {isLocating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <MapPin className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <Button
                    variant="gradient"
                    className="w-full h-12 gap-2"
                    onClick={handleSearchListings}
                  >
                    Search listings
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              // Supply user activation
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                    <PlusCircle className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Let's create your first listing
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Get your asset in front of thousands of renters
                  </p>
                </div>

                <Button
                  variant="gradient"
                  className="w-full h-12 gap-2"
                  onClick={handleCreateListing}
                >
                  Create a draft listing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Skip link */}
          <p className="text-center mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip to dashboard
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Activation;
