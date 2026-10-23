import { isExcludedTestListingTitle } from '@/lib/excludeTestListings';
import { filterPubliclyVisible, type VisibilityShape } from '@/lib/listings/publicVisibility';
import { detectSpecialty } from '@/lib/listings/specialty';

export type CategoryPhotoListing = VisibilityShape & {
  id: string; title: string; mode: string; category: string;
  cover_image_url: string | null; image_urls?: string[] | null;
  subcategory?: string | null; description?: string | null;
};
export type CategoryPhoto = { url: string; title: string };
export const HOME_PHOTO_GROUPS = ['sale', 'rent', 'kitchens', 'truck-sale', 'trailer-sale', 'coffee', 'ice-cream', 'truck-rent', 'trailer-rent', 'spaces'] as const;
export type HomePhotoGroup = typeof HOME_PHOTO_GROUPS[number];

export function categoryPhotos(rows: CategoryPhotoListing[], group: HomePhotoGroup): CategoryPhoto[] {
  const seen = new Set<string>();
  return filterPubliclyVisible(rows).filter((row) => {
    if (isExcludedTestListingTitle(row.title)) return false;
    const vehicle = ['food_truck', 'food_trailer'].includes(row.category);
    switch (group) {
      case 'sale': return vehicle && row.mode === 'sale';
      case 'rent': return vehicle && row.mode === 'rent';
      case 'kitchens': return row.category === 'ghost_kitchen';
      case 'spaces': return ['vendor_lot', 'vendor_space'].includes(row.category);
      case 'truck-sale': return row.category === 'food_truck' && row.mode === 'sale';
      case 'trailer-sale': return row.category === 'food_trailer' && row.mode === 'sale';
      case 'truck-rent': return row.category === 'food_truck' && row.mode === 'rent';
      case 'trailer-rent': return row.category === 'food_trailer' && row.mode === 'rent';
      case 'coffee': return vehicle && row.mode === 'sale' && detectSpecialty(row) === 'coffee';
      case 'ice-cream': return vehicle && row.mode === 'sale' && detectSpecialty(row) === 'ice_cream';
    }
  }).flatMap((row) => [row.cover_image_url, ...(row.image_urls ?? [])].flatMap((url) => {
    if (!url || seen.has(url) || !/^https?:\/\//.test(url)) return [];
    seen.add(url);
    return [{ url, title: row.title }];
  })).slice(0, 8);
}