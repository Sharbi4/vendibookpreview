import { useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { Image, PlusSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Listing } from '@/types/listing';

interface ProfilePhotosTabProps {
  listings: Listing[] | undefined;
  isLoading: boolean;
  isOwnProfile: boolean;
}

interface PhotoItem {
  url: string;
  listingId: string;
  listingTitle: string;
}

// Memoized photo item to prevent re-renders
const PhotoItem = memo(({ photo, index }: { photo: PhotoItem; index: number }) => (
  <Link
    to={`/listing/${photo.listingId}`}
    className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
  >
    <img
      src={photo.url}
      alt={photo.listingTitle}
      loading="lazy"
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <p className="text-white text-xs font-medium line-clamp-2">
          {photo.listingTitle}
        </p>
      </div>
    </div>
  </Link>
));
PhotoItem.displayName = 'PhotoItem';

const ProfilePhotosTab = ({ listings, isLoading, isOwnProfile }: ProfilePhotosTabProps) => {
  // Collect all photos from listings with lazy evaluation
  const allPhotos = useMemo(() => {
    if (!listings) return [];
    
    const photos: PhotoItem[] = [];
    for (const listing of listings) {
      if (listing.cover_image_url) {
        photos.push({
          url: listing.cover_image_url,
          listingId: listing.id,
          listingTitle: listing.title,
        });
      }
      if (listing.image_urls) {
        for (const url of listing.image_urls) {
          photos.push({
            url,
            listingId: listing.id,
            listingTitle: listing.title,
          });
        }
      }
    }
    return photos;
  }, [listings]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
  if (allPhotos.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Image className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No photos yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          {isOwnProfile 
            ? 'Photos will appear here once you publish listings with images.'
            : 'This user hasn\'t uploaded any photos yet.'}
        </p>
        {isOwnProfile && (
          <Button asChild>
            <Link to="/create">
              <PlusSquare className="h-4 w-4 mr-2" />
              Create Listing
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {allPhotos.map((photo, index) => (
        <PhotoItem 
          key={`${photo.listingId}-${index}`} 
          photo={photo} 
          index={index}
        />
      ))}
    </div>
  );
};

export default ProfilePhotosTab;
