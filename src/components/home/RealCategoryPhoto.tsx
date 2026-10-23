import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyDiscoveryListingFilter } from '@/lib/listings/publicVisibility';
import { excludeTestListings } from '@/lib/excludeTestListings';
import { categoryPhotos, type CategoryPhoto, type CategoryPhotoListing, type HomePhotoGroup } from '@/lib/listings/homeCategoryPhotos';

export function useHomeCategoryPhotos() {
  return useQuery({
    queryKey: ['home-category-listing-photos'],
    staleTime: 60_000,
    queryFn: async () => {
      const query = supabase.from('listings').select('*');
      const visibleQuery = applyDiscoveryListingFilter(query);
      const { data, error } = await excludeTestListings(visibleQuery)
        .order('published_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as CategoryPhotoListing[];
    },
  });
}

export function RealCategoryPhoto({ rows, group, rotating }: { rows: CategoryPhotoListing[]; group: HomePhotoGroup; rotating: boolean }) {
  const photos = categoryPhotos(rows, group);
  return <PhotoSequence key={photos.map((photo) => photo.url).join('|')} photos={photos} rotating={rotating} />;
}

function PhotoSequence({ photos, rotating }: { photos: CategoryPhoto[]; rotating: boolean }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const usable = photos.filter((photo) => !failed.includes(photo.url));
  const active = usable[index % usable.length];

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !rotating || usable.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(image);
    const timer = window.setInterval(() => {
      if (!visible || document.hidden || image.closest('a')?.matches(':hover, :focus-within')) return;
      const next = usable[(index + 1) % usable.length];
      const preload = new Image();
      preload.onload = () => setIndex((current) => current + 1);
      preload.onerror = () => setFailed((current) => [...current, next.url]);
      preload.src = next.url;
    }, 7000);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, [index, rotating, usable.map((photo) => photo.url).join('|')]);

  if (!active) return <span className="hb-photo-empty" aria-hidden="true" />;
  return <img ref={imageRef} src={active.url} alt={active.title} width={800} height={600} loading="lazy" decoding="async" onError={() => setFailed((current) => [...current, active.url])} />;
}