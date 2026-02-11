import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Zap, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Listing } from '@/types/listing';

interface StorefrontFeaturedListingProps {
  listing: Listing;
  hostName: string;
}

const StorefrontFeaturedListing = ({ listing, hostName }: StorefrontFeaturedListingProps) => {
  const coverImage = listing.cover_image_url || listing.image_urls?.[0];
  const price = listing.mode === 'sale' 
    ? listing.price_sale 
    : listing.price_daily || listing.price_hourly;
  const priceLabel = listing.mode === 'sale' 
    ? '' 
    : listing.price_daily ? '/day' : '/hr';

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 24 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Animated grey-to-orange gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,0%,92%)] via-[hsl(0,0%,88%)] to-[hsl(0,0%,85%)] dark:from-[hsl(0,0%,14%)] dark:via-[hsl(0,0%,12%)] dark:to-[hsl(0,0%,10%)]" />
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          background: [
            'linear-gradient(135deg, hsl(14,100%,57%,0.15) 0%, hsl(40,100%,49%,0.1) 50%, transparent 100%)',
            'linear-gradient(225deg, hsl(40,100%,49%,0.15) 0%, hsl(14,100%,57%,0.1) 50%, transparent 100%)',
            'linear-gradient(135deg, hsl(14,100%,57%,0.15) 0%, hsl(40,100%,49%,0.1) 50%, transparent 100%)',
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Clear glass overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-white/5 dark:bg-white/[0.02]" />
      
      <div className="relative p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ backgroundSize: '200% 200%' }}
            className="inline-flex"
          >
            <Badge className="bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] text-white text-xs font-semibold px-2.5 py-0.5 border-0 shadow-md">
              <Zap className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </motion.div>
          <span className="text-xs text-muted-foreground">{hostName}'s spotlight</span>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Image */}
          {coverImage && (
            <motion.div 
              className="relative w-full md:w-80 h-52 md:h-56 rounded-xl overflow-hidden flex-shrink-0"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <img 
                src={coverImage} 
                alt={listing.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              {listing.instant_book && (
                <Badge className="absolute top-3 left-3 bg-emerald-500 text-white text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Instant Book
                </Badge>
              )}
            </motion.div>
          )}

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 line-clamp-2">
                {listing.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {listing.description}
              </p>
              {listing.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{listing.address}</span>
                </p>
              )}
            </div>

            <div className="flex items-end justify-between gap-4">
              {price && (
                <div>
                  <span className="text-2xl font-bold text-foreground">${price}</span>
                  <span className="text-sm text-muted-foreground">{priceLabel}</span>
                </div>
              )}
              <Button variant="dark-shine" className="rounded-xl shadow-lg" asChild>
                <Link to={`/listing/${listing.id}`}>
                  View listing
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default StorefrontFeaturedListing;
