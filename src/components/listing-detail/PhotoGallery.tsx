import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PhotoGalleryProps {
  images: string[];
  videos?: string[];
  title: string;
}

type MediaItem = {
  type: 'image' | 'video';
  url: string;
};

const PhotoGallery = ({ images, videos = [], title }: PhotoGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine images and videos into a single media array
  const mediaItems: MediaItem[] = [
    ...images.map(url => ({ type: 'image' as const, url })),
    ...videos.map(url => ({ type: 'video' as const, url })),
  ];

  const displayItems = mediaItems.length > 0 ? mediaItems : [{ type: 'image' as const, url: '/placeholder.svg' }];
  const displayImages = displayItems.filter(item => item.type === 'image').slice(0, 5);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const renderMediaItem = (item: MediaItem, className: string, showOverlay = false, overlayCount = 0) => {
    if (item.type === 'video') {
      return (
        <div className={`${className} relative`}>
          <video
            src={item.url}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${className} relative`}>
        <img
          src={item.url}
          alt={title}
          className="w-full h-full object-cover hover:opacity-95 transition-opacity"
        />
        {showOverlay && overlayCount > 0 && (
          <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-lg">
              +{overlayCount} more
            </span>
          </div>
        )}
      </div>
    );
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
          {renderMediaItem(displayItems[0], 'w-full h-full')}
        </div>

        {/* Secondary Images */}
        {displayItems.slice(1, 5).map((item, idx) => (
          <div 
            key={idx}
            className="hidden md:block aspect-square cursor-pointer relative"
            onClick={() => openLightbox(idx + 1)}
          >
            {renderMediaItem(
              item, 
              'w-full h-full',
              idx === 3,
              displayItems.length - 5
            )}
          </div>
        ))}
      </div>

      {/* Videos indicator if there are videos */}
      {videos.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="w-4 h-4" />
          <span>{videos.length} video{videos.length > 1 ? 's' : ''} included</span>
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto"
            onClick={() => {
              // Find the index of the first video
              const firstVideoIndex = displayItems.findIndex(item => item.type === 'video');
              if (firstVideoIndex !== -1) {
                openLightbox(firstVideoIndex);
              }
            }}
          >
            Watch now
          </Button>
        </div>
      )}

      {/* Show all photos button on mobile */}
      {displayItems.length > 1 && (
        <Button
          variant="outline"
          className="mt-4 md:hidden"
          onClick={() => openLightbox(0)}
        >
          View all {displayItems.length} photos & videos
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
            {displayItems.length > 1 && (
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

            {/* Current Media */}
            {displayItems[currentIndex].type === 'video' ? (
              <video
                key={displayItems[currentIndex].url}
                src={displayItems[currentIndex].url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={displayItems[currentIndex].url}
                alt={`${title} ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Media Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-foreground/80 text-primary-foreground px-4 py-2 rounded-full text-sm flex items-center gap-2">
              {displayItems[currentIndex].type === 'video' && <Video className="w-4 h-4" />}
              {currentIndex + 1} / {displayItems.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
