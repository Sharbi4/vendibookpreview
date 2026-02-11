import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrendingListings } from '@/hooks/useTrendingListings';
import { CATEGORY_LABELS } from '@/types/listing';

interface TrendingDropdownProps {
  isVisible: boolean;
  onClose: () => void;
}

const TrendingDropdown = ({ isVisible, onClose }: TrendingDropdownProps) => {
  const navigate = useNavigate();
  const { data: trending, isLoading } = useTrendingListings(5);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-background/95 backdrop-blur-xl border border-border shadow-xl shadow-black/15 overflow-hidden z-50"
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          Trending Now
        </div>
        {isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : trending && trending.length > 0 ? (
          <div className="space-y-0.5">
            {trending.map((listing, i) => (
              <button
                key={listing.id}
                onClick={() => {
                  onClose();
                  navigate(`/listing/${listing.id}`);
                }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
              >
                {listing.cover_image_url ? (
                  <img
                    src={listing.cover_image_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {listing.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS]} · {listing.mode === 'rent' ? 'For Rent' : 'For Sale'}
                    {listing.price_daily && ` · $${listing.price_daily}/day`}
                    {listing.price_sale && ` · $${listing.price_sale.toLocaleString()}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground/60 font-mono shrink-0">#{i + 1}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center text-sm text-muted-foreground">No trending listings yet</div>
        )}
      </div>
    </motion.div>
  );
};

export default TrendingDropdown;
