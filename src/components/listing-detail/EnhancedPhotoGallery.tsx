import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Play, Video, Grid3X3, Images, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface EnhancedPhotoGalleryProps {
  images: string[];
  videos?: string[];
  title: string;
}

type MediaItem = {
  type: 'image' | 'video';
  url: string;
};

// Custom hook for swipe detection
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    const distX = touchStart.current.x - touchEnd.current.x;
    const distY = Math.abs(touchStart.current.y - touchEnd.current.y);
    // Only register horizontal swipes (not vertical scrolls)
    if (Math.abs(distX) > minSwipeDistance && Math.abs(distX) > distY) {
      if (distX > 0) onSwipeLeft();
      else onSwipeRight();
    }
    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

const EnhancedPhotoGallery = ({ images, videos = [], title }: EnhancedPhotoGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('left');

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
    setSwipeDirection('left');
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const prevImage = useCallback(() => {
    setSwipeDirection('right');
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  const nextMobile = useCallback(() => {
    setSwipeDirection('left');
    setMobileIndex((prev) => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  const prevMobile = useCallback(() => {
    setSwipeDirection('right');
    setMobileIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') setLightboxOpen(false);
  }, [nextImage, prevImage]);

  // Swipe handlers
  const mobileSwipe = useSwipe(nextMobile, prevMobile);
  const lightboxSwipe = useSwipe(nextImage, prevImage);

  const renderMediaThumbnail = (item: MediaItem, isMain = false, index = 0) => {
    const isHovered = hoveredIndex === index;
    
    if (item.type === 'video') {
      return (
        <div className="relative w-full h-full group">
          <video src={item.url} className="w-full h-full object-cover" muted playsInline />
          <motion.div 
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            animate={{ backgroundColor: isHovered ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)' }}
          >
            <motion.div 
              className={cn(
                "rounded-full bg-white/90 flex items-center justify-center shadow-lg",
                isMain ? "w-16 h-16" : "w-12 h-12"
              )}
              whileHover={{ scale: 1.1 }}
              animate={{ scale: isHovered ? 1.1 : 1 }}
            >
              <Play className={cn(
                "text-foreground fill-foreground ml-1",
                isMain ? "w-8 h-8" : "w-5 h-5"
              )} />
            </motion.div>
          </motion.div>
        </div>
      );
    }

    return (
      <motion.div className="relative w-full h-full overflow-hidden">
        <motion.img
          src={item.url}
          alt={title}
          className="w-full h-full object-cover"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          draggable={false}
        />
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/10 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-lg"
              >
                <Maximize2 className="w-5 h-5 text-foreground" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const totalMedia = displayItems.length;
  const hasMultipleMedia = totalMedia > 1;

  return (
    <>
      <motion.div 
        className="relative rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        {/* Desktop: Mosaic Grid */}
        <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 gap-2 h-[450px]">
          <motion.div 
            className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden"
            onClick={() => openLightbox(0)}
            onHoverStart={() => setHoveredIndex(0)}
            onHoverEnd={() => setHoveredIndex(null)}
            whileTap={{ scale: 0.995 }}
          >
            {renderMediaThumbnail(displayItems[0], true, 0)}
          </motion.div>

          {displayItems.slice(1, 5).map((item, idx) => (
            <motion.div 
              key={idx}
              className="relative cursor-pointer overflow-hidden"
              onClick={() => openLightbox(idx + 1)}
              onHoverStart={() => setHoveredIndex(idx + 1)}
              onHoverEnd={() => setHoveredIndex(null)}
              whileTap={{ scale: 0.98 }}
            >
              {renderMediaThumbnail(item, false, idx + 1)}
              {idx === 3 && totalMedia > 5 && (
                <motion.div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]"
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <motion.span className="text-white font-semibold text-xl" whileHover={{ scale: 1.1 }}>
                    +{totalMedia - 5} more
                  </motion.span>
                </motion.div>
              )}
            </motion.div>
          ))}

          {displayItems.length < 5 && Array.from({ length: 5 - displayItems.length }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-muted/50" />
          ))}
        </div>

        {/* Mobile: Swipeable carousel */}
        <div
          className="md:hidden relative aspect-[4/3] touch-pan-y"
          {...mobileSwipe}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mobileIndex}
              initial={{ opacity: 0, x: swipeDirection === 'left' ? 80 : -80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDirection === 'left' ? -80 : 80 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="absolute inset-0 cursor-pointer"
              onClick={() => openLightbox(mobileIndex)}
            >
              {renderMediaThumbnail(displayItems[mobileIndex], true, mobileIndex)}
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows on mobile */}
          {hasMultipleMedia && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevMobile(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextMobile(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          
          {/* Dot indicators */}
          {hasMultipleMedia && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {displayItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setMobileIndex(idx); }}
                  className={cn(
                    "rounded-full transition-all duration-200",
                    idx === mobileIndex
                      ? "w-6 h-2 bg-white"
                      : "w-2 h-2 bg-white/50"
                  )}
                />
              ))}
            </div>
          )}

          {/* Photo count */}
          {hasMultipleMedia && (
            <motion.div 
              className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Images className="w-3.5 h-3.5" />
              {mobileIndex + 1} / {totalMedia}
            </motion.div>
          )}
        </div>

        {/* Show All Photos Button - Desktop */}
        {hasMultipleMedia && (
          <motion.div
            className="absolute bottom-4 right-4 hidden md:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="bg-white/95 hover:bg-white text-foreground shadow-lg border-0 gap-2 backdrop-blur-sm"
              onClick={() => openLightbox(0)}
            >
              <Grid3X3 className="w-4 h-4" />
              Show all photos
            </Button>
          </motion.div>
        )}

        {/* Video Indicator */}
        {videos.length > 0 && (
          <motion.div 
            className="absolute bottom-4 left-4 hidden md:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="bg-white/95 hover:bg-white text-foreground shadow-lg border-0 gap-2 backdrop-blur-sm"
              onClick={() => {
                const firstVideoIndex = displayItems.findIndex(item => item.type === 'video');
                if (firstVideoIndex !== -1) openLightbox(firstVideoIndex);
              }}
            >
              <Video className="w-4 h-4" />
              {videos.length} video{videos.length > 1 ? 's' : ''}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Lightbox Modal with swipe support */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent 
          className="max-w-7xl w-full h-[95vh] p-0 bg-black border-none"
          onKeyDown={handleKeyDown}
        >
          <div
            className="relative w-full h-full flex flex-col touch-pan-y"
            {...lightboxSwipe}
          >
            {/* Header */}
            <motion.div 
              className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  {currentIndex + 1} / {displayItems.length}
                </span>
                {displayItems[currentIndex].type === 'video' && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs">
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
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 md:px-16">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: swipeDirection === 'left' ? 100 : -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: swipeDirection === 'left' ? -100 : 100 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-full max-h-[80vh]"
                >
                  {displayItems[currentIndex].type === 'video' ? (
                    <video
                      src={displayItems[currentIndex].url}
                      className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                      controls
                      autoPlay
                    />
                  ) : (
                    <img
                      src={displayItems[currentIndex].url}
                      alt={`${title} ${currentIndex + 1}`}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none"
                      draggable={false}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Arrows */}
            {hasMultipleMedia && (
              <>
                <motion.div
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white bg-black/30 hover:bg-black/50 w-12 h-12 rounded-full backdrop-blur-sm"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                </motion.div>
                <motion.div
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white bg-black/30 hover:bg-black/50 w-12 h-12 rounded-full backdrop-blur-sm"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </motion.div>
              </>
            )}

            {/* Thumbnail Strip */}
            {displayItems.length > 1 && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex gap-2 justify-center overflow-x-auto pb-2 px-4 max-w-4xl mx-auto">
                  {displayItems.map((item, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => { setSwipeDirection(idx > currentIndex ? 'left' : 'right'); setCurrentIndex(idx); }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden transition-all",
                        idx === currentIndex 
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black" 
                          : "opacity-50 hover:opacity-100"
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
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedPhotoGallery;