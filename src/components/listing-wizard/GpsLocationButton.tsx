import React, { useState } from 'react';
import { Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface GpsLocationButtonProps {
  onLocationDetected: (data: {
    street_address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    lat: number;
    lng: number;
  }) => void;
}

export const GpsLocationButton: React.FC<GpsLocationButtonProps> = ({ onLocationDetected }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: 'GPS not supported', description: 'Your browser does not support location detection.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        toast({ title: 'Configuration error', description: 'Maps API key is not configured.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.[0]) {
        toast({ title: 'Could not detect address', description: 'Try entering it manually.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const result = data.results[0];
      const components = result.address_components || [];

      const getComponent = (type: string): string => {
        const comp = components.find((c: any) => c.types.includes(type));
        return comp?.short_name || comp?.long_name || '';
      };

      const streetNumber = getComponent('street_number');
      const route = getComponent('route');
      const city = getComponent('locality') || getComponent('sublocality_level_1') || getComponent('administrative_area_level_2');
      const state = getComponent('administrative_area_level_1');
      const zip = getComponent('postal_code');

      const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

      onLocationDetected({
        street_address: streetAddress,
        city,
        state,
        zip_code: zip,
        country: 'United States - US',
        lat: latitude,
        lng: longitude,
      });

      toast({ title: 'Location detected!', description: streetAddress ? `${streetAddress}, ${city}` : `${city}, ${state}` });
    } catch (error: any) {
      if (error?.code === 1) {
        toast({ title: 'Location access denied', description: 'Please allow location access in your browser settings.', variant: 'destructive' });
      } else if (error?.code === 2) {
        toast({ title: 'Location unavailable', description: 'Could not determine your position. Try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Location error', description: 'Could not detect your location. Please enter it manually.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDetectLocation}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Navigation className="h-4 w-4" />
      )}
      {isLoading ? 'Detecting...' : 'Use my location'}
    </Button>
  );
};
