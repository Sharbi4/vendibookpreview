import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingCart, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface StickyMobileCTAProps {
  listingId: string;
  hostId: string;
  isRental: boolean;
  priceDaily: number | null;
  priceSale: number | null;
  status: 'draft' | 'published' | 'paused';
  instantBook?: boolean;
  onMessageHost?: () => void;
}

export const StickyMobileCTA = ({
  listingId,
  hostId,
  isRental,
  priceDaily,
  priceSale,
  status,
  instantBook = false,
  onMessageHost,
}: StickyMobileCTAProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Show sticky CTA after scrolling past a certain point
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 400px (past hero/gallery area)
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAvailable = status === 'published';
  const price = isRental ? priceDaily : priceSale;

  const handlePrimaryCTA = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Scroll to booking/inquiry form
    const formElement = document.querySelector('[data-booking-form]');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border shadow-lg safe-area-pb">
      <div className="container py-3 flex items-center justify-between gap-3">
        {/* Price Display */}
        <div className="flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">
              ${price?.toLocaleString() || '—'}
            </span>
            {isRental && <span className="text-sm text-muted-foreground">/day</span>}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2">
          {/* Secondary: Ask a Question (ghost/demoted) */}
          {onMessageHost && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMessageHost}
              className="gap-1.5 text-muted-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ask</span>
            </Button>
          )}

          {/* Primary CTA */}
          <Button
            variant="gradient"
            size="sm"
            onClick={handlePrimaryCTA}
            disabled={!isAvailable}
            className="gap-1.5 min-w-[100px]"
          >
            {isRental ? (
              <>
                <Calendar className="h-4 w-4" />
                {instantBook ? 'Book Now' : 'Request'}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Inquire
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyMobileCTA;
