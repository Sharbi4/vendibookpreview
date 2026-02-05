import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Listing } from '@/types/listing';

interface StorefrontGallerySectionProps {
  listings: Listing[] | undefined;
  isLoading: boolean;
  hostName: string;
}

const StorefrontGallerySection = ({ listings, isLoading, hostName }: StorefrontGallerySectionProps) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Collect all images from listings
  const allImages = (listings || []).flatMap((listing) => {
    const images: { url: string; listingTitle: string; listingId: string }[] = [];
    
    if (listing.cover_image_url) {
      images.push({
        url: listing.cover_image_url,
        listingTitle: listing.title,
        listingId: listing.id,
      });
    }
    
    if (listing.image_urls) {
      listing.image_urls.forEach((url) => {
        images.push({
          url,
          listingTitle: listing.title,
          listingId: listing.id,
        });
      });
    }
    
    return images;
  }).slice(0, 12); // Limit to 12 images

  if (isLoading) {
    return (
      <div className="glass-premium rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="h-6 w-40 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (allImages.length === 0) {
    return null; // Don't show section if no images
  }

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? allImages.length - 1 : selectedImage - 1);
    }
  };

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === allImages.length - 1 ? 0 : selectedImage + 1);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="glass-premium rounded-2xl p-6 border border-border/50 relative overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/10 border border-primary/20">
              <Images className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Photo Gallery</h3>
              <p className="text-sm text-muted-foreground">{allImages.length} photos from {hostName}'s listings</p>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="relative grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {allImages.map((image, index) => (
            <motion.button
              key={`${image.listingId}-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * index }}
              onClick={() => setSelectedImage(index)}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden",
                "border border-border/30 bg-muted/30",
                "hover:border-primary/50 hover:shadow-lg transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            >
              <img
                src={image.url}
                alt={image.listingTitle}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-xs text-white font-medium line-clamp-1">{image.listingTitle}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
          <AnimatePresence mode="wait">
            {selectedImage !== null && (
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <img
                  src={allImages[selectedImage].url}
                  alt={allImages[selectedImage].listingTitle}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Navigation */}
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <p className="text-white font-medium">{allImages[selectedImage].listingTitle}</p>
                  <p className="text-white/60 text-sm mt-1">
                    {selectedImage + 1} of {allImages.length}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
};

export default StorefrontGallerySection;
