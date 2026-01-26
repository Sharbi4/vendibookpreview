import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Video, Grid3X3, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  }, []);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') setLightboxOpen(false);
  }, [nextImage, prevImage]);

  const renderMediaThumbnail = (item: MediaItem, isMain = false) => {
    if (item.type === 'video') {
      return (
        <div className="relative w-full h-full group">
          <video
            src={item.url}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className={cn(
              "rounded-full bg-white/90 flex items-center justify-center shadow-lg",
              isMain ? "w-16 h-16" : "w-12 h-12"
            )}>
              <Play className={cn(
                "text-foreground fill-foreground ml-1",
                isMain ? "w-8 h-8" : "w-5 h-5"
              )} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <img
        src={item.url}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  };

  const totalMedia = displayItems.length;
  const hasMultipleMedia = totalMedia > 1;

  return (
    <>
      {/* Airbnb-style Gallery Grid */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Desktop: Mosaic Grid */}
        <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 gap-2 h-[420px]">
          {/* Main Image - Takes 2x2 */}
          <div 
            className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden group"
            onClick={() => openLightbox(0)}
          >
            {renderMediaThumbnail(displayItems[0], true)}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>

          {/* Secondary Images - Grid of 4 */}
          {displayItems.slice(1, 5).map((item, idx) => (
            <div 
              key={idx}
              className="relative cursor-pointer overflow-hidden group"
              onClick={() => openLightbox(idx + 1)}
            >
              {renderMediaThumbnail(item)}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              
              {/* Show remaining count on last visible image */}
              {idx === 3 && totalMedia > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    +{totalMedia - 5}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Fill empty slots with placeholder styling */}
          {displayItems.length < 5 && Array.from({ length: 5 - displayItems.length }).map((_, idx) => (
            <div 
              key={`empty-${idx}`}
              className="bg-muted/50"
            />
          ))}
        </div>

        {/* Mobile: Single Hero with Swipe Indicator */}
        <div className="md:hidden relative aspect-[4/3]">
          <div 
            className="w-full h-full cursor-pointer"
            onClick={() => openLightbox(0)}
          >
            {renderMediaThumbnail(displayItems[0], true)}
          </div>
          
          {/* Photo count indicator */}
          {hasMultipleMedia && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
              <Images className="w-4 h-4" />
              1 / {totalMedia}
            </div>
          )}
        </div>

        {/* Show All Photos Button - Desktop */}
        {hasMultipleMedia && (
          <Button
            variant="outline"
            size="sm"
            className="absolute bottom-4 right-4 hidden md:flex bg-white hover:bg-white/90 text-foreground shadow-lg border-0 gap-2"
            onClick={() => openLightbox(0)}
          >
            <Grid3X3 className="w-4 h-4" />
            Show all photos
          </Button>
        )}

        {/* Video Indicator */}
        {videos.length > 0 && (
          <div className="absolute bottom-4 left-4 hidden md:flex">
            <Button
              variant="outline"
              size="sm"
              className="bg-white hover:bg-white/90 text-foreground shadow-lg border-0 gap-2"
              onClick={() => {
                const firstVideoIndex = displayItems.findIndex(item => item.type === 'video');
                if (firstVideoIndex !== -1) openLightbox(firstVideoIndex);
              }}
            >
              <Video className="w-4 h-4" />
              {videos.length} video{videos.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: View All Button */}
      {hasMultipleMedia && (
        <Button
          variant="outline"
          className="mt-3 w-full md:hidden"
          onClick={() => openLightbox(0)}
        >
          <Images className="w-4 h-4 mr-2" />
          View all {totalMedia} photos
        </Button>
      )}

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent 
          className="max-w-7xl w-full h-[95vh] p-0 bg-black border-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {displayItems.length}
                {displayItems[currentIndex].type === 'video' && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    <Video className="w-3 h-3" />
                    Video
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 md:px-16">
              {displayItems[currentIndex].type === 'video' ? (
                <video
                  key={displayItems[currentIndex].url}
                  src={displayItems[currentIndex].url}
                  className="max-w-full max-h-[80vh] rounded-lg"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={displayItems[currentIndex].url}
                  alt={`${title} ${currentIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              )}
            </div>

            {/* Navigation Arrows */}
            {hasMultipleMedia && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 w-12 h-12 rounded-full"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 w-12 h-12 rounded-full"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Thumbnail Strip */}
            {displayItems.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex gap-2 justify-center overflow-x-auto pb-2 px-4 max-w-4xl mx-auto">
                  {displayItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all",
                        idx === currentIndex 
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black" 
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      {item.type === 'video' ? (
                        <>
                          <video src={item.url} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        </>
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
