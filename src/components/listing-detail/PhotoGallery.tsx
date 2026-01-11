import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PhotoGalleryProps {
  images: string[];
  title: string;
}

const PhotoGallery = ({ images, title }: PhotoGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayImages = images.length > 0 ? images : ['/placeholder.svg'];

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden">
        {/* Main Image */}
        <div 
          className="md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <img
            src={displayImages[0]}
            alt={title}
            className="w-full h-full object-cover hover:opacity-95 transition-opacity"
          />
        </div>

        {/* Secondary Images */}
        {displayImages.slice(1, 5).map((img, idx) => (
          <div 
            key={idx}
            className="hidden md:block aspect-square cursor-pointer relative"
            onClick={() => openLightbox(idx + 1)}
          >
            <img
              src={img}
              alt={`${title} ${idx + 2}`}
              className="w-full h-full object-cover hover:opacity-95 transition-opacity"
            />
            {idx === 3 && displayImages.length > 5 && (
              <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-lg">
                  +{displayImages.length - 5} more
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show all photos button on mobile */}
      {displayImages.length > 1 && (
        <Button
          variant="outline"
          className="mt-4 md:hidden"
          onClick={() => openLightbox(0)}
        >
          View all {displayImages.length} photos
        </Button>
      )}

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl w-full h-[90vh] p-0 bg-foreground border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation Buttons */}
            {displayImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-10 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-10 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Current Image */}
            <img
              src={displayImages[currentIndex]}
              alt={`${title} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-foreground/80 text-primary-foreground px-4 py-2 rounded-full text-sm">
              {currentIndex + 1} / {displayImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
