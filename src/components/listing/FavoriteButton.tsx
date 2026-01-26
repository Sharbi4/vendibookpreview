import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { trackListingFavorited, trackListingUnfavorited } from '@/lib/analytics';

interface FavoriteButtonProps {
  listingId: string;
  category?: string;
  title?: string;
  price?: number;
  className?: string;
  size?: 'sm' | 'default';
}

export const FavoriteButton = ({ listingId, category, title, price, className, size = 'default' }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();
  
  const isFav = isFavorite(listingId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    // Track before toggling
    if (isFav) {
      trackListingUnfavorited(listingId);
    } else {
      trackListingFavorited(listingId, category || 'unknown', title, price);
    }
    
    toggleFavorite(listingId);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isToggling}
      className={cn(
        "rounded-full bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm transition-all",
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className
      )}
    >
      <Heart 
        className={cn(
          "transition-all",
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          isFav 
            ? 'fill-red-500 text-red-500 scale-110' 
            : 'text-gray-600 hover:text-red-500'
        )} 
      />
    </Button>
  );
};